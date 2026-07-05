import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { VectorStore, MemoryBackend, CURRENT_MODEL_TAG } from '../semantic/vectorStore';

function vec(fill: number, dim = 8): Float32Array {
  return new Float32Array(dim).fill(fill);
}

describe('VectorStore (IndexedDB via fake-indexeddb)', () => {
  let store: VectorStore;

  beforeEach(async () => {
    store = new VectorStore();
    await store.clearAll();
  });

  it('round-trips a vector keyed by (noteId, hash)', async () => {
    await store.putVector('n1', 'hashA', vec(0.5));
    const got = await store.getVector('n1', 'hashA');
    expect(got).not.toBeNull();
    expect(got![0]).toBeCloseTo(0.5);
  });

  it('invalidates on content-hash change, not on metadata changes', async () => {
    await store.putVector('n1', 'hashA', vec(1));
    // same hash (metadata-only edit) → still valid
    expect(await store.getVector('n1', 'hashA')).not.toBeNull();
    // content changed → hash changed → stale
    expect(await store.getVector('n1', 'hashB')).toBeNull();
  });

  it('prunes orphans for deleted notes', async () => {
    await store.putVector('keep', 'h', vec(1));
    await store.putVector('gone', 'h', vec(2));
    const removed = await store.pruneOrphans(new Set(['keep']));
    expect(removed).toBe(1);
    expect(await store.getVector('keep', 'h')).not.toBeNull();
    expect(await store.getVector('gone', 'h')).toBeNull();
  });

  it('deletes individual vectors', async () => {
    await store.putVector('n1', 'h', vec(1));
    await store.deleteVector('n1');
    expect(await store.getVector('n1', 'h')).toBeNull();
  });

  it('batch-reads all current-model vectors', async () => {
    await store.putVector('a', 'ha', vec(1));
    await store.putVector('b', 'hb', vec(2));
    const all = await store.getAllCurrent();
    expect(all.size).toBe(2);
    expect(all.get('a')!.hash).toBe('ha');
  });

  it('tags records with the current model version', async () => {
    expect(CURRENT_MODEL_TAG).toMatch(/@\d+$/);
  });
});

describe('VectorStore (memory fallback)', () => {
  it('works fully on the in-memory backend and reports degraded mode', async () => {
    const store = new VectorStore(new MemoryBackend());
    await store.putVector('n1', 'h', vec(3));
    expect((await store.getVector('n1', 'h'))![0]).toBeCloseTo(3);
    await store.deleteVector('n1');
    expect(await store.getVector('n1', 'h')).toBeNull();
  });
});
