import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, AuthUser } from '../types';
import { setMonitoringUser, clearMonitoringUser, captureError } from '../utils/monitoring';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';
import { isDevBypass, DEV_MOCK_USER } from '../config/devBypass';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  getUserDoc,
  createUserDoc,
  updateUserDoc,
} from '../features/crystals/services/userService';
import { migrateLocalStorageToFirestore } from '../features/crystals/services/migrationService';
import { baseAuthUserFromFirebase, applyUserDocEnrichment } from './authResolution';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UNCONFIGURED_ERROR =
  'Firebase is not configured. Add your Firebase credentials to .env — see .env.example.';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // ─── Auth state listener ────────────────────────────────────

  useEffect(() => {
    // ── Dev bypass: skip Firebase entirely ──────────────────────
    if (isDevBypass) {
      console.warn('[AuthContext] DEV BYPASS active — Firebase auth skipped.');
      setAuthState({ user: DEV_MOCK_USER, isAuthenticated: true, isLoading: false });
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      console.error('[AuthContext] Firebase not configured — auth listener skipped.');
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        localStorage.removeItem('voiceaction_user');
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        clearMonitoringUser();
        return;
      }

      // ── 1. Authenticate IMMEDIATELY from Firebase Auth ─────────────
      // Firebase Auth is the sole source of truth. No Firestore call may
      // gate this: with offline persistence, Firestore writes don't settle
      // until the backend acks, so awaiting them here deadlocked auth
      // whenever the database was unreachable or not yet created.
      const user = baseAuthUserFromFirebase(
        firebaseUser,
        localStorage.getItem('voiceaction_user')
      );
      localStorage.setItem('voiceaction_user', JSON.stringify(user));
      setAuthState({ user, isAuthenticated: true, isLoading: false });
      setMonitoringUser(firebaseUser.uid);

      // ── 2. Firestore profile: non-blocking enrichment ──────────────
      // Load streak/settings if the doc exists; create it if missing.
      // Every path is caught — a missing database or undeployed rules
      // degrade to local persistence, never to a logged-out state.
      getUserDoc(firebaseUser.uid)
        .then((userDoc) => {
          if (userDoc) {
            setAuthState((prev) => {
              const next = applyUserDocEnrichment(prev, firebaseUser.uid, userDoc);
              if (next.user && next !== prev) {
                localStorage.setItem('voiceaction_user', JSON.stringify(next.user));
              }
              return next;
            });
          } else {
            // Fire-and-forget: with offline persistence this write is
            // queued locally and syncs when the backend becomes available.
            createUserDoc(user).catch((err) =>
              captureError(err, { tags: { type: 'user_doc_create_error' } })
            );
          }
        })
        .catch((err) =>
          captureError(err, { tags: { type: 'user_doc_load_error' } })
        );

      // ── 3. One-time note migration (also non-blocking) ─────────────
      migrateLocalStorageToFirestore(firebaseUser.uid).catch((err) =>
        captureError(err, { tags: { type: 'migration_error' } })
      );
    });

    return () => unsubscribe();
  }, []);

  // ─── Auth operations ────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured || !auth) throw new Error(UNCONFIGURED_ERROR);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    if (!isFirebaseConfigured || !auth) throw new Error(UNCONFIGURED_ERROR);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    if (!isFirebaseConfigured || !auth) throw new Error(UNCONFIGURED_ERROR);
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async (): Promise<void> => {
    if (isDevBypass) {
      // In dev bypass, reload the page so the bypass re-applies on next mount
      window.location.reload();
      return;
    }
    if (!isFirebaseConfigured || !auth) {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('voiceaction_user');
      return;
    }
    await signOut(auth);
  };

  /**
   * Updates AuthUser in local state + localStorage + Firestore user document.
   * Used by App.tsx when a note capture updates the streak counters.
   */
  const updateUser = (user: AuthUser): void => {
    localStorage.setItem('voiceaction_user', JSON.stringify(user));
    setAuthState((prev) => ({ ...prev, user }));

    // Persist streak + freeze fields to Firestore so they survive logout
    if (isFirebaseConfigured && user.id) {
      updateUserDoc(user.id, {
        currentStreak: user.currentStreak ?? 0,
        longestStreak: user.longestStreak ?? 0,
        ...(user.lastCaptureDate ? { lastCaptureDate: user.lastCaptureDate } : {}),
        ...(user.streakFreezeWeek !== undefined ? { streakFreezeWeek: user.streakFreezeWeek } : {}),
        ...(user.streakFreezeUsedWeek !== undefined ? { streakFreezeUsedWeek: user.streakFreezeUsedWeek } : {}),
      }).catch((err) =>
        captureError(err, { tags: { type: 'streak_persist_error' } })
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{ ...authState, login, signup, signInWithGoogle, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within an AuthProvider');
  return ctx;
};
