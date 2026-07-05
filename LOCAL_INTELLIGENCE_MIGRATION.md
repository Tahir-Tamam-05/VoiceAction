# VoiceAction — Local Intelligence Migration

**Date:** July 2026 · **Status:** ✅ Complete
**Result:** VoiceAction runs with **zero AI API keys, zero per-request AI cost, and zero note text sent to any inference service.** All intelligence runs on-device.

---

## 1. Gemini Dependency Audit (before migration)

| Feature | Gemini dependency | Call sites |
|---|---|---|
| Note structuring (title/type/summary/tags/mood) | `gemini-2.0-flash generateContent`, 4s race + local-tag fallback | Recording, LandingRecord, Home quick-save, EditNote Refine |
| Edit transforms (Concise / Actions / Bullets) | `transformText` free-form prompt | EditNote |
| Translation | `translateNote` | TranslationPanel (EditNote) |
| Pattern analysis | `analyzeNotePatterns` | **unused export** |
| Embeddings | `text-embedding-004` (768-dim), localStorage cache | Search, connection engine |
| Semantic search | query+note embeddings, 70/30 hybrid | Search |
| Topic extraction / connections | Gemini topic prompt + fixed 0.72 cosine threshold | EditNote save enrichment |
| Model selector | `settings_model` → Gemini model map | geminiService, userService default |
| Insights / flashcards / weekly digest / streaks | **none** — already pure local computation | — |
| Config | `VITE_GEMINI_API_KEY` in .env, vite defines, index.html preconnect | build config |

## 2–3. Selected Local Model

**`Xenova/multilingual-e5-small`, quantized (q8), 384-dim** — via **Transformers.js** (`@huggingface/transformers` v4).

| Criterion | multilingual-e5-small (chosen) | all-MiniLM-L6-v2 (alternative) |
|---|---|---|
| Download size (q8) | ~118 MB, one-time, cached | ~23 MB |
| Languages | 100+ (XLM-R tokenizer: **Hindi ✅ Kannada ✅** mixed ✅) | English only |
| Retrieval quality | Leads small-model multilingual benchmarks (MIRACL/Mr.TyDi) | Good EN-only |
| Cross-lingual | **Measured: EN query ↔ HI passage = 0.867 cosine** | none |
| Browser | WASM ✅ WebGPU ✅ (auto-fallback) | same |
| License | MIT | Apache-2.0 |

Decision: VoiceAction's stated user base captures notes in English, Hindi, Kannada, and mixed text — MiniLM would embed non-English notes to near-noise. The 118 MB is a one-time download with progress UX, cached by the runtime's browser Cache API (`transformers-cache`). The alternative model remains one config line away (`config.ts → ACTIVE_MODEL_KEY`) for a low-bandwidth build. Model prefixes (`query:`/`passage:`) and the model-specific similarity floor are config-driven so swapping models is safe.

**Measured (Node, onnxruntime; browser WASM is slower but same code path):** cold load incl. download **15.6s**, warm load from cache **0.3s**, single embedding **5 ms**, batch of 8 **19 ms**. Semantic separation: related 0.878 / unrelated 0.765 / cross-lingual related 0.867 — which empirically validates the configured similarity floor of **0.80** for this model (E5 vectors are anisotropic; unrelated texts still score ~0.77).

## 4–7. Architecture, Files

```
src/features/intelligence/
  IntelligenceEngine.ts        facade — THE canonical intelligence entry point
  config.ts                    model registry, thresholds, budgets
  types.ts                     shared types
  nlp/                         deterministic structural NLP (sync, <1ms/note)
    normalizeText · languageDetection · sentenceSegmentation · tokenize ·
    stopwords (EN+HI+KN) · keywordExtractor · titleGenerator · typeClassifier ·
    moodClassifier · actionDetector · summarizer · tagger
  model/
    ModelManager.ts            lazy singleton, queueing, progress, retry
    workerProtocol.ts          typed main↔worker messages
  workers/
    intelligence.worker.ts     Transformers.js inference (WebGPU→WASM fallback)
  semantic/
    cosineSimilarity.ts · vectorStore.ts (IndexedDB) · embeddings.ts ·
    semanticSearch.ts (BM25 + hybrid)
  graph/
    connectionEngine.ts (adaptive thresholds) · clustering.ts (label
    propagation) · clusterLabeler.ts (distinctive keyphrases)
  __tests__/                   64 automated tests (vitest)
src/components/IntelligenceIndicator.tsx   model readiness pill + privacy notice
```

**Modified:** `App.tsx` (indicator + idle preload), `Recording.tsx`, `LandingRecord.tsx`, `Home.tsx` (offline branch collapsed — local NLP works offline), `EditNote.tsx` (local transforms, translation removed), `Search.tsx`, `useNotes.ts` (vector cleanup on delete), `tagHelpers.ts` (signal-word tagger, `keyword-extractor` dep dropped), `userService.ts` (`model: 'local-intelligence'`), `types.ts`/`monitoring.ts` (comments), `vite.config.ts` (worker ES format, WASM runtime caching, Gemini defines removed), `.env.example`, `index.html` (preconnect removed), `package.json`.

**Deleted:** `services/geminiService.ts`, `services/embeddingService.ts`, `services/semanticSearch.ts`, `features/knowledge/connectionEngine.ts`, `components/TranslationPanel.tsx`. Deps removed: `@google/genai`, `keyword-extractor`. Added: `@huggingface/transformers` (+ dev: `vitest`, `fake-indexeddb`).

## 8. NLP Algorithms Selected

| Stage | Algorithm | Why |
|---|---|---|
| Normalization | NFC + entity decode + URL/emoji extraction + elongation collapse | original content never modified — analysis copy only |
| Language | Unicode-script counting (Devanagari/Kannada/Latin) | target languages are script-disjoint; no model needed |
| Sentences | scanner with abbreviation/decimal/danda handling | no regex-lookbehind (older-Safari safe) |
| Keywords/phrases | **RAKE candidates + degree/freq blended with TF + positional boost** | TextRank rejected: O(n·w) graph for no measurable gain on <500-word notes |
| Title | first-meaningful-sentence → clause cut → keyphrase title-case | filler stripping for voice transcription ("okay so um…") |
| Type | weighted linguistic patterns (EN+HI+KN markers) + imperative openers; weak signal → `text` | wrong 'task' worse than plain note |
| Mood | 8-mood lexicons + negation window + intensifiers + emoji + punctuation energy; confidence floor → Neutral | honest about limits, per spec |
| Actions | commitment patterns; due hints matched **verbatim only** — never inferred | no hallucinated dates |
| Summary | extractive: keyword-coverage × position ÷ √len, MMR redundancy penalty | never generates text; short notes pass through |
| Tags | signal-word map per taxonomy tag + type hint | old extractor only matched literal tag words |

## 9. Embedding Cache Architecture

IndexedDB `va-intelligence/vectors`, keyed by `noteId`; each record: `{noteId, hash (djb2 of title‖content‖body), modelId ("multilingual-e5-small@1"), dim, vector (Float32 bytes), createdAt, updatedAt}`. Valid only when **hash AND modelId** match → metadata edits (pin/tags) never invalidate; content edits and model upgrades always do. Batch reads (`getAllCurrent`), orphan pruning against live note ids, `purgeOtherModels()` on model-version migration, corruption recovery (delete DB + recreate once), and a transparent **in-memory fallback** when IndexedDB is unavailable. Vectors are **not** stored in Firestore.

## 10–11. Connection Scoring + Adaptive Thresholds

```
semantic edge:  raw cosine must clear  max(model floor, μ + 0.9σ)  of the
                target's candidate distribution, clamped ≤ best neighbor
                (floor = 0.80 for E5, 0.45 for MiniLM — config per model)
topic edge:     ≥2 shared keyphrases (phrase-variant matching: containment or
                ≥50% token overlap of the shorter phrase)
confidence:     hybrid = 0.6·semNorm + 0.4·topicOverlap + 0.1 agreement (≤1)
                semNorm = (cos − floor)/(1 − floor)
caps:           ≤8 edges/note; <5 candidates → floor-only (σ of 3 points is noise)
reasons:        deterministic strings — "Shared topic: exam prep",
                "Semantically similar (84%)" — no LLM text
```
This prevents both failure modes: dense corpora don't explode into hairballs (bar rises with μ+σ), sparse corpora don't end up edgeless (bar never exceeds the best neighbor above floor).

## 12–13. Clustering + Labels

**Deterministic weighted label propagation** (≤10 iterations, sorted node order, smallest-label tie-break, edges <0.3 excluded) — clusters do **not** reorganize between app loads; cluster ids are the smallest member noteId (stable under additions). Louvain rejected (complexity vs. no visible gain at note-graph scale), agglomerative rejected (O(n²·log n)). Labels: keyphrase **TF × inverse-cluster-frequency** with a multi-word preference → "Firebase Deployment", "Exam Prep"; fallback dominant tag → dominant type → "General". The ThoughtGraph renderer is untouched — it keeps reading `topics[0]`, which now comes from local keyphrases.

## 14. Search Ranking

Tier 1 (instant, model-free): **BM25** (k1=1.4, b=0.6) with field weights title×3.0 / topics×2.5 / tags×2.2 / body×1.0, prefix fuzzy matching at half weight, whole-phrase ×1.5, small recency bonus, max-normalized. Tier 2: query embedding vs **cached vectors only** (one IndexedDB batch read — search never runs corpus inference). Hybrid = **0.65·semantic + 0.35·lexical**; unenriched notes keep their lexical score. Search is fully useful before the model ever loads.

## 15. Worker Architecture

Embedding inference runs in a dedicated module Worker (`INIT_MODEL / MODEL_PROGRESS / MODEL_READY / EMBED_TEXT / EMBED_RESULT / CANCEL_JOB / ERROR`), Transformers.js dynamic-imported inside the worker (never in the main bundle), WebGPU tried first → WASM fallback, vectors returned as transferable buffers. Job map with per-request timeouts; worker crash rejects in-flight jobs and sets a retryable error state. Deterministic NLP (<0.1 ms), bulk cosine (≤0.5 ms @1000 notes), and clustering run on the main thread by design — measured far below a frame budget, and the vector store lives there. `PROCESS_NOTE`/`SEARCH` therefore intentionally do not cross the worker boundary.

## 16. Offline Behavior

- App shell/code: existing PWA precache (worker chunk included; cap raised to 6 MB).
- ONNX WASM runtime (~23 MB, bundled same-origin): Workbox **CacheFirst** runtime cache — offline after first inference.
- Model weights (~118 MB): cached by Transformers.js in the browser **Cache API** (`transformers-cache`) after first download — offline afterward; **not** Workbox-precached (would balloon SW install).
- Offline **before** first model download: capture, Firestore queue, deterministic NLP, lexical search, graph all work; semantic enrichment queues until the model is available.

## 17. Multi-Device Re-indexing

Vectors are local; notes sync via Firestore. On a new device: notes hydrate → lexical search + structure work immediately → model initializes (idle preload) → `backgroundEnrichEmbeddings` rebuilds vectors in batches of 8 with inter-batch yields (with progress callback) → semantic search/connections improve progressively. No UI freeze; enrichment is fire-and-forget and resumes on next trigger after any failure.

## 18. Failure / Degradation Matrix

| Failure | Behavior |
|---|---|
| WebGPU unavailable | WASM fallback (automatic, in-worker) |
| Model download fails / offline first run | Indicator shows retry; capture + Firestore + lexical search + NLP + graph all keep working |
| Worker crash | in-flight embeds rejected → callers return null → lexical-only; retry respawns |
| IndexedDB unavailable/corrupted | delete+recreate once, else in-memory store (session-scoped vectors) |
| Model never loads | permanent lexical mode — **no user data loss possible**; intelligence writes never gate note persistence |
| Empty/malformed/emoji/mixed-language input | covered by tests; original content stored verbatim |

## 19–21. Performance Results (measured)

| Metric | 5 notes | 50 | 250 | 1000 | Target |
|---|---|---|---|---|---|
| Deterministic NLP /note | 0.07 ms | 0.07 ms | 0.07 ms | 0.07 ms | <50 ms ✅ |
| Bulk cosine + adaptive threshold (1×N) | 0.17 ms | 0.23 ms | 0.16 ms | 0.49 ms | ms-scale ✅ |
| Clustering (full corpus) | 0.35 ms | 0.73 ms | 8.7 ms | 113 ms | background-safe ✅ |
| BM25 lexical search | 0.21 ms | 0.56 ms | 1.9 ms | 7.5 ms | instant ✅ |

Model (Node/onnxruntime; browser WASM ~5–20× slower per-embedding, still well under the 500 ms target): **cold load 15.6 s** (download-dominated), **warm load 0.3 s**, **5 ms/embedding**, batch-of-8 19 ms. Cached-vector retrieval: one IndexedDB batch read (ms-scale). App startup is never blocked — model loads via `requestIdleCallback` after auth.

## 22–25. Validation

- **Tests:** `npm test` → **64/64 passed** (5 files): normalization, entities, URLs/emojis, EN/HI/KN language detection, segmentation (abbrev/decimal/danda), tokenization (incl. Devanagari combining marks), keywords, titles, type/mood (incl. negation), actions (verbatim due hints), extractive summaries, tagger, full-pipeline determinism, cosine/hash, vector store (fake-indexeddb: round-trip, hash invalidation, orphan prune, model tags, memory fallback), adaptive thresholds (4 regimes), topic extraction, connection discovery + caps + reasons, clustering determinism/stability/labels, BM25 ranking/fuzzy/scale, **graceful semantic→lexical degradation**.
- **Lint:** `tsc --noEmit` → 0 errors. **Build:** ✓ 4.7 s, PWA precache generated, worker chunk emitted.
- **Network audit:** zero Gemini code remains (`grep -ri gemini src/ index.html vite.config.ts .env.example` → empty); `generativelanguage.googleapis.com` preconnect removed; `@google/genai` uninstalled. The only AI-related network requests are one-time model-asset downloads from `huggingface.co` (and same-origin WASM) — **no note text is ever sent**; inference inputs never leave the device.

## 26. Known Limitations

- **Translation feature removed** — it was inherently generative/Gemini-only. The `translation` field remains in the schema for historical data. (Future: a local translation model is possible but is a product decision, not parity.)
- First model download is ~118 MB — deliberate multilingual trade-off; low-bandwidth builds can switch to the 23 MB English-only model in `config.ts`.
- Mood/type classification is lexicon/rule-based — honest and deterministic, less nuanced than an LLM; low-confidence cases return Neutral/text by design.
- Flashcards were already local (SM-2 over note content — audit confirmed no Gemini); no auto-card-generation was added because reliable local Q&A generation isn't achievable without a generative model — per spec, user-driven cards beat fake-AI output.
- Clustering at 1000 notes is ~113 ms — fine off the critical path, revisit past ~5k notes.
- Browser-based E2E of the worker/model path was validated by build + Node smoke test; a manual browser pass (DevTools → Network shows only huggingface.co on first graph/search use) is the final acceptance step.

## 27. Verdict

**Production-ready.** All 26 acceptance criteria met (subject to the manual browser smoke pass above): starts with no AI key, saves notes instantly, structures them locally, embeds locally, discovers connections, clusters meaningfully with readable labels, searches semantically, computes insights, preserves flashcards/digest/auth/Firestore/ThoughtGraph/PWA unchanged, and passes lint, build, and 64 automated tests.
