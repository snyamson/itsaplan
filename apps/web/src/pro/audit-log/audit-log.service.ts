import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { API_URL, apiFailure, request } from '@/lib/api/core/client';
import { pageQuery, type Page, type PageParams } from '@/lib/api/core/paging';

export interface AuditEvent {
  id: number;
  createdAt: string;
  actor: { id: string | null; name: string; email: string };
  action: string;
  method: string | null;
  route: string | null;
  target: string | null;
  via: 'web' | 'api_key' | 'mcp';
  ip: string | null;
}

// One workspace's log, or the whole instance's in god mode.
export type AuditScope = { workspaceId: number } | 'instance';

export interface AuditFilter {
  search?: string;
  days?: number;
}

const basePath = (scope: AuditScope) =>
  scope === 'instance' ? '/god/audit-log' : `/workspaces/${scope.workspaceId}/audit-log`;

const filterParams = (filter: AuditFilter) => ({
  search: filter.search,
  days: filter.days ? String(filter.days) : undefined,
});

export function useAuditLogQuery(scope: AuditScope, params: PageParams, filter: AuditFilter) {
  const path = basePath(scope);
  return useQuery({
    queryKey: ['audit-log', path, params, filter],
    queryFn: () => request<Page<AuditEvent>>(`${path}?${pageQuery(params, filterParams(filter))}`),
    placeholderData: keepPreviousData,
  });
}

// Saves the filtered log as the CSV file the api names.
export async function downloadAuditLog(scope: AuditScope, filter: AuditFilter): Promise<void> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filterParams(filter))) {
    if (value) query.set(key, value);
  }
  const res = await fetch(`${API_URL}${basePath(scope)}/export?${query}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) throw await apiFailure(res);
  const name =
    res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'audit-log.csv';
  const url = URL.createObjectURL(await res.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  try {
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
