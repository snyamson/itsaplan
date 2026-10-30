'use client';

import type { WorkspaceSummary } from '@/lib/api/endpoints/workspaces';
import type { WorkspaceSection } from '@/features/teams/types/workspaceSection';
import WorkspaceScimSection from './scim/WorkspaceScimSection';
import coreSections from '../ce/useWorkspaceSections';
import WorkspaceAuditLogSection from './audit-log/WorkspaceAuditLogSection';
import WorkspaceDashboardSection from './dashboard/WorkspaceDashboardSection';
import WorkspaceEmailDomainsSection from './email-domains/WorkspaceEmailDomainsSection';

// The sections of ../ce, with the page of each Pro feature in place of its preview.
const PRO_PAGES: Record<string, WorkspaceSection['Component']> = {
  'audit-log': WorkspaceAuditLogSection,
  dashboard: WorkspaceDashboardSection,
  'email-domains': WorkspaceEmailDomainsSection,
  scim: WorkspaceScimSection,
};

export default function useWorkspaceSections(
  workspace: WorkspaceSummary,
  core: WorkspaceSection[],
): WorkspaceSection[] {
  return coreSections(workspace, core).map((section) =>
    PRO_PAGES[section.id] ? { ...section, Component: PRO_PAGES[section.id] } : section,
  );
}
