'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import SectionPageView from '@/components/common/page/SectionPageView';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DashboardBlocks from './DashboardBlocks';
import DashboardSummary from './DashboardSummary';
import { useWorkspaceDashboardQuery } from './dashboard.service';

const WINDOWS = ['7', '30', '90'] as const;

// The dashboard of a workspace across all of its teams and projects, over a window.
export default function WorkspaceDashboardSection({ workspaceId }: { workspaceId: number }) {
  const t = useTranslations('sections.previews.dashboard');
  const tPeriods = useTranslations('pro.auditLog.periods');
  const tPro = useTranslations('pro.auditLog');
  const [days, setDays] = useState<(typeof WINDOWS)[number]>('30');
  const dashboard = useWorkspaceDashboardQuery(workspaceId, Number(days));

  return (
    <SectionPageView
      title={t('title')}
      description={t('description')}
      wide
      actions={
        <Select value={days} onValueChange={(value) => setDays(value as typeof days)}>
          <SelectTrigger className="h-9 w-44" aria-label={tPro('period')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((value) => (
              <SelectItem key={value} value={value}>
                {tPeriods(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {dashboard.data ? (
        <div className="flex flex-col gap-10">
          <DashboardSummary summary={dashboard.data.summary} />
          <DashboardBlocks data={dashboard.data} />
        </div>
      ) : (
        <ListSkeleton rows={6} rowClassName="h-16" />
      )}
    </SectionPageView>
  );
}
