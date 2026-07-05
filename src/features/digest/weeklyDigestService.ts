// Weekly Thought Digest Service
// Phase 2 Feature: Weekly Thought Digest
// Simulates cloud function behavior for aggregating weekly stats

import { Crystal, Note } from '../../types';

// Feature flag check
const isDigestEnabled = (): boolean => {
  const features = localStorage.getItem('va_feature_flags');
  if (features) {
    try {
      const parsed = JSON.parse(features);
      return parsed.weeklyDigest !== false;
    } catch {
      return true;
    }
  }
  return true;
};

// Storage keys
const DIGEST_STORAGE_KEY = 'va_weekly_digest';
const LAST_DIGEST_DATE_KEY = 'va_last_digest_date';

export interface WeeklyDigest {
  weekStarting: number; // Timestamp of week start (Sunday)
  weekEnding: number;   // Timestamp of week end (Saturday)
  totalNotes: number;
  notesByType: Record<string, number>;
  topMood: string;
  moodDistribution: Record<string, number>;
  totalConnections: number;
  mostActiveDay: string;
  insights: string[];
  generatedAt: number;
}

// Get start of week (Sunday)
const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

// Get end of week (Saturday)
const getWeekEnd = (date: Date = new Date()): Date => {
  const start = getWeekStart(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
};

// Generate weekly digest from crystals
export const generateWeeklyDigest = (crystals: Crystal[]): WeeklyDigest | null => {
  if (!isDigestEnabled() || crystals.length === 0) return null;

  const now = Date.now();
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  // Filter crystals from this week
  const thisWeekCrystals = crystals.filter(c => {
    const crystalDate = c.createdAt;
    return crystalDate >= weekStart.getTime() && crystalDate <= weekEnd.getTime();
  });

  if (thisWeekCrystals.length === 0) return null;

  // Calculate stats
  const notesByType: Record<string, number> = {};
  const moodDistribution: Record<string, number> = {};
  const dayActivity: Record<string, number> = {};
  let totalConnections = 0;

  thisWeekCrystals.forEach(crystal => {
    // Count by type
    notesByType[crystal.type] = (notesByType[crystal.type] || 0) + 1;

    // Count moods
    if (crystal.mood) {
      moodDistribution[crystal.mood] = (moodDistribution[crystal.mood] || 0) + 1;
    }

    // Count connections
    totalConnections += crystal.connections || 0;

    // Track activity by day
    const day = new Date(crystal.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
    dayActivity[day] = (dayActivity[day] || 0) + 1;
  });

  // Find top mood
  const topMood = Object.entries(moodDistribution)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';

  // Find most active day
  const mostActiveDay = Object.entries(dayActivity)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Generate insights
  const insights: string[] = [];

  if (thisWeekCrystals.length >= 7) {
    insights.push(`You've captured ${thisWeekCrystals.length} thoughts this week!`);
  }

  if (totalConnections > 0) {
    insights.push(`Discovered ${totalConnections} connections between your ideas.`);
  }

  const voiceNotes = thisWeekCrystals.filter(c => c.type === 'voice').length;
  if (voiceNotes > 0) {
    insights.push(`${voiceNotes} voice notes captured this week.`);
  }

  if (Object.keys(notesByType).length > 2) {
    insights.push('Great variety in your thought types this week!');
  }

  const digest: WeeklyDigest = {
    weekStarting: weekStart.getTime(),
    weekEnding: weekEnd.getTime(),
    totalNotes: thisWeekCrystals.length,
    notesByType,
    topMood,
    moodDistribution,
    totalConnections,
    mostActiveDay,
    insights,
    generatedAt: now,
  };

  // Store in localStorage
  localStorage.setItem(DIGEST_STORAGE_KEY, JSON.stringify(digest));
  localStorage.setItem(LAST_DIGEST_DATE_KEY, now.toString());

  return digest;
};

// Get stored digest
export const getStoredDigest = (): WeeklyDigest | null => {
  const saved = localStorage.getItem(DIGEST_STORAGE_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as WeeklyDigest;
  } catch {
    return null;
  }
};

// Check if new digest should be generated
export const shouldGenerateDigest = (): boolean => {
  const lastDigest = localStorage.getItem(LAST_DIGEST_DATE_KEY);
  if (!lastDigest) return true;

  const lastDate = new Date(parseInt(lastDigest));
  const now = new Date();

  // Generate if it's a new week
  const lastWeekStart = getWeekStart(lastDate);
  const currentWeekStart = getWeekStart(now);

  return lastWeekStart.getTime() !== currentWeekStart.getTime();
};

// Mark digest as seen
export const markDigestSeen = (): void => {
  localStorage.setItem('va_digest_seen', 'true');
};

// Check if digest is new (unseen)
export const isDigestNew = (): boolean => {
  return localStorage.getItem('va_digest_seen') !== 'true';
};

// Hook for weekly digest
export const useWeeklyDigest = (crystals: Crystal[]) => {
  const generate = () => generateWeeklyDigest(crystals);
  const getStored = () => getStoredDigest();
  const shouldGenerate = () => shouldGenerateDigest();

  return {
    generate,
    getStored,
    shouldGenerate,
    isEnabled: isDigestEnabled(),
  };
};
