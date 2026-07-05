# VoiceAction — Operations Manual

## Monitoring Checklist

Run after every deploy:

- [ ] Check Firebase Console → Authentication → Users (no sign-in errors)
- [ ] Check Firebase Console → Firestore → Usage (read/write counts reasonable)
- [ ] Check browser DevTools → Console (no uncaught errors)
- [ ] Check Sentry (if configured) — zero new issues in last 24 h
- [ ] Verify service worker is registered (`navigator.serviceWorker.ready`)
- [ ] Verify PWA installability via Lighthouse audit

---

## Known Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Background push notifications | ❌ | Requires VAPID keys + backend server. Current impl fires when app is open only. |
| Biometric lock | ❌ UI only | `navigator.credentials` API not implemented |
| Local encryption | ❌ UI only | `crypto.subtle` not applied to localStorage |
| Voice selection setting | ✅ UI only | Stored label only; no voice synthesis implemented |
| AI cover image generation | ❌ Removed | Text models can't return image URLs |
| PWA icons (PNG) | ⚠️ | SVG icons work in Chrome/Edge. Replace with PNG for universal support |

---

## Known UX / Tech Debt (non-blocking)

Carried over from a Sprint 9 product audit; confirmed still present as of Sprint 13. None block release — polish as time allows.

| Item | Location | Notes |
|------|----------|-------|
| `NoteCard` shows locale time (e.g. "3:45 PM") for all notes | `src/components/NoteCard.tsx` | Notes older than 24h have no date context; consider relative/absolute date for older notes |
| Recent notes list hard-capped at 3, no pagination | `src/Home.tsx` (`recentNotes`) | Power users with many notes can't see more from Home |
| `glass-card` in light mode uses low-opacity white on a near-white background | `src/index.css` `.glass-card` | Can read as low-contrast in light mode |
| `updateStreakOnCapture` imported both statically and dynamically in the same file | `src/App.tsx` | Static import at top + `await import(...)` inside `handleAddNote` — redundant, harmless but worth cleaning up |
| TopBar fixed height vs content top padding | `src/components/TopBar.tsx` | Verify `pt-*` on screen content still matches TopBar height after any header changes |

---

## Security Considerations

| Item | Status |
|------|--------|
| Firebase rules restrict users to own data | ✅ (deploy `firestore.rules`) |
| Input HTML-entity sanitization | ✅ `utils/sanitization.ts` |
| Link `href` validates `https?://` prefix | ✅ |
| No `dangerouslySetInnerHTML` usage | ✅ |
| No `eval()` usage | ✅ |
| AI inference — fully on-device (no key, no note text leaves the device) | ✅ Local model via Transformers.js |
| Firebase API key — client-side (by design) | ✅ Protected by Firestore rules |
| No passwords stored | ✅ Firebase Auth handles credentials |

---

## Incident Response

### App Won't Load

1. Check Firebase hosting status: [status.firebase.google.com](https://status.firebase.google.com)
2. Check browser console for errors
3. Clear service worker: DevTools → Application → Service Workers → Unregister
4. Hard reload: Cmd+Shift+R / Ctrl+Shift+R

### Auth Broken

1. Firebase Console → Authentication → check Sign-in methods are enabled
2. Verify `VITE_FIREBASE_AUTH_DOMAIN` matches the project
3. Check Authorized Domains includes production URL

### Notes Not Syncing

1. Firebase Console → Firestore → check rules allow reads/writes
2. DevTools → Network → filter `firestore.googleapis.com` — look for 4xx errors
3. Check `isFirebaseConfigured` is `true` in the browser console

### AI / Semantic Features Not Working

1. Check the "Preparing local intelligence" pill — if it shows "Smart features paused", tap Retry (model download likely failed)
2. DevTools → Network → filter `huggingface.co` — first load downloads ~118 MB of model assets; blocked/failed requests mean a network or CSP issue
3. DevTools → Application → Cache Storage → `transformers-cache` should contain model files after a successful first load
4. Search always falls back to instant lexical ranking; note creation, structure, and tags are deterministic and never depend on the model

---

## Rollback Procedure

### Firebase Hosting

```bash
# List recent deploys
npx firebase-tools hosting:releases:list

# Roll back to previous release
npx firebase-tools hosting:rollback
```

### Vercel / Netlify

Use the dashboard to redeploy a previous build.

---

## Data Management

### Backup Firestore

```bash
# Export all data (requires Firebase Admin SDK project)
npx firebase-tools firestore:export gs://your-bucket/backup-$(date +%Y%m%d)
```

### Clear a user's data (GDPR delete)

```javascript
// Firebase Admin SDK (server-side only)
const db = admin.firestore();
const userId = 'uid-here';

// Delete all crystals
const crystals = await db.collection(`users/${userId}/crystals`).listDocuments();
await Promise.all(crystals.map(d => d.delete()));

// Delete user doc
await db.doc(`users/${userId}`).delete();

// Delete Auth account
await admin.auth().deleteUser(userId);
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Lighthouse Performance | > 90 | Three.js chunk is large — acceptable for feature |
| Lighthouse Accessibility | > 90 | WCAG AA contrast, ARIA labels |
| First Contentful Paint | < 2.5s | Cached on second visit |
| Time to Interactive | < 4s | ThoughtGraph lazy-loaded |
| Bundle (gzipped) | < 350 KB main | Firebase + app logic |

---

## Rate Limits

| Service | Limit | Mitigation |
|---------|-------|------------|
| Local AI inference | None — on-device | Embeddings cached in IndexedDB until content or model changes |
| Firestore reads | 50k/day (free tier) | `onSnapshot` avoids repeated reads |
| Firestore writes | 20k/day (free tier) | Batch migrations; single write on note save |

---

## Measured Performance Benchmarks

Simulated, from an RC validation pass. Directional only — re-measure if these subsystems change materially.

**Home screen** (derived state via `useMemo` + insight generation)

| Notes | Derived state | Insight generation |
|-------|---------------|---------------------|
| 100 | <5ms | ~8ms |
| 500 | ~15ms | ~35ms |
| 1000 | ~30ms | ~70ms |

`generateInsightSummary` is O(n²) for topic overlap — would become noticeable above ~2,000 notes.

**Search**

| Notes | Lexical BM25 (instant) | Semantic (local model, cached vectors) |
|-------|------------------------|----------------------------------------|
| 100 | <1ms | one query embedding (~5–100 ms) + ms-scale cosine scan |
| 500 | ~2ms | same — corpus vectors are batch-read from IndexedDB |
| 1000 | ~8ms | same |

Note vectors are cached in IndexedDB (`va-intelligence` DB) and only recomputed when note content or the model version changes.

**Flashcard queue** (`buildReviewQueue`, O(n log n))

| Notes | Build time |
|-------|-----------|
| 100 | <1ms |
| 1000 | ~3ms |

**ThoughtGraph** — see `PROGRESS.md` Sprint 13 for current layout-engine benchmarks (instanced rendering; verified deterministic and fast at 5/50/250/1000 notes). Earlier per-mesh-per-node numbers are superseded and no longer apply.
