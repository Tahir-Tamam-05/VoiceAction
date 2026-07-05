import { 
  Home, 
  Search, 
  History, 
  Settings, 
  Mic, 
  CheckCircle2, 
  Lightbulb, 
  FileText, 
  MoreVertical, 
  ArrowLeft, 
  Verified, 
  Crown, 
  ChevronRight, 
  LogOut,
  Bell,
  Moon,
  Shield,
  X,
  Plus,
  Send,
  Filter,
  Pin,
  TrendingUp,
  Clock
} from 'lucide-react';

export type Screen = 'landing' | 'signin' | 'home' | 'search' | 'history' | 'settings' | 'recording' | 'edit' | 'flashcards' | 'thoughtgraph';

export type NoteAttachment = {
  id: string;
  type: "text" | "link" | "image" | "file";
  content: string;       // raw text, full URL, or base64 data
  label?: string;        // optional display label
  createdAt: number;
  mimeType?: string;
  size?: number;
};

// Versioned document schema for backward compatibility
export type CrystalVersion = 'v1' | 'v2';

export interface Crystal {
  id: string;
  title: string;
  content: string;       // Summary (max 100 chars)
  body?: string;         // Full cleaned text
  type: 'task' | 'event' | 'idea' | 'audio' | 'voice' | 'text';
  timestamp: string;
  createdAt: number;
  updatedAt?: number;    // For tracking modifications
  pinned?: boolean;
  tags?: string[];
  attachments?: NoteAttachment[];

  // Crystal-specific fields (Phase 1+)
  mood?: string;         // e.g., "Focused", "Creative", "Neutral"
  moodColor?: string;    // Hex color based on mood
  linkedNoteIds?: string[];  // For auto-linking feature
  connections?: number;  // Number of linked notes (for graph)
  lastSeen?: number;     // Timestamp for "Forgotten Gems"
  version?: CrystalVersion;  // Schema version

  // Optional features
  coverImage?: string;
  translation?: {
    lang: string;
    langLabel: string;
    text: string;
    updatedAt: number;
  };
  flashcardEnabled?: boolean;
  flashcardReview?: {
    nextReviewAt: number;
    interval: number;        // days until next review
    easeFactor: number;      // SM-2 ease factor (default 2.5, min 1.3)
    totalReviews: number;
    repetition: number;      // SM-2 consecutive correct reviews (resets on Again)
  };

  // AI-generated metadata
  aiConfidence?: number;          // 0-1 confidence score from the local intelligence engine
  extractedActions?: string[];    // Action items extracted by AI

  // Semantic Intelligence (Sprint 3)
  topics?: string[];              // AI-extracted topic labels (stored, synced via Firestore)
  topicsGeneratedAt?: number;     // When topics were last extracted
  semanticSummary?: string;       // Short AI-generated semantic summary for embedding
  connectionConfidence?: Record<string, number>; // noteId → confidence score for edges
}

// Keep Note as alias for backward compatibility during migration
export type Note = Crystal;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: number;
  avatar?: string;   // initials only, derived from name

  // User stats for streak engine
  lastCaptureDate?: number;     // Timestamp of last note creation
  currentStreak?: number;       // Current streak count
  longestStreak?: number;       // All-time longest streak

  // Streak freeze (1 free freeze per calendar week)
  streakFreezeAvailable?: number;  // freezes available (0 or 1)
  streakFreezeWeek?: number;       // ISO week number when last freeze was granted
  streakFreezeUsedWeek?: number;   // ISO week number when freeze was last consumed
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

// Feature flags for gradual rollout (Phase 1+)
export interface FeatureFlags {
  smartTagging: boolean;
  translation: boolean;
  noteLinking: boolean;
  forgottenGems: boolean;
  weeklyDigest: boolean;
  voicePlayback: boolean;
  flashcards: boolean;
  pushNotifications: boolean;
}

// User settings stored in Firestore
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  featureFlags: FeatureFlags;
  notifications: {
    streakReminders: boolean;
    weeklyDigest: boolean;
    connectionHints: boolean;
  };
  updatedAt: number;
}

export const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: 'Quarterly strategy review regarding editorial direction and thermal aesthetic.',
    content: 'Focus on high-contrast typography and tonal depth.',
    type: 'task',
    timestamp: '10:42 AM',
    createdAt: Date.now() - 1000 * 60 * 60,
    pinned: true,
    tags: ['BUSINESS', 'FOCUS'],
    body: 'The design system rejects the "SaaS-standard" aesthetic of cold grays and rigid borders.',
    attachments: [
      { id: 'a1', type: 'link', content: 'https://editorial-intel.design', label: 'editorial-intel.design', createdAt: Date.now() }
    ]
  },
  {
    id: '2',
    title: 'Grocery list for the weekend gala event at the solar monolith.',
    content: 'Need to buy supplies for the event.',
    type: 'task',
    timestamp: '09:15 AM',
    createdAt: Date.now() - 1000 * 60 * 120,
    tags: ['PERSONAL']
  },
  {
    id: '3',
    title: 'Voice memo: Reflection on typography and the importance of medium weights.',
    content: 'Medium weights are essential for OLED legibility.',
    type: 'audio',
    timestamp: '08:02 AM',
    createdAt: Date.now() - 1000 * 60 * 180,
    tags: ['IDEAS', 'REFINED']
  },
  {
    id: '4',
    title: 'Neural Interface Concept Design',
    content: 'Exploring brain-computer interaction patterns.',
    type: 'idea',
    timestamp: 'Yesterday',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: '5',
    title: 'Design Sprint Kickoff Sync',
    content: 'Meeting with the core team.',
    type: 'event',
    timestamp: 'Yesterday',
    createdAt: Date.now() - 1000 * 60 * 60 * 25,
  }
];
