// Unicode-aware tokenizer used across the intelligence pipeline.

import { isStopword } from './stopwords';

// \p{M} (combining marks) must be part of tokens — Devanagari/Kannada matras
// and viramas are marks, and without them Hindi words shatter mid-character.
const TOKEN_RE = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’\-]*/gu;
const LATIN_RE = /^[a-z0-9]/;

/** Raw word tokens, lowercased, punctuation stripped. */
export function tokenizeRaw(text: string): string[] {
  if (!text) return [];
  return (text.toLowerCase().match(TOKEN_RE) ?? []).map((t) =>
    t.replace(/^['’\-]+|['’\-]+$/g, '')
  ).filter(Boolean);
}

/**
 * Content tokens: stopwords removed, short Latin fragments dropped.
 * Non-Latin scripts keep 2-char tokens (many Hindi/Kannada words are short).
 */
export function tokenize(text: string): string[] {
  return tokenizeRaw(text).filter((t) => {
    if (isStopword(t)) return false;
    const min = LATIN_RE.test(t) ? 3 : 2;
    return t.length >= min;
  });
}
