'use client';

import { useTranslations } from 'next-intl';
import { useWorkspaceScimQuery } from '@/services/workspaces.service';
import SectionPageView from '@/components/common/page/SectionPageView';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import WorkspaceScimSettings from '@/features/teams/components/workspace/scim/WorkspaceScimSettings';

// Upstream removed its copy of this page; the fork's per-workspace SCIM section renders it.
export default function WorkspaceScimSection({ workspaceId }: { workspaceId: number }) {
  const t = useTranslations('teams.workspace.scim');
  const settings = useWorkspaceScimQuery(workspaceId).data;

  return (
    <SectionPageView title={t('title')} description={t('description')}>
      {settings ? (
        <WorkspaceScimSettings workspaceId={workspaceId} settings={settings} />
      ) : (
        <ListSkeleton rows={5} rowClassName="h-12" />
      )}
    </SectionPageView>
  );
}
