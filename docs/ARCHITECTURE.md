# ARCHITECTURE.md - Technical Architecture

## VoiceAction Application Architecture

---

## 1. System Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           VOICEACTION APP                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        PRESENTATION LAYER                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │  Home   │  │Recording│  │ Search  │  │History  │  │Settings │ │   │
│  │  │ Screen  │  │ Screen  │  │ Screen  │  │ Screen  │  │ Screen  │ │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │   │
│  │       └────────────┴────────────┴────────────┴────────────┘       │   │
│  │                              │                                      │   │
│  │                    ┌─────────▼─────────┐                           │   │
│  │                    │   App.tsx        │                           │   │
│  │                    │ (State Manager)  │                           │   │
│  │                    └─────────┬─────────┘                           │   │
│  └──────────────────────────────┼────────────────────────────────────┘   │
│                                 │                                         │
│  ┌──────────────────────────────┼────────────────────────────────────┐   │
│  │                        BUSINESS LAYER                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │  useNotes    │  │  useAuth     │  │ useDarkMode  │            │   │
│  │  │   Hook       │  │   Hook       │  │   Hook       │            │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘            │   │
│  │         │                  │                                       │   │
│  │  ┌──────▼──────────────────▼───────┐                              │   │
│  │  │      AuthContext (React)        │                              │   │
│  │  │   - User State                  │                              │   │
│  │  │   - Login/Logout Functions      │                              │   │
│  │  └────────────────┬────────────────┘                              │   │
│  └───────────────────┼───────────────────────────────────────────────┘   │
│                      │                                                    │
│  ┌───────────────────┼───────────────────────────────────────────────┐   │
│  │                   │            DATA LAYER                          │   │
│  │  ┌────────────────▼────────────────┐                              │   │
│  │  │     LocalStorage                │                              │   │
│  │  │  - voiceaction_user             │                              │   │
│  │  │  - voiceaction_notes_{userId}   │                              │   │
│  │  │  - voiceaction_theme            │                              │   │
│  │  │  - settings_*                   │                              │   │
│  │  └─────────────────────────────────┘                              │   │
│  │                                                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                        │   │
│  │  │  Gemini API     │  │   Firebase      │                        │   │
│  │  │  (External)    │  │   (Mocked)       │                        │   │
│  │  └─────────────────┘  └─────────────────┘                        │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| TypeScript | 5.8.x | Type Safety |
| Vite | 6.2.x | Build Tool |
| Tailwind CSS | 4.1.x | Styling |
| Motion | 12.x | Animations |
| Three.js | 0.183.x | 3D Graphics |
| Lucide React | 0.546.x | Icons |

### External Services
| Service | Purpose | Status |
|---------|---------|--------|
| Gemini AI | Note processing | Required |
| Firebase | Authentication | Mocked |

### Development Tools
| Tool | Purpose |
|------|---------|
| TypeScript | Type checking |
| ESLint | Code linting (optional) |
| Prettier | Code formatting (optional) |

---

## 3. Project Structure

```
voiceaction/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BottomNav.tsx    # Bottom navigation bar
│   │   ├── ErrorBoundary.tsx# Error handling wrapper
│   │   ├── GlowingSphere.tsx# 3D animated sphere
│   │   ├── NoteCard.tsx     # Note display card
│   │   ├── ProfileMenu.tsx  # User profile dropdown
│   │   ├── TopBar.tsx       # Top navigation header
│   │   └── index.ts         # Barrel export
│   │
│   ├── context/             # React Context providers
│   │   └── AuthContext.tsx  # Authentication state
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Authentication logic
│   │   ├── useDarkMode.ts  # Theme toggle logic
│   │   └── useNotes.ts      # Note CRUD operations
│   │
│   ├── lib/                 # Utility libraries
│   │   └── utils.ts         # cn() class merger
│   │
│   ├── services/            # External API integrations
│   │   └── geminiService.ts # Gemini AI client
│   │
│   ├── utils/               # Helper functions
│   │   ├── authHelpers.ts   # Auth utilities
│   │   ├── exportHelpers.ts# Export to MD/CSV
│   │   ├── linkHelpers.ts  # Link extraction
│   │   ├── sanitization.ts # XSS prevention
│   │   └── streakHelpers.ts# Streak calculation
│   │
│   ├── types.ts             # Global TypeScript types
│   ├── index.css            # Tailwind + custom theme
│   ├── main.tsx             # Entry point
│   ├── App.tsx              # Root component + routing
│   │
│   └── *.tsx                # Screen components
│       ├── Home.tsx
│       ├── Auth.tsx
│       ├── Recording.tsx
│       ├── Search.tsx
│       ├── History.tsx
│       ├── EditNote.tsx
│       └── Settings.tsx
│
├── docs/                    # Documentation
├── public/                  # Static assets
├── index.html               # HTML entry
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── .env.example             # Environment template
```

---

## 4. Layered Architecture

```
┌────────────────────────────────────────────────────────┐
│                  SCREEN COMPONENTS                      │
│   Home | Recording | Search | History | Settings       │
│   - Render UI based on props                            │
│   - Handle user interactions                            │
│   - Call hooks for business logic                       │
└─────────────────────┬──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                 SHARED COMPONENTS                       │
│   NoteCard | TopBar | BottomNav | ProfileMenu          │
│   - Reusable UI building blocks                         │
│   - Stateless (mostly)                                 │
└─────────────────────┬──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                   HOOKS LAYER                           │
│   useNotes | useAuth | useDarkMode                     │
│   - Business logic encapsulation                        │
│   - State management                                    │
│   - Side effects                                        │
└─────────────────────┬──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                  CONTEXT LAYER                          │
│   AuthContext                                          │
│   - Global state                                       │
│   - Cross-cutting concerns                             │
└─────────────────────┬──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                 SERVICES LAYER                          │
│   geminiService                                        │
│   - External API calls                                 │
│   - Data transformation                                │
└─────────────────────┬──────────────────────────────────┘
                      │
┌─────────────────────▼──────────────────────────────────┐
│                   STORAGE LAYER                         │
│   LocalStorage                                         │
│   - Persistence                                        │
│   - Data retrieval                                     │
└────────────────────────────────────────────────────────┘
```

---

## 5. Component Dependencies

```
                    ┌─────────────┐
                    │   App.tsx   │
                    │ (Root)      │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ HomeScreen  │   │RecordingScreen│  │SearchScreen │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    ┌─────▼─────┐
                    │ TopBar    │
                    │BottomNav  │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ NoteCard  │
                    │ProfileMenu│
                    └───────────┘
```

---

## 6. Data Flow Architecture

### Note Creation Flow
```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ Recording  │───▶│ Transcript │───▶│  Gemini    │───▶│ Note       │
│   Screen   │    │  Capture   │    │   API      │    │  Object    │
└────────────┘    └────────────┘    └────────────┘    └─────┬──────┘
                                                            │
                                                            ▼
                                                     ┌────────────┐
                                                     │ LocalStorage│
                                                     └────────────┘
```

### Authentication Flow
```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐
│ Sign In  │───▶│ Validate │───▶│ Create User  │───▶│ App State│
│  Form    │    │  Input   │    │   Object     │    │  Update  │
└──────────┘    └──────────┘    └──────────────┘    └─────┬────┘
                                                          │
                                                          ▼
                                                   ┌───────────┐
                                                   │localStorage│
                                                   │   (user)   │
                                                   └───────────┘
```

---

## 7. Build Configuration

### Vite Configuration Key Points
- **Port**: 3000
- **Host**: 0.0.0.0
- **Path Alias**: `@/` → project root
- **Plugins**: React, TailwindCSS
- **HMR**: Controlled via DISABLE_HMR env var

### Environment Variables
```env
GEMINI_API_KEY=    # Required for AI features
APP_URL=          # Self-referential URL
```

---

## 8. State Management Strategy

### Local State (useState)
- Form inputs
- UI toggles
- Modal visibility
- Loading states

### Context State (useContext)
- Authentication (user, login, logout)
- Theme preference

### Derived State (useMemo/useMemo)
- Filtered notes
- Sorted notes
- Computed values (streak)

### Persistent State (localStorage)
- User session
- Notes data
- Theme preference
- Settings

---

## 9. Error Handling Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  ERROR BOUNDARY LAYER                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │           ErrorBoundary (Root)                   │  │
│  │  - Catches React component errors                │  │
│  │  - Shows fallback UI                             │  │
│  │  - Provides recovery actions                    │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ API Errors  │   │ Input Errors│   │ Logic Errors│
│ (try/catch) │   │ (validation)│   │ (fallback)  │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## 10. Security Architecture

### Input Sanitization
- All user input sanitized via `sanitize()` function
- Prevents XSS attacks
- HTML entity encoding

### API Key Protection
- Keys stored in environment variables
- Not exposed in client bundle
- Graceful degradation if missing

### Data Privacy
- Notes stored locally by default
- No third-party analytics (optional)
- Clear data on logout option

---

## 11. Performance Optimizations

### Implemented
- React 19 automatic batching
- Memoized filtered/sorted notes
- CSS-based animations (GPU accelerated)
- Lazy component patterns

### Future Considerations
- Code splitting per route
- Virtual scrolling for large lists
- Image optimization
- Bundle size analysis

---

## 12. File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `NoteCard.tsx` |
| Hooks | camelCase + use prefix | `useNotes.ts` |
| Utils | camelCase | `sanitization.ts` |
| Services | camelCase | `geminiService.ts` |
| Types | PascalCase | `types.ts` |
| Screens | PascalCase | `Home.tsx` |

---

*Document Version: 1.0*  
*Last Updated: March 2026*
