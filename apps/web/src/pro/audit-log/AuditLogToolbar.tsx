'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import SearchInput from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { downloadAuditLog, type AuditFilter, type AuditScope } from './audit-log.service';

export const PERIODS = ['1', '7', '30', '90', 'all'] as const;
export type Period = (typeof PERIODS)[number];

// The search, the period and the export above the log. The export takes the same filter
// as the table, so the file holds what the table shows.
export default function AuditLogToolbar({
  scope,
  filter,
  search,
  onSearchChange,
  period,
  onPeriodChange,
}: {
  scope: AuditScope;
  filter: AuditFilter;
  search: string;
  onSearchChange: (value: string) => void;
  period: Period;
  onPeriodChange: (value: Period) => void;
}) {
  const t = useTranslations('pro.auditLog');
  const [exporting, setExporting] = useState(false);

  async function exportLog() {
    setExporting(true);
    try {
      await downloadAuditLog(scope, filter);
    } catch {
      toast.error(t('exportFailed'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={t('searchPlaceholder')}
        className="min-w-64 flex-1"
      />
      <Select value={period} onValueChange={(value) => onPeriodChange(value as Period)}>
        <SelectTrigger className="h-9 w-52" aria-label={t('period')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`periods.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" className="h-9" disabled={exporting} onClick={exportLog}>
        <Download />
        {t('export')}
      </Button>
    </div>
  );
}
