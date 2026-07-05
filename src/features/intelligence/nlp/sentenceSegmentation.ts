// Sentence segmentation with abbreviation handling.
// Implemented as a scanner (no regex lookbehind) for maximum browser
// compatibility. Handles ".", "!", "?", Devanagari danda (।, ॥), and newlines.

// Bare "am"/"pm"/"no"/"us" are excluded — they end real sentences far more
// often than they abbreviate ("meet at 5 pm. Then…").
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'inc',
  'ltd', 'dept', 'approx', 'est', 'vol', 'eg', 'ie', 'e.g', 'i.e', 'a.m', 'p.m',
]);

const TERMINATORS = new Set(['.', '!', '?', '।', '॥']);

export function segmentSentences(text: string): string[] {
  if (!text.trim()) return [];

  const sentences: string[] = [];
  let start = 0;
  const push = (end: number) => {
    const s = text.slice(start, end).trim();
    if (s.length > 0) sentences.push(s);
    start = end;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '\n') {
      push(i + 1);
      continue;
    }

    if (!TERMINATORS.has(ch)) continue;

    if (ch === '.') {
      // Decimal number: 3.14
      if (/\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) continue;
      // Abbreviation: word before the period is a known abbreviation
      const before = text.slice(Math.max(0, i - 8), i).toLowerCase();
      const lastWord = before.split(/[^a-z.]+/).pop() ?? '';
      if (ABBREVIATIONS.has(lastWord.replace(/\.$/, ''))) continue;
      // Initials: "J. K. Rowling"
      if (/\b[a-z]$/i.test(text.slice(i - 2, i)) && text[i - 2] === ' ') continue;
    }

    // Consume any run of terminators/quotes after this one ("What?!", '..."')
    let end = i + 1;
    while (end < text.length && (TERMINATORS.has(text[end]) || text[end] === '"' || text[end] === '’' || text[end] === "'")) end++;
    push(end);
    i = end - 1;
  }

  push(text.length);
  return sentences;
}
