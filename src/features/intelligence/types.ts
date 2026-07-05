// Shared types for the local intelligence engine.

import { Tag } from '../../utils/tagHelpers';

// Structured note produced by the local pipeline. Field names intentionally
// mirror the previous remote-AI response so call sites need only an import swap.
export interface StructuredNoteResult {
  title: string;
  type: 'task' | 'event' | 'idea' | 'voice' | 'audio' | 'text';
  summary: string;
  tags: string[];
  mood?: string;
}

export type ProcessResult =
  | { success: true; tags: Tag[]; data: StructuredNoteResult }
  | { success: false; reason: string; tags: Tag[] };

export interface DetectedAction {
  text: string;
  /** Explicit due-date phrase found in the sentence (never inferred) */
  dueHint?: string;
}

export interface NoteAnalysis {
  language: DetectedLanguage;
  sentences: string[];
  keywords: RankedTerm[];
  keyphrases: RankedTerm[];
  actions: DetectedAction[];
}

export interface RankedTerm {
  term: string;
  score: number;
}

export interface DetectedLanguage {
  primary: 'en' | 'hi' | 'kn' | 'other';
  mixed: boolean;
}

// ─── Model / worker ───────────────────────────────────────────

export type ModelStatus =
  | { state: 'idle' }
  | { state: 'loading'; progress: number | null }  // 0–100 or null when unknown
  | { state: 'ready' }
  | { state: 'error'; message: string };

export type EmbedKind = 'query' | 'passage';

// ─── Connections ──────────────────────────────────────────────

export interface ConnectionResult {
  crystalId: string;
  confidence: number; // 0–1
  sharedTopics: string[];
  method: 'topic' | 'embedding' | 'wiki' | 'hybrid';
  reasons: string[];  // human-readable, deterministic — e.g. "Shared topic: exam prep"
}

// ─── Clustering ───────────────────────────────────────────────

export interface ClusterAssignment {
  /** noteId → clusterId (clusterId is the smallest member noteId — stable) */
  membership: Map<string, string>;
  clusters: Array<{ id: string; memberIds: string[]; label: string }>;
}
