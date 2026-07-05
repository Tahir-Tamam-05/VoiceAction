// Text normalization for analysis.
// The ORIGINAL user content is never modified — callers keep it verbatim and
// pass a normalized copy through the NLP pipeline.

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&#x27;': "'", '&apos;': "'", '&nbsp;': ' ',
};

const URL_RE = /https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+/gi;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

export interface NormalizedText {
  /** Cleaned text used for all downstream NLP */
  text: string;
  /** Emoji found in the input (kept as mood signals) */
  emojis: string[];
  /** URLs found in the input (stripped from analysis text) */
  urls: string[];
}

/** Decode common HTML entities without touching the DOM (worker-safe). */
export function decodeEntities(input: string): string {
  return input.replace(/&(?:amp|lt|gt|quot|#39|#x27|apos|nbsp);/g, (m) => HTML_ENTITIES[m] ?? m);
}

/**
 * Produce the analysis copy of a note:
 *  - Unicode NFC normalization
 *  - HTML entity decoding
 *  - URL extraction (analysis text shouldn't rank "https" as a keyword)
 *  - emoji extraction (kept separately for mood signals)
 *  - elongation collapse ("soooo" → "soo") for transcription noise
 *  - whitespace collapse
 */
export function normalizeForAnalysis(input: string): NormalizedText {
  if (!input) return { text: '', emojis: [], urls: [] };

  let text = decodeEntities(input.normalize('NFC'));

  const urls = text.match(URL_RE) ?? [];
  text = text.replace(URL_RE, ' ');

  const emojis = text.match(EMOJI_RE) ?? [];
  text = text.replace(EMOJI_RE, ' ');

  // Collapse 3+ repeated letters to 2 (transcription/typing elongations)
  text = text.replace(/([\p{L}])\1{2,}/gu, '$1$1');

  text = text.replace(/\s+/g, ' ').trim();

  return { text, emojis: [...emojis], urls: [...urls] };
}
