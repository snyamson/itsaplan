import { Elysia, t } from 'elysia';
import { requireGod, requireUser } from '#shared/access';
import { authContext } from '#shared/auth-context';
import { guards } from '#shared/guards';
import { paginate } from '#shared/pagination';
import { errors } from '#shared/responses';
import { WorkspaceResponse, workspaceParams } from '#modules/workspaces/model';
import { createOwnWorkspace, getWorkspace, workspaceCreation } from '#modules/workspaces/service';
import { exportAuditEvents, listAuditEvents, type AuditScope } from './audit-log';
import { getWorkspaceDashboard } from './dashboard';
import {
  AuditLogResponse,
  WorkspaceCreationResponse,
  WorkspaceDashboardResponse,
  auditExportQuery,
  auditLogQuery,
  createWorkspaceBody,
  dashboardQuery,
} from './model';

function csv(body: string, name: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}

const exportName = (scope: AuditScope) =>
  `audit-log-${scope === 'instance' ? 'instance' : `workspace-${scope.workspaceId}`}-${new Date().toISOString().slice(0, 10)}.csv`;

// The routes of the Pro features: workspaces a person creates beside the one sign-up made
// them, up to the owned workspace limit that ./install.ts lifts; the dashboard of a
// workspace; and the audit log that ./audit.ts writes, read per workspace by its managers
// and for the instance by its owner.
export const proRoutes = new Elysia({ name: 'pro', detail: { tags: ['Workspaces'] } })
  .use(authContext)
  .use(guards)

  .get('/workspaces/creation', ({ user }) => workspaceCreation(requireUser(user)), {
    response: { 200: WorkspaceCreationResponse, ...errors(401) },
    detail: {
      summary: 'Check workspace creation',
      description:
        'Whether you may create a workspace, and if not, why: the instance keeps workspaces ' +
        'to its owner, or you own as many as one person may.',
    },
  })

  .post(
    '/workspaces',
    async ({ user, body, set }) => {
      const workspaceId = await createOwnWorkspace(requireUser(user), body.name);
      set.status = 201;
      return getWorkspace(workspaceId, 'owner');
    },
    {
      body: createWorkspaceBody,
      response: { 201: WorkspaceResponse, ...errors(400, 401, 403, 409) },
      detail: {
        summary: 'Create a workspace',
        description: 'Create a workspace you own. It starts with no teams.',
      },
    },
  )

  .get(
    '/workspaces/:workspaceId/dashboard',
    ({ standing, query }) => getWorkspaceDashboard(standing.workspaceId, query.days ?? 30),
    {
      workspaceManager: true,
      params: workspaceParams,
      query: dashboardQuery,
      response: { 200: WorkspaceDashboardResponse, ...errors(400, 401, 404) },
      detail: {
        summary: 'Get the dashboard of a workspace',
        description:
          'What the teams and projects of the workspace did over a window, with the counts ' +
          'that describe it now. Its owner and admins only.',
      },
    },
  )

  .get(
    '/workspaces/:workspaceId/audit-log',
    ({ standing, query }) =>
      paginate(query, (window) =>
        listAuditEvents({ workspaceId: standing.workspaceId }, query, window),
      ),
    {
      workspaceManager: true,
      params: workspaceParams,
      query: auditLogQuery,
      response: { 200: AuditLogResponse, ...errors(400, 401, 404) },
      detail: {
        tags: ['Audit log'],
        summary: 'List the audit log of a workspace',
        description:
          'Who changed what in the workspace, its teams and projects, newest first, and the ' +
          'sign-ins of its people. Its owner and admins only.',
      },
    },
  )

  .get(
    '/workspaces/:workspaceId/audit-log/export',
    async ({ standing, query }) => {
      const scope = { workspaceId: standing.workspaceId };
      return csv(await exportAuditEvents(scope, query), exportName(scope));
    },
    {
      workspaceManager: true,
      params: workspaceParams,
      query: auditExportQuery,
      response: { 200: t.String(), ...errors(400, 401, 404) },
      detail: {
        tags: ['Audit log'],
        summary: 'Export the audit log of a workspace',
        description: 'The filtered log as CSV, the newest 10,000 events.',
      },
    },
  )

  .get(
    '/god/audit-log',
    ({ user, query }) => {
      requireGod(user);
      return paginate(query, (window) => listAuditEvents('instance', query, window));
    },
    {
      query: auditLogQuery,
      response: { 200: AuditLogResponse, ...errors(400, 401, 403) },
      detail: {
        tags: ['Audit log'],
        summary: 'List the audit log of the instance',
        description: 'Every event of every workspace and of the instance. Its owner only.',
      },
    },
  )

  .get(
    '/god/audit-log/export',
    async ({ user, query }) => {
      requireGod(user);
      return csv(await exportAuditEvents('instance', query), exportName('instance'));
    },
    {
      query: auditExportQuery,
      response: { 200: t.String(), ...errors(400, 401, 403) },
      detail: {
        tags: ['Audit log'],
        summary: 'Export the audit log of the instance',
        description: 'The filtered log as CSV, the newest 10,000 events.',
      },
    },
  );
