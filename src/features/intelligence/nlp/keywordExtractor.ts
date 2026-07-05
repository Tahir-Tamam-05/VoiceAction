// Keyword + keyphrase extraction.
//
// Hybrid strategy (evaluated against pure TF-IDF, pure RAKE, and TextRank):
//  - RAKE-style candidate generation: content-word runs between stopwords /
//    punctuation become phrase candidates (1–4 words). Zero-cost, and phrase
//    boundaries at stopwords match how people actually name concepts.
//  - RAKE word scoring (degree/frequency) blended with raw term frequency:
//    degree/freq alone over-rewards words that only appear inside long
//    phrases; blending with TF keeps genuinely frequent concepts on top.
//  - Positional boost: terms in the first ~15% of a note (or the first
//    sentence) are usually its subject.
//  - TextRank was rejected: the co-occurrence graph costs O(n·w) per note for
//    a quality gain that doesn't show on note-sized documents (<500 words).

import { RankedTerm } from '../types';
import { MAX_KEYWORDS, MAX_KEYPHRASES } from '../config';
import { isStopword } from './stopwords';
import { tokenizeRaw } from './tokenize';

const LATIN_START = /^[a-z0-9]/;

interface Extraction {
  keywords: RankedTerm[];
  keyphrases: RankedTerm[];
}

function isContentWord(token: string): boolean {
  if (isStopword(token)) return false;
  const min = LATIN_START.test(token) ? 3 : 2;
  if (token.length < min) return false;
  if (/^\d+$/.test(token)) return false; // bare numbers aren't concepts
  return true;
}

export function extractKeywords(text: string): Extraction {
  if (!text.trim()) return { keywords: [], keyphrases: [] };

  // Split into stopword-bounded segments per punctuation-delimited chunk
  const chunks = text.toLowerCase().split(/[.,;:!?()\[\]{}"“”\n।॥|/\\]+/);
  const phrases: string[][] = [];

  for (const chunk of chunks) {
    const tokens = tokenizeRaw(chunk);
    let current: string[] = [];
    for (const tok of tokens) {
      if (isContentWord(tok)) {
        current.push(tok);
        if (current.length === 4) { phrases.push(current); current = []; }
      } else if (current.length > 0) {
        phrases.push(current);
        current = [];
      }
    }
    if (current.length > 0) phrases.push(current);
  }

  if (phrases.length === 0) return { keywords: [], keyphrases: [] };

  // RAKE statistics: freq(w) and degree(w) = Σ (len(phrase containing w))
  const freq = new Map<string, number>();
  const degree = new Map<string, number>();
  for (const phrase of phrases) {
    for (const w of phrase) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
      degree.set(w, (degree.get(w) ?? 0) + phrase.length);
    }
  }

  // Positional boost — first occurrence early in the note
  const totalLen = text.length;
  const firstPos = new Map<string, number>();
  const lowered = text.toLowerCase();
  for (const w of freq.keys()) {
    firstPos.set(w, lowered.indexOf(w));
  }

  const wordScore = (w: string): number => {
    const f = freq.get(w) ?? 1;
    const d = degree.get(w) ?? 1;
    const rake = d / f;
    const tf = Math.sqrt(f); // dampened frequency
    const pos = firstPos.get(w)!;
    const posBoost = pos >= 0 && pos < totalLen * 0.15 ? 1.4 : 1;
    return (rake * 0.5 + tf) * posBoost;
  };

  // Keywords: ranked single words
  const keywords: RankedTerm[] = [...freq.keys()]
    .map((w) => ({ term: w, score: wordScore(w) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_KEYWORDS);

  // Keyphrases: ranked multi-word (and strong single-word) candidates
  const phraseScores = new Map<string, number>();
  for (const phrase of phrases) {
    const term = phrase.join(' ');
    const score = phrase.reduce((s, w) => s + wordScore(w), 0)
      * (phrase.length > 1 ? 1.25 : 0.9); // prefer genuine phrases
    phraseScores.set(term, Math.max(phraseScores.get(term) ?? 0, score)
      + (phraseScores.has(term) ? 0.5 : 0)); // repeat bonus
  }

  const keyphrases: RankedTerm[] = [...phraseScores.entries()]
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score)
    // drop phrases fully contained in a higher-ranked phrase
    .filter((p, i, arr) =>
      !arr.slice(0, i).some((higher) => higher.term.includes(p.term)))
    .slice(0, MAX_KEYPHRASES);

  return { keywords, keyphrases };
}
