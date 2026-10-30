export interface DocumentCover {
  url: string;
  position: number;
}

export interface DocumentStats {
  words: number;
  characters: number;
  readingMinutes: number;
}

export const MAX_DOCUMENT_TAGS = 20;
export const MAX_DOCUMENT_TAG_LENGTH = 40;
const WORDS_PER_MINUTE = 200;
const COVER_URL_PREFIX = '/protected-media/projects/';

type Metadata = Record<string, unknown>;

export function documentTags(metadata: Metadata): string[] {
  const value = metadata.tags;
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const tag = normalizeDocumentTag(item);
    if (tag && !unique.has(tag.toLowerCase())) unique.set(tag.toLowerCase(), tag);
  }
  return [...unique.values()].slice(0, MAX_DOCUMENT_TAGS);
}

export function documentCover(metadata: Metadata): DocumentCover | null {
  const value = metadata.cover;
  if (typeof value !== 'object' || value === null) return null;
  const { url, position } = value as Partial<DocumentCover>;
  if (typeof url !== 'string' || !url.startsWith(COVER_URL_PREFIX)) return null;
  return {
    url,
    position: typeof position === 'number' ? Math.min(100, Math.max(0, position)) : 50,
  };
}

export function normalizeDocumentTag(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_DOCUMENT_TAG_LENGTH);
}

export function withDocumentTags(metadata: Metadata, tags: string[]): Metadata {
  const { tags: _previous, ...rest } = metadata;
  return tags.length > 0 ? { ...rest, tags } : rest;
}

export function withDocumentCover(metadata: Metadata, cover: DocumentCover | null): Metadata {
  const { cover: _previous, ...rest } = metadata;
  return cover ? { ...rest, cover } : rest;
}

export function documentStats(text: string): DocumentStats {
  const characters = [...text.replace(/\s/g, '')].length;
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  let words = 0;
  for (const part of segmenter.segment(text)) if (part.isWordLike) words += 1;
  return {
    words,
    characters,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
  };
}
