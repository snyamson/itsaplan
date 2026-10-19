import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/api/core/client';

const key = (workspaceId: number) => ['workspace-email-domains', workspaceId] as const;

export function useEmailDomainsQuery(workspaceId: number) {
  return useQuery({
    queryKey: key(workspaceId),
    queryFn: () => request<{ domains: string[] }>(`/workspaces/${workspaceId}/email-domains`),
  });
}

export function useSetEmailDomains(workspaceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (domains: string[]) =>
      request<{ domains: string[] }>(`/workspaces/${workspaceId}/email-domains`, {
        method: 'PUT',
        body: JSON.stringify({ domains }),
      }),
    onSuccess: (saved) => qc.setQueryData(key(workspaceId), saved),
  });
}
