# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on port 3000 (0.0.0.0)
npm run build      # Production build (also serves as type-check pass via Vite)
npm run lint       # TypeScript type-check only (tsc --noEmit) — no eslint configured
npm run preview    # Serve the dist/ build locally
npm run clean      # Remove dist/
```

npm test           # Vitest — unit tests for the local intelligence engine

Always run `npm run lint`, `npm test`, and `npm run build` before considering a change complete.

## Environment Variables

All Vite env vars must be prefixed `VITE_` to be exposed to client code. Required variables (add to `.env`):

```
VITE_FIREBASE_API_KEY=      # Firebase — all 6 vars required for auth
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**There is no AI API key.** All intelligence runs on-device (see AI pipeline below). See `.env.example` for full documentation.

`src/config/firebase.ts` exports `isFirebaseConfigured: boolean` — all auth code gates itself on this flag. When `false`, Firebase never initialises and auth operations throw a descriptive error.

## Architecture

### Routing model

There is **no React Router**. Navigation is a single `currentScreen: Screen` state string in `App.tsx`. All screens are rendered in one `switch` statement inside `renderScreen()`. Route guards live in a `useEffect` in `App.tsx` that watches `isLoading` and `isAuthenticated`.

Lazy-loaded screens: `Search`, `History`, `Settings`, `EditNote`, `Flashcards`, `Auth`, `ThoughtGraph`.
Eagerly loaded: `Home`, `LandingRecord`, `Recording`.

`editingNote: Note | null` state in `App.tsx` is the only way to pass a note into `EditNoteScreen`. Set it via `handleEditNote(note)` or `setEditingNote(note)` before navigating to `'edit'`.

### Data flow

```
useAuth (hook)
  └─ AuthContext / AuthProvider  ← Firebase onAuthStateChanged
       └─ user.id drives everything below

useNotes(userId) (hook)
  └─ crystalService (singleton)    ← currently localStorage only
       └─ LocalStorageCrystalService
            key: voiceaction_crystals_{userId}
```

`useNotes` is the single source of truth for note state. It is called twice — once in `App.tsx` (to get `addNote`, `updateNote`, `deleteNote`) and once inside `HomeScreen` (to get `forgottenGems`, `weeklyStats`). Both calls receive the same `userId` so they read the same localStorage key.

### Core domain type

`Crystal` (in `src/types.ts`) is the canonical note type. `Note` is a type alias for `Crystal` kept for backward compatibility. Key fields:
- `id`, `title`, `content` (≤100 char summary), `body` (full text), `type`, `createdAt`, `updatedAt`
- `mood`, `moodColor` — AI-inferred, colour-coded in UI
- `linkedNoteIds`, `connections` — auto-linking graph data
- `lastSeen` — drives Forgotten Gems algorithm
- `version: 'v1' | 'v2'` — schema version; `migrateToCrystal()` upgrades on read

`migrateToCrystal()` in `crystalService.ts` is called on every read and write — it backfills missing fields and sets `moodColor` from `getMoodColor(mood)`.

### AI pipeline (fully local — no API key, no remote inference)

All intelligence goes through `src/features/intelligence/IntelligenceEngine.ts` (the single canonical entry point — never add a second intelligence path):
- `processNoteWithTimeout(text)` — deterministic NLP (title, type, mood, tags, summary); synchronous under the hood (<1 ms/note), async signature for call-site compatibility; returns `{ success, tags, data }`
- `transformConcise` / `transformExtractActions` / `transformBullets` — EditNote's local text transforms (extractive — never generative)
- `semantic/semanticSearch.ts` — two-tier search: instant BM25 lexical + local embedding rank over cached vectors (hybrid 0.65/0.35)
- `graph/connectionEngine.ts` — `enrichCrystalConnections()` builds `linkedNoteIds`/`connectionConfidence` from local keyphrase topics + embedding similarity with **adaptive thresholds** (model floor + μ+0.9σ, ≤8 edges/note)
- `graph/clustering.ts` + `clusterLabeler.ts` — deterministic label propagation + distinctive keyphrase labels (via `computeClusters()`)

Embeddings: `Xenova/multilingual-e5-small` (q8, 384-dim) via Transformers.js, run in a Web Worker (`workers/intelligence.worker.ts`, WebGPU→WASM fallback), managed by the `ModelManager` singleton (lazy load, idle preload from App.tsx, progress via `IntelligenceIndicator`). Vectors cache in IndexedDB (`va-intelligence` DB) keyed by content-hash + model version — never stored in Firestore, never sent anywhere. Model config, similarity floors, and thresholds live in `features/intelligence/config.ts`.

Tags are constrained to `TAG_TAXONOMY` (20 values in `src/utils/tagHelpers.ts`). `normalizeTags()` uppercases, deduplicates, and enforces taxonomy with `'OTHER'` as fallback; `extractTagsFromText()` delegates to the engine's signal-word tagger.

### Auth

`AuthProvider` wraps the entire app. Consumers use `useAuth()` → `useAuthContext()`. The hook exposes `login`, `signup`, `signInWithGoogle`, `logout`, `updateUser`. 

Streak fields (`lastCaptureDate`, `currentStreak`, `longestStreak`) are **not** stored in Firebase Auth — they are carried in `AuthUser` in localStorage under key `voiceaction_user`. On re-login, `onAuthStateChanged` merges these back from cache if `uid` matches.

### Styling

Tailwind v4 with a CSS-variable design token system. Semantic colour tokens (`bg-base`, `bg-surface`, `bg-surface-low`, `text-on-surface`, `text-text-secondary`, etc.) are defined in `src/index.css` under `:root` (light) and `.dark`. Dark mode is toggled by adding/removing the `dark` class on the root `div` in `App.tsx`.

Primary accent: `#f97316` (orange), exposed as `--color-primary` / Tailwind class `primary`.
Fonts: `Space Grotesk` (headlines, `font-headline`) and `Manrope` (body).

### Feature modules

`src/features/` holds self-contained features:
- `crystals/services/crystalService.ts` — storage layer (currently localStorage stub with `FirestoreCrystalService` class that inherits from `LocalStorageCrystalService` without overriding)
- `thought-graph/ThoughtGraph.tsx` — lazy-loaded React-Three-Fiber 3D graph; force-directed layout computed in `useForceDirectedLayout`; connections drawn from `crystal.linkedNoteIds`
- `export/exportService.ts` — Markdown / CSV / JSON / TXT file download; PDF via iframe+print; canvas share image
- `notifications/notificationService.ts` — Sonner toast wrappers only; no browser Push API
- `digest/weeklyDigestService.ts` — client-side weekly stats, stored in localStorage

### localStorage keys

| Key | Contents |
|-----|----------|
| `voiceaction_user` | `AuthUser` JSON (including streak fields) |
| `voiceaction_crystals_{uid}` | `Crystal[]` JSON array |
| `settings_model` | Legacy model-label setting (now always local) |
| `settings_notifications` | Notification toggle state |
| `settings_privacy` | Privacy toggle state |
| `settings_voice` | Voice selection label |
| `va_setting_quicklaunch` | `'true'` / `'false'` |
| `va_feature_flags` | JSON object with feature toggles |
| `va_weekly_digest` | Cached `WeeklyDigest` JSON |
| `va_last_digest_date` | Timestamp of last digest generation |
| `va_flashcards_reviewed` | `{ [noteId]: dateString }` review log |

### Known architectural constraints

- **Firestore not yet implemented.** `FirestoreCrystalService` extends `LocalStorageCrystalService` without overriding — all data remains in localStorage. When implementing Firestore, replace the body of `FirestoreCrystalService` and initialise `enableIndexedDbPersistence` during Firebase setup.
- **No Firestore user document.** Streak data lives only in localStorage. Implementing `users/{uid}` document in Firestore is required before streaks survive logout.
- **Single-device data.** Until Firestore is live, notes do not sync across devices or survive a browser cache clear.
- **No test suite.** `npm run lint` (tsc) is the only automated check.
