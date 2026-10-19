'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePaging } from '@/hooks/usePaging';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import ListPager from '@/components/common/ListPager';
import { EmptyState } from '@/components/common/page/EmptyState';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import { useAuditLogQuery, type AuditScope } from './audit-log.service';
import AuditLogTable from './AuditLogTable';
import AuditLogToolbar, { type Period } from './AuditLogToolbar';

// The audit log of a workspace or of the instance, newest first, a page at a time.
export default function AuditLog({ scope }: { scope: AuditScope }) {
  const t = useTranslations('pro.auditLog');
  const paging = usePaging(25);
  const { search, setSearch, term } = useSearchTerm();
  const [period, setPeriod] = useState<Period>('30');
  const filter = { search: term, days: period === 'all' ? undefined : Number(period) };
  const log = useAuditLogQuery(scope, paging.params, filter);

  return (
    <div className="space-y-4">
      <AuditLogToolbar
        scope={scope}
        filter={filter}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          paging.reset();
        }}
        period={period}
        onPeriodChange={(value) => {
          setPeriod(value);
          paging.reset();
        }}
      />
      {log.isPending ? (
        <ListSkeleton rows={8} rowClassName="h-11" />
      ) : !log.data?.items.length ? (
        <EmptyState
          title={t('emptyTitle')}
          description={term ? t('emptyFiltered') : t('emptyHint')}
        />
      ) : (
        <>
          <AuditLogTable events={log.data.items} />
          <ListPager paging={paging} total={log.data.total} />
        </>
      )}
    </div>
  );
}
