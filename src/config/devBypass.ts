// Development auth bypass
// Activated ONLY when VITE_DEV_BYPASS_AUTH=true AND running in dev mode.
// Hardcoded to false in production builds regardless of the env var.

import { AuthUser } from '../types';

const env = (import.meta as any).env ?? {};

/**
 * True only when VITE_DEV_BYPASS_AUTH=true in a non-production build.
 * Production builds always get false, even if the var is accidentally set.
 */
export const isDevBypass: boolean =
  env.VITE_DEV_BYPASS_AUTH === 'true' && env.PROD !== true;

/**
 * Stable mock user used in dev bypass mode.
 * Uses a fixed ID so localStorage notes survive hot-reloads.
 */
export const DEV_MOCK_USER: AuthUser = {
  id: 'dev-bypass-user',
  name: 'Dev User',
  email: 'dev@voiceaction.local',
  createdAt: Date.now(),
  currentStreak: 3,
  longestStreak: 7,
  lastCaptureDate: Date.now() - 1000 * 60 * 60 * 20, // 20 h ago — streak at risk
};
