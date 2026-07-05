# VoiceAction — Environment Variables Reference

All environment variables used by VoiceAction, their purpose, and where to get them.

---

## How Vite exposes env vars

Vite exposes variables prefixed with `VITE_` to the browser bundle via `import.meta.env.*`.  
Variables without the `VITE_` prefix are available in `vite.config.ts` only — never in client code.

| Context | Access pattern | Visible in browser bundle? |
|---------|---------------|---------------------------|
| `VITE_*` | `import.meta.env.VITE_FOO` | ✅ Yes — included in JS bundle |
| No prefix | `process.env.FOO` (vite.config.ts only) | ❌ No |

**All `VITE_*` variables are included in the production JS bundle and visible to anyone who downloads it.** This is expected for client-side apps — the security model for Firebase relies on Firestore security rules, not key secrecy.

---

## AI Features: No Key Required

VoiceAction's intelligence (note structuring, semantic search, connections, clustering, insights) runs **entirely on-device** via a quantized embedding model (Transformers.js, `Xenova/multilingual-e5-small`). There is no AI API key, no per-request cost, and no note text sent to any inference service. Model assets (~118 MB) download from huggingface.co on first semantic use and are cached by the browser. See `LOCAL_INTELLIGENCE_MIGRATION.md`.

---

## Required Variables

### `VITE_FIREBASE_API_KEY`

| Field | Value |
|-------|-------|
| **Required** | ✅ Yes |
| **Example** | `VITE_FIREBASE_API_KEY="AIzaSy..."` |
| **Get it from** | Firebase Console → Project Settings → Your apps → Web app → `apiKey` |
| **Used in** | `src/config/firebase.ts` |
| **What breaks without it** | Firebase does not initialise; auth and Firestore are disabled; app falls back to localStorage only |

**Security note:** Firebase API keys are designed to be public. Security is enforced by Firestore Rules and Firebase Auth, not by keeping the key secret.

---

### `VITE_FIREBASE_AUTH_DOMAIN`

| Field | Value |
|-------|-------|
| **Required** | ✅ Yes |
| **Example** | `VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"` |
| **Get it from** | Firebase Console → Project Settings → `authDomain` |
| **Used in** | `src/config/firebase.ts` → `getAuth()` |
| **What breaks without it** | Google Sign-In popup will fail; Firebase Auth won't initialise |

---

### `VITE_FIREBASE_PROJECT_ID`

| Field | Value |
|-------|-------|
| **Required** | ✅ Yes |
| **Example** | `VITE_FIREBASE_PROJECT_ID="voiceaction-prod"` |
| **Get it from** | Firebase Console → Project Settings → `projectId` |
| **Used in** | `src/config/firebase.ts` → Firestore collection paths |
| **What breaks without it** | Firestore reads/writes fail; all data stays in localStorage |

---

### `VITE_FIREBASE_STORAGE_BUCKET`

| Field | Value |
|-------|-------|
| **Required** | ✅ Yes (for full Firebase initialisation) |
| **Example** | `VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"` |
| **Get it from** | Firebase Console → Project Settings → `storageBucket` |
| **Used in** | `src/config/firebase.ts` → `initializeApp()` |
| **What breaks without it** | Firebase initialisation fails (SDK validates all config fields) |

**Note:** VoiceAction does not use Firebase Storage directly (no file uploads). This value is required by the Firebase SDK config object regardless.

---

### `VITE_FIREBASE_MESSAGING_SENDER_ID`

| Field | Value |
|-------|-------|
| **Required** | ✅ Yes (for full Firebase initialisation) |
| **Example** | `VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"` |
| **Get it from** | Firebase Console → Project Settings → `messagingSenderId` |
| **Used in** | `src/config/firebase.ts` → `initializeApp()` |
| **What breaks without it** | Firebase initialisation fails |

**Note:** VoiceAction does not use Firebase Cloud Messaging. This value is required by the SDK config schema.

---

### `VITE_FIREBASE_APP_ID`

| Field | Value |
|-------|-------|
| **Required** | ✅ Yes |
| **Example** | `VITE_FIREBASE_APP_ID="1:123456789:web:abcdef1234567890"` |
| **Get it from** | Firebase Console → Project Settings → `appId` |
| **Used in** | `src/config/firebase.ts` → `initializeApp()` |
| **What breaks without it** | Firebase initialisation fails; Firebase Hosting analytics won't work |

---

## Optional Variables

### `VITE_SENTRY_DSN`

| Field | Value |
|-------|-------|
| **Required** | ❌ Optional |
| **Example** | `VITE_SENTRY_DSN="https://abc123@o0.ingest.sentry.io/0000000"` |
| **Get it from** | [sentry.io](https://sentry.io) → New project → Client Keys (DSN) |
| **Used in** | `src/utils/monitoring.ts` |
| **What breaks without it** | Runtime errors are logged to console only; no remote error tracking |

**To activate Sentry:**
1. `npm install @sentry/react`
2. Add DSN to `.env`
3. Uncomment the Sentry `init()` block in `src/utils/monitoring.ts`

---

### `VITE_DEV_BYPASS_AUTH`

| Field | Value |
|-------|-------|
| **Required** | ❌ Development only |
| **Example** | `VITE_DEV_BYPASS_AUTH="true"` |
| **Used in** | `src/config/devBypass.ts` |
| **Effect** | Skips Firebase auth entirely; logs in as a mock dev user |
| **Production safety** | Hard-coded off: `env.PROD !== true` — this flag is **ignored in production builds** even if accidentally set |

**Never set this in production.** Safe to omit from `.env` entirely for production.

---

## Non-`VITE_` Variables

These are available in `vite.config.ts` only and are never included in the browser bundle.

### `APP_URL`

| Field | Value |
|-------|-------|
| **Required** | ❌ Optional |
| **Example** | `APP_URL="https://voiceaction.app"` |
| **Used in** | `vite.config.ts` (available for custom build scripts) |
| **Effect** | Not currently used in runtime code |

### `DISABLE_HMR`

| Field | Value |
|-------|-------|
| **Required** | ❌ Development only |
| **Example** | `DISABLE_HMR="true"` |
| **Used in** | `vite.config.ts` → `server.hmr` |
| **Effect** | Disables Hot Module Replacement — useful in some cloud dev environments |

---

## Graceful Degradation Matrix

When variables are missing, VoiceAction degrades gracefully rather than crashing:

| Missing Variable | User Experience |
|----------------|----------------|
| All `VITE_FIREBASE_*` | Auth disabled (no sign-in); all data stored in localStorage; no sync across devices |
| `VITE_SENTRY_DSN` | Errors logged to console only; no remote monitoring |
| `VITE_DEV_BYPASS_AUTH` unset | Normal auth flow (correct for production) |

---

## Example `.env` File

```env
# ── Firebase ──────────────────────────────────────────────────
VITE_FIREBASE_API_KEY="AIzaSyYour_Firebase_Key_Here"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef1234567890abcdef"

# ── Error Monitoring (optional) ───────────────────────────────
# VITE_SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"

# ── Development only (never set in production) ────────────────
# VITE_DEV_BYPASS_AUTH=true
```

---

## Security Checklist

- [ ] `.env` is in `.gitignore` — **never commit secrets to git**
- [ ] `VITE_DEV_BYPASS_AUTH` is not set in production env vars
- [ ] Firestore security rules are deployed (`firebase deploy --only firestore:rules`)
- [ ] Firebase Auth Authorized Domains includes only your actual domain(s)
