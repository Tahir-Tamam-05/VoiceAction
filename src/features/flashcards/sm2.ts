// SM-2 Spaced Repetition Algorithm
// Based on the original SuperMemo SM-2 specification.
//
// Grade scale:
//   0 = Again  (complete blackout, must relearn)
//   3 = Hard   (recalled with serious difficulty)
//   4 = Good   (recalled with some effort)
//   5 = Easy   (recalled instantly, no hesitation)

export type ReviewGrade = 0 | 3 | 4 | 5;
export type ReviewButton = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardReview {
  nextReviewAt: number;
  interval: number;
  easeFactor: number;
  totalReviews: number;
  repetition: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

// Map button labels to SM-2 quality grades
export const GRADE_MAP: Record<ReviewButton, ReviewGrade> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

// Human-readable labels and styles per button
export const REVIEW_BUTTONS: Array<{
  key: ReviewButton;
  label: string;
  sublabel: string;
  colorClass: string;
  bgClass: string;
}> = [
  {
    key: 'again',
    label: 'Again',
    sublabel: '< 1 day',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20',
  },
  {
    key: 'hard',
    label: 'Hard',
    sublabel: '~1 day',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20',
  },
  {
    key: 'good',
    label: 'Good',
    sublabel: 'schedule',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10 border-primary/30 hover:bg-primary/20',
  },
  {
    key: 'easy',
    label: 'Easy',
    sublabel: 'longer',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20',
  },
];

/**
 * Applies the SM-2 algorithm to produce the next review state.
 *
 * Interval schedule:
 *   repetition=0  → 1 day
 *   repetition=1  → 6 days
 *   repetition≥2  → interval * easeFactor (rounded)
 *
 * EaseFactor adjustment:
 *   EF' = EF + (0.1 - (5 - grade) × (0.08 + (5 - grade) × 0.02))
 *   clamped to MIN_EASE (1.3)
 *
 * Again (grade=0) resets repetition and sets interval=1.
 */
export function applyReview(
  current: Partial<FlashcardReview> | undefined,
  button: ReviewButton
): FlashcardReview {
  const grade = GRADE_MAP[button];
  const prev: FlashcardReview = {
    nextReviewAt: current?.nextReviewAt ?? Date.now(),
    interval: current?.interval ?? 0,
    easeFactor: current?.easeFactor ?? DEFAULT_EASE,
    totalReviews: current?.totalReviews ?? 0,
    repetition: current?.repetition ?? 0,
  };

  let { interval, easeFactor, repetition } = prev;

  if (grade < 3) {
    // Again — complete failure, restart
    repetition = 0;
    interval = 1;
  } else {
    // Update ease factor: EF += 0.1 - (5-grade)*(0.08+(5-grade)*0.02)
    const delta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
    easeFactor = Math.max(MIN_EASE, easeFactor + delta);

    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // Easy bonus: add an extra 30% to interval
    if (grade === 5) {
      interval = Math.round(interval * 1.3);
    }

    repetition += 1;
  }

  // Ensure minimum 1-day interval
  interval = Math.max(1, interval);

  return {
    nextReviewAt: Date.now() + interval * ONE_DAY_MS,
    interval,
    easeFactor,
    totalReviews: prev.totalReviews + 1,
    repetition,
  };
}

/**
 * Returns a human-readable label for when the card will next appear.
 * Used for the sublabel on review buttons to show predicted next review.
 */
export function previewNextInterval(
  current: Partial<FlashcardReview> | undefined,
  button: ReviewButton
): string {
  const next = applyReview(current, button);
  const days = next.interval;
  if (days <= 1) return '< 1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

/**
 * Returns true if a card is due for review right now.
 */
export function isDue(review: Partial<FlashcardReview> | undefined): boolean {
  if (!review?.nextReviewAt) return true; // new card — always due
  return review.nextReviewAt <= Date.now();
}
