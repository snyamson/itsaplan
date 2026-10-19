import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { setAuthSettings } from '@repo/auth';
import { setOwnedWorkspaceLimit } from '#shared/limits';
import { apiKeyApi, authedApi, createProject } from '#tests/helpers/app';
import { createAgent } from '#tests/helpers/agents';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';

// The instance owner, then a person who signed up after them with a workspace of their own.
async function setup() {
  const owner = await signUpTestUser({ name: 'Root' });
  const person = await signUpTestUser({ name: 'Ada', team: false });
  return { owner, ownerApi: authedApi(owner.cookie), personApi: authedApi(person.cookie) };
}

describe('pro workspaces', () => {
  beforeEach(resetDb);
  afterEach(() => setOwnedWorkspaceLimit());

  describe('with the limit lifted', () => {
    beforeEach(() => setOwnedWorkspaceLimit(0));

    it('lets a person create more workspaces, each owned by them', async () => {
      const { personApi } = await setup();

      expect((await personApi.workspaces.creation.get()).data).toEqual({
        allowed: true,
        reason: null,
      });
      const first = await personApi.workspaces.post({ name: 'Clients' });
      const second = await personApi.workspaces.post({ name: 'Side projects' });
      expect(first.status).toBe(201);
      expect(first.data).toMatchObject({ name: 'Clients', role: 'owner' });
      expect(second.status).toBe(201);

      const names = (await personApi.workspaces.get()).data!.map((w) => [w.name, w.role]);
      expect(names).toEqual(
        expect.arrayContaining([
          ['Clients', 'owner'],
          ['Side projects', 'owner'],
        ]),
      );
      expect(names).toHaveLength(3);
    });

    it('gives a new workspace no teams', async () => {
      const { personApi } = await setup();
      const created = await personApi.workspaces.post({ name: 'Empty' });
      const teams = (await personApi.teams.get()).data!;
      expect(teams.some((team) => team.workspaceId === created.data!.id)).toBe(false);
    });

    it('accepts a name of 60 characters and refuses an empty one or one of 61', async () => {
      const { personApi } = await setup();
      expect((await personApi.workspaces.post({ name: 'a'.repeat(60) })).status).toBe(201);
      expect((await personApi.workspaces.post({ name: '' })).status).toBe(400);
      expect((await personApi.workspaces.post({ name: 'a'.repeat(61) })).status).toBe(400);
    });

    it('leaves creation to the instance owner while personal workspaces are off', async () => {
      const { ownerApi, personApi } = await setup();
      await setAuthSettings({ personalWorkspaces: false });

      expect((await personApi.workspaces.creation.get()).data).toEqual({
        allowed: false,
        reason: 'restricted',
      });
      expect((await personApi.workspaces.post({ name: 'Acme' })).status).toBe(403);
      expect((await ownerApi.workspaces.post({ name: 'Acme' })).status).toBe(201);
    });

    it("refuses an agent's account", async () => {
      const { ownerApi } = await setup();
      await createProject(ownerApi, { key: 'MKT', name: 'Marketing' });
      const created = await createAgent(ownerApi, 'MKT', {
        name: 'Bot',
        username: 'bot',
        kind: 'external',
      });
      const agentApi = apiKeyApi(created.data!.apiKey!);

      expect((await agentApi.workspaces.creation.get()).data).toEqual({
        allowed: false,
        reason: 'restricted',
      });
      expect((await agentApi.workspaces.post({ name: 'Bots' })).status).toBe(403);
    });
  });

  it('keeps a person to one workspace under the core limit', async () => {
    const { personApi } = await setup();

    expect((await personApi.workspaces.creation.get()).data).toEqual({
      allowed: false,
      reason: 'limit',
    });
    expect((await personApi.workspaces.post({ name: 'Second' })).status).toBe(409);
  });
});
