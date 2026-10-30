import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  documentCover,
  documentStats,
  documentTags,
  normalizeDocumentTag,
  withDocumentCover,
  withDocumentTags,
} from './documentMetadata';

const COVER =
  '/protected-media/projects/QP/documents/1/assets/123e4567-e89b-12d3-a456-426614174000/raw';

describe('document metadata', () => {
  it('reads tags and ignores invalid values', () => {
    assert.deepEqual(documentTags({ tags: ['a', '', 3, 'b'] }), ['a', 'b']);
    assert.deepEqual(documentTags({ tags: 'a' }), []);
    assert.deepEqual(documentTags({ tags: ['A', 'a', ' b  c '] }), ['A', 'b c']);
    assert.equal(documentTags({ tags: Array.from({ length: 50 }, (_, i) => `t${i}`) }).length, 20);
    assert.deepEqual(documentTags({}), []);
  });

  it('reads the cover and clamps its position', () => {
    assert.deepEqual(documentCover({ cover: { url: `${COVER}/x`, position: 140 } }), {
      url: `${COVER}/x`,
      position: 100,
    });
    assert.deepEqual(documentCover({ cover: { url: `${COVER}/x` } }), {
      url: `${COVER}/x`,
      position: 50,
    });
    assert.equal(documentCover({ cover: { url: '' } }), null);
    assert.equal(documentCover({ cover: { url: '/api/projects/QP/archive' } }), null);
    assert.equal(documentCover({ cover: { url: 'https://example.com/x.png' } }), null);
    assert.equal(documentCover({ cover: { url: '//example.com/x.png' } }), null);
    assert.equal(documentCover({ cover: { url: 'javascript:alert(1)' } }), null);
    assert.equal(documentCover({ cover: 'x' }), null);
    assert.equal(documentCover({}), null);
  });

  it('keeps other metadata keys when tags or the cover change', () => {
    const cover = { url: COVER, position: 10 };
    const metadata = { source: 'import', tags: ['a'], cover };
    assert.deepEqual(withDocumentTags(metadata, ['a', 'b']), {
      source: 'import',
      tags: ['a', 'b'],
      cover,
    });
    assert.deepEqual(withDocumentTags(metadata, []), { source: 'import', cover });
    assert.deepEqual(withDocumentCover(metadata, null), { source: 'import', tags: ['a'] });
  });

  it('trims tags and collapses inner spaces', () => {
    assert.equal(normalizeDocumentTag('  hello   world '), 'hello world');
    assert.equal(normalizeDocumentTag('x'.repeat(100)).length, 40);
  });

  it('counts words, characters and reading time', () => {
    assert.deepEqual(documentStats(''), { words: 0, characters: 0, readingMinutes: 0 });
    assert.deepEqual(documentStats('One two  three'), {
      words: 3,
      characters: 11,
      readingMinutes: 1,
    });
    assert.equal(documentStats('word '.repeat(450)).readingMinutes, 3);
  });
});
