import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request } from '@/lib/api/core/client';

export type StateType = 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';

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
  issueFlow: { stateType: StateType; issues: number }[];
  projects: { projectId: number; ref: string; name: string; team: string; events: number }[];
  teams: { teamId: number; name: string; projects: number; events: number }[];
}

export function useWorkspaceDashboardQuery(workspaceId: number, days: number) {
  return useQuery({
    queryKey: ['workspace-dashboard', workspaceId, days],
    queryFn: () => request<WorkspaceDashboard>(`/workspaces/${workspaceId}/dashboard?days=${days}`),
    placeholderData: keepPreviousData,
  });
}
