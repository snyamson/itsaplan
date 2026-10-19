import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  ne,
  sql,
  type AnyColumn,
} from 'drizzle-orm';
import {
  agentRun,
  agentSchedule,
  aiAgent,
  db,
  issue,
  issueActivity,
  issueWorklog,
  project,
  projectColumn,
  team,
  teamMember,
  user,
  workspaceStoredBytes,
} from '@repo/db';
import { iso } from '#shared/lib';
import { projectRef } from '#modules/teams/ref';

export const STATE_TYPES = ['backlog', 'unstarted', 'started', 'completed', 'canceled'] as const;
const OPEN_STATES = ['backlog', 'unstarted', 'started'];

// How many rows each list of the dashboard holds.
const TOP = 5;
const TOP_PEOPLE = 3;

export interface WorkspaceDashboard {
  from: string;
  to: string;
  summary: {
    teams: number;
    projects: number;
    people: number;
    agents: number;
    openIssues: number;
    storageBytes: number;
  };
  agentRuns: {
    perDay: { day: string; runs: number; failed: number }[];
    agents: { agentId: number; name: string; runs: number }[];
  };
  schedules: {
    id: number;
    name: string;
    agentName: string;
    project: string;
    status: string;
    nextRunAt: string | null;
    lastRunAt: string | null;
  }[];
  timeLogged: {
    perDay: { day: string; minutes: number }[];
    people: { userId: string; name: string; minutes: number }[];
  };
  issueFlow: { stateType: (typeof STATE_TYPES)[number]; issues: number }[];
  projects: { projectId: number; ref: string; name: string; team: string; events: number }[];
  teams: { teamId: number; name: string; projects: number; events: number }[];
}

type RunDay = WorkspaceDashboard['agentRuns']['perDay'][number];
type TimeDay = WorkspaceDashboard['timeLogged']['perDay'][number];

// Every day of the window, oldest first, as 'YYYY-MM-DD' in UTC.
function daysOf(from: Date, to: Date): string[] {
  const days: string[] = [];
  for (const day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function fill<T extends { day: string }>(days: string[], rows: T[], empty: Omit<T, 'day'>): T[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  return days.map((day) => byDay.get(day) ?? ({ day, ...empty } as T));
}

const dayOf = (column: AnyColumn) =>
  sql<string>`to_char(date_trunc('day', ${column} at time zone 'UTC'), 'YYYY-MM-DD')`;

// What the workspace's teams and projects did over the last `days` days, with the counts
// that describe it now. Archived projects are left out of the counts and the lists.
export async function getWorkspaceDashboard(
  workspaceId: number,
  days: number,
): Promise<WorkspaceDashboard> {
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const window = daysOf(from, to);

  const teams = await db
    .select({ id: team.id, name: team.name, slug: team.slug })
    .from(team)
    .where(eq(team.workspaceId, workspaceId));
  const teamIds = teams.map((row) => row.id);
  const projects = teamIds.length
    ? await db
        .select({ id: project.id, teamId: project.teamId, key: project.key, name: project.name })
        .from(project)
        .where(and(inArray(project.teamId, teamIds), isNull(project.archivedAt)))
    : [];
  const projectIds = projects.map((row) => row.id);

  const empty: WorkspaceDashboard = {
    from: iso(from),
    to: iso(to),
    summary: {
      teams: teams.length,
      projects: projects.length,
      people: 0,
      agents: 0,
      openIssues: 0,
      storageBytes: await workspaceStoredBytes(workspaceId),
    },
    agentRuns: { perDay: fill<RunDay>(window, [], { runs: 0, failed: 0 }), agents: [] },
    schedules: [],
    timeLogged: { perDay: fill<TimeDay>(window, [], { minutes: 0 }), people: [] },
    issueFlow: STATE_TYPES.map((stateType) => ({ stateType, issues: 0 })),
    projects: [],
    teams: [],
  };
  if (teamIds.length === 0) return empty;

  const [[people], [agents]] = await Promise.all([
    db
      .select({ n: countDistinct(teamMember.userId) })
      .from(teamMember)
      .where(and(inArray(teamMember.teamId, teamIds), ne(teamMember.role, 'agent'))),
    db.select({ n: count() }).from(aiAgent).where(inArray(aiAgent.teamId, teamIds)),
  ]);
  empty.summary.people = people?.n ?? 0;
  empty.summary.agents = agents?.n ?? 0;
  if (projectIds.length === 0) return empty;

  const liveIssue = and(inArray(issue.projectId, projectIds), isNull(issue.archivedAt));
  const runDay = dayOf(agentRun.createdAt);
  const activityDay = gte(issueActivity.createdAt, from);

  const [flowRows, runRows, runAgents, schedules, timeRows, timePeople, projectEvents] =
    await Promise.all([
      db
        .select({ stateType: projectColumn.stateType, issues: count() })
        .from(issue)
        .innerJoin(projectColumn, eq(projectColumn.id, issue.columnId))
        .where(liveIssue)
        .groupBy(projectColumn.stateType),
      db
        .select({
          day: runDay,
          runs: count(),
          failed: sql<number>`count(*) filter (where ${agentRun.status} = 'failed')::int`,
        })
        .from(agentRun)
        .where(and(inArray(agentRun.projectId, projectIds), gte(agentRun.createdAt, from)))
        .groupBy(runDay),
      db
        .select({ agentId: agentRun.agentId, name: user.name, runs: count() })
        .from(agentRun)
        .innerJoin(aiAgent, eq(aiAgent.id, agentRun.agentId))
        .innerJoin(user, eq(user.id, aiAgent.userId))
        .where(and(inArray(agentRun.projectId, projectIds), gte(agentRun.createdAt, from)))
        .groupBy(agentRun.agentId, user.name)
        .orderBy(desc(count()))
        .limit(TOP_PEOPLE),
      db
        .select({
          id: agentSchedule.id,
          name: agentSchedule.name,
          agentName: user.name,
          projectId: agentSchedule.projectId,
          status: agentSchedule.status,
          nextRunAt: agentSchedule.nextRunAt,
          lastRunAt: agentSchedule.lastRunAt,
        })
        .from(agentSchedule)
        .innerJoin(aiAgent, eq(aiAgent.id, agentSchedule.agentId))
        .innerJoin(user, eq(user.id, aiAgent.userId))
        .where(inArray(agentSchedule.projectId, projectIds))
        .orderBy(sql`${agentSchedule.nextRunAt} asc nulls last`, desc(agentSchedule.lastRunAt))
        .limit(TOP),
      db
        .select({
          day: issueWorklog.spentOn,
          minutes: sql<number>`sum(${issueWorklog.minutes})::int`,
        })
        .from(issueWorklog)
        .innerJoin(issue, eq(issue.id, issueWorklog.issueId))
        .where(and(inArray(issue.projectId, projectIds), gte(issueWorklog.spentOn, window[0]!)))
        .groupBy(issueWorklog.spentOn),
      db
        .select({
          userId: issueWorklog.userId,
          name: user.name,
          minutes: sql<number>`sum(${issueWorklog.minutes})::int`,
        })
        .from(issueWorklog)
        .innerJoin(issue, eq(issue.id, issueWorklog.issueId))
        .innerJoin(user, eq(user.id, issueWorklog.userId))
        .where(and(inArray(issue.projectId, projectIds), gte(issueWorklog.spentOn, window[0]!)))
        .groupBy(issueWorklog.userId, user.name)
        .orderBy(desc(sql`sum(${issueWorklog.minutes})`))
        .limit(TOP_PEOPLE),
      db
        .select({ projectId: issue.projectId, events: count() })
        .from(issueActivity)
        .innerJoin(issue, eq(issue.id, issueActivity.issueId))
        .where(and(inArray(issue.projectId, projectIds), activityDay))
        .groupBy(issue.projectId),
    ]);

  const projectById = new Map(projects.map((row) => [row.id, row]));
  const teamById = new Map(teams.map((row) => [row.id, row]));
  const ref = (row: (typeof projects)[number]) => {
    const owner = teamById.get(row.teamId)!;
    return projectRef({ id: owner.id, slug: owner.slug }, row.key);
  };

  const flow = new Map(flowRows.map((row) => [row.stateType, row.issues]));
  const eventsByTeam = new Map<number, number>();
  for (const row of projectEvents) {
    const teamId = projectById.get(row.projectId)!.teamId;
    eventsByTeam.set(teamId, (eventsByTeam.get(teamId) ?? 0) + row.events);
  }
  const projectsByTeam = new Map<number, number>();
  for (const row of projects)
    projectsByTeam.set(row.teamId, (projectsByTeam.get(row.teamId) ?? 0) + 1);

  return {
    ...empty,
    summary: {
      ...empty.summary,
      openIssues: OPEN_STATES.reduce((sum, state) => sum + (flow.get(state) ?? 0), 0),
    },
    agentRuns: { perDay: fill<RunDay>(window, runRows, { runs: 0, failed: 0 }), agents: runAgents },
    schedules: schedules.map((row) => ({
      id: row.id,
      name: row.name,
      agentName: row.agentName,
      project: ref(projectById.get(row.projectId)!),
      status: row.status,
      nextRunAt: row.nextRunAt ? iso(row.nextRunAt) : null,
      lastRunAt: row.lastRunAt ? iso(row.lastRunAt) : null,
    })),
    timeLogged: { perDay: fill<TimeDay>(window, timeRows, { minutes: 0 }), people: timePeople },
    issueFlow: STATE_TYPES.map((stateType) => ({ stateType, issues: flow.get(stateType) ?? 0 })),
    projects: projectEvents
      .sort((a, b) => b.events - a.events)
      .slice(0, TOP)
      .map((row) => {
        const found = projectById.get(row.projectId)!;
        return {
          projectId: found.id,
          ref: ref(found),
          name: found.name,
          team: teamById.get(found.teamId)!.name,
          events: row.events,
        };
      }),
    teams: [...eventsByTeam]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP)
      .map(([teamId, events]) => ({
        teamId,
        name: teamById.get(teamId)!.name,
        projects: projectsByTeam.get(teamId) ?? 0,
        events,
      })),
  };
}
