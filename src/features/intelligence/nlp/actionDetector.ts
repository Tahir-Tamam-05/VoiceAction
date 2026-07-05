// Action / task detection.
// Finds sentences that express commitments, tasks, or reminders, and extracts
// EXPLICIT due-date phrases only — a date hint is reported exactly as the user
// wrote it, never inferred or resolved to a guessed timestamp.

import { DetectedAction } from '../types';

const ACTION_SENTENCE = /\b(need to|have to|has to|must|should|remember to|don'?t forget|make sure|todo|to-do|going to|will|plan to|promised to)\b/i;
const IMPERATIVE_START = /^(buy|call|email|text|send|submit|finish|complete|fix|pay|renew|book|schedule|cancel|return|clean|prepare|pick up|order|review|update|write|read|check|remind|ask|tell|get|bring)\b/i;

// Explicit temporal phrases — matched verbatim, reported verbatim
const DUE_PATTERNS: RegExp[] = [
  /\b(?:by|before|until|due)\s+(?:end of\s+)?(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|next month|this week|this month|eod|eow)\b/i,
  /\b(today|tonight|tomorrow)\b(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
  /\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i,
  /\bnext\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
  /\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i,
];

function findDueHint(sentence: string): string | undefined {
  for (const re of DUE_PATTERNS) {
    const m = sentence.match(re);
    if (m) return m[0].trim();
  }
  return undefined;
}

export function detectActions(sentences: string[]): DetectedAction[] {
  const actions: DetectedAction[] = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length < 6) continue;
    if (!ACTION_SENTENCE.test(sentence) && !IMPERATIVE_START.test(sentence)) continue;

    actions.push({
      text: sentence.replace(/[.!?]+$/, '').trim(),
      dueHint: findDueHint(sentence),
    });
    if (actions.length >= 10) break;
  }
  return actions;
}

/** Render detected actions as a markdown checklist (EditNote "Extract Actions"). */
export function actionsToChecklist(actions: DetectedAction[]): string {
  return actions
    .map((a) => `- [ ] ${a.text}${a.dueHint ? `  (${a.dueHint})` : ''}`)
    .join('\n');
}
