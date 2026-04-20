# FEATURE_ROADMAP.md

## 1. Feature Categorisation & Priority
| Category | Feature | Priority (P0‑P2) | Risk | Dependencies |
|----------|---------|------------------|------|--------------|
| **Core Capture** | One‑Tap Voice Capture (orb, live waveform/blob) | **P0** | Medium | Web Speech API, Web Audio API, UI component library |
| **Core Capture** | AI Note Crystallization (Gemini 1.5 Pro) | **P0** | Medium | Gemini service wrapper, Firestore write, auth token |
| **Core UI** | Crystal Feed (Home screen editorial carousel) | **P0** | Low | Capture flow, Firestore real‑time listeners, Card components |
| **Core UI** | Quick Text Capture (pull‑down input) | **P0** | Low | Shared input component, same AI pipeline |
| **Core Editing** | Note Editing with AI suggestions (concise, action items, bullet conversion) | **P0** | Medium | Edit screen UI, Gemini prompt templates, Firestore update |
| **Core Search** | Basic Search (keyword) | **P0** | Low | Firestore query, Search UI components |
| **Core Auth** | Firebase Auth (Google + Email/Password) | **P0** | Low | Firebase config, auth UI, protected routes |
| **Core Persistence** | Offline‑first Firestore cache & sync | **P0** | Medium | Firestore SDK offline enable, UI loading states |
| **Theming** | Dark/Light Mode with animated cross‑fade | **P1** | Low | Tailwind theme config, ThemeProvider, CSS variables |
| **Streak Engine** | Daily streak counter with visual progression | **P1** | Low | Local state (Zustand), Firestore user stats, UI badge component |
| **Smart Notifications** | Configurable, non‑spammy prompts (streak risk, connection hints) | **P1** | Medium | Notification UI, analytics events, optional push service |
| **Export & Share** | Markdown / PDF / CSV export, Crystal Card image generation | **P1** | Medium | Export utilities, server‑side rendering for PDFs, image generation lib |
| **Thought Graph (3D)** | Node‑based visual map of notes & connections | **P1** | High | React‑Three‑Fiber, force‑directed layout algorithm, backend graph enrichment |
| **Auto‑Linking & Pattern Detection** | AI‑driven connections between notes, recurring theme detection | **P1** | High | Gemini prompts, background worker, Firestore graph store |
| **Forgotten Gems Resurfacing** | Weekly “Forgotten Gems” card with old but related notes | **P1** | Medium | Search service, relevance scoring, UI card |
| **Weekly Thought Digest** | Automated summary email / in‑app card of weekly activity | **P1** | Medium | Scheduler (cloud function), email service, UI digest component |
| **Voice Playback with Highlights** | Karaoke‑style transcript sync while replaying audio | **P2** | High | Audio storage (optional), waveform scrubber, sync logic |
| **Flashcard Generation** | AI‑generated Q&A pairs from a crystal, spaced‑repetition review | **P2** | Medium | Gemini prompt, review UI, local scheduling |
| **Daily Prompt** | AI‑generated reflective question each day | **P2** | Low | Prompt generation service, UI banner |
| **Push Notifications** | Native web push for streaks, digests, reminders | **P2** | Medium | Service worker, permission handling, backend trigger |
| **PWA & Offline Mode** | Full offline capability, installable app shell | **P2** | High | vite‑plugin‑pwa, caching strategy, IndexedDB fallback |
| **Keyboard Shortcuts (Desktop)** | R=record, N=new text, / =search, etc. | **P2** | Low | Shortcut manager hook, accessible focus handling |
| **Advanced Export (Beautiful PDF)** | High‑fidelity PDF with typography & graphics | **P2** | Medium | PDF generation library, custom templates |
| **Advanced Streak Badges** | Levels, badges, animated rewards | **P2** | Low | UI badge system, achievement tracking |
| **Onboarding Tour** | Guided walkthrough of core features | **P2** | Low | Tour library, step definitions |
| **Team Collaboration (Shared Graph)** | Multi‑user workspaces, shared Thought Graph | **Future** | High | Multi‑tenant auth, permission model, real‑time sync |
| **Third‑Party Integrations** | Notion, Todoist, Linear, Slack sync | **Future** | High | OAuth flows, webhook adapters |
| **Moonshot: Second Brain Dashboard** | Full knowledge base UI, AI‑driven insights | **Future** | Very High | All prior layers, advanced analytics, custom AI models |

## 2. Timeline Suggestion (6‑month horizon)
| Phase | Weeks | Focus |
|-------|------|-------|
| **Phase 0 – Foundations** | 1‑2 | Project scaffolding, CI/CD, Tailwind config, basic routing, auth integration |
| **Phase 1 – MVP (P0)** | 3‑10 | Implement One‑Tap Capture, AI Crystallization, Firestore persistence, Home Feed, Quick Text, Edit screen, Basic Search, Dark/Light toggle, Streak engine (basic), error boundaries |
| **Phase 2 – Immediate Enhancements (P1)** | 11‑16 | Thought Graph prototype, Auto‑Linking, Forgotten Gems, Weekly Digest, Smart Notifications, Export formats, refined theming & micro‑interactions |
| **Phase 3 – Delighters (P2)** | 17‑22 | Voice playback sync, Flashcards, Daily Prompt, Push notifications, PWA offline, keyboard shortcuts, advanced PDF export, badge system |
| **Phase 4 – Scaling & Collaboration** | 23‑26 | Team workspaces, third‑party integrations, performance optimisations, analytics deep‑dive |
| **Phase 5 – Moonshot** | 27‑30+ | Second Brain dashboard, predictive insights, dedicated hardware partnership |

> **Note**: Each phase is designed to be **incremental**, preserving existing functionality and allowing continuous user feedback without breaking the live product.

---
*Prepared for engineering review. Adjust priorities based on team capacity and market feedback.*
