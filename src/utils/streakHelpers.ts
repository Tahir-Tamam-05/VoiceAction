import { Note, AuthUser } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─── Streak level definitions ─────────────────────────────────

export type StreakLevel = 'none' | 'ember' | 'blaze' | 'inferno' | 'phoenix';

export interface StreakLevelInfo {
  level: StreakLevel;
  label: string;
  emoji: string;
  color: string;         // CSS hex
  glowColor: string;     // tailwind glow class
  minDays: number;
  maxDays: number | null;
  nextLevel: StreakLevel | null;
  daysToNext: number | null;
}

const STREAK_LEVELS: StreakLevelInfo[] = [
  {
    level: 'none',
    label: 'Start',
    emoji: '○',
    color: '#6b7280',
    glowColor: 'shadow-none',
    minDays: 0,
    maxDays: 0,
    nextLevel: 'ember',
    daysToNext: 1,
  },
  {
    level: 'ember',
    label: 'Ember',
    emoji: '🔥',
    color: '#f59e0b',
    glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    minDays: 1,
    maxDays: 7,
    nextLevel: 'blaze',
    daysToNext: 8,
  },
  {
    level: 'blaze',
    label: 'Blaze',
    emoji: '⚡',
    color: '#f97316',
    glowColor: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
    minDays: 8,
    maxDays: 30,
    nextLevel: 'inferno',
    daysToNext: 31,
  },
  {
    level: 'inferno',
    label: 'Inferno',
    emoji: '🌋',
    color: '#ef4444',
    glowColor: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
    minDays: 31,
    maxDays: 90,
    nextLevel: 'phoenix',
    daysToNext: 91,
  },
  {
    level: 'phoenix',
    label: 'Phoenix',
    emoji: '🦅',
    color: '#8b5cf6',
    glowColor: 'shadow-[0_0_30px_rgba(139,92,246,0.6)]',
    minDays: 91,
    maxDays: null,
    nextLevel: null,
    daysToNext: null,
  },
];

export function getStreakLevel(streak: number): StreakLevelInfo {
  for (let i = STREAK_LEVELS.length - 1; i >= 0; i--) {
    if (streak >= STREAK_LEVELS[i].minDays) return STREAK_LEVELS[i];
  }
  return STREAK_LEVELS[0];
}

/**
 * Returns progress 0–1 toward the next level.
 * Returns 1 at Phoenix (max level).
 */
export function getStreakLevelProgress(streak: number): number {
  const info = getStreakLevel(streak);
  if (!info.nextLevel || info.maxDays === null) return 1;
  const range = info.maxDays - info.minDays + 1;
  const progress = (streak - info.minDays + 1) / range;
  return Math.min(1, Math.max(0, progress));
}

// ─── ISO week number helper ───────────────────────────────────

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ─── Streak freeze logic ──────────────────────────────────────

/**
 * Returns whether the user has a freeze available this week.
 * Each calendar week grants exactly 1 free freeze.
 */
export function hasAvailableFreeze(user: AuthUser | null): boolean {
  if (!user) return false;
  const thisWeek = isoWeekNumber(new Date());

  // Grant a new freeze if we haven't set one for this week yet
  const lastGrantedWeek = user.streakFreezeWeek ?? -1;
  if (lastGrantedWeek !== thisWeek) return true; // fresh freeze available

  // Freeze was already granted this week; check if it was consumed
  const usedWeek = user.streakFreezeUsedWeek ?? -1;
  return usedWeek !== thisWeek; // available if not yet used this week
}

/**
 * Tries to apply a streak freeze when the user missed exactly one day.
 * Returns updated AuthUser if freeze was consumed, or null if not applicable.
 */
export function tryApplyStreakFreeze(user: AuthUser): AuthUser | null {
  if (!user.lastCaptureDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastCapture = new Date(user.lastCaptureDate);
  lastCapture.setHours(0, 0, 0, 0);
  const daysMissed = Math.floor((now.getTime() - lastCapture.getTime()) / ONE_DAY_MS);

  // Freeze only applies when exactly 1 day was missed (daysMissed === 2 means missed yesterday)
  if (daysMissed !== 2) return null;
  if (!hasAvailableFreeze(user)) return null;

  const thisWeek = isoWeekNumber(new Date());
  return {
    ...user,
    // Preserve streak as if today was captured
    lastCaptureDate: Date.now(),
    currentStreak: user.currentStreak ?? 0,
    streakFreezeUsedWeek: thisWeek,
    streakFreezeWeek: thisWeek,
  };
}

// ─── Core streak calculation ──────────────────────────────────

/**
 * Calculate streak from notes array (legacy method)
 */
export function calculateStreak(items: Note[]): number {
  const days = [...new Set(
    items.map((i) => new Date(i.createdAt).toDateString())
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (!days.length) return 0;

  const current = new Date();
  current.setHours(0, 0, 0, 0);
  const firstDay = new Date(days[0]);
  firstDay.setHours(0, 0, 0, 0);
  if (Math.round((current.getTime() - firstDay.getTime()) / ONE_DAY_MS) > 1) return 0;

  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i]);
    d.setHours(0, 0, 0, 0);
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(days[i - 1]);
      prev.setHours(0, 0, 0, 0);
      if (Math.round((prev.getTime() - d.getTime()) / ONE_DAY_MS) === 1) {
        streak++;
      } else {
        break;
      }
    }
  }
  return streak;
}

/**
 * Calculate streak using user's lastCaptureDate.
 * Applies freeze automatically if one is available.
 */
export function calculateStreakFromUser(user: AuthUser | null): {
  currentStreak: number;
  longestStreak: number;
  isStreakAtRisk: boolean;
  daysUntilBreak: number;
  isFrozen: boolean;
  freezeAvailable: boolean;
} {
  if (!user?.lastCaptureDate) {
    return {
      currentStreak: 0,
      longestStreak: user?.longestStreak || 0,
      isStreakAtRisk: false,
      daysUntilBreak: 0,
      isFrozen: false,
      freezeAvailable: hasAvailableFreeze(user),
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastCapture = new Date(user.lastCaptureDate);
  lastCapture.setHours(0, 0, 0, 0);
  const daysSinceCapture = Math.floor((now.getTime() - lastCapture.getTime()) / ONE_DAY_MS);

  // Check if a freeze saved the streak
  const isFrozen = daysSinceCapture === 2 && !hasAvailableFreeze(user) &&
    (user.streakFreezeUsedWeek === isoWeekNumber(new Date()));

  const isStreakBroken = daysSinceCapture > 1 && !isFrozen;

  return {
    currentStreak: isStreakBroken ? 0 : (user.currentStreak || 0),
    longestStreak: user.longestStreak || 0,
    isStreakAtRisk: daysSinceCapture === 1,
    daysUntilBreak: daysSinceCapture === 0 ? 2 : Math.max(0, 2 - daysSinceCapture),
    isFrozen,
    freezeAvailable: hasAvailableFreeze(user),
  };
}

/**
 * Update user's streak when a new note is captured.
 * Also grants/resets the weekly freeze.
 */
export function updateStreakOnCapture(user: AuthUser): AuthUser {
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const lastCapture = user.lastCaptureDate ? new Date(user.lastCaptureDate) : null;
  if (lastCapture) lastCapture.setHours(0, 0, 0, 0);

  let newStreak = user.currentStreak || 0;
  let newLongest = user.longestStreak || 0;
  const thisWeek = isoWeekNumber(today);

  if (!lastCapture) {
    newStreak = 1;
    newLongest = 1;
  } else {
    const days = Math.floor((today.getTime() - lastCapture.getTime()) / ONE_DAY_MS);
    if (days === 0) {
      // Already captured today
    } else if (days === 1) {
      newStreak++;
      newLongest = Math.max(newLongest, newStreak);
    } else if (days === 2) {
      // Missed exactly one day — check if freeze can save it
      if (hasAvailableFreeze(user)) {
        newStreak++;
        newLongest = Math.max(newLongest, newStreak);
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }
  }

  return {
    ...user,
    lastCaptureDate: now,
    currentStreak: newStreak,
    longestStreak: newLongest,
    // Grant freeze for this week if not already tracked
    streakFreezeWeek: user.streakFreezeWeek !== thisWeek ? thisWeek : user.streakFreezeWeek,
  };
}

/**
 * Check if user has captured today
 */
export function hasCapturedToday(user: AuthUser | null): boolean {
  if (!user?.lastCaptureDate) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastCapture = new Date(user.lastCaptureDate);
  lastCapture.setHours(0, 0, 0, 0);
  return now.getTime() === lastCapture.getTime();
}

/**
 * Get streak badge color based on streak length (legacy — use getStreakLevel for new UI)
 */
export function getStreakBadgeColor(streak: number): string {
  return getStreakLevel(streak).color;
}

/**
 * Get streak milestone message
 */
export function getStreakMessage(streak: number): string {
  const info = getStreakLevel(streak);
  if (info.level === 'phoenix') return `Phoenix ${streak}-day streak!`;
  if (info.level === 'inferno') return `Inferno — ${streak} days!`;
  if (info.level === 'blaze') return `Blazing — ${streak} days`;
  if (info.level === 'ember') return `${streak}-day Ember`;
  if (streak === 1) return 'First day!';
  return 'Start your streak';
}
