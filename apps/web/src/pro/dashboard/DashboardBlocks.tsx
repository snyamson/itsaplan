import { useTranslations } from 'next-intl';
import { formatShortDate } from '@/utils/dates';
import { formatMinutes } from '@/utils/estimate';
import { projectPath } from '@/utils/paths';
import AgentRunsBlock from './AgentRunsBlock';
import DashboardBars from './DashboardBars';
import DashboardBlock from './DashboardBlock';
import DashboardFigures from './DashboardFigures';
import DashboardList from './DashboardList';
import type { WorkspaceDashboard } from './dashboard.service';

// The six blocks of the dashboard on a 12-column grid: agent runs and time logged by day
// beside the schedules and the issue flow, then the most active projects and teams.
export default function DashboardBlocks({ data }: { data: WorkspaceDashboard }) {
  const t = useTranslations('pro.dashboard');
  const tBlocks = useTranslations('sections.previews.dashboard.blocks');
  const tStates = useTranslations('display.stateTypes');
  const number = new Intl.NumberFormat();
  const count = (value: number) => number.format(value);

  const minutes = data.timeLogged.perDay.reduce((sum, day) => sum + day.minutes, 0);

  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
      <AgentRunsBlock agentRuns={data.agentRuns} />

      <DashboardBlock title={tBlocks('schedules')} className="lg:col-span-5">
        <DashboardList
          empty={t('noSchedules')}
          rows={data.schedules.map((schedule) => ({
            key: schedule.id,
            title: schedule.name,
            detail: `${schedule.agentName} · ${schedule.project}`,
            value:
              schedule.status === 'paused'
                ? t('paused')
                : schedule.nextRunAt
                  ? formatShortDate(schedule.nextRunAt)
                  : '—',
          }))}
        />
      </DashboardBlock>

      <DashboardBlock title={tBlocks('time')} className="lg:col-span-7">
        <DashboardFigures figures={[{ value: formatMinutes(minutes), label: t('logged') }]} />
        <DashboardBars
          label={t('logged')}
          format={formatMinutes}
          data={data.timeLogged.perDay.map((day) => ({
            label: formatShortDate(day.day),
            value: day.minutes,
          }))}
        />
        <DashboardList
          empty={t('noTime')}
          rows={data.timeLogged.people.map((person) => ({
            key: person.userId,
            title: person.name,
            value: formatMinutes(person.minutes),
          }))}
        />
      </DashboardBlock>

      <DashboardBlock title={tBlocks('flow')} className="lg:col-span-5">
        <DashboardBars
          label={t('issues')}
          format={count}
          data={data.issueFlow.map((state) => ({
            label: tStates(state.stateType),
            value: state.issues,
          }))}
        />
      </DashboardBlock>

      <DashboardBlock title={tBlocks('projects')} className="lg:col-span-7">
        <DashboardList
          empty={t('noActivity')}
          rows={data.projects.map((row) => ({
            key: row.projectId,
            title: row.name,
            detail: row.team,
            value: t('events', { count: row.events }),
            href: projectPath(row.ref),
          }))}
        />
      </DashboardBlock>

      <DashboardBlock title={tBlocks('teams')} className="lg:col-span-5">
        <DashboardList
          empty={t('noActivity')}
          rows={data.teams.map((row) => ({
            key: row.teamId,
            title: row.name,
            detail: t('projectCount', { count: row.projects }),
            value: t('events', { count: row.events }),
          }))}
        />
      </DashboardBlock>
    </div>
  );
}
