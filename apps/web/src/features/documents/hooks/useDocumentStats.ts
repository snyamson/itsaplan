import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { documentStats, type DocumentStats } from '../utils/documentMetadata';

const RECOUNT_DELAY_MS = 300;

export function useDocumentStats(editor: Editor | null, fallbackText: string): DocumentStats {
  const [stats, setStats] = useState(() => documentStats(fallbackText));

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      setStats(documentStats(fallbackText));
      return;
    }
    const recount = () => setStats(documentStats(editor.getText({ blockSeparator: '\n' })));
    recount();
    let timer: ReturnType<typeof setTimeout>;
    const scheduleRecount = () => {
      clearTimeout(timer);
      timer = setTimeout(recount, RECOUNT_DELAY_MS);
    };
    editor.on('update', scheduleRecount);
    return () => {
      clearTimeout(timer);
      editor.off('update', scheduleRecount);
    };
  }, [editor, fallbackText]);

  return stats;
}
