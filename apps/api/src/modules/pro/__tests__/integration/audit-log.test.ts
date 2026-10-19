import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { setOwnedWorkspaceLimit } from '#shared/limits';
import { setRequestTracker } from '#shared/request-tracker';
import { apiKeyApi, authedApi, createProject, ownWorkspaceId } from '#tests/helpers/app';
import { createAgent } from '#tests/helpers/agents';
import { signUpTestUser, type TestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { recordSignIn, trackAuditedRequest } from '../../audit';

type Client = ReturnType<typeof authedApi>;

// The instance owner with a project MKT in their own team, the way sign-up leaves them.
async function setup() {
  const owner = await signUpTestUser({ name: 'Root' });
  const ownerApi = authedApi(owner.cookie);
  await createProject(ownerApi, { key: 'MKT', name: 'Marketing' });
  const view = await ownerApi.projects({ projectKey: 'MKT' }).get();
  const workspaceId = await ownWorkspaceId(ownerApi);
  const [team] = (await ownerApi.teams.get()).data!;
  return { owner, ownerApi, workspaceId, teamId: team!.id, columnId: view.data!.columns[0]!.id };
}

async function workspaceLog(client: Client, workspaceId: number, query = {}) {
  return client.workspaces({ workspaceId })['audit-log'].get({ query });
}

async function addMember(ownerApi: Client, teamId: number): Promise<TestUser> {
  const person = await signUpTestUser({ name: 'Ada', team: false });
  const invite = await ownerApi.teams({ teamId }).invites.post({
    email: person.email,
    role: 'member',
  });
  await authedApi(person.cookie).invites({ token: invite.data!.token }).accept.post();
  return person;
}

describe('audit log', () => {
  beforeEach(async () => {
    await resetDb();
    setRequestTracker(trackAuditedRequest);
  });
  afterEach(() => {
    setRequestTracker();
    setOwnedWorkspaceLimit();
  });

  it('records a write with who made it, the route and the project it acted in', async () => {
    const { owner, ownerApi, workspaceId, columnId } = await setup();
    const created = await ownerApi
      .projects({ projectKey: 'MKT' })
      .issues.post({ columnId, title: 'Launch' });
    await ownerApi.issues({ issueId: created.data!.id }).patch({ title: 'Launch day' });

    const log = (await workspaceLog(ownerApi, workspaceId)).data!;
    const [patch, post] = log.items;
    expect(patch).toMatchObject({
      action: 'PATCH /issues/:issueId',
      actor: { id: owner.userId, name: 'Root', email: owner.email },
      target: expect.stringContaining('MKT'),
      via: 'web',
    });
    expect(post).toMatchObject({ action: 'POST /projects/:projectKey/issues' });
  });

  it('names the team for a team route, and records a delete of the team itself', async () => {
    const { ownerApi, workspaceId } = await setup();
    const team = await ownerApi.teams.post({ name: 'Design', slug: 'design', workspaceId });
    await ownerApi.teams({ teamId: team.data!.id }).delete();

    const actions = (await workspaceLog(ownerApi, workspaceId)).data!.items.map((e) => [
      e.action,
      e.target,
    ]);
    expect(actions).toContainEqual(['POST /teams', 'Design']);
    expect(actions).toContainEqual(['DELETE /teams/:teamId', 'Design']);
  });

  it('leaves out reads and refused writes', async () => {
    const { ownerApi, workspaceId } = await setup();
    const before = (await workspaceLog(ownerApi, workspaceId)).data!.total;

    await ownerApi.projects({ projectKey: 'MKT' }).get();
    const refused = await ownerApi.teams.post({ name: '', slug: 'x', workspaceId });
    expect(refused.status).toBe(400);

    expect((await workspaceLog(ownerApi, workspaceId)).data!.total).toBe(before);
  });

  it('marks a request made with an API key', async () => {
    const { ownerApi, workspaceId, columnId } = await setup();
    const created = await createAgent(ownerApi, 'MKT', {
      name: 'Bot',
      username: 'bot',
      kind: 'external',
    });
    await apiKeyApi(created.data!.apiKey!)
      .projects({ projectKey: 'MKT' })
      .issues.post({ columnId, title: 'From the bot' });

    const [latest] = (await workspaceLog(ownerApi, workspaceId)).data!.items;
    expect(latest).toMatchObject({ action: 'POST /projects/:projectKey/issues', via: 'api_key' });
  });

  it("keeps each workspace's log to itself, while the instance owner reads them all", async () => {
    const { ownerApi, workspaceId } = await setup();
    setOwnedWorkspaceLimit(0);
    const person = await signUpTestUser({ name: 'Ada', team: false });
    const personApi = authedApi(person.cookie);
    const own = await ownWorkspaceId(personApi);
    await personApi.teams.post({ name: 'Solo', slug: 'solo', workspaceId: own });

    const mine = (await workspaceLog(personApi, own)).data!.items.map((e) => e.target);
    expect(mine).toEqual(['Solo']);
    const owners = (await workspaceLog(ownerApi, workspaceId)).data!.items.map((e) => e.target);
    expect(owners).not.toContain('Solo');

    const instance = (await ownerApi.god['audit-log'].get({ query: {} })).data!;
    expect(instance.items.map((e) => e.target)).toContain('Solo');
    expect((await personApi.god['audit-log'].get({ query: {} })).status).toBe(403);
  });

  it('is read by the workspace managers only', async () => {
    const { ownerApi, workspaceId, teamId } = await setup();
    const member = await addMember(ownerApi, teamId);

    expect((await workspaceLog(authedApi(member.cookie), workspaceId)).status).toBe(404);
    await ownerApi.workspaces({ workspaceId }).managers.post({ userId: member.userId });
    expect((await workspaceLog(authedApi(member.cookie), workspaceId)).status).toBe(200);
  });

  it("shows the sign-ins of the workspace's people, and no one else's", async () => {
    const { ownerApi, workspaceId, teamId } = await setup();
    const member = await addMember(ownerApi, teamId);
    const stranger = await signUpTestUser({ name: 'Zed', team: false });
    await recordSignIn({ userId: member.userId, ipAddress: '203.0.113.7' });
    await recordSignIn({ userId: stranger.userId, ipAddress: '198.51.100.1' });

    const signIns = (await workspaceLog(ownerApi, workspaceId, { search: 'sign_in' })).data!.items;
    expect(signIns.map((e) => [e.actor.name, e.ip])).toEqual([['Ada', '203.0.113.7']]);
  });

  it('filters by a search over who, what and where, and by period', async () => {
    const { ownerApi, workspaceId } = await setup();
    await ownerApi.teams.post({ name: 'Design', slug: 'design', workspaceId });

    const found = (await workspaceLog(ownerApi, workspaceId, { search: 'desig' })).data!;
    expect(found.items.map((e) => e.target)).toEqual(['Design']);
    expect(
      (await workspaceLog(ownerApi, workspaceId, { search: 'nothing-here' })).data!.total,
    ).toBe(0);
    expect((await workspaceLog(ownerApi, workspaceId, { days: 1 })).data!.total).toBeGreaterThan(0);
    expect((await workspaceLog(ownerApi, workspaceId, { days: 0 })).status).toBe(400);
  });

  it('pages the log', async () => {
    const { ownerApi, workspaceId } = await setup();
    for (const name of ['One', 'Two', 'Three']) {
      await ownerApi.teams.post({ name, slug: name.toLowerCase(), workspaceId });
    }
    const page = (await workspaceLog(ownerApi, workspaceId, { page: 1, pageSize: 2 })).data!;
    expect(page.items).toHaveLength(2);
    expect(page.total).toBeGreaterThanOrEqual(3);
  });

  it('exports the filtered log as CSV, keeping a formula in a name as text', async () => {
    const { ownerApi, workspaceId } = await setup();
    await ownerApi.teams.post({ name: '=HYPERLINK("x")', slug: 'formula', workspaceId });

    const res = await ownerApi
      .workspaces({ workspaceId })
      ['audit-log'].export.get({ query: { search: 'HYPERLINK' } });
    expect(res.status).toBe(200);
    const lines = String(res.data).trim().split('\r\n');
    expect(lines[0]).toBe('time,name,email,action,where,via,ip');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('keeps the events of a deleted workspace in the instance log', async () => {
    const { ownerApi } = await setup();
    setOwnedWorkspaceLimit(0);
    const created = await ownerApi.workspaces.post({ name: 'Short lived' });
    await ownerApi.workspaces({ workspaceId: created.data!.id }).delete();

    const instance = (await ownerApi.god['audit-log'].get({ query: { search: 'Short' } })).data!;
    expect(instance.items.map((e) => e.action)).toEqual([
      'DELETE /workspaces/:workspaceId',
      'POST /workspaces',
    ]);
  });
});
