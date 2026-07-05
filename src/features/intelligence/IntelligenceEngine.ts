// IntelligenceEngine — the single canonical entry point for all local
// intelligence in VoiceAction — structuring, embeddings, connections, search.
//
//   note text ──► deterministic NLP (sync, <50ms) ──► structured note
//              └► local embedding (worker, async)  ──► vector store
//                       └► connections ──► clusters ──► search ──► insights
//
// Privacy boundary: nothing in this module performs network inference. Note
// text goes to Firestore for sync (existing product behavior) and NOWHERE
// else. Embedding vectors never leave the device.

import { Crystal } from '../../types';
import { normalizeForAnalysis } from './nlp/normalizeText';
import { detectLanguage } from './nlp/languageDetection';
import { segmentSentences } from './nlp/sentenceSegmentation';
import { extractKeywords } from './nlp/keywordExtractor';
import { generateTitle } from './nlp/titleGenerator';
import { classifyType } from './nlp/typeClassifier';
import { classifyMood } from './nlp/moodClassifier';
import { detectActions, actionsToChecklist } from './nlp/actionDetector';
import { summarize, extractiveSummary } from './nlp/summarizer';
import { tagsForText } from './nlp/tagger';
import { modelManager } from './model/ModelManager';
import { buildClusterAssignment, ClusterEdge } from './graph/clustering';
import { labelCluster } from './graph/clusterLabeler';
import { ProcessResult, ClusterAssignment, NoteAnalysis } from './types';

// ─── Structured note processing (replaces processVoiceNoteWithTimeout) ──

/**
 * Full deterministic analysis of a note's text. Synchronous and fast; the
 * async signature matches the previous remote-AI call so call sites need only an
 * import swap. Never fails for non-empty input — there is no fallback tier
 * anymore because THIS is the reliable tier.
 */
export async function processNoteWithTimeout(text: string): Promise<ProcessResult> {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return { success: false, reason: 'empty', tags: [] };

  const { analysis, title, type, mood, summary, tags } = analyze(trimmed);
  void analysis;

  return {
    success: true,
    tags,
    data: { title, type, summary, tags, mood },
  };
}

function analyze(text: string) {
  const normalized = normalizeForAnalysis(text);
  const language = detectLanguage(normalized.text);
  const sentences = segmentSentences(normalized.text);
  const { keywords, keyphrases } = extractKeywords(normalized.text);
  const actions = detectActions(sentences);

  const { type } = classifyType(normalized.text);
  const { mood } = classifyMood(normalized.text, normalized.emojis);
  const title = generateTitle(sentences, keyphrases);
  const summary = summarize(normalized.text, sentences, keywords);
  const tags = tagsForText(normalized.text, type);

  const analysis: NoteAnalysis = { language, sentences, keywords, keyphrases, actions };
  return { analysis, title, type, mood, summary, tags };
}

/** Full analysis object for callers that need more than the structured note. */
export function analyzeText(text: string): NoteAnalysis {
  return analyze((text ?? '').trim()).analysis;
}

// ─── Text transforms (EditNote: Concise / Actions / Bullets) ────────────

export interface TransformResult {
  content?: string;
  body?: string;
}

/** "Make Concise" — extractive summary, preserves the user's own sentences. */
export function transformConcise(body: string): TransformResult | null {
  const normalized = normalizeForAnalysis(body);
  const sentences = segmentSentences(normalized.text);
  if (sentences.length === 0) return null;

  const { keywords } = extractKeywords(normalized.text);
  const concise = extractiveSummary(sentences, keywords, 3);
  return {
    body: concise,
    content: summarize(concise, segmentSentences(concise), keywords),
  };
}

/** "Extract Actions" — detected tasks as a markdown checklist. */
export function transformExtractActions(body: string): TransformResult | null {
  const normalized = normalizeForAnalysis(body);
  const sentences = segmentSentences(normalized.text);
  const actions = detectActions(sentences);
  if (actions.length === 0) return null;

  return {
    body: actionsToChecklist(actions),
    content: `${actions.length} action item${actions.length === 1 ? '' : 's'} found`,
  };
}

/** "Convert to Bullets" — one bullet per sentence/line. */
export function transformBullets(body: string): TransformResult | null {
  const normalized = normalizeForAnalysis(body);
  const sentences = segmentSentences(normalized.text);
  if (sentences.length === 0) return null;

  const bullets = sentences.map((s) => `• ${s.replace(/[.!?]+$/, '').trim()}`).join('\n');
  const { keywords } = extractKeywords(normalized.text);
  return {
    body: bullets,
    content: summarize(normalized.text, sentences, keywords),
  };
}

// ─── Clustering (canonical graph clustering + labels) ───────────────────

export function computeClusters(crystals: Crystal[]): ClusterAssignment {
  const edges: ClusterEdge[] = [];
  const ids = new Set(crystals.map((c) => c.id));
  const seen = new Set<string>();

  for (const c of crystals) {
    for (const target of c.linkedNoteIds ?? []) {
      if (!ids.has(target) || target === c.id) continue;
      const key = c.id < target ? `${c.id}|${target}` : `${target}|${c.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: c.id, b: target, weight: c.connectionConfidence?.[target] ?? 0.45 });
    }
  }

  const byId = new Map(crystals.map((c) => [c.id, c]));
  // Two-pass labeling: membership first, then distinctive labels across clusters
  const provisional = buildClusterAssignment(
    crystals.map((c) => c.id),
    edges,
    () => ''
  );
  const memberGroups = provisional.clusters.map((cl) =>
    cl.memberIds.map((id) => byId.get(id)!).filter(Boolean)
  );

  return {
    membership: provisional.membership,
    clusters: provisional.clusters.map((cl, i) => ({
      ...cl,
      label: labelCluster(memberGroups[i], memberGroups),
    })),
  };
}

// ─── Model lifecycle ─────────────────────────────────────────────────────

export { modelManager };

/** Idle-preload the embedding model once the app is settled. */
export function scheduleIntelligencePreload(): void {
  modelManager.schedulePreload();
}
