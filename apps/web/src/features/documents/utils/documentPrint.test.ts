import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import {
  defaultDocumentPrintOptions,
  documentPrintStyles,
  preparePrintDocument,
} from './documentPrint';

const page = `<!doctype html><html><head></head><body><h1 data-document-title>Guide</h1><h2>Intro</h2><p>a</p><h3>Detail</h3><h4>Skipped</h4><h2>Next</h2></body></html>`;

function prepare(options: Partial<typeof defaultDocumentPrintOptions>, icon?: string) {
  const { document } = new JSDOM(page).window;
  preparePrintDocument(
    document as unknown as Document,
    { ...defaultDocumentPrintOptions, ...options },
    { icon, tocLabel: 'Contents' },
  );
  return document;
}

describe('document print', () => {
  it('sets page size, margins and page numbers in the page rule', () => {
    const css = documentPrintStyles({
      ...defaultDocumentPrintOptions,
      pageSize: 'letter',
      margin: 'wide',
    });
    assert.match(css, /@page\{size:letter;margin:28mm\}/);
    assert.match(css, /counter\(page\)/);
    assert.doesNotMatch(
      documentPrintStyles({ ...defaultDocumentPrintOptions, pageNumbers: false }),
      /counter\(page\)/,
    );
  });

  it('removes the title when it is not included', () => {
    assert.equal(prepare({ includeTitle: false }).querySelector('h1'), null);
    assert.equal(prepare({ includeTitle: true }).querySelector('h1')?.textContent, 'Guide');
  });

  it('puts the icon in front of the title', () => {
    assert.equal(prepare({}, '📘').querySelector('h1')?.textContent, '📘Guide');
  });

  it('builds a table of contents from h1 to h3 headings after the title', () => {
    const document = prepare({ tableOfContents: true });
    const links = [...document.querySelectorAll('.print-toc a')];
    assert.deepEqual(
      links.map((link) => link.textContent),
      ['Intro', 'Detail', 'Next'],
    );
    for (const link of links) {
      assert.ok(document.getElementById(link.getAttribute('href')!.slice(1)));
    }
    assert.equal(document.querySelector('h1')?.nextElementSibling?.className, 'print-toc');
  });

  it('keeps a content heading when the page has no title', () => {
    const { document } = new JSDOM(
      '<html><head></head><body><h1>Own heading</h1><p>a</p></body></html>',
    ).window;
    preparePrintDocument(
      document as unknown as Document,
      { ...defaultDocumentPrintOptions, includeTitle: false },
      { tocLabel: 'Contents' },
    );
    assert.equal(document.querySelector('h1')?.textContent, 'Own heading');
  });

  it('adds no table of contents when it is off', () => {
    assert.equal(prepare({ tableOfContents: false }).querySelector('.print-toc'), null);
  });
});
