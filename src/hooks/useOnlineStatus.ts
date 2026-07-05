import { useState, useEffect } from 'react';

export interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;   // true briefly after reconnecting — triggers "syncing" state
  lastOnlineAt: number | null;
}

/**
 * Tracks browser online/offline status.
 * `wasOffline` is true for 3 seconds after reconnect to show a sync indicator.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(
    navigator.onLine ? Date.now() : null
  );

  useEffect(() => {
    let syncTimer: ReturnType<typeof setTimeout>;

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(Date.now());
      setWasOffline(true);
      // Clear "syncing" indicator after 3 seconds
      syncTimer = setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      clearTimeout(syncTimer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(syncTimer);
    };
  }, []);

  return { isOnline, wasOffline, lastOnlineAt };
}
