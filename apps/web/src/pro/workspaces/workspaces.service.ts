import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/api/core/client';
import type { Workspace } from '@/lib/api/endpoints/workspaces';
import { qk } from '@/services/queryKeys';

export interface WorkspaceCreation {
  allowed: boolean;
  reason: 'restricted' | 'limit' | null;
}

// Under qk.workspaces, so whatever refreshes the workspace list asks this again too.
const creationKey = [...qk.workspaces, 'creation'] as const;

export function useWorkspaceCreationQuery() {
  return useQuery({
    queryKey: creationKey,
    queryFn: () => request<WorkspaceCreation>('/workspaces/creation'),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.workspaces }),
  });
}
