import { describe, it, expect } from 'vitest';
import { keywordRank, semanticRank, matchTypeBadge } from '../semantic/semanticSearch';
import { Note } from '../../../types';

function note(id: string, title: string, body: string, tags: string[] = []): Note {
  return { id, title, body, content: '', type: 'text', timestamp: '', createdAt: Date.now(), tags };
}

const CORPUS: Note[] = [
  note('1', 'Firebase deployment checklist', 'Deploy the security rules then verify hosting.', ['WORK']),
  note('2', 'Grocery run', 'Buy milk, eggs, bread and vegetables.', ['SHOPPING']),
  note('3', 'Physics exam prep', 'Study thermodynamics chapters and practice tests for the exam.', ['LEARNING']),
  note('4', 'Weekend trip planning', 'Book the hotel and check the train timings for the trip.', ['TRAVEL']),
  note('5', 'Deployment retrospective', 'The firebase deployment failed because rules were missing.', ['WORK']),
];

describe('keywordRank (BM25 lexical tier)', () => {
  it('ranks title matches above body-only matches', () => {
    const results = keywordRank('firebase deployment', CORPUS);
    expect(results[0].note.id).toBe('1'); // exact title phrase
    expect(results.map((r) => r.note.id)).toContain('5');
    expect(results.map((r) => r.note.id)).not.toContain('2');
  });

  it('supports prefix fuzzy matching', () => {
    const results = keywordRank('thermo', CORPUS);
    expect(results[0]?.note.id).toBe('3');
  });

  it('normalizes scores to 0–1 and handles empty queries', () => {
    const results = keywordRank('exam', CORPUS);
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
    expect(keywordRank('', CORPUS)).toEqual([]);
    expect(keywordRank('the a of', CORPUS)).toEqual([]); // stopwords only
  });

  it('is fast at 1000 notes', () => {
    const big = Array.from({ length: 1000 }, (_, i) =>
      note(`x${i}`, `Note about topic ${i % 30}`, `Body content for subject ${i % 30} with details.`));
    const t0 = performance.now();
    keywordRank('topic 12 details', big);
    expect(performance.now() - t0).toBeLessThan(150);
  });
});

describe('semanticRank (graceful degradation without model)', () => {
  it('returns lexical results when the embedding model is unavailable', async () => {
    // In the Node test environment there is no Worker → the model can never
    // load → semanticRank must silently degrade to the lexical tier.
    const results = await semanticRank('firebase deployment', CORPUS);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].matchType).toBe('keyword');
    expect(results[0].note.id).toBe('1');
  });
});

describe('matchTypeBadge', () => {
  it('maps match types to UI badges', () => {
    expect(matchTypeBadge('embedding')).toBe('AI');
    expect(matchTypeBadge('hybrid')).toBe('AI+');
    expect(matchTypeBadge('keyword')).toBe('');
  });
});
