'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { workspacePath } from '@/utils/paths';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import { useCreateWorkspace } from './workspaces.service';

// Creates a workspace the current user owns and opens its settings, where its teams are
// added.
export default function WorkspaceCreateModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('pro.workspaces');
  const router = useRouter();
  const createWorkspace = useCreateWorkspace();
  const [name, setName] = useState('');

  const canSubmit = !createWorkspace.isPending && name.trim() !== '';

  function submit() {
    if (!canSubmit) return;
    createWorkspace.mutate(name.trim(), {
      onSuccess: (workspace) => {
        onClose();
        router.push(workspacePath(workspace.id));
      },
    });
  }

  return (
    <Modal title={t('title')} onClose={onClose} className="pb-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Building2 className="size-5" />
          </div>
          <input
            dir={name ? 'auto' : undefined}
            className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
            placeholder={t('namePlaceholder')}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
            }}
            autoFocus
          />
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{t('hint')}</p>

        <div className="mt-4 flex items-center border-t pt-3">
          <Button className="ms-auto" disabled={!canSubmit} onClick={submit}>
            {t('submit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
