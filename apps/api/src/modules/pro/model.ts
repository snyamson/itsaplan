import { t } from 'elysia';
import { pageQueryFields, pageResponse } from '#shared/pagination';

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
