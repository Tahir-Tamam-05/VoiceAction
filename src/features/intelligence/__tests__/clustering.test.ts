import { describe, it, expect } from 'vitest';
import { clusterGraph, buildClusterAssignment, ClusterEdge } from '../graph/clustering';
import { labelCluster } from '../graph/clusterLabeler';
import { computeClusters } from '../IntelligenceEngine';
import { Crystal } from '../../../types';

const strongEdge = (a: string, b: string): ClusterEdge => ({ a, b, weight: 0.9 });

describe('clusterGraph (label propagation)', () => {
  it('groups two dense communities separately', () => {
    const nodes = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3'];
    const edges = [
      strongEdge('a1', 'a2'), strongEdge('a2', 'a3'), strongEdge('a1', 'a3'),
      strongEdge('b1', 'b2'), strongEdge('b2', 'b3'), strongEdge('b1', 'b3'),
    ];
    const m = clusterGraph(nodes, edges);
    expect(m.get('a1')).toBe(m.get('a2'));
    expect(m.get('a2')).toBe(m.get('a3'));
    expect(m.get('b1')).toBe(m.get('b2'));
    expect(m.get('a1')).not.toBe(m.get('b1'));
  });

  it('is deterministic across runs and edge orderings', () => {
    const nodes = ['n1', 'n2', 'n3', 'n4', 'n5'];
    const edges = [strongEdge('n1', 'n2'), strongEdge('n2', 'n3'), strongEdge('n4', 'n5')];
    const m1 = clusterGraph(nodes, edges);
    const m2 = clusterGraph(nodes, [...edges].reverse());
    for (const n of nodes) expect(m1.get(n)).toBe(m2.get(n));
  });

  it('ignores weak edges below the participation floor', () => {
    const m = clusterGraph(['x', 'y'], [{ a: 'x', b: 'y', weight: 0.1 }]);
    expect(m.get('x')).not.toBe(m.get('y'));
  });

  it('cluster membership is stable when an unrelated node is added', () => {
    const base = ['a1', 'a2', 'a3'];
    const edges = [strongEdge('a1', 'a2'), strongEdge('a2', 'a3')];
    const before = clusterGraph(base, edges);
    const after = clusterGraph([...base, 'z9'], edges);
    for (const n of base) expect(after.get(n)).toBe(before.get(n));
  });
});

describe('labelCluster', () => {
  const note = (id: string, topics: string[], tags: string[] = []): Crystal => ({
    id, title: id, content: '', type: 'text', timestamp: '', createdAt: 0, topics, tags,
  });

  it('labels clusters with distinctive keyphrases, not "Cluster 1"', () => {
    const clusterA = [
      note('1', ['firebase deployment', 'hosting']),
      note('2', ['firebase deployment', 'security rules']),
    ];
    const clusterB = [
      note('3', ['exam prep', 'physics']),
      note('4', ['exam prep', 'chemistry']),
    ];
    const labelA = labelCluster(clusterA, [clusterA, clusterB]);
    const labelB = labelCluster(clusterB, [clusterA, clusterB]);
    expect(labelA).toBe('Firebase Deployment');
    expect(labelB).toBe('Exam Prep');
  });

  it('falls back to dominant tag, then type, then General', () => {
    const tagged = [note('1', [], ['HEALTH']), note('2', [], ['HEALTH'])];
    expect(labelCluster(tagged, [tagged])).toBe('Health');
    expect(labelCluster([], [])).toBe('General');
  });
});

describe('computeClusters (engine integration)', () => {
  it('builds labeled clusters from linkedNoteIds + confidence', () => {
    const notes: Crystal[] = [
      { id: 'a', title: 'A', content: '', type: 'text', timestamp: '', createdAt: 0, topics: ['startup growth'], linkedNoteIds: ['b'], connectionConfidence: { b: 0.9 } },
      { id: 'b', title: 'B', content: '', type: 'text', timestamp: '', createdAt: 0, topics: ['startup growth'], linkedNoteIds: ['a'], connectionConfidence: { a: 0.9 } },
      { id: 'c', title: 'C', content: '', type: 'text', timestamp: '', createdAt: 0, topics: ['gardening'] },
    ];
    const { membership, clusters } = computeClusters(notes);
    expect(membership.get('a')).toBe(membership.get('b'));
    expect(membership.get('c')).not.toBe(membership.get('a'));
    const ab = clusters.find((cl) => cl.memberIds.includes('a'))!;
    expect(ab.label).toBe('Startup Growth');
  });
});
