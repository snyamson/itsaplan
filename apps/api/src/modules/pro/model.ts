import { t } from 'elysia';
import { pageQueryFields, pageResponse } from '#shared/pagination';
import { EmailDomains } from '#modules/god/model';

export const WorkspaceCreationResponse = t.Object({
  allowed: t.Boolean(),
  reason: t.Union([t.Literal('restricted'), t.Literal('limit'), t.Null()]),
});

export const createWorkspaceBody = t.Object({ name: t.String({ minLength: 1, maxLength: 60 }) });

const auditFilterFields = {
  search: t.Optional(
    t.String({ maxLength: 200, description: 'Matches who, the action, where, and the address.' }),
  ),
  days: t.Optional(
    t.Numeric({ minimum: 1, maximum: 3650, description: 'Only the last this many days.' }),
  ),
};

export const auditLogQuery = t.Object({ ...pageQueryFields, ...auditFilterFields });

export const auditExportQuery = t.Object(auditFilterFields);

export const AuditEventResponse = t.Object({
  id: t.Number(),
  createdAt: t.String(),
  actor: t.Object({ id: t.Nullable(t.String()), name: t.String(), email: t.String() }),
  action: t.String({ description: "'sign_in', or the method and the route as declared." }),
  method: t.Nullable(t.String()),
  route: t.Nullable(t.String()),
  target: t.Nullable(t.String({ description: 'The project, team or workspace acted in.' })),
  via: t.String({ description: "'web', 'api_key' or 'mcp'." }),
  ip: t.Nullable(t.String()),
});

export const AuditLogResponse = pageResponse(AuditEventResponse);

export const dashboardQuery = t.Object({
  days: t.Optional(t.Numeric({ minimum: 1, maximum: 365, description: 'The window. Default 30.' })),
});

const perDay = <T extends Record<string, ReturnType<typeof t.Number>>>(fields: T) =>
  t.Array(t.Object({ day: t.String(), ...fields }));

export const WorkspaceDashboardResponse = t.Object({
  from: t.String(),
  to: t.String(),
  summary: t.Object({
    teams: t.Number(),
    projects: t.Number(),
    people: t.Number(),
    agents: t.Number(),
    openIssues: t.Number(),
    storageBytes: t.Number(),
  }),
  agentRuns: t.Object({
    perDay: perDay({ runs: t.Number(), failed: t.Number() }),
    agents: t.Array(t.Object({ agentId: t.Number(), name: t.String(), runs: t.Number() })),
  }),
  schedules: t.Array(
    t.Object({
      id: t.Number(),
      name: t.String(),
      agentName: t.String(),
      project: t.String(),
      status: t.String(),
      nextRunAt: t.Nullable(t.String()),
      lastRunAt: t.Nullable(t.String()),
    }),
  ),
  timeLogged: t.Object({
    perDay: perDay({ minutes: t.Number() }),
    people: t.Array(t.Object({ userId: t.String(), name: t.String(), minutes: t.Number() })),
  }),
  issueFlow: t.Array(
    t.Object({
      stateType: t.Union([
        t.Literal('backlog'),
        t.Literal('unstarted'),
        t.Literal('started'),
        t.Literal('completed'),
        t.Literal('canceled'),
      ]),
      issues: t.Number(),
    }),
  ),
  projects: t.Array(
    t.Object({
      projectId: t.Number(),
      ref: t.String(),
      name: t.String(),
      team: t.String(),
      events: t.Number(),
    }),
  ),
  teams: t.Array(
    t.Object({ teamId: t.Number(), name: t.String(), projects: t.Number(), events: t.Number() }),
  ),
});

export const emailDomainsBody = t.Object({ domains: EmailDomains });

export const EmailDomainsResponse = t.Object({ domains: t.Array(t.String()) });
