// Local title generation.
//
// Strategy, in order of preference:
//  1. The first meaningful sentence, cleaned of leading transcription fillers,
//     when it is concise enough to BE a title.
//  2. The lead clause of the first sentence (cut at a natural boundary).
//  3. The top keyphrase, title-cased, with the note's leading verb when the
//     note is an action ("Buy groceries for the week").
// Titles are ≤ TITLE_MAX_CHARS, truncated at word boundaries, never empty.

import { TITLE_MAX_CHARS } from '../config';
import { RankedTerm } from '../types';
import { tokenize } from './tokenize';

const LEADING_FILLER = /^(so|okay so|ok so|okay|ok|well|um+|uh+|hmm+|basically|actually|anyway|i think|i guess|note to self[,:]?|reminder[,:]?)[,\s]+/i;

function clean(sentence: string): string {
  let s = sentence.trim();
  // Strip fillers repeatedly ("okay so um basically ...")
  for (let i = 0; i < 4; i++) {
    const next = s.replace(LEADING_FILLER, '');
    if (next === s) break;
    s = next;
  }
  // Strip trailing terminator punctuation
  s = s.replace(/[.!?।॥\s]+$/u, '').trim();
  return s;
}

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut.slice(0, max)).trim();
}

function sentenceCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function titleCase(s: string): string {
  return s.split(' ').map((w) =>
    w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w
  ).join(' ');
}

export function generateTitle(
  sentences: string[],
  keyphrases: RankedTerm[],
  fallback = 'Quick note'
): string {
  const first = sentences.length > 0 ? clean(sentences[0]) : '';
  const contentWords = tokenize(first);

  // 1. First sentence is already title-shaped
  if (first.length >= 12 && first.length <= TITLE_MAX_CHARS && contentWords.length >= 2) {
    return sentenceCase(first);
  }

  // 2. Lead clause of a longer first sentence — cut at comma / dash / "because"
  if (first.length > TITLE_MAX_CHARS) {
    const clause = first.split(/,|—|–| - | because | but | which | so that /i)[0].trim();
    if (clause.length >= 12 && tokenize(clause).length >= 2) {
      return sentenceCase(truncateAtWord(clause, TITLE_MAX_CHARS));
    }
    return sentenceCase(truncateAtWord(first, TITLE_MAX_CHARS));
  }

  // 3. Keyphrase-derived title
  const phrase = keyphrases.find((p) => p.term.split(' ').length >= 2) ?? keyphrases[0];
  if (phrase) {
    return truncateAtWord(titleCase(phrase.term), TITLE_MAX_CHARS);
  }

  // 4. Short first sentence with at least one real word
  if (first.length >= 3) return sentenceCase(truncateAtWord(first, TITLE_MAX_CHARS));

  return fallback;
}
