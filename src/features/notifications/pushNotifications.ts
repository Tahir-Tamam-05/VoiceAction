// Browser Push Notification Service
// Uses the native Notification API (no backend required).
// Notifications fire when the app is open or the service worker is running.
//
// Limitation: Background push (when app is fully closed) requires VAPID keys
// + a backend server to send messages. This implementation handles all
// foreground triggers and provides the architecture for future backend push.

import { captureError } from '../../utils/monitoring';

// ─── Permission ────────────────────────────────────────────────

export type NotificationPermission = 'granted' | 'denied' | 'default';

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission as NotificationPermission;
}

/**
 * Requests browser notification permission with a user-friendly flow.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notification API not supported in this browser.');
    return 'denied';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  } catch (err) {
    captureError(err, { tags: { type: 'notification_permission_error' } });
    return 'denied';
  }
}

// ─── Send notification ─────────────────────────────────────────

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;          // Replaces existing notification with same tag
  silent?: boolean;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Sends a browser notification.
 * Uses Service Worker API when available (allows actions + persistent display).
 * Falls back to the basic Notification constructor.
 */
export async function sendBrowserNotification(
  opts: PushNotificationOptions
): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;

  const notifOpts: NotificationOptions = {
    body: opts.body,
    icon: opts.icon ?? '/icon-192.svg',
    badge: opts.badge ?? '/icon-192.svg',
    tag: opts.tag,
    silent: opts.silent ?? false,
    data: opts.data,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(opts.title, notifOpts);
        return;
      }
    }
    // Fallback: basic Notification (no actions, auto-closes on mobile)
    new Notification(opts.title, notifOpts);
  } catch (err) {
    captureError(err, { tags: { type: 'push_notification_error' } });
  }
}

// ─── Scheduled triggers ────────────────────────────────────────

const STREAK_NOTIF_TAG = 'va-streak-risk';
const REVIEW_NOTIF_TAG = 'va-review-due';
const DIGEST_NOTIF_TAG = 'va-weekly-digest';

/**
 * Shows a streak-at-risk notification.
 * Call when `isStreakAtRisk === true` on app load.
 */
export async function notifyStreakAtRisk(streakDays: number): Promise<void> {
  await sendBrowserNotification({
    title: '🔥 Streak at risk!',
    body: `Your ${streakDays}-day streak ends today. Capture a thought to keep it going.`,
    tag: STREAK_NOTIF_TAG,
    data: { screen: 'recording' },
  });
}

/**
 * Shows a flashcard review reminder.
 */
export async function notifyReviewDue(dueCount: number): Promise<void> {
  if (dueCount === 0) return;
  await sendBrowserNotification({
    title: '📚 Flashcards due',
    body: `${dueCount} card${dueCount === 1 ? '' : 's'} ready for review.`,
    tag: REVIEW_NOTIF_TAG,
    data: { screen: 'flashcards' },
  });
}

/**
 * Shows a weekly digest ready notification.
 */
export async function notifyWeeklyDigestReady(noteCount: number): Promise<void> {
  await sendBrowserNotification({
    title: '📊 Weekly Digest ready',
    body: `You captured ${noteCount} thoughts this week. See what patterns emerged.`,
    tag: DIGEST_NOTIF_TAG,
    data: { screen: 'home' },
  });
}
