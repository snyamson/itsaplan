export type DocumentPrintPageSize = 'a4' | 'letter';
export type DocumentPrintMargin = 'narrow' | 'normal' | 'wide';

export interface DocumentPrintOptions {
  pageSize: DocumentPrintPageSize;
  margin: DocumentPrintMargin;
  includeTitle: boolean;
  tableOfContents: boolean;
  pageNumbers: boolean;
}

export const defaultDocumentPrintOptions: DocumentPrintOptions = {
  pageSize: 'a4',
  margin: 'normal',
  includeTitle: true,
  tableOfContents: false,
  pageNumbers: true,
};

const PAGE_SIZES: Record<DocumentPrintPageSize, string> = { a4: 'A4', letter: 'letter' };
const MARGINS_MM: Record<DocumentPrintMargin, number> = { narrow: 12, normal: 20, wide: 28 };
const TOC_HEADINGS = 'h1, h2, h3';
// Safari fires print() without waiting and may skip afterprint on the frame.
const PRINT_CLEANUP_MS = 10 * 60_000;

export function documentPrintStyles(options: DocumentPrintOptions): string {
  const margin = MARGINS_MM[options.margin];
  const pageNumbers = options.pageNumbers
    ? '@page{@bottom-center{content:counter(page);font:11px system-ui,sans-serif;color:#737373}}'
    : '';
  return `@page{size:${PAGE_SIZES[options.pageSize]};margin:${margin}mm}${pageNumbers}
body{max-width:none;margin:0;padding:0;font-size:12pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3,h4,h5,h6{break-after:avoid-page}
pre,blockquote,tr,img,figure{break-inside:avoid-page}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10pt}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #d4d4d4;padding:6px 10px;text-align:start;vertical-align:top}
thead{display:table-header-group}
ul[data-type=taskList]{list-style:none;padding-inline-start:0}
ul[data-type=taskList] li{display:flex;gap:8px}
.print-icon{margin-inline-end:.3em}
.print-toc{break-after:page}
.print-toc ol{margin:0;padding:0;list-style:none}
.print-toc a{color:inherit;text-decoration:none}
.print-toc li[data-level="2"]{padding-inline-start:1.2em}
.print-toc li[data-level="3"]{padding-inline-start:2.4em}
.hljs-comment,.hljs-quote{color:#6a737d}
.hljs-keyword,.hljs-doctag,.hljs-type,.hljs-selector-tag{color:#d73a49}
.hljs-title,.hljs-section,.hljs-selector-id{color:#6f42c1}
.hljs-attr,.hljs-attribute,.hljs-number,.hljs-literal,.hljs-variable,.hljs-meta{color:#005cc5}
.hljs-string,.hljs-regexp,.hljs-symbol{color:#032f62}
.hljs-built-in,.hljs-bullet{color:#e36209}
.hljs-name,.hljs-addition{color:#22863a}
.hljs-deletion{color:#b31d28}`;
}

export function preparePrintDocument(
  doc: Document,
  options: DocumentPrintOptions,
  { icon, tocLabel }: { icon?: string | null; tocLabel: string },
): void {
  const style = doc.createElement('style');
  style.textContent = documentPrintStyles(options);
  doc.head.append(style);

  const titleHeading = doc.body.querySelector('h1[data-document-title]');
  if (titleHeading && !options.includeTitle) titleHeading.remove();
  else if (titleHeading && icon) {
    const mark = doc.createElement('span');
    mark.className = 'print-icon';
    mark.textContent = icon;
    titleHeading.prepend(mark);
  }

  if (!options.tableOfContents) return;
  const headings = [...doc.body.querySelectorAll<HTMLElement>(TOC_HEADINGS)].filter(
    (heading) => heading !== titleHeading && heading.textContent?.trim(),
  );
  if (headings.length === 0) return;

  const list = doc.createElement('ol');
  headings.forEach((heading, index) => {
    heading.id ||= `print-heading-${index}`;
    const item = doc.createElement('li');
    item.dataset.level = heading.tagName.slice(1);
    const link = doc.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    item.append(link);
    list.append(item);
  });
  const toc = doc.createElement('nav');
  toc.className = 'print-toc';
  const label = doc.createElement('h2');
  label.textContent = tocLabel;
  toc.append(label, list);
  if (titleHeading?.isConnected) titleHeading.after(toc);
  else doc.body.prepend(toc);
}

export async function printDocumentHtml(
  html: string,
  options: DocumentPrintOptions,
  labels: { icon?: string | null; tocLabel: string },
): Promise<void> {
  const frame = window.document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.style.cssText = 'position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0';
  window.document.body.append(frame);
  try {
    await new Promise<void>((resolve) => {
      frame.addEventListener('load', () => resolve(), { once: true });
      frame.srcdoc = html;
    });
    const doc = frame.contentDocument;
    const view = frame.contentWindow;
    if (!doc || !view) throw new Error('The print frame has no document.');
    preparePrintDocument(doc, options, labels);
    await Promise.all([...doc.images].map((image) => image.decode().catch(() => undefined)));
    view.addEventListener('afterprint', () => frame.remove(), { once: true });
    window.setTimeout(() => frame.remove(), PRINT_CLEANUP_MS);
    view.focus();
    view.print();
  } catch (error) {
    frame.remove();
    throw error;
  }
}
