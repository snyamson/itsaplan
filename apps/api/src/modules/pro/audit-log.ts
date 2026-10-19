import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { db, team, teamMember, workspaceManager } from '@repo/db';
import { auditEvent } from '@repo/db/schema/pro';
import { iso } from '#shared/lib';

// Whose log is read: one workspace's, or the whole instance's for its owner.
export type AuditScope = { workspaceId: number } | 'instance';

export interface AuditFilter {
  search?: string;
  // Only the events of the last this many days; every event when unset.
  days?: number;
}

export interface AuditEventDto {
  id: number;
  createdAt: string;
  actor: { id: string | null; name: string; email: string };
  action: string;
  method: string | null;
  route: string | null;
  target: string | null;
  via: string;
  ip: string | null;
}

// The most a CSV export holds, newest first.
export const EXPORT_LIMIT = 10_000;

// A workspace's log holds what was done in it, and the sign-ins of the people in its
// teams and of its managers, since a sign-in belongs to no workspace of its own.
function scopeWhere(scope: AuditScope): SQL | undefined {
  if (scope === 'instance') return undefined;
  const members = db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .where(eq(team.workspaceId, scope.workspaceId));
  const managers = db
    .select({ userId: workspaceManager.userId })
    .from(workspaceManager)
    .where(eq(workspaceManager.workspaceId, scope.workspaceId));
  return or(
    eq(auditEvent.workspaceId, scope.workspaceId),
    and(
      eq(auditEvent.action, 'sign_in'),
      or(inArray(auditEvent.actorId, members), inArray(auditEvent.actorId, managers)),
    ),
  );
}

function filterWhere(scope: AuditScope, filter: AuditFilter): SQL | undefined {
  const conditions = [scopeWhere(scope)];
  if (filter.days) {
    conditions.push(gte(auditEvent.createdAt, sql`now() - make_interval(days => ${filter.days})`));
  }
  const search = filter.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(
        ilike(auditEvent.actorName, pattern),
        ilike(auditEvent.actorEmail, pattern),
        ilike(auditEvent.action, pattern),
        ilike(auditEvent.target, pattern),
        ilike(auditEvent.ip, pattern),
      ),
    );
  }
  return and(...conditions);
}

function toDto(row: typeof auditEvent.$inferSelect): AuditEventDto {
  return {
    id: row.id,
    createdAt: iso(row.createdAt),
    actor: { id: row.actorId, name: row.actorName, email: row.actorEmail },
    action: row.action,
    method: row.method,
    route: row.route,
    target: row.target,
    via: row.via,
    ip: row.ip,
  };
}

export async function listAuditEvents(
  scope: AuditScope,
  filter: AuditFilter,
  window: { limit: number; offset: number },
): Promise<{ items: AuditEventDto[]; total: number }> {
  const where = filterWhere(scope, filter);
  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(auditEvent)
      .where(where)
      .orderBy(desc(auditEvent.createdAt), desc(auditEvent.id))
      .limit(window.limit)
      .offset(window.offset),
    db.select({ total: count() }).from(auditEvent).where(where),
  ]);
  return { items: rows.map(toDto), total: totalRow?.total ?? 0 };
}

// A name is written by its owner, and a spreadsheet runs a cell that starts with one of
// these as a formula, so such a cell is kept as text.
function csvCell(value: string | null): string {
  const raw = value ?? '';
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportAuditEvents(scope: AuditScope, filter: AuditFilter): Promise<string> {
  const { items } = await listAuditEvents(scope, filter, { limit: EXPORT_LIMIT, offset: 0 });
  const header = ['time', 'name', 'email', 'action', 'where', 'via', 'ip'];
  const lines = items.map((event) =>
    [
      event.createdAt,
      event.actor.name,
      event.actor.email,
      event.action,
      event.target,
      event.via,
      event.ip,
    ]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...lines].join('\r\n') + '\r\n';
}
