// Regression tests for the post-authentication routing loop.
//
// Bug fixed: after successful Firebase signup/login, `onAuthStateChanged`
// awaited Firestore reads/writes BEFORE setting isAuthenticated. With the
// Firestore database absent (or rules undeployed) and offline persistence
// enabled, the write never settled → auth state never flipped → the app
// rendered the public Landing forever and "Get Started" looped to Auth.
//
// These tests pin both halves of the fix:
//  1. src/routing/appRouting.ts — the canonical routing state machine
//  2. src/context/authResolution.ts — Firestore-independent auth resolution

import { describe, it, expect, beforeEach } from 'vitest';
import { authPhase, resolveView, guardRedirect, shouldShowOnboarding } from '../appRouting';
import { baseAuthUserFromFirebase, applyUserDocEnrichment, FirebaseUserLike } from '../../context/authResolution';
import { AuthState } from '../../types';
import { Screen } from '../../types';
import { UserDoc } from '../../features/crystals/services/userService';

const ALL_SCREENS: Screen[] = [
  'landing', 'signin', 'home', 'search', 'history', 'settings',
  'recording', 'edit', 'flashcards', 'thoughtgraph',
];

const fbUser = (uid = 'uid-1'): FirebaseUserLike => ({
  uid,
  displayName: 'Tahir',
  email: 'tahir@example.com',
  photoURL: null,
  metadata: { creationTime: 'Mon, 06 Jul 2026 10:00:00 GMT' },
});

const authenticatedState = (uid = 'uid-1'): AuthState => ({
  user: baseAuthUserFromFirebase(fbUser(uid), null),
  isAuthenticated: true,
  isLoading: false,
});

// ─── 1. Unauthenticated → Landing ─────────────────────────────

describe('1. unauthenticated visitors see Landing', () => {
  it('renders Landing regardless of stale screen state (except signin)', () => {
    for (const s of ALL_SCREENS.filter((s) => s !== 'signin')) {
      expect(resolveView('unauthenticated', s)).toEqual({ kind: 'landing' });
    }
  });

  it('guard converges protected screens back to landing', () => {
    expect(guardRedirect('unauthenticated', 'home', false)).toBe('landing');
    expect(guardRedirect('unauthenticated', 'settings', false)).toBe('landing');
    expect(guardRedirect('unauthenticated', 'landing', false)).toBeNull();
    expect(guardRedirect('unauthenticated', 'signin', false)).toBeNull();
  });
});

// ─── 2. Get Started → Signup/Auth ─────────────────────────────

describe('2. Landing "Get Started" → Auth screen', () => {
  it('unauthenticated + signin screen renders the Auth view', () => {
    // Get Started / "Already have an account" both set screen to 'signin'
    expect(resolveView('unauthenticated', 'signin')).toEqual({ kind: 'auth' });
    expect(guardRedirect('unauthenticated', 'signin', false)).toBeNull(); // no bounce
  });
});

// ─── 3. Signup success → Onboarding over Home ─────────────────

describe('3. signup success → authenticated app + onboarding', () => {
  it('auth flip while on signin routes into the app (Home)', () => {
    expect(guardRedirect('authenticated', 'signin', false)).toBe('home');
    expect(resolveView('authenticated', 'signin')).toEqual({ kind: 'app', screen: 'home' });
  });

  it('first session (flag unset) shows onboarding', () => {
    expect(shouldShowOnboarding('authenticated', false)).toBe(true);
  });
});

// ─── 4 + 5. Email login / Google login → Home ─────────────────

describe('4/5. login success (email and Google follow the identical path)', () => {
  it('authenticated user on any public screen is sent to Home', () => {
    expect(guardRedirect('authenticated', 'landing', false)).toBe('home');
    expect(guardRedirect('authenticated', 'signin', false)).toBe('home');
  });

  it('quick-launch preference sends them to recording instead', () => {
    expect(guardRedirect('authenticated', 'landing', true)).toBe('recording');
  });

  it('returning user (flag set) gets no onboarding', () => {
    expect(shouldShowOnboarding('authenticated', true)).toBe(false);
  });
});

// ─── 6. Authenticated refresh → Home ──────────────────────────

describe('6. authenticated page refresh', () => {
  it('shows loading while Firebase restores the session, then Home', () => {
    expect(authPhase(true, false)).toBe('initializing');
    expect(resolveView('initializing', 'landing')).toEqual({ kind: 'loading' });
    // guard must not force 'landing' during initialization (that was loop fuel)
    expect(guardRedirect('initializing', 'home', false)).toBeNull();
    // session restored → initial 'landing' state converges to home
    expect(authPhase(false, true)).toBe('authenticated');
    expect(guardRedirect('authenticated', 'landing', false)).toBe('home');
  });
});

// ─── 7. Authenticated user can NEVER see Landing/Auth ─────────

describe('7. authenticated users never see Landing or Auth', () => {
  it('every screen resolves to an app view, never landing/auth/signin', () => {
    for (const s of ALL_SCREENS) {
      const view = resolveView('authenticated', s);
      expect(view.kind).toBe('app');
      if (view.kind === 'app') {
        expect(view.screen).not.toBe('landing');
        expect(view.screen).not.toBe('signin');
      }
    }
  });
});

// ─── 8. Firestore unavailable → authenticated app still opens ─

describe('8. Firestore absence never blocks or clears authentication', () => {
  it('base auth user is built from Firebase Auth alone — no Firestore input', () => {
    const user = baseAuthUserFromFirebase(fbUser(), null);
    expect(user.id).toBe('uid-1');
    expect(user.name).toBe('Tahir');
    expect(user.currentStreak).toBe(0);
  });

  it('restores cached streaks for the same uid, ignores another uid or corrupt cache', () => {
    const cached = JSON.stringify({ id: 'uid-1', currentStreak: 7, longestStreak: 12 });
    expect(baseAuthUserFromFirebase(fbUser(), cached).currentStreak).toBe(7);
    expect(baseAuthUserFromFirebase(fbUser('other'), cached).currentStreak).toBe(0);
    expect(baseAuthUserFromFirebase(fbUser(), '{not json').currentStreak).toBe(0);
  });

  it('a null user doc (missing DB / undeployed rules) changes nothing — user stays authenticated', () => {
    const state = authenticatedState();
    const after = applyUserDocEnrichment(state, 'uid-1', null);
    expect(after).toBe(state);
    expect(after.isAuthenticated).toBe(true);
  });

  it('enrichment is structurally incapable of clearing authentication', () => {
    const state = authenticatedState();
    const doc: UserDoc = {
      id: 'uid-1', name: 'Tahir', email: 'tahir@example.com', createdAt: 1,
      currentStreak: 9, longestStreak: 20, settings: {}, updatedAt: 2,
    };
    const after = applyUserDocEnrichment(state, 'uid-1', doc);
    expect(after.isAuthenticated).toBe(true);
    expect(after.user?.currentStreak).toBe(9);
  });

  it('late enrichment after logout does not resurrect a user', () => {
    const loggedOut: AuthState = { user: null, isAuthenticated: false, isLoading: false };
    const doc = { id: 'uid-1', name: 'x', email: '', createdAt: 1, currentStreak: 3, longestStreak: 3, settings: {}, updatedAt: 2 } as UserDoc;
    expect(applyUserDocEnrichment(loggedOut, 'uid-1', doc)).toBe(loggedOut);
  });

  it('stale enrichment for a previous user does not corrupt the current one', () => {
    const state = authenticatedState('uid-2');
    const staleDoc = { id: 'uid-1', name: 'old', email: '', createdAt: 1, currentStreak: 99, longestStreak: 99, settings: {}, updatedAt: 2 } as UserDoc;
    const after = applyUserDocEnrichment(state, 'uid-1', staleDoc);
    expect(after.user?.currentStreak).toBe(0); // unchanged
  });
});

// ─── 9. Logout → Landing ──────────────────────────────────────

describe('9. logout returns to the public Landing', () => {
  it('phase flips and every in-app screen converges to landing', () => {
    expect(authPhase(false, false)).toBe('unauthenticated');
    for (const s of ['home', 'settings', 'thoughtgraph'] as Screen[]) {
      expect(guardRedirect('unauthenticated', s, false)).toBe('landing');
      expect(resolveView('unauthenticated', s)).toEqual({ kind: 'landing' });
    }
  });
});

// ─── 10. Onboarding shows exactly once ────────────────────────

describe('10. onboarding shown only once, only when authenticated', () => {
  const KEY = 'va_onboarding_complete';

  beforeEach(() => {
    // Minimal localStorage stub for the single-flag contract
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });

  it('one flag drives it: unset → show, set → never again', () => {
    const complete = () => localStorage.getItem(KEY) === 'true';
    expect(shouldShowOnboarding('authenticated', complete())).toBe(true);
    localStorage.setItem(KEY, 'true'); // what Onboarding's markOnboardingComplete() writes
    expect(shouldShowOnboarding('authenticated', complete())).toBe(false);
  });

  it('never shows for visitors or during auth initialization', () => {
    expect(shouldShowOnboarding('unauthenticated', false)).toBe(false);
    expect(shouldShowOnboarding('initializing', false)).toBe(false);
  });
});
