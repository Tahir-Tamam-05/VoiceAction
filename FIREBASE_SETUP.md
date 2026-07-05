# VoiceAction — Firebase Setup Guide

Complete step-by-step setup from zero to a working Firebase project.  
Estimated time: **20–30 minutes**.

---

## Prerequisites

- A Google account
- Node.js 20+ installed (`node --version`)
- npm 9+ installed (`npm --version`)

---

## Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter project name: `voiceaction` (or your preferred name)
4. **Disable** Google Analytics (optional — not required for VoiceAction)
5. Click **"Create project"** → wait ~30 seconds
6. Click **"Continue"**

---

## Step 2 — Register a Web App

1. In the Firebase Console, click the **`</>`** (Web) icon on the project overview page
2. App nickname: `VoiceAction Web`
3. Check **"Also set up Firebase Hosting"** if you plan to use Firebase Hosting
4. Click **"Register app"**
5. **Copy the `firebaseConfig` object** — you will need these values for `.env`:

```js
const firebaseConfig = {
  apiKey: "AIza...",              // → VITE_FIREBASE_API_KEY
  authDomain: "your-app.firebaseapp.com",  // → VITE_FIREBASE_AUTH_DOMAIN
  projectId: "your-app-id",       // → VITE_FIREBASE_PROJECT_ID
  storageBucket: "your-app.firebasestorage.app", // → VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789", // → VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123...:web:abc..."    // → VITE_FIREBASE_APP_ID
};
```

6. Click **"Continue to console"**

---

## Step 3 — Configure Authentication

1. Firebase Console → **Build → Authentication**
2. Click **"Get started"**
3. Enable **Email/Password** provider:
   - Click "Email/Password"
   - Toggle **Enable** → Save
4. Enable **Google** provider:
   - Click "Google"
   - Toggle **Enable**
   - Enter a **support email** (your Google account email)
   - Save
5. Go to the **Settings** tab → **Authorized domains**
6. Your `firebaseapp.com` domain is pre-added. For production, also add:
   - Your Vercel domain: `your-app.vercel.app`
   - Your custom domain (if any): `yourdomain.com`

---

## Step 4 — Create Firestore Database

1. Firebase Console → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose location:
   - `us-central1` (US, lowest latency for most users)
   - Or your regional preference
4. Select **"Start in production mode"** (the app uses its own rules)
5. Click **"Enable"** → wait ~1 minute for provisioning

---

## Step 5 — Deploy Firestore Security Rules

The security rules are in `firestore.rules` at the repo root. Deploy them using the Firebase CLI.

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Login

```bash
firebase login
```

### Initialize (first time only)

```bash
firebase use --add
# Select your project from the list
# Alias: default
```

Or create `.firebaserc` manually:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### Deploy rules + indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Expected output:

```
✔  cloud.firestore: Released rules firestore.rules
✔  cloud.firestore: Indexes released
```

### Verify the rules are live

Firebase Console → Firestore → **Rules** tab → confirm you see the deployed rules.

---

## Step 6 — Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values from Step 2:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# ── Firebase ────────────────────────────────────────────────
# (AI features need no API key — intelligence runs on-device)
VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-app-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123...:web:abc..."
```

**Important:** Never commit `.env` to version control. The `.gitignore` already excludes it.

---

## Step 7 — AI Setup: Nothing To Do

VoiceAction needs **no AI API key**. All intelligence runs on-device via a local
embedding model that downloads (~118 MB, one time) from huggingface.co on first
semantic use and is cached by the browser afterward. See
`LOCAL_INTELLIGENCE_MIGRATION.md` for the architecture.

---

## Step 8 — Build and Test Locally

```bash
npm install
npm run lint     # Must pass: 0 TypeScript errors
npm run build    # Must pass: 0 build errors
npm run preview  # Serves dist/ at localhost:4173 — test with production env vars
```

Open `http://localhost:4173` and verify:

- [ ] Landing page loads
- [ ] Sign Up with email/password works
- [ ] Sign In with Google works
- [ ] Creating a voice note works
- [ ] Note appears in Home feed
- [ ] ThoughtGraph renders
- [ ] Sign Out works

---

## Step 9 — Deploy to Firebase Hosting (optional)

If you chose Firebase Hosting in Step 2:

```bash
# Build
npm run build

# Deploy hosting only
firebase deploy --only hosting

# Or deploy everything at once
firebase deploy
```

Output: `Hosting URL: https://your-app.web.app`

---

## Step 10 — Deploy to Vercel (recommended alternative)

1. Push code to GitHub (ensure `.env` is not committed)
2. Go to [vercel.com](https://vercel.com) → Import repository
3. Framework: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variables in Vercel dashboard (**Settings → Environment Variables**):
   - Add all `VITE_*` variables from `.env`
   - Do NOT add `VITE_DEV_BYPASS_AUTH` to production
7. Click **Deploy**

Vercel auto-deploys on every `git push` to `main`.

---

## Verification Checklist

After deployment, run through this checklist:

```
Auth
[ ] Sign Up with email/password → user appears in Firebase Auth console
[ ] Sign Up with Google → user appears in Firebase Auth console
[ ] Sign In → redirects to Home
[ ] Sign Out → redirects to Landing
[ ] Forgot Password → email received within 1 minute
[ ] Login again → notes restored from Firestore

Data
[ ] Create a voice note → appears in Home feed
[ ] Edit a note → changes persist after page reload
[ ] Delete a note → removed from feed
[ ] Search returns correct results
[ ] ThoughtGraph renders and is interactive
[ ] Flashcard review updates SM-2 intervals

PWA
[ ] No console errors on load
[ ] Service worker registered (DevTools → Application → Service Workers)
[ ] Manifest loaded (DevTools → Application → Manifest)
[ ] "Add to Home Screen" prompt appears (Chrome / Edge)
[ ] App opens in standalone mode after install

Firestore
[ ] Firebase Console → Firestore → data appears under users/{uid}/crystals/
[ ] Edit a note on desktop → changes appear on mobile within ~1 second
```

---

## Troubleshooting

### "Firebase is not configured" error in browser console

→ Check `.env` values are correct and the build was run after editing `.env`.  
→ Verify `VITE_FIREBASE_PROJECT_ID` matches the actual project ID (not the display name).

### "auth/unauthorized-domain" error

→ Add your deployment URL to Firebase Auth → Settings → Authorized Domains.

### Firestore permission denied

→ Run `firebase deploy --only firestore:rules` to deploy the security rules.  
→ Check Firebase Console → Firestore → Rules — rules should show `allow read, write: if request.auth.uid == userId`.

### "quota-exceeded" on Firestore

→ Free tier: 50K reads/day, 20K writes/day, 20K deletes/day.  
→ Upgrade to Blaze plan (pay-as-you-go) for production traffic.

### Google Sign-In popup blocked

→ The OAuth popup must be triggered by a user gesture (button click). Check that `signInWithPopup` is called directly from an event handler, not inside `setTimeout` or `async` chains without a gesture root.
