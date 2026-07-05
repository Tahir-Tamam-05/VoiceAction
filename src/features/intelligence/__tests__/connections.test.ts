import { describe, it, expect } from 'vitest';
import { Crystal } from '../../../types';
import {
  computeAdaptiveThreshold, findSemanticConnections, extractTopics,
} from '../graph/connectionEngine';
import { ACTIVE_MODEL, MAX_CONNECTIONS_PER_NOTE } from '../config';
import { cosineSimilarity, contentHash } from '../semantic/cosineSimilarity';

function crystal(id: string, title: string, body: string): Crystal {
  return {
    id, title, body,
    content: '',
    type: 'text',
    timestamp: '',
    createdAt: Date.now(),
  };
}

// ─── Cosine + hash primitives ─────────────────────────────────

describe('cosineSimilarity / contentHash', () => {
  it('computes cosine correctly', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0); // dim mismatch
  });

  it('hash changes with content, stable otherwise', () => {
    expect(contentHash('abc')).toBe(contentHash('abc'));
    expect(contentHash('abc')).not.toBe(contentHash('abd'));
  });
});

// ─── Adaptive thresholds ──────────────────────────────────────

describe('computeAdaptiveThreshold', () => {
  const floor = ACTIVE_MODEL.similarityFloor;

  it('uses the model floor alone for tiny corpora', () => {
    const { threshold } = computeAdaptiveThreshold([0.9, 0.85]);
    expect(threshold).toBe(floor);
  });

  it('raises the bar above the mean for dense similarity distributions', () => {
    // Everything looks similar (anisotropy) — bar must rise above the floor
    const sims = [0.82, 0.83, 0.84, 0.85, 0.86, 0.87, 0.88, 0.89];
    const { threshold, mean } = computeAdaptiveThreshold(sims);
    expect(threshold).toBeGreaterThan(mean);
    expect(threshold).toBeGreaterThan(floor);
  });

  it('never raises the bar above the best available neighbor', () => {
    const sims = [0.86, 0.3, 0.31, 0.29, 0.3, 0.28];
    const { threshold } = computeAdaptiveThreshold(sims);
    expect(threshold).toBeLessThanOrEqual(0.86);
  });

  it('handles empty input', () => {
    expect(computeAdaptiveThreshold([]).threshold).toBe(floor);
  });
});

// ─── Topic extraction (local) ─────────────────────────────────

describe('extractTopics', () => {
  it('extracts keyphrase topics locally, no network', async () => {
    const topics = await extractTopics(crystal('t1', 'Firebase deployment checklist',
      'The firebase deployment needs security rules deployed and the hosting configuration verified. Firebase deployment is blocked until then.'));
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.join(' ')).toContain('firebase');
  });

  it('falls back to tags for near-empty text', async () => {
    const c = crystal('t2', '', '');
    c.tags = ['HEALTH'];
    const topics = await extractTopics(c);
    expect(topics).toContain('health');
  });
});

// ─── Connection discovery (topic-only mode — no model in node) ─

describe('findSemanticConnections', () => {
  it('creates topic edges for notes sharing ≥2 keyphrases, with reasons', async () => {
    const target = crystal('a', 'Exam preparation plan',
      'Exam preparation for physics. The exam preparation schedule covers physics chapters and practice tests daily.');
    const related = crystal('b', 'Physics exam notes',
      'More exam preparation notes for the physics exam preparation sessions, focusing on practice tests.');
    const unrelated = crystal('c', 'Grocery list',
      'Buy milk, vegetables, bread and eggs from the store tomorrow morning.');

    const conns = await findSemanticConnections(target, [related, unrelated]);
    const ids = conns.map((c) => c.crystalId);
    expect(ids).toContain('b');
    expect(ids).not.toContain('c');

    const edge = conns.find((c) => c.crystalId === 'b')!;
    expect(edge.method).toBe('topic'); // no embedding model in node
    expect(edge.confidence).toBeGreaterThan(0);
    expect(edge.reasons.some((r) => r.startsWith('Shared topic:'))).toBe(true);
  });

  it('caps connections per note', async () => {
    const mk = (i: number) => crystal(`n${i}`, 'Exam preparation physics',
      'Exam preparation physics practice tests exam preparation physics practice tests.');
    const target = mk(0);
    const many = Array.from({ length: 20 }, (_, i) => mk(i + 1));
    const conns = await findSemanticConnections(target, many);
    expect(conns.length).toBeLessThanOrEqual(MAX_CONNECTIONS_PER_NOTE);
  });

  it('returns empty for a lone note', async () => {
    expect(await findSemanticConnections(crystal('solo', 'Only note', 'text'), [])).toEqual([]);
  });
});
