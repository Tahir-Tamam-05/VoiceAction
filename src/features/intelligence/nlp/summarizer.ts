// Extractive summarization — sentence ranking, never generation.
// A summary is always sentences the user actually wrote; nothing is invented.

import { SUMMARY_MAX_CHARS } from '../config';
import { RankedTerm } from '../types';
import { tokenize } from './tokenize';

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

interface ScoredSentence {
  sentence: string;
  index: number;
  score: number;
  tokens: Set<string>;
}

function scoreSentences(sentences: string[], keywords: RankedTerm[]): ScoredSentence[] {
  const weights = new Map(keywords.map((k) => [k.term, k.score]));
  return sentences.map((sentence, index) => {
    const tokens = tokenize(sentence);
    const tokenSet = new Set(tokens);
    let coverage = 0;
    for (const t of tokenSet) coverage += weights.get(t) ?? 0;

    // Position prior: openers state the subject, closers state the conclusion
    const posBoost = index === 0 ? 1.3 : index === sentences.length - 1 ? 1.1 : 1;
    // Length normalization — don't reward run-on sentences
    const lenNorm = Math.sqrt(Math.max(tokens.length, 1));

    return { sentence, index, score: (coverage / lenNorm) * posBoost, tokens: tokenSet };
  });
}

/** Token-overlap ratio against an already-selected set (redundancy check). */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

/**
 * One-line summary for the note card (`content` field, ≤140 chars).
 * Short notes don't get a synthetic summary — the text speaks for itself.
 */
export function summarize(
  text: string,
  sentences: string[],
  keywords: RankedTerm[]
): string {
  const trimmed = text.trim();
  if (trimmed.length <= SUMMARY_MAX_CHARS) return trimmed;
  if (sentences.length === 0) return truncateAtWord(trimmed, SUMMARY_MAX_CHARS);

  const scored = scoreSentences(sentences, keywords)
    .sort((a, b) => b.score - a.score);
  return truncateAtWord(scored[0].sentence, SUMMARY_MAX_CHARS);
}

/**
 * Multi-sentence extractive summary (EditNote "Make Concise").
 * Greedy selection with a redundancy penalty (MMR-style): each added sentence
 * must bring new content. Output preserves original sentence order.
 */
export function extractiveSummary(
  sentences: string[],
  keywords: RankedTerm[],
  maxSentences = 3
): string {
  if (sentences.length <= maxSentences) return sentences.join(' ');

  const scored = scoreSentences(sentences, keywords)
    .sort((a, b) => b.score - a.score);

  const selected: ScoredSentence[] = [];
  for (const cand of scored) {
    if (selected.length >= maxSentences) break;
    if (selected.some((s) => overlap(cand.tokens, s.tokens) > 0.6)) continue;
    selected.push(cand);
  }

  return selected
    .sort((a, b) => a.index - b.index)
    .map((s) => s.sentence)
    .join(' ');
}
