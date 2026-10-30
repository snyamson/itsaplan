'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MAX_DOCUMENT_TAGS,
  MAX_DOCUMENT_TAG_LENGTH,
  normalizeDocumentTag,
} from '../utils/documentMetadata';

export default function DocumentTags({
  tags,
  editable,
  adding,
  onAddingChange,
  onChange,
}: {
  tags: string[];
  editable: boolean;
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
  onChange: (update: (tags: string[]) => string[]) => void;
}) {
  const t = useTranslations('documents');
  const [draft, setDraft] = useState('');
  const cancelled = useRef(false);
  const showInput = editable && adding && tags.length < MAX_DOCUMENT_TAGS;

  useEffect(() => {
    if (showInput) cancelled.current = false;
  }, [showInput]);

  const commitDraft = () => {
    const tag = normalizeDocumentTag(draft);
    setDraft('');
    if (!tag) return;
    onChange((current) =>
      current.some((existing) => existing.toLowerCase() === tag.toLowerCase())
        ? current
        : [...current, tag],
    );
  };

  if (tags.length === 0 && !showInput) return null;

  return (
    <ul className="mt-3 flex flex-wrap items-center gap-1.5" aria-label={t('tagsLabel')}>
      {tags.map((tag) => (
        <li key={tag}>
          <Badge variant="secondary" className="gap-1" dir="auto">
            {tag}
            {editable && (
              <button
                type="button"
                className="-me-1 rounded-full p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none print:hidden"
                aria-label={t('tagRemove', { tag })}
                onClick={() =>
                  onChange((current) => current.filter((existing) => existing !== tag))
                }
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        </li>
      ))}
      {editable && !showInput && tags.length < MAX_DOCUMENT_TAGS && (
        <li className="print:hidden">
          <button
            type="button"
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={t('tagAdd')}
            onClick={() => onAddingChange(true)}
          >
            <Plus className="size-3.5" />
          </button>
        </li>
      )}
      {showInput && (
        <li>
          <Input
            autoFocus
            value={draft}
            maxLength={MAX_DOCUMENT_TAG_LENGTH}
            placeholder={t('tagPlaceholder')}
            aria-label={t('tagInputLabel')}
            className="h-6 w-32 px-2 text-xs"
            onChange={(event) => setDraft(event.target.value.replaceAll(',', ''))}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                commitDraft();
              } else if (event.key === 'Escape') {
                cancelled.current = true;
                setDraft('');
                onAddingChange(false);
              }
            }}
            onBlur={() => {
              if (!cancelled.current) commitDraft();
              onAddingChange(false);
            }}
          />
        </li>
      )}
    </ul>
  );
}
