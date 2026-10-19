'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { emailDomainsValid, parseEmailDomains } from '@/utils/emailDomains';
import SectionPageView from '@/components/common/page/SectionPageView';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsRow from '@/components/common/page/SettingsRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSetEmailDomains } from './email-domains.service';

// The domains as one comma-separated field, the way god mode takes the instance's.
export default function WorkspaceEmailDomainsForm({
  workspaceId,
  saved,
}: {
  workspaceId: number;
  saved: string[];
}) {
  const t = useTranslations('sections.previews.emailDomains');
  const tPro = useTranslations('pro.emailDomains');
  const tCommon = useTranslations('common');
  const save = useSetEmailDomains(workspaceId);
  const [text, setText] = useState(saved.join(', '));

  const domains = parseEmailDomains(text);
  const valid = emailDomainsValid(domains);
  const dirty = domains.join() !== saved.join();

  function submit() {
    save.mutate(domains, {
      onSuccess: (result) => {
        setText(result.domains.join(', '));
        toast.success(tPro('saved'));
      },
    });
  }

  return (
    <SectionPageView
      title={t('title')}
      description={t('description')}
      actions={
        <Button disabled={!dirty || !valid || save.isPending} onClick={submit}>
          {save.isPending ? tCommon('saving') : tCommon('save')}
        </Button>
      }
    >
      <SettingsCard>
        <SettingsRow
          title={t('label')}
          description={t('hint')}
          note={valid ? undefined : tPro('invalid')}
          control={
            <Input
              className="w-40 shrink-0 sm:w-72"
              placeholder="example.com"
              aria-label={t('label')}
              aria-invalid={!valid}
              value={text}
              disabled={save.isPending}
              onChange={(e) => setText(e.target.value)}
            />
          }
        />
      </SettingsCard>
    </SectionPageView>
  );
}
