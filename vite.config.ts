import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon-192.svg', 'icon-512.svg', 'apple-touch-icon.svg', 'manifest.json'],

        // Manifest is served from public/manifest.json — disable injection to avoid duplication
        manifest: false,

        workbox: {
          // Cache static assets: JS, CSS, HTML, fonts, SVGs
          globPatterns: ['**/*.{js,css,html,svg,woff,woff2,ico}'],

          // The intelligence worker chunk bundles Transformers.js (>2 MB) —
          // raise the precache cap so offline mode still gets the worker.
          // Model weights themselves are NOT precached (see runtime caching).
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

          // Runtime caching strategies
          runtimeCaching: [
            // Google Fonts — CacheFirst (rarely changes)
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            // ONNX Runtime WASM binary — Vite bundles it same-origin into
            // /assets (~23 MB), too large to precache without slowing SW
            // install. CacheFirst at runtime → offline after first inference.
            // Model weights from huggingface.co are cached by Transformers.js
            // itself via the browser Cache API ('transformers-cache').
            {
              urlPattern: /\/assets\/.*\.wasm$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'onnx-wasm',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 180 },
              },
            },
            // Firebase Auth — NetworkFirst (needs fresh tokens)
            {
              urlPattern: /^https:\/\/.*\.firebaseapp\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-auth',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 },
              },
            },
          ],

          // Skip waiting so new SW activates immediately on update
          skipWaiting: true,
          clientsClaim: true,

          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/(api|_)/],
        },

        devOptions: {
          enabled: false, // Disable SW in dev to avoid HMR conflicts
        },
      }),
    ],

    // Intelligence worker uses dynamic import (Transformers.js) — requires ES format
    worker: {
      format: 'es' as const,
    },

    optimizeDeps: {
      // onnxruntime-web inside Transformers.js breaks esbuild pre-bundling
      exclude: ['@huggingface/transformers'],
    },

    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },

    build: {
      // Raise chunk size warning to 1 MB (Three.js is inherently large)
      chunkSizeWarningLimit: 1024,
      rollupOptions: {
        output: {
          // Keep Three.js separate so it can be cached aggressively
          manualChunks(id) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'three-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
          },
        },
      },
    },
  };
});
