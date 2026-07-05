// Taxonomy tagger — maps note content onto the fixed TAG_TAXONOMY.
// Signal-word scoring per tag (the old extractor only counted literal
// occurrences of the tag words themselves, so "buy milk" never got SHOPPING).

import { Tag, TAG_TAXONOMY } from '../../../utils/tagHelpers';
import { MAX_TAGS, FALLBACK_TAG } from '../../../config';

const TAG_SIGNALS: Record<string, string[]> = {
  WORK: ['work', 'office', 'boss', 'client', 'colleague', 'team', 'deadline', 'report', 'presentation', 'slides', 'standup', 'sprint', 'manager', 'coworker', 'promotion', 'job'],
  PERSONAL: ['family', 'home', 'kids', 'wife', 'husband', 'mom', 'dad', 'brother', 'sister', 'personal', 'myself', 'life'],
  IDEA: ['idea', 'concept', 'what if', 'imagine', 'brainstorm', 'prototype', 'invention', 'feature'],
  URGENT: ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'right away', 'now', 'important'],
  HEALTH: ['health', 'doctor', 'gym', 'workout', 'exercise', 'sleep', 'diet', 'medicine', 'appointment', 'dentist', 'run', 'yoga', 'meditation', 'therapy'],
  FINANCE: ['money', 'pay', 'payment', 'budget', 'invoice', 'bank', 'salary', 'rent', 'tax', 'invest', 'savings', 'bill', 'loan', 'emi', 'expense'],
  TRAVEL: ['travel', 'trip', 'flight', 'hotel', 'vacation', 'holiday', 'passport', 'visa', 'airport', 'train', 'booking', 'itinerary'],
  LEARNING: ['learn', 'study', 'course', 'exam', 'class', 'tutorial', 'book', 'read', 'lecture', 'practice', 'homework', 'assignment', 'college', 'university'],
  CREATIVE: ['design', 'art', 'write', 'writing', 'music', 'draw', 'paint', 'compose', 'story', 'poem', 'creative', 'sketch', 'photography'],
  SOCIAL: ['friend', 'party', 'dinner', 'lunch', 'meet up', 'meetup', 'birthday', 'wedding', 'hangout', 'gathering', 'catch up'],
  SHOPPING: ['buy', 'shop', 'order', 'purchase', 'grocery', 'groceries', 'store', 'amazon', 'cart', 'delivery', 'milk', 'vegetables'],
  REMINDER: ['remind', 'remember', 'forget', "don't forget", 'reminder', 'note to self'],
  GOAL: ['goal', 'target', 'achieve', 'milestone', 'resolution', 'objective', 'aim', 'ambition'],
  RESEARCH: ['research', 'investigate', 'explore', 'analyze', 'compare', 'look into', 'find out', 'dig into', 'survey'],
  MEETING: ['meeting', 'sync', 'call with', 'standup', 'interview', 'discussion', 'agenda', '1:1'],
  PROJECT: ['project', 'build', 'launch', 'ship', 'release', 'deploy', 'milestone', 'roadmap', 'mvp'],
  NOTE: [],
  REFLECTION: ['reflect', 'realized', 'looking back', 'learned', 'lesson', 'grateful', 'gratitude', 'thinking about', 'perspective'],
  JOURNAL: ['today i', 'this morning', 'tonight i', 'felt', 'feeling', 'my day', 'journal', 'diary'],
  OTHER: [],
};

/**
 * Score every taxonomy tag against the text; return the top 1–MAX_TAGS.
 * Type hints from the classifier add weight (a task about buying → SHOPPING).
 */
export function tagsForText(text: string, typeHint?: string): Tag[] {
  const lower = ` ${text.toLowerCase()} `;
  const scores = new Map<Tag, number>();

  for (const tag of TAG_TAXONOMY) {
    const signals = TAG_SIGNALS[tag] ?? [];
    let score = 0;
    for (const signal of signals) {
      let idx = lower.indexOf(signal);
      while (idx !== -1) {
        // Whole-word-ish guard for single-word signals
        const beforeOk = /[^a-z]/.test(lower[idx - 1] ?? ' ');
        const afterOk = signal.includes(' ') || /[^a-z]/.test(lower[idx + signal.length] ?? ' ');
        if (beforeOk && afterOk) score += 1;
        idx = lower.indexOf(signal, idx + signal.length);
      }
    }
    // Literal mention of the tag itself still counts
    if (lower.includes(` ${tag.toLowerCase()} `)) score += 1;
    if (score > 0) scores.set(tag, score);
  }

  if (typeHint === 'idea') scores.set('IDEA', (scores.get('IDEA') ?? 0) + 1);
  if (typeHint === 'event') scores.set('MEETING', (scores.get('MEETING') ?? 0) + 0.5);

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, MAX_TAGS);

  return ranked.length > 0 ? ranked : [FALLBACK_TAG as Tag];
}
