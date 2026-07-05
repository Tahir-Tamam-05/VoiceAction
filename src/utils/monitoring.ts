// Error Monitoring Utility
// Lightweight wrapper designed to be dropped into Sentry without code changes.
// Works standalone (console logging) when VITE_SENTRY_DSN is not configured.
//
// To enable Sentry:
//   1. npm install @sentry/react
//   2. Add VITE_SENTRY_DSN to .env
//   3. Uncomment the Sentry init block below

const SENTRY_DSN = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
const IS_PROD = (import.meta as any).env?.PROD as boolean;

// ─── Context types ─────────────────────────────────────────────

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string };
  level?: 'fatal' | 'error' | 'warning' | 'info';
}

// ─── Init ──────────────────────────────────────────────────────

export function initMonitoring(): void {
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError(new Error(`Unhandled rejection: ${event.reason}`), {
      tags: { type: 'unhandled_rejection' },
      level: 'error',
    });
  });

  // Capture uncaught errors
  window.addEventListener('error', (event) => {
    if (event.error) {
      captureError(event.error, {
        tags: { type: 'uncaught_error', source: event.filename || 'unknown' },
        level: 'error',
      });
    }
  });

  if (IS_PROD && SENTRY_DSN) {
    // ── Sentry integration (uncomment when @sentry/react is installed) ──
    // import('@sentry/react').then(({ init, browserTracingIntegration }) => {
    //   init({
    //     dsn: SENTRY_DSN,
    //     integrations: [browserTracingIntegration()],
    //     tracesSampleRate: 0.1,
    //     // Strip sensitive user content from breadcrumbs
    //     beforeBreadcrumb(breadcrumb) {
    //       if (breadcrumb.category === 'xhr' && breadcrumb.data?.url?.includes('huggingface')) {
    //         delete breadcrumb.data.response_body;
    //       }
    //       return breadcrumb;
    //     },
    //     beforeSend(event) {
    //       // Never send API keys or note content
    //       if (event.request?.data) delete event.request.data;
    //       return event;
    //     },
    //   });
    // });
    console.info('[Monitoring] Sentry DSN found but @sentry/react not installed. Add it to activate.');
  }
}

// ─── Capture ───────────────────────────────────────────────────

export function captureError(error: unknown, ctx?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  // In production with Sentry configured, forward to Sentry
  // (would call Sentry.captureException here)

  // Always log to console in dev; only log in prod if not Sentry-handled
  if (!IS_PROD || !SENTRY_DSN) {
    const level = ctx?.level ?? 'error';
    const method = level === 'warning' || level === 'info' ? 'warn' : 'error';
    console[method]('[Monitoring]', err.message, ctx?.extra ?? '');
  }
}

export function captureMessage(message: string, ctx?: ErrorContext): void {
  if (!IS_PROD || !SENTRY_DSN) {
    console.info('[Monitoring]', message, ctx?.tags ?? '');
  }
}

/**
 * Sets the current authenticated user for error context.
 * Call after successful sign-in.
 */
export function setMonitoringUser(userId: string): void {
  // Sentry: Sentry.setUser({ id: userId })
  if (!IS_PROD) console.debug('[Monitoring] User set:', userId);
}

export function clearMonitoringUser(): void {
  // Sentry: Sentry.setUser(null)
}
