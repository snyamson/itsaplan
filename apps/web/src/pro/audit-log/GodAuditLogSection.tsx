'use client';

import GodSectionPage from '@/features/god/components/GodSectionPage';
import AuditLog from './AuditLog';

export default function GodAuditLogSection() {
  return (
    <GodSectionPage slug="audit-log" widthClassName="max-w-none">
      <AuditLog scope="instance" />
    </GodSectionPage>
  );
}
