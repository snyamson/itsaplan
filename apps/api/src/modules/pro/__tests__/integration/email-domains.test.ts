import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { setAuthSettings } from '@repo/auth';
import { authedApi, ownWorkspaceId } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { setInviteEmailPolicy } from '#modules/invites/email-policy';
import { inviteEmailAllowed, registrationEmailPolicy, scimEmailAllowed } from '../../email-domains';

type Client = ReturnType<typeof authedApi>;

async function setup() {
  const owner = await signUpTestUser({ name: 'Root' });
  const ownerApi = authedApi(owner.cookie);
  const workspaceId = await ownWorkspaceId(ownerApi);
  const [team] = (await ownerApi.teams.get()).data!;
  return { ownerApi, workspaceId, teamId: team!.id };
}

function domains(client: Client, workspaceId: number) {
  return client.workspaces({ workspaceId })['email-domains'];
}

describe('workspace email domains', () => {
  beforeEach(resetDb);
  afterEach(() => setInviteEmailPolicy());

  it('are set and read by the workspace owner', async () => {
    const { ownerApi, workspaceId } = await setup();
    expect((await domains(ownerApi, workspaceId).get()).data).toEqual({ domains: [] });

    const set = await domains(ownerApi, workspaceId).put({ domains: ['b.test', 'a.test'] });
    expect(set.data).toEqual({ domains: ['a.test', 'b.test'] });
    await domains(ownerApi, workspaceId).put({ domains: ['a.test'] });
    expect((await domains(ownerApi, workspaceId).get()).data).toEqual({ domains: ['a.test'] });
  });

  it('refuses a malformed domain, a repeated one, and anyone but the owner', async () => {
    const { ownerApi, workspaceId, teamId } = await setup();
    expect((await domains(ownerApi, workspaceId).put({ domains: ['not a domain'] })).status).toBe(
      400,
    );
    expect(
      (await domains(ownerApi, workspaceId).put({ domains: ['a.test', 'a.test'] })).status,
    ).toBe(400);

    const admin = await signUpTestUser({ team: false });
    const invite = await ownerApi.teams({ teamId }).invites.post({
      email: admin.email,
      role: 'member',
    });
    await authedApi(admin.cookie).invites({ token: invite.data!.token }).accept.post();
    await ownerApi.workspaces({ workspaceId }).managers.post({ userId: admin.userId });
    expect((await domains(authedApi(admin.cookie), workspaceId).get()).status).toBe(403);
  });

  it('keep the invites of the workspace to addresses at its domains', async () => {
    const { ownerApi, workspaceId, teamId } = await setup();
    setInviteEmailPolicy(inviteEmailAllowed);
    const invites = ownerApi.teams({ teamId }).invites;

    expect((await invites.post({ email: 'anyone@else.test', role: 'member' })).status).toBe(201);
    await domains(ownerApi, workspaceId).put({ domains: ['acme.test'] });
    const refused = await invites.post({ email: 'someone@else.test', role: 'member' });
    expect(refused.status).toBe(400);
    expect((await invites.post({ email: 'ada@ACME.test', role: 'member' })).status).toBe(201);
  });

  it("keep a workspace's SCIM to its domains, and leave the instance's alone", async () => {
    const { ownerApi, workspaceId } = await setup();
    expect(await scimEmailAllowed(workspaceId, 'x@any.test')).toBe(true);
    await domains(ownerApi, workspaceId).put({ domains: ['acme.test'] });
    expect(await scimEmailAllowed(workspaceId, 'x@any.test')).toBe(false);
    expect(await scimEmailAllowed(workspaceId, 'x@acme.test')).toBe(true);
    expect(await scimEmailAllowed(null, 'x@any.test')).toBe(true);
  });

  it('let an address invited at a workspace domain register past the instance domains', async () => {
    const { ownerApi, workspaceId, teamId } = await setup();
    await setAuthSettings({ allowedEmailDomains: ['corp.test'] });
    await domains(ownerApi, workspaceId).put({ domains: ['client.test'] });

    expect(await registrationEmailPolicy('me@corp.test')).toBe(true);
    expect(await registrationEmailPolicy('guest@client.test')).toBe(false);
    setInviteEmailPolicy(inviteEmailAllowed);
    await ownerApi.teams({ teamId }).invites.post({ email: 'guest@client.test', role: 'member' });
    expect(await registrationEmailPolicy('guest@client.test')).toBe(true);
    expect(await registrationEmailPolicy('other@client.test')).toBe(false);
  });
});
