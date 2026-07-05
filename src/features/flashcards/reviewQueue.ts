// Flashcard Review Queue Service
// Deterministically orders cards for review sessions.
// Priority: overdue cards first (most overdue → top), then due-today cards.

import { Note, Crystal } from '../../types';
import { isDue } from './sm2';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────

export interface QueuedCard {
  note: Note;
  overdueBy: number;        // days overdue (0 = due today, >0 = overdue)
  isNew: boolean;           // never reviewed before
}

export interface QueueStats {
  dueToday: number;
  overdue: number;
  newCards: number;
  total: number;
  completedToday: number;
}

// ─── Eligibility ──────────────────────────────────────────────

/**
 * A note is eligible for flashcard review when:
 *   - flashcardEnabled is true, OR
 *   - type === 'idea' (auto-included)
 * AND
 *   - nextReviewAt <= now, OR card is new (no nextReviewAt)
 */
export function isEligible(note: Note): boolean {
  const crystal = note as Crystal;
  const eligible = crystal.flashcardEnabled === true || crystal.type === 'idea';
  if (!eligible) return false;
  return isDue(crystal.flashcardReview);
}

// ─── Queue builder ────────────────────────────────────────────

/**
 * Builds a deterministically ordered review queue from all notes.
 *
 * Ordering:
 *   1. Overdue cards, sorted by most-overdue first
 *   2. New cards (never reviewed), sorted by creation time (oldest first)
 *   3. Due-today cards, sorted by creation time
 *
 * Performance: O(n) filter + O(k log k) sort where k = due cards.
 * Handles 1000+ notes without lag via useMemo in the component.
 */
export function buildReviewQueue(notes: Note[]): QueuedCard[] {
  const now = Date.now();
  const queue: QueuedCard[] = [];

  for (const note of notes) {
    if (!isEligible(note)) continue;
    const crystal = note as Crystal;
    const review = crystal.flashcardReview;
    const isNew = !review?.nextReviewAt;
    const overdueBy = isNew
      ? 0
      : Math.max(0, Math.floor((now - review!.nextReviewAt) / ONE_DAY_MS));

    queue.push({ note, overdueBy, isNew });
  }

  return queue.sort((a, b) => {
    // Overdue cards first, sorted by most overdue
    if (a.overdueBy !== b.overdueBy) return b.overdueBy - a.overdueBy;
    // New cards before same-day due cards
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
    // Older notes first (surface long-forgotten ideas)
    return (a.note.createdAt || 0) - (b.note.createdAt || 0);
  });
}

// ─── Stats ────────────────────────────────────────────────────

/**
 * Returns queue statistics for the session header display.
 */
export function getQueueStats(notes: Note[]): QueueStats {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let dueToday = 0;
  let overdue = 0;
  let newCards = 0;

  for (const note of notes) {
    const crystal = note as Crystal;
    const eligible = crystal.flashcardEnabled === true || crystal.type === 'idea';
    if (!eligible) continue;

    const review = crystal.flashcardReview;
    if (!review?.nextReviewAt) {
      newCards++;
    } else if (review.nextReviewAt <= todayStart.getTime()) {
      overdue++;
    } else if (review.nextReviewAt <= now) {
      dueToday++;
    }
  }

  // Count completions stored in session (rough: cards with totalReviews > 0 reviewed today)
  // For session stats, we rely on the component's own sessionStats counter.
  return {
    dueToday,
    overdue,
    newCards,
    total: dueToday + overdue + newCards,
    completedToday: 0,
  };
}
