# IMPLEMENTATION_PLAN.md

## High‑Level Execution Flow

The implementation is broken into **phased, incremental sprints** that preserve the existing production app. Each step adds a **self‑contained feature** with its own routing, state slice, and UI component, then merges into the main navigation only after automated regression tests pass.

### Safe Integration Principles

| Principle | How It Is Enforced |
|-----------|--------------------|
| **Feature Flags** | Wrap every new route/component in a `FeatureToggle` (Zustand flag) that defaults to `off` in production. Enables gradual rollout and easy rollback. |
| **Isolated Routes** | New pages are added under `/app/routes/` with their own lazy‑loaded bundle. Existing routes remain untouched. |
| **Backward‑compatible API** | The Gemini service wrapper accepts an optional `mode` param; the MVP uses the default mode, while advanced prompts are added later without breaking the endpoint. |
| **Data Migration Guardrails** | Firestore writes use versioned document schemas (`v1`, `v2`). The UI reads the latest version but falls back to older fields if missing. |
| **Automated Smoke Tests** | After each merge, CI runs a Cypress suite that validates the core flow (capture → crystal → home feed) before deployment. |
| **Staged Deployments** | Deploy to a **staging** environment first; once verified, promote to production via a canary rollout (10 % of users). |

---

## Phase‑by‑Phase Implementation Steps

### Phase 0 – Project Foundations (Weeks 1‑2)
1. **Scaffold Repository** – Run `npx -y create-vite@latest ./` with React 19 & TypeScript, commit initial code.
2. **Configure CI/CD** – GitHub Actions: lint, type‑check, Vitest, Cypress, build.
3. **Add Core Dependencies** – Install Tailwind 4, Framer Motion, React‑Three‑Fiber, Zustand, React Router 7, Lucide React, Sonner, date‑fns, react‑markdown, remark‑gfm, Firebase v9 modular, Sentry, PostHog.
4. **Setup Firebase** – Create Firebase project, enable Auth (Google & Email/Password) and Firestore. Add config to `src/shared/lib/firebase.ts` (environment variables stored in `.env`).
5. **Create Global Providers** – `AuthProvider`, `ThemeProvider`, `ZustandStoreProvider` in `src/app/providers/`.
6. **Implement Basic Layout** – Header, Footer, Bottom Navigation (as per design spec) with placeholder routes.
7. **Add Tailwind Theme Config** – Define light/dark palettes, spacing scale, typography tokens from the vision.
8. **Add Feature‑Toggle Hook** – `useFeatureFlag` using Zustand.

### Phase 1 – MVP (P0) (Weeks 3‑10)
#### 1. One‑Tap Voice Capture
- Create `features/recording/components/VoiceOrb.tsx` with pulsating animation (Framer Motion) and click handler.
- Hook `useSpeechRecognition` wraps Web Speech API, returns transcript and audio buffer.
- Add real‑time waveform/3‑D blob visualizer using React‑Three‑Fiber (fallback to simple canvas for low‑end).
- Wire to `recording` route (`/record`).

#### 2. AI Note Crystallization
- Implement serverless function `api/crystallize` (Node) that forwards transcript to Gemini 1.5 Pro and returns the **Crystal JSON** schema.
- Create `features/ai/services/gemini.ts` client wrapper.
- Add loading UI with crystal‑forming animation (Framer Motion).

#### 3. Firestore Persistence
- Define `Crystal` TypeScript interface in `shared/types/crystal.ts`.
- Implement CRUD service `features/crystals/services/crystalService.ts` (create, read, update, delete) with offline enable (`enableIndexedDbPersistence`).
- Store each crystal under `users/{uid}/crystals/{crystalId}`.

#### 4. Home Feed (Crystal Feed)
- Build `HomeScreen` route displaying:
  - Pinned carousel (horizontal scroll)
  - Today’s crystals list with mood‑colored borders
  - “Your Week in Thoughts” summary card
  - “Forgotten Gems” section (simple query for older crystals with low `lastSeen`).
- Use `react-window` for virtualized list on desktop.

#### 5. Quick Text Capture
- Add pull‑down gesture component on HomeScreen that reveals a text input.
- Re‑use the same AI service to process text into a Crystal.

#### 6. Note Editing with AI Suggestions
- Create `EditCrystalScreen` with content‑editable fields.
- Add AI suggestion buttons (`Make concise`, `Extract action items`, `Convert to bullets`). Each triggers a Gemini prompt and patches the crystal.

#### 7. Basic Search (Keyword)
- Implement Firestore text‑based query on `title`/`body`.
- UI under `/search` route with filter pills (All, Ideas, Tasks, etc.).

#### 8. Dark/Light Mode Toggle
- Add animated toggle component (circular reveal) in Header.
- Persist user preference in Firestore `settings/theme`.

#### 9. Streak Engine (Basic)
- Store `lastCaptureDate` per user. Compute streak on login, display badge in Header.
- Add daily reset logic via a Cloud Function (cron).

#### 10. Error Boundaries & Loading States
- Global `ErrorBoundary` component (Sentry integration).
- Skeleton loaders for list items (Framer Motion shimmer).

#### 11. Testing & QA
- Write unit tests for each service (Vitest).
- End‑to‑end Cypress tests covering capture → crystal → home feed → edit → delete.
- Conduct accessibility audit with axe.

### Phase 2 – Immediate Enhancements (P1) (Weeks 11‑16)
1. **Thought Graph (3D)** – Lazy‑load `features/thought-graph` route. Use React‑Three‑Fiber with force‑directed layout; fetch node/edge data from Firestore `graph/{uid}` collection.
2. **Auto‑Linking & Pattern Detection** – Extend Gemini prompts to suggest connections; store `connections` array in each crystal.
3. **Forgotten Gems Resurfacing** – Background Cloud Function runs nightly to find crystals with low recent activity but high connection count; surface via UI.
4. **Weekly Thought Digest** – Cloud Function aggregates weekly stats, stores a digest document, UI card on HomeScreen.
5. **Smart Notifications** – Implement in‑app toast system (Sonner) with configurable triggers; later add Web Push Service Worker.
6. **Export & Share** – Add `ExportService` that converts a crystal to Markdown, PDF (pdfmake), CSV, and generates a shareable image using `html2canvas` + custom CSS.
7. **Refine Theming & Micro‑Interactions** – Polish glass‑morphism on modals, add hover lifts, improve transition timings per design spec.
8. **Performance Optimisation** – Code‑split Thought Graph bundle, enable lazy loading of heavy 3‑D assets, add Lighthouse CI.

### Phase 3 – Delighters (P2) (Weeks 17‑22)
1. **Voice Playback with Highlighted Transcript** – Store original audio blob in Firestore (optional), build synchronized playback component.
2. **Flashcard Generation** – Prompt Gemini for Q&A pairs, store in `flashcards/{crystalId}` collection, UI for spaced‑repetition review.
3. **Daily Prompt** – Cloud Function generates a reflective question based on recent mood tags, UI banner on HomeScreen.
4. **Push Notifications** – Register Service Worker, request permission, send scheduled notifications for streak risk and digest.
5. **PWA Offline Mode** – Enable `vite-plugin-pwa`, cache essential assets, store pending crystals locally and sync on reconnect.
6. **Keyboard Shortcuts (Desktop)** – Global shortcut manager hook (`useHotkeys`) for R, N, /, etc.
7. **Advanced PDF Export** – Use `@react-pdf/renderer` for high‑fidelity PDFs with custom fonts and graphics.
8. **Badge System** – Extend streak engine to award badges, display in profile.
9. **Onboarding Tour** – Guided overlay using `react-joyride` to walk new users through capture, feed, and edit.

### Phase 4 – Scaling & Collaboration (Weeks 23‑26)
- Introduce **Team Workspaces**: new Firestore top‑level `teams/{teamId}` collection, permission rules, shared Thought Graph UI.
- Build **Third‑Party Sync Connectors** (Notion, Todoist) via OAuth and webhook adapters.
- Optimize **Analytics** dashboards (PostHog) for feature adoption metrics.

### Phase 5 – Moonshot (Beyond 6 months)
- Implement **Second Brain Dashboard**, **Predictive Insights**, **Hardware Recording Device** integration, etc., as outlined in the Vision.

---

## Deployment Checklist per Sprint
1. **Branch Strategy** – Feature branches merged into `develop`; `main` is production.
2. **Feature Flag Review** – Ensure new flag defaults to `off`.
3. **Run CI** – Lint, type‑check, unit tests, Cypress.
4. **Staging Deploy** – Deploy to `staging` environment, run manual QA.
5. **Canary Release** – Enable flag for 10 % of users, monitor Sentry & PostHog.
6. **Full Rollout** – Flip flag on, merge to `main`, tag release.

---

## Frontend Experience Guidelines (Embedded)
- **Maintain Theme Consistency** – Use Tailwind tokens (`bg-surface`, `text-primary`, `border-accent`) everywhere.
- **Smooth Scroll‑Based Interactions** – Implement IntersectionObserver for section fade‑ins; use `scroll‑snap‑type` for carousel sections.
- **Subtle Motion** – Parallax on hero orb, spring‑based button presses, glass‑morphism on modals (backdrop‑blur, border‑glow).
- **Micro‑Interactions** – Hover lift on cards, press scale on mobile, swipe gestures for pin/delete, animated toggle for dark mode.
- **Avoid Over‑Glowing & Cheap Gradients** – Stick to the curated accent gradients defined in the color system.
- **Realistic Visual Assets** – Use low‑poly crystal models from Spline, subtle depth layers, no generic CSS blobs.
- **Typography & Spacing** – Follow the scale defined in the vision (Display 48 px → Caption 12 px, base unit 4 px).
- **Accessibility** – Ensure all interactive elements have ARIA labels, focus outlines, and meet WCAG AA contrast.

---

*Document Version: 1.0*
*Last Updated: March 2026*
