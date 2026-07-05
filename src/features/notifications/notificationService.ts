// Notification Service - Smart toast system with configurable triggers
// Phase 2 Feature: Smart Notifications

import { toast } from 'sonner';
import { Crystal } from '../../types';

// Feature flag check
const isNotificationsEnabled = (): boolean => {
  const features = localStorage.getItem('va_feature_flags');
  if (features) {
    try {
      const parsed = JSON.parse(features);
      return parsed.smartNotifications !== false;
    } catch {
      return true;
    }
  }
  return true;
};

// User notification preferences
export interface NotificationPreferences {
  streakReminders: boolean;
  connectionHints: boolean;
  weeklyDigestReady: boolean;
  exportComplete: boolean;
  aiProcessingComplete: boolean;
  muteAll: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  streakReminders: true,
  connectionHints: true,
  weeklyDigestReady: true,
  exportComplete: true,
  aiProcessingComplete: true,
  muteAll: false,
};

const STORAGE_KEY = 'va_notification_prefs';

export const getNotificationPreferences = (): NotificationPreferences => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }
  return DEFAULT_PREFERENCES;
};

export const saveNotificationPreferences = (prefs: NotificationPreferences): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

// Toast variants following STYLE_GUIDE
const toastStyles = {
  default: {
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border-color)',
      color: 'var(--on-surface)',
    },
  },
  success: {
    style: {
      background: 'var(--surface)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      color: 'var(--on-surface)',
    },
  },
  warning: {
    style: {
      background: 'var(--surface)',
      border: '1px solid rgba(249, 115, 22, 0.3)',
      color: 'var(--on-surface)',
    },
  },
  error: {
    style: {
      background: 'var(--surface)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: 'var(--on-surface)',
    },
  },
  info: {
    style: {
      background: 'var(--surface)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      color: 'var(--on-surface)',
    },
  },
};

// Smart notification triggers
export const notifications = {
  // Streak risk warning
  streakAtRisk: (daysLeft: number) => {
    if (!isNotificationsEnabled()) return;
    const prefs = getNotificationPreferences();
    if (!prefs.streakReminders || prefs.muteAll) return;

    toast.warning(
      daysLeft === 0
        ? 'Streak ends today! Capture a thought to keep it going.'
        : `Streak at risk! ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`,
      {
        ...toastStyles.warning,
        duration: 5000,
        icon: '🔥',
        action: {
          label: 'Record Now',
          onClick: () => {
            window.dispatchEvent(new CustomEvent('navigate', { detail: { screen: 'recording' } }));
          },
        },
      }
    );
  },

  // New connection discovered
  connectionHint: (crystalTitle: string, relatedCount: number) => {
    if (!isNotificationsEnabled()) return;
    const prefs = getNotificationPreferences();
    if (!prefs.connectionHints || prefs.muteAll) return;

    toast.info(
      `Found ${relatedCount} connection${relatedCount === 1 ? '' : 's'} for "${crystalTitle}"`,
      {
        ...toastStyles.info,
        duration: 4000,
        icon: '🔗',
      }
    );
  },

  // Weekly digest ready
  weeklyDigestReady: (stats: { count: number; topMood: string }) => {
    if (!isNotificationsEnabled()) return;
    const prefs = getNotificationPreferences();
    if (!prefs.weeklyDigestReady || prefs.muteAll) return;

    toast.success(
      `Weekly Digest: ${stats.count} thoughts captured. Top mood: ${stats.topMood}`,
      {
        ...toastStyles.success,
        duration: 6000,
        icon: '📊',
      }
    );
  },

  // Export complete
  exportComplete: (format: string) => {
    if (!isNotificationsEnabled()) return;
    const prefs = getNotificationPreferences();
    if (!prefs.exportComplete || prefs.muteAll) return;

    toast.success(`Exported as ${format}`, {
      ...toastStyles.success,
      duration: 3000,
      icon: '💾',
    });
  },

  // AI processing complete
  aiProcessingComplete: (crystalTitle: string) => {
    if (!isNotificationsEnabled()) return;
    const prefs = getNotificationPreferences();
    if (!prefs.aiProcessingComplete || prefs.muteAll) return;

    toast.success(`"${crystalTitle}" processed`, {
      ...toastStyles.success,
      duration: 3000,
      icon: '✨',
    });
  },

  // Generic success/error/info
  success: (message: string, options?: { duration?: number; icon?: string }) => {
    if (!isNotificationsEnabled()) return;
    toast.success(message, {
      ...toastStyles.success,
      duration: options?.duration || 3000,
      icon: options?.icon,
    });
  },

  error: (message: string) => {
    if (!isNotificationsEnabled()) return;
    toast.error(message, {
      ...toastStyles.error,
      duration: 5000,
    });
  },

  info: (message: string) => {
    if (!isNotificationsEnabled()) return;
    toast.info(message, {
      ...toastStyles.info,
      duration: 4000,
    });
  },
};

// Hook for using notifications with auto-cleanup
export const useSmartNotifications = () => {
  return {
    ...notifications,
    preferences: getNotificationPreferences(),
    updatePreferences: saveNotificationPreferences,
  };
};

// Initialize notification system (call once in App)
export const initializeNotifications = (): void => {
  const checkOnLoad = async () => {
    const raw = localStorage.getItem('voiceaction_user');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.lastCaptureDate) return;

      const lastCapture = new Date(parsed.lastCaptureDate);
      lastCapture.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - lastCapture.getTime()) / (24 * 60 * 60 * 1000));

      if (daysSince === 1) {
        // In-app toast (always shown)
        notifications.streakAtRisk(0);

        // Browser push notification (only if permission granted)
        const { notifyStreakAtRisk, getNotificationPermission } = await import('./pushNotifications');
        if (getNotificationPermission() === 'granted') {
          notifyStreakAtRisk(parsed.currentStreak ?? 0);
        }
      }
    } catch {
      // Ignore parse errors
    }
  };

  // Delay to allow app to fully mount
  setTimeout(checkOnLoad, 2000);
};
