/// <reference lib="webworker" />
// Intelligence worker — runs embedding inference off the main thread.
// Transformers.js is dynamic-imported here so it never enters the main bundle.

import type { WorkerRequest, WorkerResponse } from '../model/workerProtocol';

declare const self: DedicatedWorkerGlobalScope;

let extractor: ((texts: string[], opts: object) => Promise<{ tolist(): number[][] }>) | null = null;
let initPromise: Promise<void> | null = null;
const cancelled = new Set<number>();

function post(msg: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(msg, transfer);
}

async function initModel(modelId: string): Promise<void> {
  if (extractor) { post({ type: 'MODEL_READY', device: 'wasm' }); return; }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false; // always resolve from the HF hub + browser cache

    // Aggregate per-file download progress into a single 0–100 number
    const fileProgress = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status === 'progress' && p.file && p.total) {
        fileProgress.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
        let loaded = 0, total = 0;
        for (const f of fileProgress.values()) { loaded += f.loaded; total += f.total; }
        post({ type: 'MODEL_PROGRESS', progress: total > 0 ? Math.round((loaded / total) * 100) : null, file: p.file });
      }
    };

    const hasWebGPU = typeof (self.navigator as { gpu?: unknown } | undefined)?.gpu !== 'undefined';
    let device: 'webgpu' | 'wasm' = 'wasm';

    if (hasWebGPU) {
      try {
        extractor = await pipeline('feature-extraction', modelId, {
          dtype: 'q8', device: 'webgpu', progress_callback,
        }) as unknown as typeof extractor;
        device = 'webgpu';
      } catch {
        extractor = null; // fall through to WASM
      }
    }

    if (!extractor) {
      extractor = await pipeline('feature-extraction', modelId, {
        dtype: 'q8', device: 'wasm', progress_callback,
      }) as unknown as typeof extractor;
    }

    post({ type: 'MODEL_READY', device });
  })();

  try {
    await initPromise;
  } catch (err) {
    initPromise = null;
    extractor = null;
    throw err;
  }
}

async function embed(id: number, texts: string[]) {
  if (!extractor) throw new Error('Model not initialized');
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  if (cancelled.has(id)) { cancelled.delete(id); return; }

  const rows = output.tolist();
  const dim = rows[0]?.length ?? 0;
  const buffers = rows.map((row) => new Float32Array(row).buffer);
  post({ type: 'EMBED_RESULT', id, dim, buffers }, buffers);
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case 'INIT_MODEL':
        await initModel(msg.modelId);
        break;
      case 'EMBED_TEXT':
        await embed(msg.id, msg.texts);
        break;
      case 'CANCEL_JOB':
        cancelled.add(msg.id);
        break;
    }
  } catch (err) {
    post({
      type: 'ERROR',
      id: msg.type === 'EMBED_TEXT' ? msg.id : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
