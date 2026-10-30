'use client';

import { useRef } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDocumentAssetsQuery, useUploadDocumentAsset } from '../services/documents.service';

export default function DocumentCoverDialog({
  open,
  projectKey,
  documentId,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  projectKey: string;
  documentId: number;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}) {
  const t = useTranslations('documents');
  const fileInput = useRef<HTMLInputElement>(null);
  const assets = useDocumentAssetsQuery(projectKey, documentId);
  const upload = useUploadDocumentAsset(projectKey, documentId);
  const images = (assets.data ?? []).filter((asset) => asset.contentType.startsWith('image/'));

  const choose = (url: string) => {
    onSelect(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>{t('coverTitle')}</DialogTitle>
          <DialogDescription>{t('coverDescription')}</DialogDescription>
        </DialogHeader>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept="image/*"
          aria-label={t('coverUpload')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = '';
            if (!file) return;
            void upload
              .mutateAsync(file)
              .then((asset) => choose(asset.url))
              .catch(() => undefined);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
          {t('coverUpload')}
        </Button>
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">{t('coverFromAssets')}</p>
          {images.length === 0 ? (
            <p className="rounded-md bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              {t('coverNoImages')}
            </p>
          ) : (
            <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
              {images.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className="block aspect-video w-full overflow-hidden rounded-md border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={asset.filename}
                    onClick={() => choose(asset.url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- private media uses the session-gated proxy. */}
                    <img src={asset.url} alt="" className="size-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
