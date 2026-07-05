// Vector math + content hashing shared across the semantic layer.

export function cosineSimilarity(
  a: Float32Array | number[],
  b: Float32Array | number[]
): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** djb2 content hash — same scheme the previous cache used. */
export function contentHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
    h = h >>> 0;
  }
  return h.toString(36);
}

export function crystalContentHash(crystal: {
  title: string;
  content?: string;
  body?: string;
}): string {
  return contentHash(
    (crystal.title || '') + '||' + (crystal.content || '') + '||' + (crystal.body || '')
  );
}

/** Text used to embed a note — title + summary + body, capped. */
export function crystalEmbedText(
  crystal: { title: string; content?: string; body?: string },
  maxChars: number
): string {
  return `${crystal.title}. ${crystal.content || ''} ${crystal.body || ''}`
    .trim()
    .slice(0, maxChars);
}
