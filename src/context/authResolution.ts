// Pure auth-state resolution helpers for AuthContext.
//
// Invariant enforced here and in AuthContext: Firebase Auth is the SOLE
// source of truth for "is the user authenticated". Firestore only ENRICHES
// an already-authenticated user (streaks, settings) — it can never gate,
// delay, or clear authentication. This is what broke before: authentication
// was blocked awaiting a Firestore write that never settles while the
// database is unreachable or not yet created.

import { AuthState, AuthUser } from '../types';
import { UserDoc, mergeUserDocIntoAuthUser } from '../features/crystals/services/userService';

/** The minimal shape we need from firebase.User (kept structural for tests). */
export interface FirebaseUserLike {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  metadata: { creationTime?: string };
}

/**
 * Builds the authenticated AuthUser from the Firebase Auth profile alone,
 * merging streak fields from the localStorage cache when it belongs to the
 * same uid. No Firestore involved — this must always succeed.
 */
export function baseAuthUserFromFirebase(
  firebaseUser: FirebaseUserLike,
  cachedRaw: string | null
): AuthUser {
  const user: AuthUser = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
    email: firebaseUser.email || '',
    createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()).getTime(),
    avatar: firebaseUser.photoURL || undefined,
    currentStreak: 0,
    longestStreak: 0,
  };

  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as AuthUser;
      if (cached.id === firebaseUser.uid) {
        user.currentStreak = cached.currentStreak ?? 0;
        user.longestStreak = cached.longestStreak ?? 0;
        if (cached.lastCaptureDate) user.lastCaptureDate = cached.lastCaptureDate;
        if (cached.streakFreezeWeek !== undefined) user.streakFreezeWeek = cached.streakFreezeWeek;
        if (cached.streakFreezeUsedWeek !== undefined) user.streakFreezeUsedWeek = cached.streakFreezeUsedWeek;
      }
    } catch {
      // corrupt cache — base profile stands
    }
  }

  return user;
}

/**
 * Applies late-arriving Firestore profile data to the current auth state.
 * Race-safe by construction:
 *  - never runs against a logged-out state (no user resurrection)
 *  - never runs against a DIFFERENT user (stale enrichment after re-login)
 *  - a null/missing user doc changes nothing
 *  - can only ever return an authenticated state or the previous state —
 *    it is structurally incapable of clearing authentication.
 */
export function applyUserDocEnrichment(
  prev: AuthState,
  uid: string,
  userDoc: UserDoc | null
): AuthState {
  if (!prev.user || !prev.isAuthenticated) return prev; // logged out meanwhile
  if (prev.user.id !== uid) return prev;                // different user now
  if (!userDoc) return prev;                            // nothing to merge

  return {
    ...prev,
    user: mergeUserDocIntoAuthUser(prev.user, userDoc),
  };
}
