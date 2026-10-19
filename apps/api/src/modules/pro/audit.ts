import { eq } from 'drizzle-orm';
import type { AuthExtensions } from '@repo/auth/extensions';
import { db, team, user, workspace } from '@repo/db';
import { auditEvent } from '@repo/db/schema/pro';
import { pgErrorCode } from '#shared/lib';
import { isMcpRequest } from '#shared/mcp-request';
import type { TrackedAnswer, TrackedRequest } from '#shared/request-tracker';
import { getProjectById, type ProjectRow } from '#modules/projects/service';

// Requests a person does not make: an agent runner polling and reporting, a chat being
// streamed, and the MCP endpoint itself, whose tool calls reach the routes they forward
// to as requests of their own. Reading notifications changes nothing anyone audits.
const UNAUDITED = [
  /^\/mcp$/,
  /^\/agent-runs\//,
  /^\/agent-chats\//,
  /^\/notifications/,
  /^\/settings\/whats-new\/seen$/,
];

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface Scope {
  workspaceId: number | null;
  target: string | null;
}

type AuditInsert = typeof auditEvent.$inferInsert;

// The workspace a request acts in and what it names, read from the request's own
// guards where it has them, and from its path otherwise. A team or workspace is looked
// up before the handler runs, while a delete has not removed it yet.
async function scopeBefore(params: Record<string, unknown>): Promise<Scope | null> {
  if (params.teamId !== undefined) {
    const [row] = await db
      .select({ workspaceId: team.workspaceId, name: team.name })
      .from(team)
      .where(eq(team.id, Number(params.teamId)));
    return row ? { workspaceId: row.workspaceId, target: row.name } : null;
  }
  if (params.workspaceId !== undefined) {
    const [row] = await db
      .select({ id: workspace.id, name: workspace.name })
      .from(workspace)
      .where(eq(workspace.id, Number(params.workspaceId)));
    return row ? { workspaceId: row.id, target: row.name } : null;
  }
  return null;
}

async function projectScope(project: ProjectRow): Promise<Scope> {
  const [row] = await db
    .select({ workspaceId: team.workspaceId })
    .from(team)
    .where(eq(team.id, project.teamId));
  return { workspaceId: row?.workspaceId ?? null, target: project.ref };
}

async function scopeAfter(
  before: Scope | null,
  { context, value }: TrackedAnswer,
  route: string,
): Promise<Scope> {
  if (before) return before;
  const project = context.project as ProjectRow | undefined;
  if (project) return projectScope(project);
  if (typeof context.projectId === 'number') {
    const found = await getProjectById(context.projectId);
    if (found) return projectScope(found);
  }
  // A create that names its workspace in what it returns.
  const created = value as { id?: number; workspaceId?: number; name?: string } | undefined;
  if (route === '/teams' && created?.workspaceId) {
    return { workspaceId: created.workspaceId, target: created.name ?? null };
  }
  if (route === '/workspaces' && created?.id) {
    return { workspaceId: created.id, target: created.name ?? null };
  }
  return { workspaceId: null, target: null };
}

function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || null;
}

function via(headers: Headers): string {
  if (isMcpRequest(headers)) return 'mcp';
  return headers.get('x-api-key') ? 'api_key' : 'web';
}

// A workspace deleted by the request it records is gone by the time the event is
// written, so its event is kept for the instance instead.
async function insertEvent(event: AuditInsert): Promise<void> {
  try {
    await db.insert(auditEvent).values(event);
  } catch (error) {
    if (event.workspaceId == null || pgErrorCode(error) !== '23503') throw error;
    await db.insert(auditEvent).values({ ...event, workspaceId: null });
  }
}

// Every write a person made that went through, with who made it, where and how.
export async function trackAuditedRequest({ request, route, params }: TrackedRequest) {
  if (!WRITES.has(request.method) || UNAUDITED.some((pattern) => pattern.test(route))) {
    return undefined;
  }
  const before = await scopeBefore(params);
  return async (answer: TrackedAnswer) => {
    if (!answer.user || answer.status >= 400) return;
    const { workspaceId, target } = await scopeAfter(before, answer, route);
    await insertEvent({
      workspaceId,
      actorId: answer.user.id,
      actorName: answer.user.name,
      actorEmail: answer.user.email,
      action: `${request.method} ${route}`,
      method: request.method,
      route,
      target,
      via: via(request.headers),
      ip: clientIp(request.headers),
    });
  };
}

// A new session is a sign-in, whichever way the person signed in.
export async function recordSignIn(session: {
  userId: string;
  ipAddress?: string | null;
}): Promise<void> {
  const [actor] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, session.userId));
  if (!actor) return;
  await insertEvent({
    workspaceId: null,
    actorId: session.userId,
    actorName: actor.name,
    actorEmail: actor.email,
    action: 'sign_in',
    via: 'web',
    ip: session.ipAddress || null,
  });
}

export const signInAudit: AuthExtensions['plugins'][number] = {
  id: 'pro-audit-sign-in',
  init: () => ({
    options: {
      databaseHooks: {
        session: {
          create: {
            after: async (session: { userId: string; ipAddress?: string | null }) => {
              try {
                await recordSignIn(session);
              } catch (error) {
                console.error('[audit] could not record a sign-in:', error);
              }
            },
          },
        },
      },
    },
  }),
};
