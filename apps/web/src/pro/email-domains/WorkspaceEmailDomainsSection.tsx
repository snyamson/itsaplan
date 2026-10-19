'use client';

import { useTranslations } from 'next-intl';
import SectionPageView from '@/components/common/page/SectionPageView';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { useEmailDomainsQuery } from './email-domains.service';
import WorkspaceEmailDomainsForm from './WorkspaceEmailDomainsForm';

// The form mounts once the saved domains have loaded, so it starts from them.
export default function WorkspaceEmailDomainsSection({ workspaceId }: { workspaceId: number }) {
  const t = useTranslations('sections.previews.emailDomains');
  const saved = useEmailDomainsQuery(workspaceId).data;

  if (!saved) {
    return (
      <SectionPageView title={t('title')} description={t('description')}>
        <ListSkeleton rows={1} rowClassName="h-16" />
      </SectionPageView>
    );
  }
  return <WorkspaceEmailDomainsForm workspaceId={workspaceId} saved={saved.domains} />;
}
