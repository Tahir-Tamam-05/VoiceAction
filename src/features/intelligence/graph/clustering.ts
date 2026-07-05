// Graph clustering — deterministic label propagation over connection edges.
//
// Algorithm choice: label propagation over the existing weighted edge set.
//  - Connected components alone under-segments (one bridge edge merges two
//    real themes); Louvain needs a full modularity implementation whose
//    quality gain doesn't show on note-graph sizes (≤ a few thousand nodes);
//    agglomerative is O(n²·log n) and needs a distance matrix.
//  - Label propagation is O(edges) per iteration, respects edge weights, and
//    made deterministic here (sorted iteration order, smallest-label
//    tie-break) so clusters DON'T reorganize between app loads.
// Cluster ids are the smallest member noteId — stable as notes are added.

import { ClusterAssignment } from '../types';

export interface ClusterEdge {
  a: string;
  b: string;
  weight: number; // connection confidence 0–1
}

const MAX_ITERATIONS = 10;
/** Edges below this weight don't participate in clustering */
const MIN_EDGE_WEIGHT = 0.3;

export function clusterGraph(
  nodeIds: string[],
  edges: ClusterEdge[]
): Map<string, string> {
  const sorted = [...nodeIds].sort();
  const labels = new Map<string, string>(sorted.map((id) => [id, id]));

  // Adjacency with weights
  const adj = new Map<string, Array<{ id: string; w: number }>>();
  for (const e of edges) {
    if (e.weight < MIN_EDGE_WEIGHT || e.a === e.b) continue;
    if (!labels.has(e.a) || !labels.has(e.b)) continue;
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push({ id: e.b, w: e.weight });
    adj.get(e.b)!.push({ id: e.a, w: e.weight });
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let changed = false;

    for (const id of sorted) {
      const neighbors = adj.get(id);
      if (!neighbors || neighbors.length === 0) continue;

      // Weighted vote per neighboring label
      const votes = new Map<string, number>();
      for (const n of neighbors) {
        const label = labels.get(n.id)!;
        votes.set(label, (votes.get(label) ?? 0) + n.w);
      }

      // Deterministic winner: highest weight, then smallest label
      let best = labels.get(id)!;
      let bestScore = votes.get(best) ?? 0;
      for (const [label, score] of [...votes.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
        if (score > bestScore) { best = label; bestScore = score; }
      }

      if (best !== labels.get(id)) {
        labels.set(id, best);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Canonicalize: cluster id = smallest member noteId
  const members = new Map<string, string[]>();
  for (const [id, label] of labels) {
    if (!members.has(label)) members.set(label, []);
    members.get(label)!.push(id);
  }
  const canonical = new Map<string, string>();
  for (const [, ids] of members) {
    const clusterId = [...ids].sort()[0];
    for (const id of ids) canonical.set(id, clusterId);
  }
  return canonical;
}

export function buildClusterAssignment(
  nodeIds: string[],
  edges: ClusterEdge[],
  labelFor: (memberIds: string[]) => string
): ClusterAssignment {
  const membership = clusterGraph(nodeIds, edges);

  const byCluster = new Map<string, string[]>();
  for (const [noteId, clusterId] of membership) {
    if (!byCluster.has(clusterId)) byCluster.set(clusterId, []);
    byCluster.get(clusterId)!.push(noteId);
  }

  const clusters = [...byCluster.entries()]
    .map(([id, memberIds]) => ({ id, memberIds: memberIds.sort(), label: labelFor(memberIds) }))
    .sort((a, b) => b.memberIds.length - a.memberIds.length);

  return { membership, clusters };
}
