# VoiceAction — Deployment Guide

End-to-end path from a clean checkout to a live production deployment. Work top to bottom.

---

## 1. Prerequisites

- Node.js 20+
- A Firebase project (Auth + Firestore enabled) — see [FIREBASE_SETUP.md](FIREBASE_SETUP.md) if you don't have one yet
- No AI API key needed — intelligence runs on-device (model assets download from huggingface.co on first use)

---

## 2. Environment Configuration

```bash
cp .env.example .env
```

Fill in every value below. Full details (source, what breaks if missing) are in [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md).

| Variable | Source | Required |
|----------|--------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web App | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console | ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | ✅ |
| `VITE_FIREBASE_APP_ID` | Firebase Console | ✅ |
| `VITE_SENTRY_DSN` | Sentry project settings | Optional |

Checks:
- [ ] `VITE_DEV_BYPASS_AUTH` is **not** set (it's hard-ignored in production builds regardless, but keep it out of prod env vars)
- [ ] `.env` is **not** committed to git (`git status` should not show `.env`)

The intelligence model (~118 MB quantized) downloads from huggingface.co on first semantic use and is cached by the browser afterward — no server or key to configure.

---

## 3. Firebase Setup

### Authentication
1. Firebase Console → Authentication → Sign-in method
2. Enable **Google** and **Email/Password** providers
3. Firebase Console → Authentication → Settings → Authorized domains → add your production domain(s)

### Firestore
1. Firebase Console → Firestore Database → Create database
2. Start in **production mode**
3. Deploy security rules (below)
4. Create composite indexes — Firestore will prompt automatically on first query, or run `firebase deploy --only firestore:indexes`

### Deploy Firestore Security Rules

Rules already live in `firestore.rules` at the repo root (restricts every user to `users/{uid}` and `users/{uid}/crystals/{crystalId}`). Deploy them with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add             # select your project, alias: default — or edit .firebaserc directly
firebase deploy --only firestore:rules,firestore:indexes
```

Verify: Firebase Console → Firestore → **Rules** tab shows the deployed rules.

---

## 4. Build Verification

```bash
npm install
npm run lint      # must report 0 TypeScript errors
npm run build     # must report 0 build errors
```

Confirm the output:
- [ ] `dist/sw.js` exists (PWA service worker)
- [ ] `dist/manifest.json` exists (PWA manifest)

---

## 5. Local Smoke Test (production env vars)

```bash
npm run preview   # serves dist/ at localhost:4173
```

Open `http://localhost:4173` and verify:

**Auth**
- [ ] Landing page renders, no console errors
- [ ] Sign Up (email/password) → creates account, redirects to Home
- [ ] Onboarding overlay appears on first login
- [ ] Sign Out → returns to Landing
- [ ] Sign In (email/password and Google) → both work
- [ ] Forgot Password → shows "reset link sent" confirmation

**Core flow**
- [ ] Record a voice note → AI processes it → appears in Home feed
- [ ] Quick text capture → AI tags appear → note saved
- [ ] Edit note → changes persist after reload
- [ ] Delete note → removed from feed
- [ ] Pin note → appears in Pinned section

**Features**
- [ ] Search → keyword results instant; AI-ranked results appear once the local model has initialized (first visit downloads it — watch the "Preparing local intelligence" pill)
- [ ] ThoughtGraph renders and nodes are clickable; coach marks appear on first visit
- [ ] Flashcards → SM-2 review works (need 1+ flashcard-enabled note)
- [ ] Export → Markdown file downloads correctly
- [ ] Dark/Light mode toggle works

**PWA**
- [ ] DevTools → Application → Service Workers → activated and running
- [ ] DevTools → Application → Manifest → app name correct, no manifest errors
- [ ] Install prompt appears in Chrome address bar
- [ ] Throttle to 3G / disable cache → app still loads from service worker cache

---

## 6. Deploy

### Option A — Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Or via GitHub integration: import the repo at vercel.com, framework **Vite**, build command `npm run build`, output directory `dist`. Add every `VITE_*` variable in **Settings → Environment Variables** (do **not** add `VITE_DEV_BYPASS_AUTH`). Vercel auto-deploys on every push to `main`.

### Option B — Firebase Hosting

```bash
firebase login
firebase use --add          # if not already done
npm run build
firebase deploy             # deploys hosting + firestore rules/indexes together
# or: firebase deploy --only hosting
```

Output: `https://your-project.web.app`

### Option C — Netlify

```bash
npx netlify deploy --prod --dir=dist
```

Set environment variables in the Netlify dashboard matching `.env`.

### Option D — Any static host (S3, Cloudflare Pages, etc.)

Upload `dist/` contents. Configure:
- All routes → `index.html` (SPA routing)
- `Cache-Control: max-age=31536000, immutable` for `/assets/*`
- `Cache-Control: no-cache` for `index.html` and `manifest.json`

### Quick reference

```bash
# Full deploy to Vercel
npm run lint && npm run build && vercel --prod

# Full deploy to Firebase Hosting + Firestore rules
npm run lint && npm run build && firebase deploy

# Rules only (after editing firestore.rules)
firebase deploy --only firestore:rules

# Rollback on Firebase Hosting
firebase hosting:releases:list
firebase hosting:rollback
```

---

## 7. Security Verification

```bash
# Confirm no secrets in tracked git history — should produce no output
git log --all --full-diff -p | grep -E "VITE_FIREBASE_API_KEY|AIza" | grep "^+" | head
```

- [ ] No API keys in git history
- [ ] Firestore rules restrict users to their own data (test: another UID cannot read)
- [ ] `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff` headers present (configured in `firebase.json` for Firebase Hosting; replicate on other hosts)

---

## 8. PWA Icons

Current icons are SVG (works in Chrome/Edge/Safari). For maximum Android/iOS compatibility, generate PNGs:

```bash
npx @vite-pwa/assets-generator --preset minimal public/icon-512.svg
# or use https://maskable.app or https://github.com/elegantapp/pwa-asset-generator
```

Update `public/manifest.json` icon paths and `type` to `image/png` afterward.

---

## 9. Domain & CORS

1. Add your production domain to Firebase Auth → Authorized Domains
2. Firebase Hosting issues SSL automatically; on Vercel add the domain under Settings → Domains
3. Model assets load from huggingface.co — no CORS or key configuration needed

---

## 10. Optional: Sentry Error Monitoring

1. Create a project at [sentry.io](https://sentry.io) → Platform: React
2. `npm install @sentry/react`
3. Add `VITE_SENTRY_DSN` to `.env` and your host's environment variables
4. Uncomment the Sentry `init()` block in `src/utils/monitoring.ts`
5. Rebuild and redeploy

---

## 11. Legal (required before public launch)

- [ ] Privacy Policy page created and linked (Auth/Settings currently show a "coming soon" toast)
- [ ] Terms of Service page created and linked
- [ ] Cookie/tracking disclosure added if analytics are introduced

---

## 12. Updating the App

```bash
npm run build
# re-deploy via your chosen host
```

Users on the previous version see the service worker auto-update within ~1 minute of loading the page (configured in `vite.config.ts`).

---

## 13. Post-Deploy Monitoring

See [OPERATIONS.md](OPERATIONS.md) for the full monitoring checklist, incident response steps, and rollback procedures. At minimum, in the first 24 hours:

- [ ] First real user signs up and creates a note successfully
- [ ] Firebase Console → Firestore → data appears under `users/{uid}/crystals/`
- [ ] No error spikes in Sentry (if configured) or browser console

---

## External Services Summary

| Service | Purpose | Free Tier | Required? |
|---------|---------|-----------|-----------|
| Hugging Face Hub (model assets) | One-time on-device AI model download (~118 MB, cached) | Free, unmetered | ✅ |
| Firebase Auth | User accounts, Google Sign-In | Email unlimited | ✅ |
| Cloud Firestore | Note storage, real-time sync | 50K reads/day, 20K writes/day, 1 GiB | ✅ |
| Vercel / Firebase Hosting | Serve the app | Free tier sufficient for beta | ✅ |
| Sentry | Error monitoring | 5K errors/month free | Optional |

**Estimated cost at 0 paying users: $0/month.** Free tier ceiling: ~500 daily active users before Firestore reads exceed the free quota.
