# DATA_FLOW.md - Data Flow & State Management

## VoiceAction Data Architecture

---

## 1. Data Lifecycle Overview

### High-Level Data Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER ACTION                                     │
│  (Record / Type / Edit / Delete)                                        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       INPUT HANDLER                                      │
│  (Screen Component)                                                     │
│  - Capture user input                                                    │
│  - Validate data                                                         │
│  - Sanitize if needed                                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                                 │
│  (Custom Hooks: useNotes, useAuth)                                       │
│  - Transform data                                                        │
│  - Call APIs if needed                                                  │
│  - Update state                                                         │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       STATE UPDATE                                      │
│  (React State)                                                           │
│  - setNotes() / setAuthState() / setIsDark()                           │
│  - Trigger re-render                                                    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENCE LAYER                                  │
│  (LocalStorage)                                                          │
│  - Save to localStorage                                                 │
│  - Sync across sessions                                                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       UI RENDER                                          │
│  (Screen / Components)                                                   │
│  - Display updated data                                                 │
│  - Show success/error states                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Note Data Flow

### Create Note Flow
```
┌──────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────┐
│ Recording│───▶│ Transcript │───▶│   Gemini    │───▶│ Processed │
│ Screen   │    │   (text)   │    │    API      │    │   Note   │
└──────────┘    └────────────┘    └─────────────┘    └─────┬──────┘
                                                           │
                                                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         NOTE CREATION                                 │
│  {                                                                      │
│    id: crypto.randomUUID(),    // Unique ID                           │
│    title: aiResult.title,     // AI generated                        │
│    content: aiResult.content, // Summary                             │
│    body: aiResult.body,       // Full transcript                     │
│    type: aiResult.type,       // voice/text/task/idea               │
│    timestamp: Date string,    // Display time                        │
│    createdAt: Date.now(),      // Unix timestamp                      │
│    pinned: false,             // Default                              │
│    tags: [],                  // Optional                             │
│    mood: aiResult.mood,       // AI detected                         │
│    attachments: []            // Optional                             │
│  }                                                                   │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │  sanitizeNote() │
                         │  (XSS protect)  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   setNotes()    │
                         │ addNote(note)  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ localStorage    │
                         │ setItem()       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Re-render     │
                         │  Notes List     │
                         └──────────────────┘
```

### Update Note Flow
```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│ EditNote   │───▶│   Form     │───▶│  Updated   │───▶│ Sanitize │
│  Screen    │    │  Submit    │    │   Note     │    │   Data   │
└────────────┘    └────────────┘    └──────┬─────┘    └────┬─────┘
                                          │                │
                                          ▼                ▼
                                  ┌──────────────────┐ ┌──────────────┐
                                  │   onUpdateNote  │ │localStorage  │
                                  │   (function)   │ │   update    │
                                  └────────┬─────────┘ └──────────────┘
                                           │
                                           ▼
                                   ┌──────────────────┐
                                   │ map through      │
                                   │ notes array      │
                                   │ replace by id   │
                                   └────────┬─────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │ setNotes(newNotes)│
                                   │ + save to local  │
                                   └──────────────────┘
```

### Delete Note Flow
```
┌──────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────┐
│ NoteCard │───▶│  Confirm   │───▶│   Delete    │───▶│  Filter  │
│  Delete  │    │  Modal     │    │  Function   │    │  Array   │
└──────────┘    └────────────┘    └──────┬──────┘    └────┬─────┘
                                         │                │
                                         ▼                ▼
                                 ┌──────────────────┐ ┌──────────────┐
                                 │ setNotes() +    │ │localStorage  │
                                 │ localStorage    │ │   update    │
                                 └──────────────────┘ └──────────────┘
```

---

## 3. Authentication Data Flow

### Login Flow
```
┌──────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────┐
│ SignIn   │───▶│  Validate  │───▶│   Create    │───▶│ Save to  │
│  Form    │    │   Input    │    │  AuthUser   │    │  State   │
└──────────┘    └────────────┘    └──────┬──────┘    └────┬─────┘
                                          │                │
                                          ▼                ▼
                                  ┌──────────────────┐ ┌──────────────┐
                                  │  JSON.stringify  │ │ setAuthState │
                                  │  (user object)  │ │ ({user,...}) │
                                  └────────┬─────────┘ └──────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ localStorage     │
                                  │ setItem()        │
                                  │ ('voiceaction_   │
                                  │  user')          │
                                  └──────────────────┘
```

### Session Restoration Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                      APP MOUNT (useEffect)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Check localStorage│
                    │ 'voiceaction_user'│
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       ┌─────────────┐              ┌─────────────┐
       │   Exists    │              │  Not Found  │
       └──────┬──────┘              └──────┬──────┘
              │                            │
              ▼                            ▼
       ┌─────────────────┐         ┌─────────────────┐
       │ Parse JSON      │         │ Set isLoading  │
       │ + Set AuthState │         │ to false       │
       │ {user,         │         │ Show landing   │
       │  isAuthenticated│         │ screen         │
       │  isLoading}    │         └─────────────────┘
       └─────────────────┘
```

---

## 4. Theme Data Flow

### Dark Mode Toggle
```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│ ProfileMenu│───▶│  toggle()  │───▶│ setIsDark()│───▶│ CSS      │
│  Toggle    │    │  (hook)    │    │  (state)   │    │  Update  │
└────────────┘    └────────────┘    └──────┬─────┘    └────┬─────┘
                                            │               │
                                            ▼               ▼
                                    ┌────────────────┐ ┌──────────────┐
                                    │ localStorage   │ │ classList   │
                                    │ setItem()     │ │ .add/remove │
                                    │ 'theme'       │ │  'dark'     │
                                    └────────────────┘ └──────────────┘
                                            │
                                            ▼
                                    ┌────────────────┐
                                    │ Trigger        │
                                    │ useEffect      │
                                    │ (isDark deps)  │
                                    └────────────────┘
```

### Theme CSS Variables
```
┌─────────────────────────────────────────────────────────────────┐
│                    LIGHT MODE (default)                         │
│  --base: #F9F8F6        --on-surface: #0A0A0A                 │
│  --surface: #FFFFFF     --text-secondary: #525252               │
│  --surface-low: #F1F0EE                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (toggle)
┌─────────────────────────────────────────────────────────────────┐
│                      DARK MODE                                   │
│  --base: #000000        --on-surface: #fdf4e3                  │
│  --surface: #150d01    --text-secondary: #a89276               │
│  --surface-low: #1b1202                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. LocalStorage Schema

### Storage Keys
```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCALSTORAGE KEYS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KEY                           │ VALUE TYPE  │ DESCRIPTION      │
│  ─────────────────────────────────────────────────────────────  │
│  voiceaction_user              │ JSON Object │ Auth session    │
│  voiceaction_notes_{userId}   │ JSON Array  │ User notes      │
│  voiceaction_theme            │ String      │ "dark" | "light"│
│  settings_notifications       │ JSON Object │ Notif preferences│
│  settings_privacy             │ JSON Object │ Privacy settings │
│  settings_voice               │ String      │ Selected voice   │
│  settings_model               │ String      │ AI model choice │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Structures
```typescript
// voiceaction_user
{
  id: string;        // "user_1"
  name: string;      // "John Doe"
  email: string;     // "john@example.com"
  createdAt: number; // Unix timestamp
  phone?: string;
  avatar?: string;
}

// voiceaction_notes_{userId}
[
  {
    id: string;
    title: string;
    content: string;
    body?: string;
    type: 'task' | 'event' | 'idea' | 'audio' | 'voice' | 'text';
    timestamp: string;
    createdAt: number;
    pinned?: boolean;
    tags?: string[];
    attachments?: NoteAttachment[];
    mood?: string;
  },
  // ... more notes
]

// settings_notifications
{
  push: boolean;
  email: boolean;
  mentions: boolean;
}

// settings_privacy
{
  biometric: boolean;
  encryption: boolean;
  analytics: boolean;
}
```

---

## 6. State Management Architecture

### React State Hierarchy
```
┌─────────────────────────────────────────────────────────────────┐
│                         APP STATE                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AuthState (Context)                    │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐    │   │
│  │  │    user     │ │isAuthenticated │ │  isLoading   │    │   │
│  │  │ AuthUser    │ │   boolean     │ │   boolean    │    │   │
│  │  │   | null    │ │              │ │              │    │   │
│  │  └─────────────┘ └──────────────┘ └───────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NotesState (useState)                 │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                     notes: Note[]                  │ │   │
│  │  │  ┌──────────────────────────────────────────────┐  │ │   │
│  │  │  │ [{id, title, content, type, ...}, ...]       │  │ │   │
│  │  │  └──────────────────────────────────────────────┘  │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                                  │
│  │  Managed by: useNotes(userId) hook                          │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ThemeState (useState)                 │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                 isDark: boolean                     │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                                  │
│  │  Managed by: useDarkMode() hook                            │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    UIState (useState)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │current  │ │editing   │ │search    │ │ filters  │   │   │
│  │  │Screen   │ │  Note    │ │ Query    │ │          │   │   │
│  │  │ (enum)  │ │ (Note|null)│(string) │ │(object)  │   │   │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │                                                                  │
│  │  Managed by: App.tsx                                        │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Derived State (useMemo)
```
┌─────────────────────────────────────────────────────────────────┐
│                      DERIVED STATE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SOURCE          │ DERIVED              │ COMPUTED BY          │
│  ────────────────────────────────────────────────────────────   │
│  notes           │ pinnedNotes         │ HomeScreen           │
│                  │ (filter by pinned)  │ (useMemo)            │
│                                                                  │
│  notes           │ recentNotes         │ HomeScreen           │
│                  │ (sorted, limit 3)  │ (useMemo)            │
│                                                                  │
│  notes           │ filteredNotes      │ SearchScreen         │
│                  │ (search + filters) │ (useMemo)            │
│                                                                  │
│  notes           │ groupedNotes       │ HistoryScreen        │
│                  │ (grouped by date)  │ (useMemo)            │
│                                                                  │
│  notes           │ streak             │ HomeScreen           │
│                  │ (consecutive days) │ (calculateStreak)    │
│                                                                  │
│  notes           │ allTags            │ Search/History       │
│                  │ (unique tags)      │ (useMemo)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Synchronization

### Note Sync Flow
```
USER DEVICE                                    LOCALSTORAGE
     │                                              │
     │  1. User creates/edits note                  │
     │─────────────────────────────────────────────▶│
     │                                              │
     │  2. useNotes hook updates state              │
     │        + saves to localStorage               │
     │─────────────────────────────────────────────▶│
     │                                              │
     │  3. React re-renders UI                      │
     │◀─────────────────────────────────────────────│
     │                                              │
     │  4. (Future: Cloud sync would happen here)   │
     │                                              │
```

### Multi-Tab Sync (Future Enhancement)
```
┌─────────────────────────────────────────────────────────────┐
│                    FUTURE: TAB SYNC                         │
│                                                             │
│  Tab A                  Tab B                              │
│   │                       │                                 │
│   │ Edit Note            │                                 │
│   │───────▶              │                                 │
│   │              localStorage.setItem()                   │
│   │              (storage event)                          │
│   │                       │                               │
│   │◀───────               │                               │
│   │  storage event        │                               │
│   │  trigger update       │                               │
│                                                             │
│  NOTE: Not currently implemented                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Error Data Flow

### Error Handling Patterns
```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR CATEGORIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. INPUT ERRORS                                                │
│     ┌──────────────┐    ┌─────────────┐    ┌──────────────┐  │
│     │ Empty Field │───▶│ Form Validate│───▶│ Show Error   │  │
│     │ Submit      │    │   + Return   │    │  Message     │  │
│     └──────────────┘    └─────────────┘    └──────────────┘  │
│                                                                  │
│  2. API ERRORS                                                  │
│     ┌──────────────┐    ┌─────────────┐    ┌──────────────┐  │
│     │ Gemini API  │───▶│ try/catch   │───▶│ Alert +      │  │
│     │ Timeout/Fail│    │             │    │ Fallback     │  │
│     └──────────────┘    └─────────────┘    └──────────────┘  │
│                                                                  │
│  3. STORAGE ERRORS                                              │
│     ┌──────────────┐    ┌─────────────┐    ┌──────────────┐  │
│     │ JSON.parse   │───▶│ try/catch   │───▶│ Reset to     │  │
│     │ Fail         │    │             │    │ Empty/Default│  │
│     └──────────────┘    └─────────────┘    └──────────────┘  │
│                                                                  │
│  4. RUNTIME ERRORS                                              │
│     ┌──────────────┐    ┌─────────────┐    ┌──────────────┐  │
│     │ Component   │───▶│ErrorBoundary│───▶│ Show Fallback │  │
│     │ Crash       │    │  Catch      │    │   + Reset    │  │
│     └──────────────┘    └─────────────┘    └──────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Validation

### Note Validation Rules
```typescript
interface ValidationRules {
  title: {
    required: true,
    maxLength: 200,
    minLength: 1
  },
  content: {
    required: false,
    maxLength: 500
  },
  body: {
    required: false,
    maxLength: 10000
  },
  type: {
    required: true,
    enum: ['task', 'event', 'idea', 'audio', 'voice', 'text']
  },
  attachments: {
    maxCount: 10,
    allowedTypes: ['link', 'image', 'file']
  }
}
```

### Sanitization Pipeline
```
Raw Input
    │
    ▼
┌─────────────────┐
│  XSS Sanitize  │  ← sanitize() function
│  (HTML encode) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Trim Whitespace│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate Type │  ← TypeScript (build time)
│  + Runtime     │
└────────┬────────┘
         │
         ▼
    Valid Data
```

---

## 10. Data Migration Strategy

### Future Schema Changes
```typescript
// Migration example (future use)
const migrateNotes = (notes: any[], fromVersion: number, toVersion: number) => {
  if (fromVersion < 1 && toVersion >= 1) {
    // Add new fields with defaults
    return notes.map(note => ({
      ...note,
      mood: note.mood || 'Neutral',
      attachments: note.attachments || []
    }));
  }
  return notes;
};
```

---

*Document Version: 1.0*  
*Last Updated: March 2026*
