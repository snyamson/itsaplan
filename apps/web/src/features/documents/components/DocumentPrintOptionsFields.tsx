'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  DocumentPrintMargin,
  DocumentPrintOptions,
  DocumentPrintPageSize,
} from '../utils/documentPrint';

const pageSizes: DocumentPrintPageSize[] = ['a4', 'letter'];
const margins: DocumentPrintMargin[] = ['narrow', 'normal', 'wide'];
const toggles = ['includeTitle', 'tableOfContents', 'pageNumbers'] as const;

export default function DocumentPrintOptionsFields({
  value,
  disabled,
  onChange,
}: {
  value: DocumentPrintOptions;
  disabled: boolean;
  onChange: (value: DocumentPrintOptions) => void;
}) {
  const t = useTranslations('documents');

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="pdf-page-size">{t('pdfPageSize')}</Label>
          <Select
            value={value.pageSize}
            disabled={disabled}
            onValueChange={(pageSize) =>
              onChange({ ...value, pageSize: pageSize as DocumentPrintPageSize })
            }
          >
            <SelectTrigger id="pdf-page-size" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {t(`pdfPageSizes.${size}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="pdf-margin">{t('pdfMargins')}</Label>
          <Select
            value={value.margin}
            disabled={disabled}
            onValueChange={(margin) =>
              onChange({ ...value, margin: margin as DocumentPrintMargin })
            }
          >
            <SelectTrigger id="pdf-margin" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {margins.map((margin) => (
                <SelectItem key={margin} value={margin}>
                  {t(`pdfMarginOptions.${margin}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {toggles.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <Checkbox
            id={`pdf-${key}`}
            checked={value[key]}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...value, [key]: checked === true })}
          />
          <Label htmlFor={`pdf-${key}`} className="font-normal">
            {t(`pdfOptions.${key}`)}
          </Label>
        </div>
      ))}
    </div>
  );
}
