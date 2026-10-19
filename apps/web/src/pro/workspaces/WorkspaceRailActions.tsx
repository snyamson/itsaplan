'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { workspaceRowClass, workspaceTileClass } from '@/components/layout/utils/workspaceTile';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import WorkspaceCreateModal from './WorkspaceCreateModal';
import { useWorkspaceCreationQuery } from './workspaces.service';

// Below the workspaces of a rail of tiles or of a list of rows: creates a workspace, for
// an account the instance lets create one.
export default function WorkspaceRailActions({ variant = 'tile' }: { variant?: 'tile' | 'row' }) {
  const t = useTranslations('teams.workspace');
  const { data: creation } = useWorkspaceCreationQuery();
  const [open, setOpen] = useState(false);

  if (!creation?.allowed) return null;

  return (
    <>
      {variant === 'row' ? (
        <Button
          variant="ghost"
          className={`${workspaceRowClass} text-muted-foreground`}
          onClick={() => setOpen(true)}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed"
          >
            <Plus className="size-3.5" />
          </span>
          {t('create')}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t('create')}
              className={workspaceTileClass(false)}
              onClick={() => setOpen(true)}
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('create')}</TooltipContent>
        </Tooltip>
      )}
      {open && <WorkspaceCreateModal onClose={() => setOpen(false)} />}
    </>
  );
}
