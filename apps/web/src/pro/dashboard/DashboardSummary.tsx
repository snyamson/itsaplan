import { useTranslations } from 'next-intl';
import { formatSize } from '@/utils/fileSize';
import type { WorkspaceDashboard } from './dashboard.service';

const COUNTS = ['teams', 'projects', 'people', 'agents'] as const;

// What the workspace holds now: its teams, projects, people and agents, then the issues
// still open and the space its attachments take.
export default function DashboardSummary({ summary }: { summary: WorkspaceDashboard['summary'] }) {
  const t = useTranslations('sections.previews.dashboard.summary');
  const number = new Intl.NumberFormat();

  return (
    <div className="flex flex-wrap gap-y-4 rounded-xl bg-muted/50 py-4">
      <div className="grid min-w-0 flex-[4_1_440px] grid-cols-4 gap-4 px-6">
        {COUNTS.map((key) => (
          <div key={key} className="min-w-0">
            <p className="text-2xl font-semibold tabular-nums">{number.format(summary[key])}</p>
            <p className="truncate text-sm text-muted-foreground">{t(key)}</p>
          </div>
        ))}
      </div>
      <div className="grid min-w-0 flex-[2_1_240px] grid-cols-2 gap-4 border-s border-border/60 px-6">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">{number.format(summary.openIssues)}</p>
          <p className="truncate text-sm text-muted-foreground">{t('openIssues')}</p>
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">{formatSize(summary.storageBytes)}</p>
          <p className="truncate text-sm text-muted-foreground">{t('storage')}</p>
        </div>
      </div>
    </div>
  );
}
