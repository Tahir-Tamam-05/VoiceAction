import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initMonitoring } from './utils/monitoring';

// Initialise error monitoring before anything else
initMonitoring();

// Register service worker (PWA) — only in production
// vite-plugin-pwa injects the virtual module; this is a no-op in dev
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          // New content available — prompt user to reload
          // Handled gracefully: auto-update is configured in vite.config.ts
          console.info('[SW] New content available — refreshing…');
        },
        onOfflineReady() {
          console.info('[SW] App is ready to work offline.');
        },
        onRegistered(r) {
          console.info('[SW] Registered:', r);
        },
        onRegisterError(error) {
          console.warn('[SW] Registration failed:', error);
        },
      });
    })
    .catch(() => {
      // PWA not available in this environment — fine
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
