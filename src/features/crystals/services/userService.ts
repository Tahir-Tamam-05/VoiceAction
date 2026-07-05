// User document service — manages users/{uid} in Firestore.
// Stores streak data, settings, and preferences that must survive logout.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../config/firebase';
import { AuthUser } from '../../../types';

// ─── Schema ───────────────────────────────────────────────────

export interface UserSettings {
  theme: string;
  model: string;
  quickLaunch: boolean;
  notifications: { push: boolean; email: boolean; mentions: boolean };
  privacy: { biometric: boolean; encryption: boolean; analytics: boolean };
}

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  currentStreak: number;
  longestStreak: number;
  lastCaptureDate?: number;
  settings: Partial<UserSettings>;
  updatedAt: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  model: 'local-intelligence',
  quickLaunch: false,
  notifications: { push: true, email: false, mentions: true },
  privacy: { biometric: false, encryption: true, analytics: true },
};

// ─── Helpers ─────────────────────────────────────────────────

function userDocRef(userId: string) {
  if (!db) throw new Error('[UserService] Firestore not initialised');
  return doc(db, 'users', userId);
}

function settingsFromLocalStorage(): Partial<UserSettings> {
  try {
    const notifications = localStorage.getItem('settings_notifications');
    const privacy = localStorage.getItem('settings_privacy');
    const model = localStorage.getItem('settings_model');
    const quickLaunch = localStorage.getItem('va_setting_quicklaunch');
    return {
      ...(notifications ? { notifications: JSON.parse(notifications) } : {}),
      ...(privacy ? { privacy: JSON.parse(privacy) } : {}),
      ...(model ? { model } : {}),
      ...(quickLaunch !== null ? { quickLaunch: quickLaunch === 'true' } : {}),
    };
  } catch {
    return {};
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Loads the user document from Firestore.
 * Returns null when Firestore is not configured or the document does not exist yet.
 */
export async function getUserDoc(userId: string): Promise<UserDoc | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(userDocRef(userId));
    return snap.exists() ? (snap.data() as UserDoc) : null;
  } catch (err) {
    console.error('[UserService] Failed to load user doc:', err);
    return null;
  }
}

/**
 * Creates or fully replaces the user document.
 * Called once after sign-in when the document does not exist.
 */
export async function createUserDoc(user: AuthUser): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const data: UserDoc = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      ...(user.lastCaptureDate ? { lastCaptureDate: user.lastCaptureDate } : {}),
      settings: { ...DEFAULT_SETTINGS, ...settingsFromLocalStorage() },
      updatedAt: Date.now(),
    };
    await setDoc(userDocRef(user.id), data);
  } catch (err) {
    console.error('[UserService] Failed to create user doc:', err);
  }
}

/**
 * Merges partial updates into the user document.
 * Safe to call frequently (streak updates, settings changes).
 */
export async function updateUserDoc(
  userId: string,
  data: Partial<Omit<UserDoc, 'id'>>
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await updateDoc(userDocRef(userId), { ...data, updatedAt: Date.now() });
  } catch (err) {
    console.error('[UserService] Failed to update user doc:', err);
    // If doc doesn't exist yet (first run), create it
    if ((err as any)?.code === 'not-found') {
      const fallback: Partial<UserDoc> = { ...data, updatedAt: Date.now() };
      await setDoc(userDocRef(userId), fallback, { merge: true });
    }
  }
}

/**
 * Builds an AuthUser from the Firestore user document.
 * Preserves Firebase Auth fields (name, email, avatar) and merges streak data.
 */
export function mergeUserDocIntoAuthUser(
  authUser: AuthUser,
  userDoc: UserDoc & {
    streakFreezeWeek?: number;
    streakFreezeUsedWeek?: number;
  }
): AuthUser {
  return {
    ...authUser,
    currentStreak: userDoc.currentStreak ?? authUser.currentStreak ?? 0,
    longestStreak: userDoc.longestStreak ?? authUser.longestStreak ?? 0,
    ...(userDoc.lastCaptureDate ? { lastCaptureDate: userDoc.lastCaptureDate } : {}),
    ...(userDoc.streakFreezeWeek !== undefined ? { streakFreezeWeek: userDoc.streakFreezeWeek } : {}),
    ...(userDoc.streakFreezeUsedWeek !== undefined ? { streakFreezeUsedWeek: userDoc.streakFreezeUsedWeek } : {}),
  };
}
