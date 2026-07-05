// Two-tier local search.
//
//   Tier 1 — lexical: BM25-weighted field scoring (title/tags/topics/body)
//            with prefix fuzzy matching and phrase bonus. Instant, synchronous,
//            works before the model has ever loaded.
//   Tier 2 — semantic: query embedding vs cached note vectors (batch-read from
//            IndexedDB). Notes without vectors keep their lexical score —
//            search never blocks on inference for the corpus.
//
// Hybrid ranking: 0.65 · semantic (floor-normalized) + 0.35 · lexical.

import { Crystal, Note } from '../../../types';
import { ACTIVE_MODEL } from '../config';
import { tokenize } from '../nlp/tokenize';
import { cosineSimilarity, crystalContentHash } from './cosineSimilarity';
import { getQueryEmbedding } from './embeddings';
import { vectorStore } from './vectorStore';

export type MatchType = 'embedding' | 'keyword' | 'topic' | 'hybrid';

export interface RankedResult {
  note: Note;
  score: number;       // 0–1
  matchType: MatchType;
  matchedTerms?: string[];
}

// ─── Tier 1: BM25-weighted lexical ranking ────────────────────

const K1 = 1.4;
const B = 0.6;
const FIELD_WEIGHTS = { title: 3.0, tags: 2.2, topics: 2.5, body: 1.0 } as const;

interface DocIndex {
  note: Note;
  fields: Record<keyof typeof FIELD_WEIGHTS, string[]>;
  length: number;
}

export function keywordRank(query: string, notes: Note[]): RankedResult[] {
  if (!query.trim() || notes.length === 0) return [];
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  // Build a lightweight index for this call (≤ few-k notes → single-digit ms)
  const docs: DocIndex[] = notes.map((note) => {
    const crystal = note as Crystal;
    const fields = {
      title: tokenize(note.title || ''),
      tags: (note.tags || []).flatMap((t) => tokenize(t)),
      topics: (crystal.topics || []).flatMap((t) => tokenize(t)),
      body: tokenize((note.content || '') + ' ' + (note.body || '')),
    };
    return {
      note,
      fields,
      length: fields.title.length + fields.body.length + fields.tags.length + fields.topics.length,
    };
  });

  const avgLen = docs.reduce((s, d) => s + d.length, 0) / docs.length || 1;

  // Document frequency per query token (exact or prefix hit counts)
  const df = new Map<string, number>();
  for (const qt of qTokens) {
    let count = 0;
    for (const d of docs) {
      const hit = (Object.keys(d.fields) as Array<keyof typeof FIELD_WEIGHTS>)
        .some((f) => d.fields[f].some((t) => t === qt || t.startsWith(qt)));
      if (hit) count++;
    }
    df.set(qt, count);
  }

  const N = docs.length;
  const results: RankedResult[] = [];

  for (const d of docs) {
    let score = 0;
    const matchedTerms: string[] = [];

    for (const qt of qTokens) {
      // Field-weighted term frequency; prefix matches count at half weight
      let wtf = 0;
      for (const f of Object.keys(d.fields) as Array<keyof typeof FIELD_WEIGHTS>) {
        for (const t of d.fields[f]) {
          if (t === qt) wtf += FIELD_WEIGHTS[f];
          else if (t.startsWith(qt) && qt.length >= 3) wtf += FIELD_WEIGHTS[f] * 0.5;
        }
      }
      if (wtf === 0) continue;
      matchedTerms.push(qt);

      const idf = Math.log(1 + (N - (df.get(qt) ?? 0) + 0.5) / ((df.get(qt) ?? 0) + 0.5));
      score += idf * (wtf * (K1 + 1)) / (wtf + K1 * (1 - B + B * (d.length / avgLen)));
    }

    if (score <= 0) continue;

    // Whole-phrase bonus + light recency bonus
    if (d.note.title?.toLowerCase().includes(query.toLowerCase().trim())) score *= 1.5;
    if (Date.now() - (d.note.createdAt || 0) < 7 * 86_400_000) score += 0.05;

    results.push({ note: d.note, score, matchType: 'keyword', matchedTerms: [...new Set(matchedTerms)] });
  }

  // Normalize to 0–1 against the best hit
  const max = results.reduce((m, r) => Math.max(m, r.score), 0) || 1;
  for (const r of results) r.score = Math.min(r.score / max, 1);

  return results.sort((a, b) => b.score - a.score);
}

// ─── Tier 2: semantic ranking over cached vectors ─────────────

/** Floor-normalize a raw cosine into 0–1 for the active model. */
function normalizeSim(sim: number): number {
  const floor = ACTIVE_MODEL.similarityFloor;
  return Math.max(0, Math.min((sim - floor) / (1 - floor), 1));
}

export async function embeddingRank(query: string, notes: Note[]): Promise<RankedResult[]> {
  if (!query.trim() || notes.length === 0) return [];

  const queryVector = await getQueryEmbedding(query);
  if (!queryVector) return []; // model not ready — lexical results stand

  // One batch read instead of N individual IDB hits
  const vectors = await vectorStore.getAllCurrent();
  const results: RankedResult[] = [];

  for (const note of notes) {
    const entry = vectors.get(note.id);
    if (!entry) continue; // not yet enriched — keeps its lexical score
    if (entry.hash !== crystalContentHash(note as Crystal)) continue; // stale

    const score = normalizeSim(cosineSimilarity(queryVector, entry.vector));
    if (score > 0.05) results.push({ note, score, matchType: 'embedding' });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Hybrid merge ─────────────────────────────────────────────

export async function semanticRank(
  query: string,
  notes: Note[],
  options: { maxResults?: number } = {}
): Promise<RankedResult[]> {
  const { maxResults = 50 } = options;
  if (!query.trim() || notes.length === 0) return [];

  const kwResults = keywordRank(query, notes);
  const embResults = await embeddingRank(query, notes);

  if (embResults.length === 0) return kwResults.slice(0, maxResults);

  const kwMap = new Map(kwResults.map((r) => [r.note.id, r]));
  const merged = new Map<string, RankedResult>();

  for (const emb of embResults) {
    const kw = kwMap.get(emb.note.id);
    merged.set(emb.note.id, kw
      ? { note: emb.note, score: emb.score * 0.65 + kw.score * 0.35, matchType: 'hybrid', matchedTerms: kw.matchedTerms }
      : emb);
  }
  for (const kw of kwResults) {
    if (!merged.has(kw.note.id)) merged.set(kw.note.id, kw);
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ─── Badge label helper (unchanged contract) ──────────────────

export function matchTypeBadge(type: MatchType): string {
  switch (type) {
    case 'embedding': return 'AI';
    case 'hybrid':    return 'AI+';
    case 'topic':     return 'Topic';
    case 'keyword':   return '';
  }
}
