import { Elysia, ElysiaCustomStatusResponse } from 'elysia';
import type { SessionUser } from './auth-context';
import { errorAnswer } from './lib';

// A request handed to an extension of the api before its handler runs, after it is
// validated and before the session and the access guards are resolved.
export interface TrackedRequest {
  request: Request;
  // The matched route as declared, with its parameters unfilled: `/teams/:teamId`.
  route: string;
  params: Record<string, unknown>;
  // The parsed body of a route that reads one; undefined where the handler reads the raw
  // request.
  body: unknown;
}

// The answer of a tracked request: what its handler returned, or the status of the error
// that refused or failed it.
export interface TrackedAnswer {
  status: number;
  // The account the session or credential belongs to, null on a route that reads none or
  // where the request failed before it was read.
  user: SessionUser | null;
  // The handler's value; undefined when it returned a raw Response or failed.
  value: unknown;
  // What the route's guards resolved for it, each where it has one: the `project` of a
  // :projectKey route, the `projectId` of an entity, a team `membership`, a workspace
  // `standing`. None of them where the request failed first.
  context: Record<string, unknown>;
}

type FinishTracking = (answer: TrackedAnswer) => Promise<void>;

// Called for every request. It returns undefined for a request it does not follow, or
// the call that takes the request's answer, so it can read what the request is about to
// change while it is still there.
type RequestTracker = (request: TrackedRequest) => Promise<FinishTracking | undefined> | undefined;

let tracker: RequestTracker | undefined;

export function setRequestTracker(next?: RequestTracker): void {
  tracker = next;
}

const pending = new WeakMap<Request, FinishTracking>();

// The context of a hook, with what the guards of a route may have resolved on it.
interface Resolved {
  request: Request;
  responseValue?: unknown;
  set: { status?: unknown };
  code?: unknown;
  error?: unknown;
  user?: SessionUser | null;
  project?: unknown;
  projectId?: unknown;
  membership?: unknown;
  standing?: unknown;
}

// Elysia reads a request's body only for the routes whose handler or hooks name `body`,
// and a hook on every route that named it would read the body of each one, which leaves
// nothing for a route that reads the raw request: better-auth, the git webhooks. Read by
// a computed key, the body is what the route parsed for itself, or undefined.
const BODY = ['bo', 'dy'].join('');

function answerOf(value: unknown, status: unknown): Pick<TrackedAnswer, 'status' | 'value'> {
  if (value instanceof Response) return { status: value.status, value: undefined };
  if (value instanceof ElysiaCustomStatusResponse) {
    return { status: Number(value.code), value: value.response };
  }
  return { status: typeof status === 'number' ? status : 200, value };
}

async function finishTracking(
  request: Request,
  user: SessionUser | null | undefined,
  context: Record<string, unknown>,
  answer: Pick<TrackedAnswer, 'status' | 'value'>,
): Promise<void> {
  const finish = pending.get(request);
  if (!finish) return;
  pending.delete(request);
  try {
    await finish({ ...answer, user: user ?? null, context });
  } catch (error) {
    console.error('[request-tracker] with the answer:', error);
  }
}

// The answer is handed over before it is sent, so the request ends after the tracker is
// done with it. An error is handed over before the planner's onError turns it into the
// response, since this is registered first, and is left to it.
export const requestTracking = new Elysia({ name: 'request-tracking' })
  .onBeforeHandle({ as: 'global' }, async (ctx) => {
    if (!tracker) return;
    try {
      const { request, route } = ctx;
      const body = (ctx as Record<string, unknown>)[BODY];
      const finish = await tracker({ request, route, params: ctx.params ?? {}, body });
      if (finish) pending.set(request, finish);
    } catch (error) {
      console.error('[request-tracker] before the handler:', error);
    }
  })
  // Elysia reads the source of a hook to decide what a route parses, and a hook that
  // passes its whole context on reads as one that needs the body. So what the guards
  // resolved is destructured by name.
  .onAfterHandle(
    { as: 'global' },
    ({ request, responseValue, set, user, project, projectId, membership, standing }: Resolved) =>
      finishTracking(
        request,
        user,
        { project, projectId, membership, standing },
        answerOf(responseValue, set.status),
      ),
  )
  .onError(
    { as: 'global' },
    ({ request, code, error, user, project, projectId, membership, standing }: Resolved) =>
      finishTracking(
        request,
        user,
        { project, projectId, membership, standing },
        { status: errorAnswer(code, error).status, value: undefined },
      ),
  );
