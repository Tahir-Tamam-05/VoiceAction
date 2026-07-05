// Canonical routing state machine for VoiceAction.
//
//   AUTH INITIALIZING            → loading view
//   UNAUTHENTICATED              → public Landing (or Auth when on 'signin')
//   AUTHENTICATED                → the app; NEVER Landing, NEVER Auth
//   LOGOUT                       → back to Landing
//
// App.tsx must derive both its guard redirects and its render decision from
// these functions — there is no second routing authority.

import { Screen } from '../types';

export type AuthPhase = 'initializing' | 'unauthenticated' | 'authenticated';

export function authPhase(isLoading: boolean, isAuthenticated: boolean): AuthPhase {
  if (isLoading) return 'initializing';
  return isAuthenticated ? 'authenticated' : 'unauthenticated';
}

export type View =
  | { kind: 'loading' }
  | { kind: 'landing' }
  | { kind: 'auth' }
  | { kind: 'app'; screen: Screen };

/** Screens that only exist for unauthenticated visitors. */
const PUBLIC_SCREENS: ReadonlyArray<Screen> = ['landing', 'signin'];

/**
 * What to render for the current phase + screen. Total: every combination
 * maps to exactly one view.
 */
export function resolveView(phase: AuthPhase, currentScreen: Screen): View {
  switch (phase) {
    case 'initializing':
      return { kind: 'loading' };
    case 'unauthenticated':
      // Only two public views exist. Any other screen value collapses to
      // Landing (e.g. a stale 'home' set right after a submit).
      return currentScreen === 'signin' ? { kind: 'auth' } : { kind: 'landing' };
    case 'authenticated':
      // An authenticated user must never see Landing or Auth — public
      // screens collapse to Home.
      return PUBLIC_SCREENS.includes(currentScreen)
        ? { kind: 'app', screen: 'home' }
        : { kind: 'app', screen: currentScreen };
  }
}

/**
 * Screen-state correction for the current phase, or null when the current
 * screen is already legal. Used by the App.tsx guard effect so `currentScreen`
 * state converges with what resolveView renders.
 */
export function guardRedirect(
  phase: AuthPhase,
  currentScreen: Screen,
  quickLaunch: boolean
): Screen | null {
  if (phase === 'initializing') return null; // decide nothing while loading
  if (phase === 'authenticated') {
    if (PUBLIC_SCREENS.includes(currentScreen)) {
      return quickLaunch ? 'recording' : 'home';
    }
    return null;
  }
  // unauthenticated: everything except the two public screens returns to Landing
  return PUBLIC_SCREENS.includes(currentScreen) ? null : 'landing';
}

/**
 * Onboarding shows exactly once: first authenticated session without the
 * completion flag. Never during initialization, never for visitors.
 */
export function shouldShowOnboarding(phase: AuthPhase, onboardingComplete: boolean): boolean {
  return phase === 'authenticated' && !onboardingComplete;
}
