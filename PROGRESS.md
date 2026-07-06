# VoiceAction — Project Status

**Status: 100% code-complete. Ready for beta once operational setup below is finished.**

`npm run lint` — 0 TypeScript errors · `npm test` — 64/64 passed · `npm run build` — 0 errors, PWA service worker generated.

---

## What's Built

| Area | State |
|------|-------|
| Voice capture & recording | Web Speech API, live waveform, auto-stop on silence |
| AI note processing | **Fully local** deterministic NLP (title, type, mood, tags, summary, actions) — no API key, <1 ms/note |
| Auth | Firebase Auth — email/password + Google, route guards, password reset |
| Persistence | Firestore (`users/{uid}/crystals/{crystalId}`), offline-first via `persistentLocalCache`, realtime `onSnapshot` sync, localStorage fallback when Firebase isn't configured |
| Search | Two-tier: instant BM25 lexical + local semantic embeddings (`multilingual-e5-small` q8 on-device, hybrid-ranked) |
| Knowledge graph | Auto-linking via local keyphrase topics + on-device embedding similarity with adaptive thresholds; explainable confidence-scored edges |
| Thought Graph (3D) | Deterministic instanced-rendering "knowledge universe" — see Sprint 13 below |
| Flashcards | Full SM-2 spaced repetition (4-button review, interval/ease scheduling) |
| Streaks | Ember/Blaze/Inferno/Phoenix levels, 1 freeze/week, persisted to Firestore |
| Insights | Theme bars, emerging topics, hub notes — pure client-side computation |
| Export | Markdown, CSV, JSON, TXT, PDF (print), share image, clipboard |
| PWA | `vite-plugin-pwa`, offline shell, installable, auto-update service worker |
| Onboarding | 3-slide overlay, demo workspace (8 sample notes), graph coach marks, rich empty states everywhere |
| Notifications | Toast system (streaks, connections, exports) + foreground browser Notification API |

Full architecture and conventions: [CLAUDE.md](CLAUDE.md). Design tokens: [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md).

---

## Remaining Work (Operational, Not Code)

1. ~~Fill `.env` with real Firebase credentials~~ ✅ Done (July 2026) — project `voiceaction-11633` wired locally; hosting env vars still needed at deploy time
2. `firebase deploy --only firestore:rules` — data is unprotected until this runs (~5 min)
3. Deploy to Vercel or Firebase Hosting — see [DEPLOYMENT.md](DEPLOYMENT.md) (~5 min)
4. Smoke test the live URL against `DEPLOYMENT.md` §5 (~30 min)
5. Write Privacy Policy + Terms of Service pages — legal requirement before public launch (~2–4 hrs)
6. Optional: PNG PWA icons for universal support, Sentry DSN for error monitoring

Known non-blocking UX/tech-debt items are tracked in [OPERATIONS.md](OPERATIONS.md).

---

## Milestone History

| Milestone | Highlights |
|-----------|-----------|
| Foundation & bug fixes | Firebase config hardening, Gemini model upgrade, signup display-name fix, broken ThoughtGraph navigation fixed |
| Firestore cloud sync | Real CRUD + realtime `onSnapshot`, offline persistence, localStorage → Firestore migration, `users/{uid}` doc for streaks/settings |
| Semantic intelligence | Gemini embeddings replaced keyword-only search; topic-extraction connection engine; insight service (themes, clusters, hub notes) |
| Retention engine | Full SM-2 flashcards; streak levels + freeze; insight dashboard on Home |
| PWA & hardening | Service worker + offline shell; push-style notifications; Sentry-ready monitoring; security audit (removed `prompt()` XSS vector, URL allow-listing) |
| ThoughtGraph visual redesign | 3-layer node design, cluster halos, bezier connections, rich inspector panel |
| ThoughtGraph wiring | Light-mode support, working Edit/Pin actions, deterministic cluster layout |
| ThoughtGraph layout refinement | Inspector panel cleared bottom nav on all viewports, fixed scroll, readable labels in both themes |
| Full product audit | Fixed critical UX/trust bugs: broken Sign Out, broken Export, alarming internal auth copy, dead links |
| Activation & onboarding | 3-slide onboarding, demo workspace, graph coach marks, rich empty states across every screen |
| Release candidate validation | Fixed critical note-corruption bug (HTML-entity double-encoding on write); mobile safe-area fixes; full E2E + security pass |
| Deployment prep | Deployment docs, Firebase config files (`firebase.json`, `firestore.rules`, `.firebaserc`), verified no secrets in git history |
| Signature Thought Graph | Rewrote the graph's rendering and layout engine — see Sprint 13 below |
| **Local intelligence migration (current)** | Removed Gemini entirely; all AI now runs on-device — see Sprint 14 below |

---

## Sprint 13 — Signature Thought Graph: The Knowledge Universe

Transformed the Thought Graph into a deterministic, performant 3D "knowledge universe" scaling from 5 to 1,000+ notes, without touching any other workflow (no Firestore schema changes, no new dependencies).

**Architecture**
- `src/features/thought-graph/graphLayout.ts` (new) — deterministic layout engine: galaxy/sphere/small-universe modes, cluster detection, importance scoring, device quality tiers, adaptive label budgets. All jitter is hashed from note ids — zero randomness, so the universe is spatially stable across visits.
- `src/features/thought-graph/ThoughtGraph.tsx` (rewritten) — instanced node rendering (1 draw call for all nodes), a GPU point-sprite glow layer, one merged edge buffer for the connection web, curved highlight edges + flow particles only for the focused node, camera rig with fly-to-node/cluster, and a responsive inspector (side panel desktop / bottom sheet mobile) with Open/Edit/Pin/Delete.
- Respects `prefers-reduced-motion`; quality tiers cap DPR/star count/segments on weaker or mobile devices.

**Verified performance** (layout engine, measured):

| Notes | Layout time | Edges | Quality tier |
|-------|------------|-------|-------------|
| 5 | 0.3 ms | 9 | high |
| 50 | 0.3 ms | 67 | high |
| 250 | 0.7 ms | 516 | medium |
| 1000 | 1.9 ms | 2598 | low |

Draw calls at 1,000 notes: ~6 total, vs. ~5,000 in the prior per-node-mesh implementation.

**Known limitations:** positions are derived, not persisted (stable per note-set, but a cluster re-flows when notes are added to it); no arrow-key node traversal yet; real-device 60fps and visual QA still needs a manual browser pass.

**Validation:** `npm run lint` — 0 errors · `npm run build` — clean · layout determinism and NaN-safety verified at 5/50/250/1000 notes.

---

## Sprint 14 — Local Intelligence Migration (July 2026)

Removed Gemini as a dependency entirely. All intelligence — note structuring, embeddings, semantic search, connections, clustering, insights — now runs **on-device** with zero API keys and zero per-request cost. Full detail: [LOCAL_INTELLIGENCE_MIGRATION.md](LOCAL_INTELLIGENCE_MIGRATION.md).

**What changed**
- New `src/features/intelligence/` subsystem: deterministic NLP (title/type/mood/tags/summary/actions, EN+HI+KN aware), `Xenova/multilingual-e5-small` (q8) embeddings via Transformers.js in a Web Worker (WebGPU→WASM), IndexedDB vector store with content-hash + model-version invalidation, BM25+semantic hybrid search, adaptive-threshold connection engine with explainable edge reasons, deterministic label-propagation clustering with keyphrase labels.
- Removed: `geminiService`, `embeddingService`, old `semanticSearch`, old `connectionEngine`, TranslationPanel (translation was inherently Gemini-only), `VITE_GEMINI_API_KEY`, `@google/genai`, `keyword-extractor`.
- Model readiness UX: idle preload after auth, "Preparing local intelligence…" pill with download progress + one-time privacy notice, retry on failure. Note capture never blocks on the model.
- Test infrastructure added: vitest + fake-indexeddb, **64 tests** across NLP, vector store, connections, clustering, and search (including graceful semantic→lexical degradation).

**Measured**: deterministic NLP 0.07 ms/note · BM25 search 7.5 ms @1000 notes · clustering 113 ms @1000 notes · model cold load 15.6 s (download) / warm 0.3 s / 5 ms per embedding (Node) · cross-lingual EN↔HI similarity 0.867 validates the multilingual model choice.

**Known limitations**: translation feature removed; first model download is ~118 MB (config-switchable to a 23 MB English-only model); mood/type are honest rule-based classifiers (low confidence → Neutral/text).

**Validation**: `npm run lint` 0 errors · `npm test` 64/64 · `npm run build` clean · zero Gemini code, config, or network references remain (grep-verified).

---

## Firebase Configuration (July 2026)

Wired the app to the real Firebase project **`voiceaction-11633`**:
- `.env` (gitignored, never committed) populated with all 6 `VITE_FIREBASE_*` values; `measurementId` intentionally omitted (Analytics unused); obsolete Gemini key retained but marked deletable; `VITE_DEV_BYPASS_AUTH` commented out so dev mode exercises real auth.
- `.firebaserc` default project set to `voiceaction-11633`.
- Verified: single `initializeApp` guarded by `getApps()`; Auth + Firestore (offline-persistent) share the one app instance; dev server boots clean; `npm run lint` 0 errors; `npm run build` clean with all config values injected; no credentials in any tracked file.
- Remaining Firebase Console steps: enable Email/Password + Google providers, create Firestore DB, `firebase deploy --only firestore:rules`.

---

## Post-Auth Routing Loop Fix (July 2026)

**Bug:** after successful Firebase signup/login the app stayed on the public Landing ("Get Started" → Auth → loop); the authenticated app never opened.

**Root cause:** `AuthContext.onAuthStateChanged` awaited Firestore (`getUserDoc` → `createUserDoc`) *before* calling `setAuthState({ isAuthenticated: true })`. With the Firestore database not yet created and offline persistence enabled, `setDoc` never settles (it queues until backend ack), so authenticated state was never set even though Firebase Auth succeeded.

**Fix (architectural, no redirect patches):**
- `src/context/AuthContext.tsx` — authenticates immediately from the Firebase user (sole source of truth); Firestore profile load/create and note migration moved to non-blocking, fully-caught enrichment.
- `src/context/authResolution.ts` (new) — pure, race-safe helpers: `baseAuthUserFromFirebase` (cache-merge), `applyUserDocEnrichment` (structurally cannot clear auth, ignores stale/post-logout enrichment).
- `src/routing/appRouting.ts` (new) — canonical routing state machine (`authPhase` / `resolveView` / `guardRedirect` / `shouldShowOnboarding`); `App.tsx` guard + render now both derive from it.
- `src/routing/__tests__/routing.test.ts` (new) — 19 regression tests covering all 10 required scenarios, including "Firestore unavailable after successful auth → app still opens".

**Validation:** `npm run lint` 0 errors · `npm test` 83/83 · `npm run build` clean. Firestore absence degrades gracefully to local persistence; the queued user-doc write syncs automatically once the database is created.

---

## Sprint 15 — Pre-Deployment Product Experience Rebuild (July 2026)

Final experience upgrade before public deployment: navigation, capture, and first-open rebuilt around one visual language.

**Navigation** — Search removed from the bottom nav (it duplicates the TopBar search); recomposed symmetrically as Home · History ‖ ● Record ‖ Graph · Settings with aria-labels/`aria-current`, focus rings, ≥44px targets, spring active indicator, safe areas preserved.

**Recording** — state machine hardened before the redesign: `stopOnceRef` guards eliminate the rapid-Stop double-save race (both capture surfaces), `onend` no longer clobbers error status, Cancel is disabled mid-save, and mic streams/AudioContext/timers are provably torn down on stop/cancel/unmount. New `VoiceField` visualization: a Canvas-2D radial frequency architecture (96 log-mapped FFT spokes around a breathing core) + particle constellation emitting on real speech energy, driven by a parallel `useMicAnalyser` (getUserMedia → AnalyserNode) stream — zero fake audio, zero new runtime deps, deterministic fallback when the mic is unavailable, `prefers-reduced-motion` respected, processing renders as an inward collapse. The field goes live from mic audio even while the speech service handshakes.

**First-open** — landing rebuilt as a looping product story (`LandingHero`): six real saved-thing fragments (reel/purchase/event/idea/link/task) scatter → get captured into orbit around the core → connect into a typed constellation → a natural-language query lights up the right memory ("that warm-up reel I saved" → FOUND). Demo-first ordering on mobile so the story is in the first viewport; copy cut to one headline + two sentences; capture-type row, trust line, three-step strip. The decorative Orb/waveform/chips were removed; capture on the landing now uses the same VoiceField as the Recording screen.

**Fixes found via screenshot-driven browser validation** (Playwright, 8 viewports, dark+light): mobile hero was below the fold and clipped (reordered); constellation edges/dimmed chips too faint (retuned); IntelligenceIndicator overlapped the Stop control on recording (now nav-screens only) and the floating record button (raised offset); **dev-bypass mode wrote to Firestore without auth** once real credentials existed — demo workspace failed to load (factory now selects localStorage under bypass); recording timer now counts from mic-live.

**Validation:** lint 0 errors · 83/83 tests · production build clean · 18 screenshots across 320/375/390/430/768/1024/1366/1440, both themes, inspected and iterated twice. Dev tooling added: `playwright` (devDependency) + `scripts/screenshots.mjs`.

---

## Final UI Polish (July 2026)

- **Notifications moved to the top**: Toaster `top-center` with `offset` + `mobileOffset` = `calc(safe-area-top + 84px)` — clears the fixed TopBar and notch, stacks downward, dismissible, never covers navigation.
- **Landing visual elevation (story/copy unchanged)**: page-wide `MemoryBackdrop` (deterministic constellation motes + short neighbor links, pointer parallax, reduced-motion static frame); hero constellation gets a radial stage vignette + slowly rotating orbital paths + glow-halo edges + crisper glass chips; headline gains gradient-ink treatment on "you almost forgot."; the three steps re-set as numbered nodes on a connection line (horizontal desktop / vertical rail mobile) — the graph language instead of generic cards; CTA rebuilt with layered specular depth. One screenshot-driven iteration: initial backdrop links read as smears → retuned (shorter links, fainter lines, brighter motes).
- **Real bug found & fixed during validation**: the screen-transition wrapper's `y` transform made it the containing block for `position:fixed` children — the TopBar scrolled away with the page on every screen. Transition is now a pure crossfade; TopBar verified pinned while scrolled.

**Validation:** lint 0 errors · 83/83 tests · build clean · screenshots at 390/1440, both themes, toast + scroll states inspected.
