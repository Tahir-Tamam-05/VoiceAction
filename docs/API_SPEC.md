# API_SPEC.md - External API Integrations

## VoiceAction API Documentation

---

## 1. Gemini AI Integration

### Overview
VoiceAction uses Google's Gemini AI for intelligent note processing. The AI transforms raw voice transcripts into structured notes with titles, summaries, and metadata.

### Service Location
```typescript
// File: src/services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
```

### API Configuration
```typescript
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3-flash-preview";
```

### Environment Setup
```env
# Required
GEMINI_API_KEY=your_api_key_here

# Optional
APP_URL=http://localhost:3000
```

### API Sequence Diagram
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Recording   │    │   Gemini     │    │   Gemini     │    │    Note      │
│  Screen      │───▶│   Service    │───▶│   API        │───▶│   Object     │
│  (stop)      │    │  (process)  │    │  (call)      │    │  (result)    │
└──────────────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
                            │                    │                    │
                            ▼                    ▼                    ▼
                     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                     │ Check API    │    │   Parse      │    │   Sanitize   │
                     │ Key exists   │    │   JSON       │    │   + Return   │
                     └──────────────┘    └──────────────┘    └──────────────┘
```

### Function: processVoiceNote

#### Request
```typescript
interface ProcessVoiceNoteParams {
  transcript: string;
}
```

#### API Call
```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-flash-preview",
  contents: `Analyze this voice transcript and provide a structured note. 
  Return a JSON object with:
  - title: A concise title
  - content: A short summary (max 100 chars)
  - body: The full cleaned up text
  - type: One of ['voice', 'text', 'task', 'idea']
  - mood: A single word describing the mood
  
  Transcript: "${transcript}"`,
  config: {
    responseMimeType: "application/json",
  }
});
```

#### Response
```typescript
interface GeminiResponse {
  title: string;        // "Quarterly Strategy Review"
  content: string;      // "Focus on high-contrast typography..."
  body: string;         // Full cleaned transcript
  type: 'voice' | 'text' | 'task' | 'idea';
  mood: string;         // "Focused", "Creative", "Neutral"
}
```

#### Error Handling
```typescript
// If API key is missing
if (!API_KEY) {
  console.warn("GEMINI_API_KEY is missing. AI features will be disabled.");
  return null;
}

// If API returns invalid JSON
try {
  return JSON.parse(response.text);
} catch (parseError) {
  // Try to extract JSON from markdown
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return null;
}

// If API call fails
catch (error) {
  console.error("AI Processing Error:", error);
  return null;
}
```

### Graceful Degradation
When AI processing fails, the app falls back to manual note creation:
```typescript
const newNote: Note = {
  id: crypto.randomUUID(),
  title: `Voice Note ${new Date().toLocaleDateString()}`,
  content: transcript.slice(0, 100) + "...",
  body: transcript,
  type: 'voice',
  // ... other fields with defaults
};
```

---

## 2. Firebase Integration (Mocked)

### Current Status
Firebase authentication is **currently mocked** using localStorage.

### Future Implementation
```typescript
// Future: Real Firebase Auth
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "voiceaction.firebaseapp.com",
  projectId: "voiceaction",
  // ... other config
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;
```

### Auth State Management (Future)
```typescript
// Future: Firebase Auth Observer
import { onAuthStateChanged } from "firebase/auth";

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // User signed in
      setAuthState({ user, isAuthenticated: true, isLoading: false });
    } else {
      // User signed out
      setAuthState({ user: null, isAuthenticated: false, isLoading: false });
    }
  });

  return () => unsubscribe();
}, []);
```

---

## 3. Storage API

### LocalStorage Usage

#### User Session
```typescript
const saveUser = (user: AuthUser) => {
  localStorage.setItem("voiceaction_user", JSON.stringify(user));
};

const loadUser = (): AuthUser | null => {
  const saved = localStorage.getItem("voiceaction_user");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      localStorage.removeItem("voiceaction_user");
      return null;
    }
  }
  return null;
};
```

#### Notes Storage
```typescript
const STORAGE_KEY = `voiceaction_notes_${userId}`;

const saveNotes = (notes: Note[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

const loadNotes = (): Note[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved notes:", e);
      return [];
    }
  }
  return MOCK_NOTES; // Return mock data for first-time users
};
```

### Storage Event Listener (Future)
```typescript
// For multi-tab sync in the future
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      setNotes(JSON.parse(e.newValue));
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

## 4. External Libraries API

### Motion (Animations)
```typescript
import { motion, AnimatePresence } from "motion/react";

// Basic animation
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
>
  Content
</motion.div>

// Conditional animation
<motion.div
  animate={{ 
    height: isRecording ? [20, Math.random() * 80 + 20, 20] : 4,
    opacity: isRecording ? 1 : 0.2
  }}
  transition={{ repeat: Infinity, duration: 0.5 }}
/>
```

### Three.js / React Three Fiber
```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

<Canvas>
  <ambientLight />
  <pointLight position={[10, 10, 10]} />
  <mesh>
    <sphereGeometry args={[1, 32, 32]} />
    <meshStandardMaterial color="orange" />
  </mesh>
  <OrbitControls />
</Canvas>
```

### File API (Attachments)
```typescript
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  for (const file of files) {
    const reader = new FileReader();
    
    const attachment = await new Promise<NoteAttachment>((resolve) => {
      reader.onload = (event) => {
        resolve({
          id: crypto.randomUUID(),
          type: file.type.startsWith('image/') ? 'image' : 'file',
          content: event.target?.result as string, // base64
          label: file.name,
          mimeType: file.type,
          size: file.size,
          createdAt: Date.now()
        });
      };
      reader.readAsDataURL(file);
    });
    
    setAttachments([...attachments, attachment]);
  }
};
```

### Export API
```typescript
// Download as file
const downloadFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Markdown export
const exportAsMarkdown = (items: Note[]) => {
  const md = items.map(item => `
## ${item.title}
**Type:** ${item.type} | **Date:** ${item.timestamp}
${item.content}
${item.body ? `**Notes:** ${item.body}` : ""}
---`).join("\n");
  
  downloadFile("voiceaction-notes.md", md, "text/markdown");
};

// CSV export
const exportAsCSV = (items: Note[]) => {
  const headers = "Title,Type,Content,Date,Pinned\n";
  const rows = items.map(i =>
    `"${i.title}","${i.type}","${i.content}","${i.timestamp}","${i.pinned}"`
  ).join("\n");
  
  downloadFile("voiceaction-notes.csv", headers + rows, "text/csv");
};
```

---

## 5. API Error Codes & Handling

### Gemini API Errors
```typescript
interface APIError {
  code: string;
  message: string;
  status: number;
}

const errorHandling = {
  'API_KEY_MISSING': {
    status: 401,
    message: 'GEMINI_API_KEY not configured',
    userMessage: 'AI features are disabled. Please add API key.',
    recovery: 'Use manual note creation fallback'
  },
  'API_KEY_INVALID': {
    status: 403,
    message: 'Invalid API key',
    userMessage: 'Invalid API key. Please check configuration.',
    recovery: 'Show settings to update key'
  },
  'QUOTA_EXCEEDED': {
    status: 429,
    message: 'Rate limit exceeded',
    userMessage: 'Too many requests. Please try again later.',
    recovery: 'Implement exponential backoff'
  },
  'SERVER_ERROR': {
    status: 500,
    message: 'Gemini service error',
    userMessage: 'AI service temporarily unavailable.',
    recovery: 'Fallback to manual creation'
  },
  'NETWORK_ERROR': {
    status: 0,
    message: 'Network request failed',
    userMessage: 'Connection error. Please check internet.',
    recovery: 'Retry with offline fallback'
  }
};
```

### Storage Errors
```typescript
const storageErrorHandling = {
  'QUOTA_EXCEEDED': {
    message: 'LocalStorage quota exceeded',
    recovery: 'Alert user to delete old notes'
  },
  'PARSE_ERROR': {
    message: 'Invalid data in storage',
    recovery: 'Reset to defaults, preserve user session'
  },
  'NOT_AVAILABLE': {
    message: 'LocalStorage not available',
    recovery: 'Use in-memory storage fallback'
  }
};
```

---

## 6. API Rate Limiting

### Current Implementation
No rate limiting currently implemented.

### Future Enhancement
```typescript
// Rate limiter for Gemini API
class RateLimiter {
  private requests: number[] = [];
  private readonly MAX_REQUESTS = 60; // per minute
  private readonly WINDOW = 60000; // 1 minute

  canProceed(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => t > now - this.WINDOW);
    return this.requests.length < this.MAX_REQUESTS;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  waitTime(): number {
    const oldestInWindow = this.requests[0];
    return oldestInWindow ? Math.max(0, this.WINDOW - (Date.now() - oldestInWindow)) : 0;
  }
}
```

---

## 7. API Testing

### Mock Responses
```typescript
// For development without API key
const mockGeminiResponse = {
  title: "Mock Note Title",
  content: "This is a mock summary of the voice note.",
  body: "Full transcript would appear here in a real scenario.",
  type: "voice",
  mood: "Neutral"
};

// Use mock when API key is missing
const useMock = !process.env.GEMINI_API_KEY;
```

---

## 8. Environment Configuration

### Required Variables
```env
# .env.local
GEMINI_API_KEY=AIzaSy...  # Required for AI features
```

### Optional Variables
```env
APP_URL=http://localhost:3000  # For self-referential links
```

### Vite Environment Access
```typescript
// In Vite, access env variables via import.meta.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Or via process.env (defined in vite.config.ts)
const apiKey = process.env.GEMINI_API_KEY;
```

---

## 9. Future API Integrations

### Planned Integrations
1. **Firebase Auth** - Real authentication
2. **Cloud Firestore** - Cloud data storage
3. **Web Speech API** - Browser-based voice-to-text
4. **Push Notifications** - Reminders and updates

### Integration Readiness
```
┌─────────────────────────────────────────────────────────────────┐
│                  INTEGRATION READINESS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Service              │ Ready   │ Notes                         │
│  ────────────────────────────────────────────────────────────   │
│  Gemini AI            │   ✅    │ Implemented, requires key     │
│  Firebase Auth        │   🔲    │ Mocked, needs config          │
│  Cloud Storage        │   🔲    │ Not started                   │
│  Web Speech API       │   🔲    │ Future enhancement            │
│  Push Notifications   │   🔲    │ Future enhancement            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*  
*Last Updated: March 2026*
