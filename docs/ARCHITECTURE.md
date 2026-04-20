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
│  │                    │                                      │   │
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

---

## Component Map Details (merged from COMPONENT_MAP.md)

# COMPONENT_MAP.md - Component Hierarchy & Relationships

## 1. Screen Component Hierarchy

Overall Screen Flow

```
                         ┌─────────────────┐
                         │   App.tsx       │
                         │ (Root Router)   │
                         └────────┬────────┘
                                  │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
     ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
     │  Landing    │       │ Auth Screens│       │ Main App    │
     │  Screen    │       │ (SignIn)    │       │ (Protected) │
     └─────────────┘       └─────────────┘       └──────┬──────┘
                                                        │
          ┌───────────────────────┼───────────────────────┤
          │                       │                       │
          ▼                       ▼                       ▼
   ┌───────────┐          ┌───────────┐          ┌───────────┐
   │   Home    │          │ Recording │          │  Search   │
   │  Screen   │          │  Screen   │          │  Screen   │
   └───────────┘          └───────────┘          └───────────┘
          │                                         
          ▼                                         
   ┌───────────┐          ┌───────────┐          ┌───────────┐
   │  History  │          │ Settings  │          │ EditNote  │
   │  Screen   │          │  Screen   │          │  Screen   │
   └───────────┘          └───────────┘          └───────────┘
```

---

## 2. Component Tree

```
App (Root)
├── ErrorBoundary (Global Error Handler)
│
├── AuthProvider (Context Provider)
│   └── App (Main Content)
│       ├── LandingScreen
│       │   └── [Landing UI Components]
│       │
│       ├── SignInScreen
│       │   ├── Form Components
│       │   └── Auth Helpers
│       │
│       └── [Protected Screens]
│           ├── HomeScreen
│           │   ├── TopBar
│           │   │   └── ProfileMenu
│           │   ├── GlowingSphere3D
│           │   ├── NoteCard (×N)
│           │   └── Info Banners
│           │
│           ├── RecordingScreen
│           │   ├── Waveform Visualizer
│           │   ├── Timer Display
│           │   └── Controls
│           │
│           ├── SearchScreen
│           │   ├── TopBar
│           │   ├── SearchInput
│           │   ├── FilterChips
│           │   └── NoteCard (×N)
│           │
│           ├── HistoryScreen
│           │   ├── TopBar
│           │   ├── FilterPanel
│           │   ├── Timeline
│           │   │   └── NoteCard (×N)
│           │   └── BentoStats
│           │
│           ├── SettingsScreen
│           │   ├── TopBar
│           │   ├── ProfileSection
│           │   ├── SettingsGroup (×3)
│           │   │   ├── SettingsItem (×N)
│           │   │   └── ToggleItem
│           │   └── Footer
│           │
│           └── EditNoteScreen
│               ├── TopBar
│               ├── NoteForm
│               │   ├── TitleInput
│               │   ├── ContentInput
│               │   ├── BodyInput
│               │   └── AttachmentList
│               └── DeleteConfirmModal
│
└── BottomNav (Global Navigation)
```

---

## 3. Component Details

### Shared Components

#### TopBar
```
┌─────────────────────────────────────────────────┐
│  [Back]  TITLE                    [Search] [⚙] │
└─────────────────────────────────────────────────┘
```
Props:
- title: string
- onBack?: () => void
- user?: AuthUser | null
- onLogout?: () => void
- onSetScreen?: (s: Screen) => void
- isDark?: boolean
- onToggleDarkMode?: () => void
- onExport?: () => void
Location: src/components/TopBar.tsx

#### BottomNav
```
┌─────────────────────────────────────────────────┐
│  [🏠]    [🔍]    [🎙]    [📜]    [⚙]       │
│  Home    Search   MIC    History  Settings     │
└─────────────────────────────────────────────────┘
```
Props:
- currentScreen: Screen
- setScreen: (screen: Screen) => void
Location: src/components/BottomNav.tsx

#### NoteCard
```
┌─────────────────────────────────────────────────┐
│ [🎙] 12:42 PM                      [⋮]        │
│ Note Title Here                                │
│ [content preview...]                           │
└─────────────────────────────────────────────────┘
```
Props:
- note: Note
- onClick: () => void
- onDelete: (id: string) => void
States:
- showOptions: boolean (dropdown menu)
- showConfirm: boolean (delete confirmation)
Location: src/components/NoteCard.tsx

#### ProfileMenu
```
┌─────────────────────────────────────────────────┐
│              [User Avatar]                      │
│  ┌──────────────────────────────────────┐      │
│  │  User Name                            │      │
│  │  user@email.com                       │      │
│  ├──────────────────────────────────────┤      │
│  │  ⚙️ Settings                         │      │
│  │  📥 Export Notes                      │      │
│  │  🌙 Dark Mode                         │      │
│  ├──────────────────────────────────────┤      │
│  │  🚪 Sign Out                          │      │
│  └──────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```
Props:
- user: AuthUser | null
- onLogout: () => void
- onSetScreen: (s: Screen) => void
- isDark: boolean
- onToggleDarkMode: () => void
- onExport: () => void
Location: src/components/ProfileMenu.tsx

---

## 4. Screen Components Detail

### HomeScreen
```
Purpose: Dashboard with pinned/recent notes, quick capture

Props Interface:
- setScreen: (s: Screen) => void
- notes: Note[]
- onEditNote: (n: Note) => void
- onDeleteNote: (id: string) => void
- user: AuthUser | null
- isDark: boolean
- onToggleDarkMode: () => void

Key Features:
- 3D Glowing Sphere (animated)
- Quick Note Input + AI Process
- Pinned Notes Section
- Recent Notes Section
- Streak Display

Location: src/Home.tsx
```

### RecordingScreen
```
Purpose: Voice recording with live waveform

Props Interface:
- setScreen: (s: Screen) => void
- onSaveNote: (n: Note) => void
- isDark: boolean

Key Features:
- Live Timer
- Animated Waveform (20 bars)
- Auto-transcript (mock)
- AI Processing on Stop
- Beforeunload Auto-save

Location: src/Recording.tsx
```

### SearchScreen
```
Purpose: Full-text search with advanced filters

Props Interface:
- setScreen: (s: Screen) => void
- notes: Note[]
- onEditNote: (n: Note) => void
- onDeleteNote: (id: string) => void
- isDark: boolean
- onToggleDarkMode: () => void

Filters Available:
- Type: All, voice, text, task, idea
- Sort: newest, oldest, alphabetical, pinned
- Date Range: start, end
- Pinned Status: toggle
- Tags: dynamic from notes

Location: src/Search.tsx
```

### HistoryScreen
```
Purpose: Timeline view of all notes

Props Interface:
- setScreen: (s: Screen) => void
- notes: Note[]
- onEditNote: (n: Note) => void
- onDeleteNote: (id: string) => void
- isDark: boolean
- onToggleDarkMode: () => void

Key Features:
- Grouped by Date
- Timeline Visualization
- Bento Stats Grid
- Advanced Filtering

Location: src/History.tsx
```

### EditNoteScreen
```
Purpose: Full note editing with attachments

Props Interface:
- setScreen: (s: Screen) => void
- note: Note
- onUpdateNote: (n: Note) => void
- onDeleteNote: (id: string) => void
- isDark: boolean

Editable Fields:
- Title
- Summary (content)
- Full Body
- Type (dropdown)
- Pinned Status
- Attachments (links, images, files)

Features:
- AI Refine Button
- Link Extraction
- File Upload
- Delete Confirmation

Location: src/EditNote.tsx
```

### SettingsScreen
```
Purpose: User profile and app preferences

Props Interface:
- setScreen: (s: Screen) => void
- logout: () => void
- user: AuthUser | null
- toggleDarkMode: () => void
- isDark: boolean
- notes: Note[]

Settings Groups:
- Account: Profile, Notifications, Privacy, Export
- Voice & AI: Voice Selection, AI Model, Cloud Sync
- System: Appearance, Sign Out

Location: src/Settings.tsx
```

---

## 5. Component Communication

### Props Drilling Example
```
App.tsx
    │
    ├── useNotes(userId) ──────────► HomeScreen
    │    │                  │
    │    ├── notes ──────────────────► NoteCard
    │    ├── onEditNote ──────────────► EditNoteScreen
    │    └── onDeleteNote ────────────► NoteCard
    │
    ├── useAuth() ──────────────────► TopBar
    │    │                               │
    │    ├── user ───────────────────► ProfileMenu
    │    ├── logout ─────────────────► ProfileMenu
    │    └── isAuthenticated ──────────► App logic
    │
    └── useDarkMode() ───────────────► App wrapper
          │
          ├── isDark ──────────────────► All screens
          └── toggle ──────────────────► Settings, ProfileMenu
```

### Event Flow Diagram
```
User Action                    Component              Handler              Result
────────────────────────────────────────────────────────────────────────────
Tap Note Card              NoteCard.onClick      onEditNote()      Navigate to EditNote
Tap Delete                NoteCard.onDelete     confirmDelete()   Remove from notes array
Tap Mic Button            BottomNav.onClick     setScreen()       Navigate to Recording
Toggle Dark Mode         ProfileMenu.onClick   toggle()          Update CSS class
Submit Search            SearchInput.onChange  setSearchQuery()  Filter notes (memo)
Save Note                EditNote.onSave      onUpdateNote()    Persist to localStorage
```

---

## 6. Reusable Component Patterns

### Modal Pattern (Delete Confirmation)
Components:
- DeleteConfirmModal (in EditNoteScreen)
- ProfileMenu (in TopBar)
- TypeMenu (in EditNoteScreen)
Pattern:
- AnimatePresence (motion)
- Fixed overlay backdrop
- Motion.div for animation
- Click outside to close

### Card Pattern (NoteCard)
Structure:
- Motion.div (container)
- Header: Icon + Time + Options
- Body: Title + Preview
- Footer: Tags
Behaviors:
- whileTap: scale 0.98
- Hover: border highlight
- Options: dropdown menu

### Form Pattern (Settings)
Structure:
- SettingsGroup (section)
- SettingsItem (row)
- ToggleItem (switch)
State:
- Expanded/Collapsed
- Active/Inactive
- Loading state

---

## 7. Component Index

| Component | File | Type | Exports |
|------------|------|------|---------|
| TopBar | TopBar.tsx | Shared | Named |
| BottomNav | BottomNav.tsx | Shared | Named |
| NoteCard | NoteCard.tsx | Shared | Named |
| ProfileMenu | ProfileMenu.tsx | Shared | Named |
| ErrorBoundary | ErrorBoundary.tsx | Shared | Named |
| GlowingSphere3D | GlowingSphere.tsx | Shared | Named |
| HomeScreen | Home.tsx | Screen | Named |
| RecordingScreen | Recording.tsx | Screen | Named |
| SearchScreen | Search.tsx | Screen | Named |
| HistoryScreen | History.tsx | Screen | Named |
| SettingsScreen | Settings.tsx | Screen | Named |
| EditNoteScreen | EditNote.tsx | Screen | Named |
| LandingScreen | Auth.tsx | Screen | Named |
| SignInScreen | Auth.tsx | Screen | Named |
| SettingsGroup | Settings.tsx | Helper | Named |
| SettingsItem | Settings.tsx | Helper | Named |
| ToggleItem | Settings.tsx | Helper | Named |

---

## 8. Component Lifecycle

### Screen Lifecycle
```
Mount ──▶ Render ──▶ Interact ──▶ Unmount
  │          │            │           │
  ▼          ▼            ▼           ▼
useEffect   UI Output   Handlers   Cleanup
Setup       Display     Update     useEffect
                                               return
```

### Hook Dependencies
```
useNotes(userId)
├── Mount: Load from localStorage
├── Update: Save to localStorage
└── Cleanup: None

useAuth()
├── Mount: Check localStorage
├── Update: Set user state
└── Cleanup: None

useDarkMode()
├── Mount: Read theme preference
├── Update: Save to localStorage + CSS
└── Cleanup: None
```

---

## 9. Props Interface Summary

### Required Props Pattern
```typescript
// Always required
setScreen: (s: Screen) => void
isDark: boolean

// Conditionally required
user: AuthUser | null  // When authenticated
onLogout: () => void   // When user exists
notes: Note[]         // For note-related screens

// Optional
onBack?: () => void
title?: string
```

---

*Document Version: 1.0*
*Last Updated: March 2026*
