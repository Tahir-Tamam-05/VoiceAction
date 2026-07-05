// Centralized observability event logger for dev/production
import { OBSERVABILITY_EVENTS } from '../config';

export function logEvent(event: keyof typeof OBSERVABILITY_EVENTS, detail?: any) {
  const key = OBSERVABILITY_EVENTS[event];
  try {
    // Bump localStorage counter for this event
    const count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(count));
    // Write details to console
    if (detail) {
      // eslint-disable-next-line no-console
      console.info(`[Observability] ${key}:`, detail);
    } else {
      // eslint-disable-next-line no-console
      console.info(`[Observability] ${key}`);
    }
  } catch (e) {
    // Fallback: always log to console, even if localStorage is not available
    // eslint-disable-next-line no-console
    console.warn(`[Observability] Failed localStorage event log: ${key}`, e, detail);
  }
}
