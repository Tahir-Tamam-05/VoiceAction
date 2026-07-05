// Local vector store — IndexedDB-backed, with a transparent in-memory
// fallback when IndexedDB is unavailable (private browsing, quota, corruption).
//
// Records are keyed by noteId and versioned by (contentHash, modelId): a
// vector is valid only if both match. Metadata edits (pin, tags) don't touch
// semantic content, so they never invalidate vectors. Model changes invalidate
// everything for the old model via purgeOtherModels().
//
// Vectors never leave the device. Firestore stores notes; vectors stay local.

import {
  VECTOR_DB_NAME, VECTOR_DB_VERSION, VECTOR_STORE_NAME,
  ACTIVE_MODEL, ACTIVE_MODEL_KEY,
} from '../config';

export interface VectorRecord {
  noteId: string;
  hash: string;
  modelId: string;      // e.g. "multilingual-e5-small@1"
  dim: number;
  vector: ArrayBuffer;  // Float32Array bytes
  createdAt: number;
  updatedAt: number;
}

export const CURRENT_MODEL_TAG = `${ACTIVE_MODEL_KEY}@${ACTIVE_MODEL.version}`;

// ─── Backend abstraction (IDB or memory) ──────────────────────

interface VectorBackend {
  get(noteId: string): Promise<VectorRecord | undefined>;
  put(record: VectorRecord): Promise<void>;
  delete(noteId: string): Promise<void>;
  getAll(): Promise<VectorRecord[]>;
  clear(): Promise<void>;
}

class MemoryBackend implements VectorBackend {
  private map = new Map<string, VectorRecord>();
  async get(noteId: string) { return this.map.get(noteId); }
  async put(record: VectorRecord) { this.map.set(record.noteId, record); }
  async delete(noteId: string) { this.map.delete(noteId); }
  async getAll() { return [...this.map.values()]; }
  async clear() { this.map.clear(); }
}

class IdbBackend implements VectorBackend {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.open(true);
  }

  private open(allowRecovery: boolean): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(VECTOR_DB_NAME, VECTOR_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(VECTOR_STORE_NAME)) {
          db.createObjectStore(VECTOR_STORE_NAME, { keyPath: 'noteId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        if (allowRecovery) {
          // Corruption recovery: drop the DB and recreate once
          const del = indexedDB.deleteDatabase(VECTOR_DB_NAME);
          del.onsuccess = del.onerror = () => {
            this.open(false).then(resolve, reject);
          };
        } else {
          reject(req.error ?? new Error('IndexedDB open failed'));
        }
      };
      req.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
  }

  private async tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.dbPromise;
    return new Promise<T>((resolve, reject) => {
      const t = db.transaction(VECTOR_STORE_NAME, mode);
      const req = run(t.objectStore(VECTOR_STORE_NAME));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
    });
  }

  get(noteId: string) { return this.tx<VectorRecord | undefined>('readonly', (s) => s.get(noteId) as IDBRequest<VectorRecord | undefined>); }
  async put(record: VectorRecord) { await this.tx('readwrite', (s) => s.put(record)); }
  async delete(noteId: string) { await this.tx('readwrite', (s) => s.delete(noteId)); }
  getAll() { return this.tx<VectorRecord[]>('readonly', (s) => s.getAll() as IDBRequest<VectorRecord[]>); }
  async clear() { await this.tx('readwrite', (s) => s.clear()); }
}

// ─── Store ────────────────────────────────────────────────────

export class VectorStore {
  private backend: VectorBackend;
  private degraded = false;

  constructor(backend?: VectorBackend) {
    if (backend) {
      this.backend = backend;
    } else if (typeof indexedDB !== 'undefined') {
      this.backend = new IdbBackend();
    } else {
      this.backend = new MemoryBackend();
      this.degraded = true;
    }
  }

  /** True when running on the in-memory fallback (vectors won't survive reload). */
  isDegraded(): boolean {
    return this.degraded;
  }

  private async safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await op();
    } catch {
      // IDB failure mid-session → degrade to memory so the app keeps working
      if (!(this.backend instanceof MemoryBackend)) {
        this.backend = new MemoryBackend();
        this.degraded = true;
        try { return await op(); } catch { return fallback; }
      }
      return fallback;
    }
  }

  /** Returns the vector only if hash AND model tag match — else null. */
  async getVector(noteId: string, hash: string): Promise<Float32Array | null> {
    return this.safe(async () => {
      const rec = await this.backend.get(noteId);
      if (!rec || rec.hash !== hash || rec.modelId !== CURRENT_MODEL_TAG) return null;
      return new Float32Array(rec.vector);
    }, null);
  }

  async putVector(noteId: string, hash: string, vector: Float32Array): Promise<void> {
    const now = Date.now();
    await this.safe(async () => {
      const existing = await this.backend.get(noteId);
      await this.backend.put({
        noteId,
        hash,
        modelId: CURRENT_MODEL_TAG,
        dim: vector.length,
        vector: vector.buffer.slice(0) as ArrayBuffer,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    }, undefined);
  }

  async deleteVector(noteId: string): Promise<void> {
    await this.safe(() => this.backend.delete(noteId), undefined);
  }

  /** All valid vectors for the current model, as a batch read. */
  async getAllCurrent(): Promise<Map<string, { hash: string; vector: Float32Array }>> {
    return this.safe(async () => {
      const all = await this.backend.getAll();
      const map = new Map<string, { hash: string; vector: Float32Array }>();
      for (const rec of all) {
        if (rec.modelId !== CURRENT_MODEL_TAG) continue;
        map.set(rec.noteId, { hash: rec.hash, vector: new Float32Array(rec.vector) });
      }
      return map;
    }, new Map());
  }

  /** Remove vectors for notes that no longer exist (orphan cleanup). */
  async pruneOrphans(validNoteIds: Set<string>): Promise<number> {
    return this.safe(async () => {
      const all = await this.backend.getAll();
      let removed = 0;
      for (const rec of all) {
        if (!validNoteIds.has(rec.noteId)) {
          await this.backend.delete(rec.noteId);
          removed++;
        }
      }
      return removed;
    }, 0);
  }

  /** Model-version migration: drop vectors produced by any other model. */
  async purgeOtherModels(): Promise<number> {
    return this.safe(async () => {
      const all = await this.backend.getAll();
      let removed = 0;
      for (const rec of all) {
        if (rec.modelId !== CURRENT_MODEL_TAG) {
          await this.backend.delete(rec.noteId);
          removed++;
        }
      }
      return removed;
    }, 0);
  }

  async clearAll(): Promise<void> {
    await this.safe(() => this.backend.clear(), undefined);
  }
}

export const vectorStore = new VectorStore();
export { MemoryBackend };
