# VoiceAction

VoiceAction is a voice-first note-taking PWA. Speak or type a thought, and a fully local, on-device intelligence engine turns it into a structured, tagged, mood-colored note ("Crystal") that auto-links to related notes in an interactive 3D Thought Graph. Includes semantic search, SM-2 spaced-repetition flashcards, streaks, and full offline/PWA support.

Built with React 19, TypeScript, Vite 6, Tailwind CSS v4, Firebase (Auth + Firestore), React Three Fiber, and Transformers.js (local on-device AI).

## Quick Start

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env   # fill in Firebase credentials — see ENVIRONMENT_VARIABLES.md
npm run dev             # http://localhost:3000
```

Without Firebase credentials the app still runs — auth is disabled and notes persist to `localStorage` only. **AI features need no API key**: all intelligence (note structuring, semantic search, connections, insights) runs on-device via a quantized embedding model (Transformers.js) downloaded once and cached.

## Commands

```bash
npm run dev        # Start dev server on port 3000 (0.0.0.0)
npm run build       # Production build (also type-checks via Vite)
npm run lint        # TypeScript type-check (tsc --noEmit) — no eslint configured
npm test            # Vitest — 64 tests over the local intelligence engine
npm run preview     # Serve the dist/ build locally
npm run clean       # Remove dist/
```

Run `npm run lint`, `npm test`, and `npm run build` before considering a change complete.

## Documentation

| Doc | Purpose |
|-----|---------|
| [CLAUDE.md](CLAUDE.md) | Architecture, data flow, and conventions for working in this codebase |
| [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | Every env var: purpose, source, and what breaks without it |
| [FIREBASE_SETUP.md](FIREBASE_SETUP.md) | Step-by-step Firebase project setup |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Build, deploy (Vercel / Firebase Hosting / Netlify / static), and post-deploy checklist |
| [OPERATIONS.md](OPERATIONS.md) | Monitoring, incident response, rollback, and known limitations |
| [PROGRESS.md](PROGRESS.md) | Current project status and completed milestones |
| [LOCAL_INTELLIGENCE_MIGRATION.md](LOCAL_INTELLIGENCE_MIGRATION.md) | The on-device AI architecture: model choice, NLP algorithms, caching, measurements |
| [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) | Design tokens, typography, and component style patterns |

## License

Apache-2.0
