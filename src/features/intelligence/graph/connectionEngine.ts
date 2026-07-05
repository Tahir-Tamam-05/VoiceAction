// Local semantic connection engine.
//
// Connections come from measurable signals only:
//   1. Semantic similarity — local embedding cosine with ADAPTIVE thresholds
//   2. Shared keyphrases/topics — locally extracted, ≥2 shared for an edge
//   3. Agreement bonus when both signals fire
//
// Adaptive thresholding (no single hardcoded cosine): a candidate similarity
// must clear BOTH the model-specific floor (E5's anisotropy means unrelated
// texts already score ~0.7–0.8) AND mean + K·σ of THIS note's candidate
// distribution. That keeps dense corpora from exploding into hairballs and
// sparse corpora from ending up edgeless. Edges are capped per note.
//
// Every edge carries deterministic, explainable reasons — no LLM text.

import { Crystal } from '../../../types';
import {
  ACTIVE_MODEL, ADAPTIVE_MIN_CANDIDATES, ADAPTIVE_SIGMA_K,
  MAX_CONNECTIONS_PER_NOTE, MAX_TOPICS, TOPIC_CACHE_PREFIX, TOPIC_EDGE_MIN_SHARED,
} from '../config';
import { extractKeywords } from '../nlp/keywordExtractor';
import { normalizeForAnalysis } from '../nlp/normalizeText';
import { ConnectionResult } from '../types';
import { cosineSimilarity, crystalContentHash } from '../semantic/cosineSimilarity';
import { getOrGenerateEmbedding } from '../semantic/embeddings';
import { vectorStore } from '../semantic/vectorStore';

// ─── Local topic extraction (keyphrases) ──────────────────────

interface TopicCacheEntry { hash: string; topics: string[]; ts: number }

function getCachedTopics(crystalId: string, hash: string): string[] | null {
  try {
    const raw = localStorage.getItem(`${TOPIC_CACHE_PREFIX}${crystalId}`);
    if (!raw) return null;
    const entry: TopicCacheEntry = JSON.parse(raw);
    return entry.hash === hash ? entry.topics : null;
  } catch {
    return null;
  }
}

function setCachedTopics(crystalId: string, hash: string, topics: string[]): void {
  try {
    localStorage.setItem(
      `${TOPIC_CACHE_PREFIX}${crystalId}`,
      JSON.stringify({ hash, topics, ts: Date.now() } satisfies TopicCacheEntry)
    );
  } catch { /* quota — cache is optional */ }
}

/**
 * Topic labels for a note — top locally extracted keyphrases.
 * Synchronous computation; the async signature is kept for call-site
 * compatibility. Falls back to tags when the text is too thin.
 */
export async function extractTopics(crystal: Crystal): Promise<string[]> {
  const hash = crystalContentHash(crystal);
  const cached = getCachedTopics(crystal.id, hash);
  if (cached) return cached;

  const { text } = normalizeForAnalysis(
    `${crystal.title}. ${crystal.content || ''} ${crystal.body || ''}`
  );

  let topics: string[];
  if (text.length < 10) {
    topics = tagFallbackTopics(crystal);
  } else {
    const { keyphrases, keywords } = extractKeywords(text);
    topics = keyphrases.map((p) => p.term);
    // Thin phrase yield → backfill with top single keywords
    for (const k of keywords) {
      if (topics.length >= MAX_TOPICS) break;
      if (!topics.some((t) => t.includes(k.term))) topics.push(k.term);
    }
    topics = topics.slice(0, MAX_TOPICS);
    if (topics.length === 0) topics = tagFallbackTopics(crystal);
  }

  setCachedTopics(crystal.id, hash, topics);
  return topics;
}

function tagFallbackTopics(crystal: Crystal): string[] {
  const topics = (crystal.tags ?? []).map((t) => t.toLowerCase());
  if (crystal.type && crystal.type !== 'text') topics.push(crystal.type);
  return [...new Set(topics)].slice(0, 4);
}

// ─── Topic overlap ────────────────────────────────────────────

/**
 * Phrase-variant matching: "exam preparation plan" and "exam preparation
 * notes" are the same theme. Two topics match on containment OR when they
 * share ≥50% of the shorter phrase's content tokens.
 */
function topicsMatch(a: string, b: string): boolean {
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const ta = a.split(' ');
  const tb = new Set(b.split(' '));
  const shared = ta.filter((t) => tb.has(t)).length;
  return shared / Math.min(ta.length, tb.size) >= 0.5 && shared >= 1;
}

function sharedTopicsBetween(a: string[], b: string[]): string[] {
  return a.filter((t) => b.some((o) => topicsMatch(t, o)));
}

// ─── Adaptive semantic threshold ──────────────────────────────

export interface AdaptiveThreshold {
  threshold: number;
  mean: number;
  std: number;
}

/**
 * Threshold for one note against its candidate similarity distribution:
 *   max(model floor, μ + K·σ), clamped so it can never exceed the top score
 *   (a note's single best neighbor always remains reachable when above floor).
 * Small corpora (< ADAPTIVE_MIN_CANDIDATES) skip the statistics — σ over 3
 * points is noise — and use the model floor alone.
 */
export function computeAdaptiveThreshold(sims: number[]): AdaptiveThreshold {
  const floor = ACTIVE_MODEL.similarityFloor;
  if (sims.length === 0) return { threshold: floor, mean: 0, std: 0 };

  const mean = sims.reduce((s, v) => s + v, 0) / sims.length;
  const variance = sims.reduce((s, v) => s + (v - mean) ** 2, 0) / sims.length;
  const std = Math.sqrt(variance);

  if (sims.length < ADAPTIVE_MIN_CANDIDATES) {
    return { threshold: floor, mean, std };
  }

  const adaptive = mean + ADAPTIVE_SIGMA_K * std;
  const top = Math.max(...sims);
  // Never let the bar rise above the best available neighbor
  const threshold = Math.min(Math.max(floor, adaptive), Math.max(floor, top));
  return { threshold, mean, std };
}

/** Floor-normalize a raw cosine into a 0–1 confidence for the active model. */
function normalizeSim(sim: number): number {
  const floor = ACTIVE_MODEL.similarityFloor;
  return Math.max(0, Math.min((sim - floor) / (1 - floor), 1));
}

// ─── Connection discovery ─────────────────────────────────────

export async function findSemanticConnections(
  target: Crystal,
  candidates: Crystal[]
): Promise<ConnectionResult[]> {
  const others = candidates.filter((c) => c.id !== target.id);
  if (others.length === 0) return [];

  const targetTopics = await extractTopics(target);
  const targetVector = await getOrGenerateEmbedding(target); // null → topic-only mode

  // Batch-read all cached vectors once
  const vectors = targetVector ? await vectorStore.getAllCurrent() : new Map();

  // First pass: collect similarities for the adaptive threshold
  const simByCandidate = new Map<string, number>();
  if (targetVector) {
    for (const other of others) {
      const entry = vectors.get(other.id);
      if (!entry || entry.hash !== crystalContentHash(other)) continue;
      simByCandidate.set(other.id, cosineSimilarity(targetVector, entry.vector));
    }
  }
  const { threshold } = computeAdaptiveThreshold([...simByCandidate.values()]);

  // Second pass: score edges
  const results: ConnectionResult[] = [];
  for (const other of others) {
    const otherTopics = await extractTopics(other);
    const shared = sharedTopicsBetween(targetTopics, otherTopics);

    const topicConfidence = shared.length >= TOPIC_EDGE_MIN_SHARED
      ? Math.min(shared.length / Math.max(targetTopics.length, otherTopics.length, 1), 1)
      : 0;

    const sim = simByCandidate.get(other.id) ?? 0;
    const semanticConfidence = sim >= threshold ? normalizeSim(sim) : 0;

    if (topicConfidence === 0 && semanticConfidence === 0) continue;

    let confidence: number;
    let method: ConnectionResult['method'];
    const reasons: string[] = [];

    if (topicConfidence > 0 && semanticConfidence > 0) {
      confidence = Math.min(semanticConfidence * 0.6 + topicConfidence * 0.4 + 0.1, 1);
      method = 'hybrid';
    } else if (semanticConfidence > 0) {
      confidence = semanticConfidence;
      method = 'embedding';
    } else {
      confidence = topicConfidence;
      method = 'topic';
    }

    for (const t of shared.slice(0, 2)) reasons.push(`Shared topic: ${t}`);
    if (semanticConfidence > 0) reasons.push(`Semantically similar (${Math.round(semanticConfidence * 100)}%)`);

    results.push({ crystalId: other.id, confidence, sharedTopics: shared, method, reasons });
  }

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_CONNECTIONS_PER_NOTE);
}

// ─── Full enrichment (call-site contract preserved) ───────────

/**
 * Runs the full connection pipeline on a crystal; returns the fields to merge
 * into the note (same contract EditNote already uses, fire-and-forget).
 */
export async function enrichCrystalConnections(
  target: Crystal,
  allCrystals: Crystal[]
): Promise<Partial<Crystal>> {
  const semanticConns = await findSemanticConnections(target, allCrystals);

  const linkedNoteIds = [...new Set(semanticConns.map((c) => c.crystalId))]
    .filter((id) => id !== target.id);

  const connectionConfidence: Record<string, number> = {};
  semanticConns.forEach((c) => { connectionConfidence[c.crystalId] = c.confidence; });

  const topics = await extractTopics(target);

  return {
    linkedNoteIds,
    connections: linkedNoteIds.length,
    connectionConfidence,
    topics,
    topicsGeneratedAt: Date.now(),
  };
}
