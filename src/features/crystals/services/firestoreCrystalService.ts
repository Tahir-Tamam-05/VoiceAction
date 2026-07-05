// Firestore Crystal Service
// Implements real CRUD against users/{uid}/crystals/{crystalId}.
//
// Conflict resolution: updatedAt last-write-wins.
//   - Every write stamps updatedAt: Date.now().
//   - update() reads the existing doc first; only proceeds when
//     incoming.updatedAt >= existing.updatedAt (newest wins).
//   - create() always writes — no prior document to conflict with.
//
// Offline support: handled by Firebase SDK's persistentLocalCache
// (configured in firebase.ts). Writes are queued in IndexedDB and
// replayed automatically on reconnect.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  CollectionReference,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../config/firebase';
import { Crystal } from '../../../types';
import { CrystalService, migrateToCrystal } from './crystalService';

// ─── Path helpers ─────────────────────────────────────────────

function crystalsCol(userId: string): CollectionReference<DocumentData> {
  if (!db) throw new Error('[FirestoreService] Firestore not initialised');
  return collection(db, 'users', userId, 'crystals');
}

function crystalDoc(userId: string, crystalId: string) {
  if (!db) throw new Error('[FirestoreService] Firestore not initialised');
  return doc(db, 'users', userId, 'crystals', crystalId);
}

// ─── Conversion ───────────────────────────────────────────────

/** Converts a Firestore document to a typed Crystal, applying v2 migration. */
function docToCrystal(id: string, data: DocumentData): Crystal {
  return migrateToCrystal({ id, ...data } as Partial<Crystal>);
}

/** Strips undefined values (Firestore rejects them). */
function sanitiseForFirestore(crystal: Crystal): Record<string, unknown> {
  return JSON.parse(JSON.stringify(crystal));
}

// ─── Service ─────────────────────────────────────────────────

export class FirestoreCrystalService implements CrystalService {

  async create(userId: string, data: Partial<Crystal>): Promise<Crystal> {
    const crystal = migrateToCrystal({ ...data, updatedAt: Date.now() });
    const ref = crystalDoc(userId, crystal.id);
    await setDoc(ref, sanitiseForFirestore(crystal));
    return crystal;
  }

  async getAll(userId: string): Promise<Crystal[]> {
    const q = query(crystalsCol(userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToCrystal(d.id, d.data()));
  }

  async getById(userId: string, crystalId: string): Promise<Crystal | null> {
    const snap = await getDoc(crystalDoc(userId, crystalId));
    if (!snap.exists()) return null;
    return docToCrystal(snap.id, snap.data());
  }

  async update(
    userId: string,
    crystalId: string,
    data: Partial<Crystal>
  ): Promise<Crystal> {
    const ref = crystalDoc(userId, crystalId);

    // Conflict resolution: read existing updatedAt, only write if newer
    const existing = await getDoc(ref);
    const existingUpdatedAt: number = existing.exists()
      ? (existing.data().updatedAt ?? 0)
      : 0;
    const incomingUpdatedAt: number = data.updatedAt ?? Date.now();

    if (incomingUpdatedAt < existingUpdatedAt) {
      console.warn(
        `[FirestoreService] Skipped stale update for crystal ${crystalId}: ` +
        `incoming ${incomingUpdatedAt} < existing ${existingUpdatedAt}`
      );
      // Return the server version
      return docToCrystal(existing.id, existing.data());
    }

    const merged = migrateToCrystal({
      ...(existing.exists() ? existing.data() : {}),
      ...data,
      id: crystalId,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
    } as Partial<Crystal>);

    await setDoc(ref, sanitiseForFirestore(merged), { merge: true });
    return merged;
  }

  async delete(userId: string, crystalId: string): Promise<void> {
    await deleteDoc(crystalDoc(userId, crystalId));
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
      Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'Neutral';
    const connections = thisWeek.reduce(
      (sum, c) => sum + (c.connections || 0),
      0
    );

    return { count: thisWeek.length, topMood, connections };
  }

  /**
   * Subscribes to realtime updates for all crystals belonging to userId.
   * Returns an unsubscribe function — call it on component unmount.
   *
   * @param userId  Firebase Auth UID
   * @param onData  Called with full sorted Crystal[] on every change
   * @param onError Called when the listener encounters a Firestore error
   */
  subscribe(
    userId: string,
    onData: (crystals: Crystal[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const q = query(crystalsCol(userId), orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const crystals = snapshot.docs.map((d) => docToCrystal(d.id, d.data()));
        onData(crystals);
      },
      (err) => {
        console.error('[FirestoreService] onSnapshot error:', err);
        onError?.(err);
      }
    );
  }
}
