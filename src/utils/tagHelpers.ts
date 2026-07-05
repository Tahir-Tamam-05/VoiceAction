import { MAX_TAGS, FALLBACK_TAG } from '../config';
// Module cycle with the tagger (it reads TAG_TAXONOMY from here) is safe:
// both sides only touch each other's exports inside function bodies.
import { tagsForText } from '../features/intelligence/nlp/tagger';

export const TAG_TAXONOMY = [
  'WORK', 'PERSONAL', 'IDEA', 'URGENT', 'HEALTH',
  'FINANCE', 'TRAVEL', 'LEARNING', 'CREATIVE', 'SOCIAL',
  'SHOPPING', 'REMINDER', 'GOAL', 'RESEARCH', 'MEETING',
  'PROJECT', 'NOTE', 'REFLECTION', 'JOURNAL', 'OTHER'
] as const;

export type Tag = typeof TAG_TAXONOMY[number];


// Normalize and deduplicate tags, enforce taxonomy, fallback if needed
export const normalizeTags = (raw: string[] | undefined): Tag[] => {
  if (!raw || !Array.isArray(raw)) return [FALLBACK_TAG as Tag];
  const upper = raw
    .filter(Boolean)
    .map(t => (typeof t === 'string' ? t.toUpperCase().trim() : ''));
  // Deduplicate, filter for taxonomy, preserve order
  const unique = Array.from(new Set(upper)).filter(t => TAG_TAXONOMY.includes(t as Tag));
  if (!unique.length) return [FALLBACK_TAG as Tag];
  return unique.slice(0, MAX_TAGS) as Tag[];
};

// Local taxonomy extractor — delegates to the intelligence engine's
// signal-word tagger (the old version only matched literal tag words, so
// "buy milk" never scored SHOPPING).
export const extractTagsFromText = (text: string): Tag[] => {
  if (!text || typeof text !== 'string') return [FALLBACK_TAG as Tag];
  return tagsForText(text);
};
