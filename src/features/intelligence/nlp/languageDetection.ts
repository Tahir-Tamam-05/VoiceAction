// Script-based language detection.
// VoiceAction's target languages (English, Hindi, Kannada) live in disjoint
// Unicode script blocks, so counting characters per script is fast and
// reliable — no statistical model needed.

import { DetectedLanguage } from '../types';

const DEVANAGARI = /[ऀ-ॿ]/g;
const KANNADA = /[ಀ-೿]/g;
const LATIN = /[A-Za-z]/g;

export function detectLanguage(text: string): DetectedLanguage {
  if (!text) return { primary: 'en', mixed: false };

  const hi = (text.match(DEVANAGARI) ?? []).length;
  const kn = (text.match(KANNADA) ?? []).length;
  const en = (text.match(LATIN) ?? []).length;
  const total = hi + kn + en;

  if (total === 0) return { primary: 'other', mixed: false };

  const counts: Array<[DetectedLanguage['primary'], number]> = [
    ['en', en], ['hi', hi], ['kn', kn],
  ];
  counts.sort((a, b) => b[1] - a[1]);

  const primary = counts[0][1] > 0 ? counts[0][0] : 'other';
  // Mixed when a secondary script contributes a meaningful share
  const mixed = counts[1][1] / total > 0.15;

  return { primary, mixed };
}
