'use client';

import { useTranslations } from 'next-intl';
import { formatDateTime } from '@/utils/dates';
import { cn } from '@/lib/utils';
import type { AuditEvent } from './audit-log.service';

const ROW_GRID = 'grid min-w-[900px] grid-cols-[16%_20%_28%_18%_18%] border-b';

const COLUMNS = ['time', 'actor', 'action', 'where', 'from'] as const;

const VERBS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

function verb(event: AuditEvent): (typeof VERBS)[number] | 'other' | 'sign_in' {
  if (event.action === 'sign_in') return 'sign_in';
  return VERBS.find((method) => method === event.method) ?? 'other';
}

// One row per event: when, who, what they did (the kind of change and the route it went
// through), where, and from which address and by which way in.
export default function AuditLogTable({ events }: { events: AuditEvent[] }) {
  const t = useTranslations('pro.auditLog');
  const tColumns = useTranslations('sections.previews.auditLog.columns');

  return (
    <div className="overflow-x-auto" dir="ltr">
      <div className={cn(ROW_GRID, 'py-2 text-xs font-medium text-muted-foreground')}>
        {COLUMNS.map((column) => (
          <span key={column} className="px-3">
            {tColumns(column)}
          </span>
        ))}
      </div>
      {events.map((event) => (
        <div key={event.id} className={cn(ROW_GRID, 'py-2.5 text-sm')}>
          <span className="px-3 text-muted-foreground tabular-nums">
            {formatDateTime(event.createdAt)}
          </span>
          <div className="flex min-w-0 flex-col px-3">
            <span className="truncate" dir="auto">
              {event.actor.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">{event.actor.email}</span>
          </div>
          <div className="flex min-w-0 flex-col px-3">
            <span>{t(`verbs.${verb(event)}`)}</span>
            {event.route && (
              <span className="truncate font-mono text-xs text-muted-foreground">
                {event.route}
              </span>
            )}
          </div>
          <span className="truncate px-3" dir="auto">
            {event.target ?? (event.route?.startsWith('/god/') ? t('instance') : '—')}
          </span>
          <div className="flex min-w-0 flex-col px-3">
            <span className="truncate tabular-nums">{event.ip ?? '—'}</span>
            <span className="text-xs text-muted-foreground">{t(`via.${event.via}`)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
