// Typed message protocol between the main thread and the intelligence worker.
//
// Only embedding inference crosses this boundary. Deterministic NLP (<50ms),
// bulk cosine scoring (≤1000 × 384 dims ≈ ms-scale), and clustering are run
// on the main thread by design — measured cost is far below a frame budget,
// and the vector store lives on the main thread.

export type WorkerRequest =
  | { type: 'INIT_MODEL'; modelId: string }
  | { type: 'EMBED_TEXT'; id: number; texts: string[] }
  | { type: 'CANCEL_JOB'; id: number };

export type WorkerResponse =
  | { type: 'MODEL_PROGRESS'; progress: number | null; file?: string }
  | { type: 'MODEL_READY'; device: 'webgpu' | 'wasm' }
  | { type: 'EMBED_RESULT'; id: number; dim: number; buffers: ArrayBuffer[] }
  | { type: 'ERROR'; id?: number; message: string };
