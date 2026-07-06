// Crystal Service — storage layer for note (Crystal) CRUD.
//
// When Firebase is configured → FirestoreCrystalService (cloud + realtime + offline)
// When Firebase is not configured → LocalStorageCrystalService (local-only fallback)
//
// Both implement the same CrystalService interface so all consumers are storage-agnostic.

import { Crystal, CrystalVersion } from '../../../types';
import { isFirebaseConfigured } from '../../../config/firebase';
import { isDevBypass } from '../../../config/devBypass';
import { FirestoreCrystalService } from './firestoreCrystalService';

// ─── Schema helpers ───────────────────────────────────────────

export const CURRENT_VERSION: CrystalVersion = 'v2';

/** Maps mood label → hex colour for UI borders and graph nodes. */
export const getMoodColor = (mood?: string): string => {
  const moodColors: Record<string, string> = {
    Focused: '#f97316',
    Creative: '#8b5cf6',
    Neutral: '#6b7280',
    Energetic: '#22c55e',
    Reflective: '#3b82f6',
    Stressed: '#ef4444',
    Calm: '#14b8a6',
    Excited: '#f59e0b',
  };
  return moodColors[mood || 'Neutral'] || moodColors['Neutral'];
};

/**
 * Upgrades any partial/legacy Crystal to the current v2 schema.
 * Called on every read and write to ensure consistent shape.
 */
export const migrateToCrystal = (data: Partial<Crystal>): Crystal => {
  const now = Date.now();
  return {
    ...data,
    id: data.id || crypto.randomUUID(),
    title: data.title || 'Untitled',
    content: data.content || '',
    type: data.type || 'text',
    timestamp:
      data.timestamp ||
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    pinned: data.pinned || false,
    tags: data.tags || [],
    version: CURRENT_VERSION,
    mood: data.mood || 'Neutral',
    moodColor: getMoodColor(data.mood),
    linkedNoteIds: data.linkedNoteIds || [],
    connections: data.linkedNoteIds?.length ?? data.connections ?? 0,
    lastSeen: data.lastSeen || now,
  } as Crystal;
};

// ─── Storage key (localStorage fallback) ─────────────────────

export const getStorageKey = (userId: string): string =>
  `voiceaction_crystals_${userId}`;

// ─── Service interface ────────────────────────────────────────

export interface CrystalService {
  create: (userId: string, data: Partial<Crystal>) => Promise<Crystal>;
  getAll: (userId: string) => Promise<Crystal[]>;
  getById: (userId: string, crystalId: string) => Promise<Crystal | null>;
  update: (
    userId: string,
    crystalId: string,
    data: Partial<Crystal>
  ) => Promise<Crystal>;
  delete: (userId: string, crystalId: string) => Promise<void>;
  getPinned: (userId: string) => Promise<Crystal[]>;
  getRecent: (userId: string, limit?: number) => Promise<Crystal[]>;
  getForgottenGems: (userId: string) => Promise<Crystal[]>;
  getWeeklyStats: (
    userId: string
  ) => Promise<{ count: number; topMood: string; connections: number }>;
}

// ─── LocalStorage implementation (fallback when Firebase absent) ─

export class LocalStorageCrystalService implements CrystalService {
  private key = getStorageKey;

  async create(userId: string, data: Partial<Crystal>): Promise<Crystal> {
    const existing = await this.getAll(userId);
    const crystal = migrateToCrystal(data);
    localStorage.setItem(this.key(userId), JSON.stringify([crystal, ...existing]));
    return crystal;
  }

  async getAll(userId: string): Promise<Crystal[]> {
    try {
      const raw = localStorage.getItem(this.key(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Crystal[];
      return parsed
        .map((c) => migrateToCrystal(c))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch {
      return [];
    }
  }

  async getById(userId: string, crystalId: string): Promise<Crystal | null> {
    const all = await this.getAll(userId);
    const found = all.find((c) => c.id === crystalId);
    return found ? migrateToCrystal(found) : null;
  }

  async update(
    userId: string,
    crystalId: string,
    data: Partial<Crystal>
  ): Promise<Crystal> {
    const all = await this.getAll(userId);
    const idx = all.findIndex((c) => c.id === crystalId);
    if (idx === -1) throw new Error(`Crystal ${crystalId} not found`);
    const updated = migrateToCrystal({
      ...all[idx],
      ...data,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
    });
    all[idx] = updated;
    localStorage.setItem(this.key(userId), JSON.stringify(all));
    return updated;
  }

  async delete(userId: string, crystalId: string): Promise<void> {
    const all = await this.getAll(userId);
    localStorage.setItem(
      this.key(userId),
      JSON.stringify(all.filter((c) => c.id !== crystalId))
    );
  }

  async getPinned(userId: string): Promise<Crystal[]> {
    const all = await this.getAll(userId);
    return all.filter((c) => c.pinned);
  }

  async getRecent(userId: string, limit = 10): Promise<Crystal[]> {
    const all = await this.getAll(userId);
    return all.filter((c) => !c.pinned).slice(0, limit);
  }

  async getForgottenGems(userId: string): Promise<Crystal[]> {
    const all = await this.getAll(userId);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return all
      .filter((c) => {
        const lastSeen = c.lastSeen || c.createdAt || 0;
        return (
          ((c.connections || 0) > 0 && lastSeen < oneWeekAgo) ||
          (lastSeen < thirtyDaysAgo && !c.pinned)
        );
      })
      .sort((a, b) => (b.connections || 0) - (a.connections || 0))
      .slice(0, 5);
  }

  async getWeeklyStats(
    userId: string
  ): Promise<{ count: number; topMood: string; connections: number }> {
    const all = await this.getAll(userId);
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = all.filter((c) => (c.createdAt || 0) > oneWeekAgo);

    const moodCounts: Record<string, number> = {};
    thisWeek.forEach((c) => {
      const mood = c.mood || 'Neutral';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    const topMood =
      Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
    const connections = thisWeek.reduce((sum, c) => sum + (c.connections || 0), 0);

    return { count: thisWeek.length, topMood, connections };
  }
}

// ─── Factory ──────────────────────────────────────────────────

export function createCrystalService(): CrystalService {
  // Dev auth bypass has no Firebase Auth session, so Firestore writes would
  // be rejected by security rules — bypass mode must be fully local.
  if (isFirebaseConfigured && !isDevBypass) {
    return new FirestoreCrystalService();
  }
  return new LocalStorageCrystalService();
}

/** Singleton — used throughout the app via useNotes hook. */
export const crystalService = createCrystalService();
