// Embedding facade — the public API the rest of the app uses.
// Mirrors the previous embedding-service contract (getOrGenerateEmbedding /
// getQueryEmbedding / backgroundEnrichEmbeddings), now backed by the local
// model worker and the IndexedDB vector store.

import { EMBED_MAX_CHARS, ENRICH_BATCH_SIZE, ENRICH_BATCH_DELAY_MS, QUERY_CACHE_TTL_MS } from '../config';
import { modelManager } from '../model/ModelManager';
import { crystalContentHash, crystalEmbedText } from './cosineSimilarity';
import { vectorStore } from './vectorStore';

export { crystalContentHash };
export { cosineSimilarity } from './cosineSimilarity';

type EmbeddableCrystal = { id: string; title: string; content?: string; body?: string };

// In-memory query-embedding cache (5-minute TTL)
const queryCache = new Map<string, { vector: Float32Array; ts: number }>();

/** Cached note vector if fresh, else null (no inference). */
export async function getCachedEmbedding(
  crystalId: string,
  hash: string
): Promise<Float32Array | null> {
  return vectorStore.getVector(crystalId, hash);
}

/**
 * Note embedding: IndexedDB cache hit, or local inference + cache write.
 * Returns null when the model is unavailable — callers degrade to lexical.
 */
export async function getOrGenerateEmbedding(
  crystal: EmbeddableCrystal
): Promise<Float32Array | null> {
  const hash = crystalContentHash(crystal);
  const cached = await vectorStore.getVector(crystal.id, hash);
  if (cached) return cached;

  const text = crystalEmbedText(crystal, EMBED_MAX_CHARS);
  if (!text) return null;

  try {
    const [vector] = await modelManager.embed([text], 'passage');
    if (vector) await vectorStore.putVector(crystal.id, hash, vector);
    return vector ?? null;
  } catch {
    return null; // model loading failed / worker crashed — lexical-only mode
  }
}

/** Query embedding with a short-lived in-memory cache. */
export async function getQueryEmbedding(query: string): Promise<Float32Array | null> {
  const key = query.toLowerCase().trim();
  if (!key) return null;

  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.ts < QUERY_CACHE_TTL_MS) return cached.vector;

  try {
    const [vector] = await modelManager.embed([key.slice(0, 500)], 'query');
    if (!vector) return null;
    queryCache.set(key, { vector, ts: Date.now() });
    if (queryCache.size > 50) {
      const cutoff = Date.now() - QUERY_CACHE_TTL_MS;
      for (const [k, v] of queryCache) if (v.ts < cutoff) queryCache.delete(k);
    }
    return vector;
  } catch {
    return null;
  }
}

export interface EnrichProgress {
  done: number;
  total: number;
}

/**
 * Background enrichment: embed every note without a fresh vector, in batches,
 * yielding between batches so the worker never saturates. This is the
 * multi-device re-index path — after Firestore hydration on a new device,
 * vectors rebuild progressively while lexical features work immediately.
 *
 * Fire-and-forget; failures are silent (semantic features simply stay partial).
 */
export async function backgroundEnrichEmbeddings(
  crystals: EmbeddableCrystal[],
  onProgress?: (p: EnrichProgress) => void
): Promise<void> {
  try {
    // Figure out what actually needs work before waking the model
    const pending: EmbeddableCrystal[] = [];
    for (const c of crystals) {
      const hash = crystalContentHash(c);
      if (!(await vectorStore.getVector(c.id, hash))) pending.push(c);
    }
    if (pending.length === 0) return;

    await modelManager.ensureReady();
    await vectorStore.purgeOtherModels(); // model-version migration

    let done = 0;
    for (let i = 0; i < pending.length; i += ENRICH_BATCH_SIZE) {
      const batch = pending.slice(i, i + ENRICH_BATCH_SIZE);
      const texts = batch.map((c) => crystalEmbedText(c, EMBED_MAX_CHARS));
      const vectors = await modelManager.embed(texts, 'passage');
      await Promise.all(batch.map((c, j) =>
        vectors[j] ? vectorStore.putVector(c.id, crystalContentHash(c), vectors[j]) : Promise.resolve()
      ));
      done += batch.length;
      onProgress?.({ done, total: pending.length });
      if (i + ENRICH_BATCH_SIZE < pending.length) {
        await new Promise((r) => setTimeout(r, ENRICH_BATCH_DELAY_MS));
      }
    }

    // Occasional hygiene: drop vectors for deleted notes
    await vectorStore.pruneOrphans(new Set(crystals.map((c) => c.id)));
  } catch {
    // Model unavailable — enrichment resumes on a later call
  }
}

/** Remove a deleted note's vector (called from the note-deletion path). */
export async function removeEmbedding(crystalId: string): Promise<void> {
  await vectorStore.deleteVector(crystalId);
}
