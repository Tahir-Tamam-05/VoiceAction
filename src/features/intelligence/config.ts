// Central configuration for the local intelligence engine.
//
// Model selection rationale (see LOCAL_INTELLIGENCE_MIGRATION.md for the full
// evaluation): VoiceAction users capture notes in English, Hindi, Kannada, and
// mixed-language text. `all-MiniLM-L6-v2` (23 MB) is English-only — Hindi and
// Kannada notes would embed to near-noise. `multilingual-e5-small` covers 100+
// languages via its XLM-R tokenizer (including Devanagari and Kannada scripts),
// leads small-model multilingual retrieval benchmarks (MIRACL/Mr.TyDi), and is
// available quantized (q8, ~118 MB) for browser inference via Transformers.js.
// The download cost is paid once — assets are cached by the runtime's Cache API.

export interface EmbeddingModelConfig {
  /** Hugging Face model id resolved by Transformers.js */
  id: string;
  /** Reported dimensionality of the pooled sentence vector */
  dim: number;
  /** Version tag for cache invalidation when we change models/settings */
  version: number;
  /** E5-family models require these prefixes for asymmetric retrieval */
  queryPrefix: string;
  passagePrefix: string;
  /**
   * Raw-cosine floor below which two texts are treated as unrelated.
   * Model-specific: E5 vectors are anisotropic (unrelated texts still score
   * ~0.7), so its floor is far higher than MiniLM's.
   */
  similarityFloor: number;
}

export const EMBEDDING_MODELS: Record<string, EmbeddingModelConfig> = {
  'multilingual-e5-small': {
    id: 'Xenova/multilingual-e5-small',
    dim: 384,
    version: 1,
    queryPrefix: 'query: ',
    passagePrefix: 'passage: ',
    similarityFloor: 0.80,
  },
  // Low-bandwidth alternative — English-only, 23 MB. Swap ACTIVE_MODEL to use.
  'all-MiniLM-L6-v2': {
    id: 'Xenova/all-MiniLM-L6-v2',
    dim: 384,
    version: 1,
    queryPrefix: '',
    passagePrefix: '',
    similarityFloor: 0.45,
  },
};

export const ACTIVE_MODEL_KEY = 'multilingual-e5-small';
export const ACTIVE_MODEL: EmbeddingModelConfig = EMBEDDING_MODELS[ACTIVE_MODEL_KEY];

// ─── NLP budgets ──────────────────────────────────────────────

export const TITLE_MAX_CHARS = 60;
export const SUMMARY_MAX_CHARS = 140;
export const MAX_KEYWORDS = 12;
export const MAX_KEYPHRASES = 8;
export const MAX_TOPICS = 5;

// ─── Connection engine ────────────────────────────────────────

export const MAX_CONNECTIONS_PER_NOTE = 8;
/** Semantic edges must clear mean + K·σ of the candidate similarity distribution */
export const ADAPTIVE_SIGMA_K = 0.9;
/** Minimum shared keyphrases for a topic-only edge */
export const TOPIC_EDGE_MIN_SHARED = 2;
/** Below this many candidates, skip σ-statistics and use the model floor only */
export const ADAPTIVE_MIN_CANDIDATES = 5;

// ─── Embedding / worker ───────────────────────────────────────

export const EMBED_INFERENCE_TIMEOUT_MS = 60_000;
export const MODEL_INIT_TIMEOUT_MS = 5 * 60_000; // first download can be slow
export const ENRICH_BATCH_SIZE = 8;
export const ENRICH_BATCH_DELAY_MS = 120;
export const QUERY_CACHE_TTL_MS = 5 * 60_000;
/** Cap inference input length — long notes are truncated for embedding only */
export const EMBED_MAX_CHARS = 2000;

// ─── Storage ──────────────────────────────────────────────────

export const VECTOR_DB_NAME = 'va-intelligence';
export const VECTOR_DB_VERSION = 1;
export const VECTOR_STORE_NAME = 'vectors';
export const TOPIC_CACHE_PREFIX = 'va_topics_';
export const INTEL_NOTICE_KEY = 'va_intel_notice_seen';
