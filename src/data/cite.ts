import { sources, type SourceKey, type Source } from './research';

/** Fixed display order for the numbered bibliography. */
export const orderedSourceKeys = Object.keys(sources) as SourceKey[];

export const orderedSources: (Source & { key: SourceKey; n: number })[] =
  orderedSourceKeys.map((key, i) => ({ ...sources[key], key, n: i + 1 }));

/** 1-based citation number for a source key. */
export function citeNumber(key: SourceKey): number {
  return orderedSourceKeys.indexOf(key) + 1;
}

/** DOM id for a source's bibliography entry (for jump-links). */
export function citeAnchor(key: SourceKey): string {
  return `src-${sources[key].id}`;
}
