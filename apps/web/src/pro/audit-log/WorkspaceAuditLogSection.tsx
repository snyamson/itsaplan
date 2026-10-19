'use client';

import { useTranslations } from 'next-intl';
import SectionPageView from '@/components/common/page/SectionPageView';
import AuditLog from './AuditLog';

export default function WorkspaceAuditLogSection({ workspaceId }: { workspaceId: number }) {
  const t = useTranslations('sections.previews.auditLog');

  return (
    <SectionPageView title={t('title')} description={t('description')} wide>
      <AuditLog scope={{ workspaceId }} />
    </SectionPageView>
  );
}
