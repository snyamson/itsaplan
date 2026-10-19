import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { setOwnedWorkspaceLimit } from '#shared/limits';
import { authedApi, createProject, ownWorkspaceId } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';

type Client = ReturnType<typeof authedApi>;

const today = () => new Date().toISOString().slice(0, 10);

// The instance owner with a project MKT in their own team, and its columns by state.
async function setup() {
  const owner = await signUpTestUser({ name: 'Root' });
  const ownerApi = authedApi(owner.cookie);
  await createProject(ownerApi, { key: 'MKT', name: 'Marketing' });
  const view = (await ownerApi.projects({ projectKey: 'MKT' }).get()).data!;
  const column = (state: string) => view.columns.find((c) => c.stateType === state)!.id;
  const workspaceId = await ownWorkspaceId(ownerApi);
  const [team] = (await ownerApi.teams.get()).data!;
  return { owner, ownerApi, workspaceId, teamId: team!.id, column };
}

function dashboard(client: Client, workspaceId: number, query = {}) {
  return client.workspaces({ workspaceId }).dashboard.get({ query });
}

describe('workspace dashboard', () => {
  beforeEach(resetDb);
  afterEach(() => setOwnedWorkspaceLimit());

  it('counts the teams, projects, people and open issues of the workspace', async () => {
    const { ownerApi, workspaceId, teamId, column } = await setup();
    const issues = ownerApi.projects({ projectKey: 'MKT' }).issues;
    await issues.post({ columnId: column('unstarted'), title: 'One' });
    await issues.post({ columnId: column('started'), title: 'Two' });
    await issues.post({ columnId: column('completed'), title: 'Done' });
    const person = await signUpTestUser({ team: false });
    const invite = await ownerApi.teams({ teamId }).invites.post({
      email: person.email,
      role: 'member',
    });
    await authedApi(person.cookie).invites({ token: invite.data!.token }).accept.post();

    const data = (await dashboard(ownerApi, workspaceId)).data!;
    expect(data.summary).toMatchObject({ teams: 1, projects: 1, people: 2, openIssues: 2 });
    expect(data.issueFlow).toContainEqual({ stateType: 'started', issues: 1 });
    expect(data.issueFlow).toContainEqual({ stateType: 'completed', issues: 1 });
  });

  it('lists the most active projects and teams of the window', async () => {
    const { ownerApi, workspaceId, column } = await setup();
    await ownerApi.projects({ projectKey: 'MKT' }).issues.post({
      columnId: column('unstarted'),
      title: 'Launch',
    });

    const data = (await dashboard(ownerApi, workspaceId)).data!;
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toMatchObject({
      name: 'Marketing',
      ref: expect.stringContaining('MKT'),
    });
    expect(data.projects[0]!.events).toBeGreaterThan(0);
    expect(data.teams[0]!.projects).toBe(1);
  });

  it('adds up the time logged per day and per person', async () => {
    const { ownerApi, workspaceId, column } = await setup();
    const created = await ownerApi.projects({ projectKey: 'MKT' }).issues.post({
      columnId: column('started'),
      title: 'Write copy',
    });
    const worklogs = ownerApi.issues({ issueId: created.data!.id }).worklogs;
    await worklogs.post({ minutes: 30, spentOn: today() });
    await worklogs.post({ minutes: 45, spentOn: today() });

    const data = (await dashboard(ownerApi, workspaceId, { days: 7 })).data!;
    expect(data.timeLogged.perDay).toHaveLength(7);
    // Treaty revives the day into a Date, at midnight UTC.
    const last = data.timeLogged.perDay.at(-1)!;
    expect(new Date(last.day).toISOString().slice(0, 10)).toBe(today());
    expect(last.minutes).toBe(75);
    expect(data.timeLogged.people).toEqual([
      expect.objectContaining({ name: 'Root', minutes: 75 }),
    ]);
  });

  it('answers a workspace without teams with zeros and a day for every day', async () => {
    const { ownerApi } = await setup();
    setOwnedWorkspaceLimit(0);
    const created = await ownerApi.workspaces.post({ name: 'Empty' });

    const data = (await dashboard(ownerApi, created.data!.id, { days: 30 })).data!;
    expect(data.summary).toEqual({
      teams: 0,
      projects: 0,
      people: 0,
      agents: 0,
      openIssues: 0,
      storageBytes: 0,
    });
    expect(data.agentRuns.perDay).toHaveLength(30);
    expect(data.projects).toEqual([]);
  });

  it('is read by the workspace managers only, over a window of 1 to 365 days', async () => {
    const { ownerApi, workspaceId, teamId } = await setup();
    const person = await signUpTestUser({ team: false });
    const invite = await ownerApi.teams({ teamId }).invites.post({
      email: person.email,
      role: 'member',
    });
    await authedApi(person.cookie).invites({ token: invite.data!.token }).accept.post();

    expect((await dashboard(authedApi(person.cookie), workspaceId)).status).toBe(404);
    expect((await dashboard(ownerApi, workspaceId, { days: 365 })).status).toBe(200);
    expect((await dashboard(ownerApi, workspaceId, { days: 0 })).status).toBe(400);
    expect((await dashboard(ownerApi, workspaceId, { days: 366 })).status).toBe(400);
  });
});
