// Migration service — one-time import of localStorage crystals into Firestore.
// Runs automatically on first login after Firestore is activated.
// Safe to call multiple times; the guard flag prevents duplicate imports.

import {
  collection,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../config/firebase';
import { Crystal } from '../../../types';
import { migrateToCrystal } from './crystalService';

// ─── Constants ────────────────────────────────────────────────

const MIGRATION_FLAG_PREFIX = 'va_migration_';
const LEGACY_STORAGE_PREFIX = 'voiceaction_crystals_';
const BATCH_SIZE = 400; // stay well under Firestore's 500-op limit

// ─── Helpers ─────────────────────────────────────────────────

function migrationFlagKey(userId: string): string {
  return `${MIGRATION_FLAG_PREFIX}${userId}`;
}

function legacyStorageKey(userId: string): string {
  return `${LEGACY_STORAGE_PREFIX}${userId}`;
}

function readLegacyCrystals(userId: string): Crystal[] {
  try {
    const raw = localStorage.getItem(legacyStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Partial<Crystal>) => migrateToCrystal(c));
  } catch {
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Returns true if the migration has already been completed for this user.
 */
export function isMigrationComplete(userId: string): boolean {
  return localStorage.getItem(migrationFlagKey(userId)) === 'done';
}

/**
 * Marks migration as complete so it won't run again.
 */
function markMigrationComplete(userId: string): void {
  localStorage.setItem(migrationFlagKey(userId), 'done');
}

/**
 * Migrates all localStorage crystals for `userId` into Firestore.
 *
 * - Idempotent: skips immediately if already done.
 * - Batch-writes in chunks of 400 to stay under Firestore limits.
 * - Preserves all Crystal fields: timestamps, mood, tags, linkedNoteIds, pinned.
 * - Does NOT delete localStorage data (kept as offline cache).
 *
 * @returns number of crystals migrated (0 if already done or nothing to migrate)
 */
export async function migrateLocalStorageToFirestore(
  userId: string
): Promise<number> {
  if (!isFirebaseConfigured || !db) return 0;
  if (isMigrationComplete(userId)) return 0;

  const crystals = readLegacyCrystals(userId);

  if (crystals.length === 0) {
    markMigrationComplete(userId);
    return 0;
  }

  console.log(
    `[Migration] Migrating ${crystals.length} crystals to Firestore for user ${userId}…`
  );

  try {
    const crystalsCol = collection(db, 'users', userId, 'crystals');
    let migrated = 0;

    // Write in batches of BATCH_SIZE
    for (let i = 0; i < crystals.length; i += BATCH_SIZE) {
      const chunk = crystals.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((crystal) => {
        const ref = doc(crystalsCol, crystal.id);
        // Strip undefined values — Firestore rejects them
        const clean = JSON.parse(JSON.stringify(crystal)) as Crystal;
        batch.set(ref, clean, { merge: true }); // merge: existing data not overwritten
      });

      await batch.commit();
      migrated += chunk.length;
      console.log(`[Migration] Batch committed: ${migrated}/${crystals.length}`);
    }

    markMigrationComplete(userId);
    console.log(`[Migration] ✅ Complete — ${migrated} crystals migrated.`);
    return migrated;
  } catch (err) {
    console.error('[Migration] ❌ Failed — will retry on next login:', err);
    // Do NOT mark complete; will retry next login
    return 0;
  }
}
