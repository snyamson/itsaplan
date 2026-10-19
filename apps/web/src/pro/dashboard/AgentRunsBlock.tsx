import { useTranslations } from 'next-intl';
import { formatShortDate } from '@/utils/dates';
import DashboardBars from './DashboardBars';
import DashboardBlock from './DashboardBlock';
import DashboardFigures from './DashboardFigures';
import DashboardList from './DashboardList';
import type { WorkspaceDashboard } from './dashboard.service';

// The runs of the workspace's agents: how many and how many failed, per day, and which
// agents ran most.
export default function AgentRunsBlock({
  agentRuns,
}: {
  agentRuns: WorkspaceDashboard['agentRuns'];
}) {
  const t = useTranslations('pro.dashboard');
  const tBlocks = useTranslations('sections.previews.dashboard.blocks');
  const number = new Intl.NumberFormat();
  const count = (value: number) => number.format(value);
  const runs = agentRuns.perDay.reduce((sum, day) => sum + day.runs, 0);
  const failed = agentRuns.perDay.reduce((sum, day) => sum + day.failed, 0);

  return (
    <DashboardBlock title={tBlocks('agents')} className="lg:col-span-7">
      <DashboardFigures
        figures={[
          { value: count(runs), label: t('runs') },
          { value: count(failed), label: t('failed') },
        ]}
      />
      <DashboardBars
        label={t('runs')}
        format={count}
        data={agentRuns.perDay.map((day) => ({
          label: formatShortDate(day.day),
          value: day.runs,
        }))}
      />
      <DashboardList
        empty={t('noRuns')}
        rows={agentRuns.agents.map((agent) => ({
          key: agent.agentId,
          title: agent.name,
          value: count(agent.runs),
        }))}
      />
    </DashboardBlock>
  );
}
