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

export type Screen = 'landing' | 'home' | 'search' | 'history' | 'settings' | 'recording' | 'edit';

export type NoteAttachment = {
  id: string;
  type: "text" | "link" | "image" | "file";
  content: string;       // raw text, full URL, or base64 data
  label?: string;        // optional display label
  createdAt: number;
  mimeType?: string;
  size?: number;
};

export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'task' | 'event' | 'idea' | 'audio' | 'voice' | 'text';
  timestamp: string;
  createdAt: number;
  pinned?: boolean;
  tags?: string[];
  body?: string;                    // NEW: rich free-text note body
  attachments?: NoteAttachment[];   // NEW: links + extra text blocks
  mood?: string;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: number;
  avatar?: string;   // initials only, derived from name
};

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

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
