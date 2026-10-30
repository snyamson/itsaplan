'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Move, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { DocumentCover as Cover } from '../utils/documentMetadata';

export default function DocumentCover({
  cover,
  editable,
  onChange,
  onRemove,
  onReplace,
}: {
  cover: Cover;
  editable: boolean;
  onChange: (cover: Cover) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const t = useTranslations('documents');
  const [repositioning, setRepositioning] = useState(false);
  const [position, setPosition] = useState(cover.position);
  const committed = useRef(cover.position);

  useEffect(() => {
    setPosition(cover.position);
    committed.current = cover.position;
  }, [cover.position]);

  const commit = () => {
    if (position === committed.current) return;
    committed.current = position;
    onChange({ ...cover, position });
  };

  return (
    <div className="group/cover relative mb-6 h-40 overflow-hidden rounded-xl bg-muted md:h-56">
      {/* eslint-disable-next-line @next/next/no-img-element -- private media uses the session-gated proxy. */}
      <img
        src={cover.url}
        alt=""
        className="size-full object-cover"
        style={{ objectPosition: `50% ${position}%` }}
      />
      {editable && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-focus-within/cover:opacity-100 group-hover/cover:opacity-100 print:hidden">
          {repositioning && (
            <input
              type="range"
              min={0}
              max={100}
              value={position}
              aria-label={t('coverPosition')}
              className="w-40 accent-primary"
              onChange={(event) => setPosition(Number(event.target.value))}
              onPointerUp={commit}
              onPointerCancel={commit}
              onKeyUp={commit}
              onBlur={commit}
            />
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              if (repositioning) commit();
              setRepositioning((value) => !value);
            }}
          >
            <Move />
            {t('coverReposition')}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onReplace}>
            <ImageIcon />
            {t('coverChange')}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label={t('coverRemove')}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}
