'use client';

import { ImageIcon, Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function DocumentPageActions({
  hasCover,
  hasTags,
  onAddCover,
  onAddTag,
}: {
  hasCover: boolean;
  hasTags: boolean;
  onAddCover: () => void;
  onAddTag: () => void;
}) {
  const t = useTranslations('documents');
  if (hasCover && hasTags) return null;

  return (
    <div className="mb-2 flex h-8 items-center gap-1 opacity-0 transition-opacity group-hover/header:opacity-100 focus-within:opacity-100 print:hidden">
      {!hasCover && (
        <Button type="button" variant="ghost" size="sm" onClick={onAddCover}>
          <ImageIcon />
          {t('coverAdd')}
        </Button>
      )}
      {!hasTags && (
        <Button type="button" variant="ghost" size="sm" onClick={onAddTag}>
          <Tag />
          {t('tagAdd')}
        </Button>
      )}
    </div>
  );
}
