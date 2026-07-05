// ModelManager — main-thread singleton controlling the intelligence worker.
//
// Responsibilities: lazy loading, single initialization, request queueing
// before readiness, progress reporting, retry after failure, and clean
// degradation when Workers/WASM are unavailable. Never blocks app startup —
// initialization only happens on demand or during idle preload.

import { ACTIVE_MODEL, EMBED_INFERENCE_TIMEOUT_MS, MODEL_INIT_TIMEOUT_MS } from '../config';
import { EmbedKind, ModelStatus } from '../types';
import type { WorkerRequest, WorkerResponse } from './workerProtocol';

type StatusListener = (status: ModelStatus) => void;

interface PendingJob {
  resolve: (vectors: Float32Array[]) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class ModelManagerImpl {
  private worker: Worker | null = null;
  private status: ModelStatus = { state: 'idle' };
  private listeners = new Set<StatusListener>();
  private pending = new Map<number, PendingJob>();
  private nextJobId = 1;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((e: Error) => void) | null = null;
  private initTimer: ReturnType<typeof setTimeout> | null = null;

  getStatus(): ModelStatus {
    return this.status;
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: ModelStatus) {
    this.status = status;
    this.listeners.forEach((l) => l(status));
  }

  /** Kick off model loading during browser idle time. Safe to call repeatedly. */
  schedulePreload(): void {
    if (this.status.state !== 'idle') return;
    const start = () => { this.ensureReady().catch(() => { /* surfaced via status */ }); };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(start, { timeout: 10_000 });
    } else {
      setTimeout(start, 3_000);
    }
  }

  /** Resolves when the model is ready; starts loading if needed. */
  ensureReady(): Promise<void> {
    if (this.status.state === 'ready') return Promise.resolve();
    if (this.readyPromise && this.status.state === 'loading') return this.readyPromise;

    if (typeof Worker === 'undefined') {
      const err = new Error('Web Workers unavailable — semantic features disabled');
      this.setStatus({ state: 'error', message: err.message });
      return Promise.reject(err);
    }

    this.setStatus({ state: 'loading', progress: null });
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    try {
      this.spawnWorker();
      this.send({ type: 'INIT_MODEL', modelId: ACTIVE_MODEL.id });
      this.initTimer = setTimeout(() => {
        this.failInit(new Error('Model initialization timed out'));
      }, MODEL_INIT_TIMEOUT_MS);
    } catch (err) {
      this.failInit(err instanceof Error ? err : new Error(String(err)));
    }

    return this.readyPromise;
  }

  /** Retry after an error state (e.g. transient network failure on download). */
  retry(): Promise<void> {
    if (this.status.state === 'error') {
      this.teardownWorker();
      this.setStatus({ state: 'idle' });
      this.readyPromise = null;
    }
    return this.ensureReady();
  }

  /**
   * Embed a batch of texts. Queues behind model initialization — callers
   * simply await. Prefixes (E5 query/passage) are applied here so the worker
   * stays model-agnostic.
   */
  async embed(texts: string[], kind: EmbedKind): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    await this.ensureReady();

    const prefix = kind === 'query' ? ACTIVE_MODEL.queryPrefix : ACTIVE_MODEL.passagePrefix;
    const prefixed = texts.map((t) => prefix + t);
    const id = this.nextJobId++;

    return new Promise<Float32Array[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.send({ type: 'CANCEL_JOB', id });
        reject(new Error('Embedding inference timed out'));
      }, EMBED_INFERENCE_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      this.send({ type: 'EMBED_TEXT', id, texts: prefixed });
    });
  }

  // ─── internals ────────────────────────────────────────────

  private spawnWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL('../workers/intelligence.worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.onMessage(e.data);
    this.worker.onerror = (e) => {
      this.failInit(new Error(e.message || 'Intelligence worker crashed'));
    };
  }

  private teardownWorker() {
    if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = null; }
    this.worker?.terminate();
    this.worker = null;
    for (const [, job] of this.pending) {
      clearTimeout(job.timer);
      job.reject(new Error('Intelligence worker terminated'));
    }
    this.pending.clear();
  }

  private failInit(err: Error) {
    if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = null; }
    this.setStatus({ state: 'error', message: err.message });
    this.readyReject?.(err);
    this.readyResolve = null;
    this.readyReject = null;
    // Reject in-flight embeds — callers degrade to lexical-only behavior
    for (const [, job] of this.pending) {
      clearTimeout(job.timer);
      job.reject(err);
    }
    this.pending.clear();
  }

  private send(msg: WorkerRequest) {
    if (!this.worker) throw new Error('Worker not running');
    this.worker.postMessage(msg);
  }

  private onMessage(msg: WorkerResponse) {
    switch (msg.type) {
      case 'MODEL_PROGRESS':
        if (this.status.state === 'loading') {
          this.setStatus({ state: 'loading', progress: msg.progress });
        }
        break;

      case 'MODEL_READY':
        if (this.initTimer) { clearTimeout(this.initTimer); this.initTimer = null; }
        this.setStatus({ state: 'ready' });
        this.readyResolve?.();
        this.readyResolve = null;
        this.readyReject = null;
        break;

      case 'EMBED_RESULT': {
        const job = this.pending.get(msg.id);
        if (!job) break; // cancelled or timed out
        this.pending.delete(msg.id);
        clearTimeout(job.timer);
        job.resolve(msg.buffers.map((b) => new Float32Array(b)));
        break;
      }

      case 'ERROR': {
        if (msg.id !== undefined) {
          const job = this.pending.get(msg.id);
          if (job) {
            this.pending.delete(msg.id);
            clearTimeout(job.timer);
            job.reject(new Error(msg.message));
          }
        } else if (this.status.state === 'loading') {
          this.failInit(new Error(msg.message));
        }
        break;
      }
    }
  }
}

export const modelManager = new ModelManagerImpl();
