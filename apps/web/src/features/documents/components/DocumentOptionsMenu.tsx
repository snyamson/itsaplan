'use client';

import { useCallback, useState } from 'react';
import {
  Archive,
  Check,
  Clipboard,
  Copy,
  Download,
  Expand,
  History,
  ImageIcon,
  ImageOff,
  LockKeyhole,
  MoreHorizontal,
  PanelTop,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectDocument } from '@/lib/api/endpoints/documents';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { documentCover } from '../utils/documentMetadata';
import DocumentExportDialog from './DocumentExportDialog';

export default function DocumentOptionsMenu({
  document,
  title,
  content,
  richHtml,
  stickyToolbar,
  canCreate,
  canUpdate,
  canManage,
  canManageLifecycle,
  canDelete,
  busy,
  onFullWidthChange,
  onCoverPick,
  onCoverRemove,
  onStickyToolbarChange,
  onPrivacyChange,
  onCreateChild,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
  onOpenHistory,
}: {
  document: ProjectDocument;
  title: string;
  content: () => string;
  richHtml: () => string;
  stickyToolbar: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canManage: boolean;
  canManageLifecycle: boolean;
  canDelete: boolean;
  busy: boolean;
  onFullWidthChange: (value: boolean) => void;
  onCoverPick: () => void;
  onCoverRemove: () => void;
  onStickyToolbarChange: (value: boolean) => void;
  onPrivacyChange: (value: boolean) => void;
  onCreateChild: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onOpenHistory: () => void;
}) {
  const t = useTranslations('documents');
  const [exportOpen, setExportOpen] = useState(false);
  const archived = document.archivedAt !== null;
  const hasCover = documentCover(document.metadata) !== null;

  const copyMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content());
    } catch {
      const input = window.document.createElement('textarea');
      input.value = content();
      input.style.position = 'fixed';
      input.style.opacity = '0';
      try {
        window.document.body.append(input);
        input.select();
        if (!window.document.execCommand('copy')) return;
      } catch {
        return;
      } finally {
        input.remove();
      }
    }
    toast.success(t('markdownCopied'));
  }, [content, t]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('documentActions')}
            aria-busy={busy}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {canUpdate && (
            <DropdownMenuItem
              disabled={busy}
              onSelect={(event) => {
                event.preventDefault();
                onFullWidthChange(!document.fullWidth);
              }}
            >
              <Expand />
              <span className="flex-1">{t('fullWidth')}</span>
              {document.fullWidth && <Check className="text-primary" aria-hidden />}
            </DropdownMenuItem>
          )}
          {canUpdate && (
            <DropdownMenuItem disabled={busy} onSelect={onCoverPick}>
              <ImageIcon />
              {t(hasCover ? 'coverChange' : 'coverAdd')}
            </DropdownMenuItem>
          )}
          {canUpdate && hasCover && (
            <DropdownMenuItem disabled={busy} onSelect={onCoverRemove}>
              <ImageOff />
              {t('coverRemove')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onStickyToolbarChange(!stickyToolbar);
            }}
          >
            <PanelTop />
            <span className="flex-1">{t('stickyToolbar')}</span>
            {stickyToolbar && <Check className="text-primary" aria-hidden />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void copyMarkdown()}>
            <Clipboard />
            {t('copyMarkdown')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenHistory}>
            <History />
            {t('versionHistory')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setExportOpen(true)}>
            <Download />
            {t('export')}
          </DropdownMenuItem>

          {canCreate && (
            <>
              <DropdownMenuSeparator />
              {!archived && (
                <DropdownMenuItem onSelect={onCreateChild}>
                  <Plus />
                  {t('addSubpage')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={busy} onSelect={onDuplicate}>
                <Copy />
                {t('makeCopy')}
              </DropdownMenuItem>
            </>
          )}

          {(canManage || canManageLifecycle || canDelete) && <DropdownMenuSeparator />}
          {canManage && !archived && (
            <DropdownMenuItem
              disabled={busy}
              onSelect={(event) => {
                event.preventDefault();
                onPrivacyChange(!document.isPrivate);
              }}
            >
              <LockKeyhole />
              <span className="flex-1">{t('privatePage')}</span>
              {document.isPrivate && <Check className="text-primary" aria-hidden />}
            </DropdownMenuItem>
          )}
          {canManageLifecycle && !archived && (
            <DropdownMenuItem disabled={busy || document.isLocked} onSelect={onArchive}>
              <Archive />
              {t('archive')}
            </DropdownMenuItem>
          )}
          {canManageLifecycle && archived && (
            <DropdownMenuItem disabled={busy} onSelect={onRestore}>
              <RotateCcw />
              {t('restore')}
            </DropdownMenuItem>
          )}
          {canDelete && archived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={busy} onSelect={onDelete}>
                <Trash2 />
                {t('deletePermanently')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DocumentExportDialog
        open={exportOpen}
        documentId={document.id}
        title={title}
        icon={document.icon}
        content={content}
        richHtml={richHtml}
        onOpenChange={setExportOpen}
      />
    </>
  );
}
