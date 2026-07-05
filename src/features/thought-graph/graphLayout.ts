// graphLayout — deterministic spatial layout engine for the Thought Graph.
//
// Pure functions: the same crystals always produce the same universe, so users
// build spatial memory across visits. No randomness — all jitter is hashed
// from note ids.

import * as THREE from 'three';
import { Crystal } from '../../types';

// ─── Cluster identity palette ─────────────────────────────────

export const CLUSTER_PALETTE = [
  { hex: '#f97316', glow: 'rgba(249,115,22,' },   // orange — primary
  { hex: '#8b5cf6', glow: 'rgba(139,92,246,' },   // purple
  { hex: '#3b82f6', glow: 'rgba(59,130,246,' },   // blue
  { hex: '#22c55e', glow: 'rgba(34,197,94,' },    // green
  { hex: '#ec4899', glow: 'rgba(236,72,153,' },   // pink
  { hex: '#f59e0b', glow: 'rgba(245,158,11,' },   // amber
  { hex: '#14b8a6', glow: 'rgba(20,184,166,' },   // teal
  { hex: '#a78bfa', glow: 'rgba(167,139,250,' },  // violet
];

export type ViewMode = 'galaxy' | 'sphere';

export interface LayoutNode {
  id: string;
  crystal: Crystal;
  position: THREE.Vector3;
  clusterIndex: number;
  degree: number;
  importance: number;   // 0..1 — drives size + label priority
  size: number;         // world-unit radius
  tier: 'hub' | 'connected' | 'isolated';
}

export interface GraphEdge {
  a: string;
  b: string;
  confidence: number;   // 0..1
  clusterIndex: number;
}

export interface ClusterMeta {
  index: number;
  label: string;
  count: number;
  centroid: THREE.Vector3;
  radius: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  nodeById: Map<string, LayoutNode>;
  edges: GraphEdge[];
  neighbors: Map<string, string[]>;
  clusters: ClusterMeta[];
  boundingRadius: number;  // for camera framing
}

// ─── Deterministic hash → [0, 1) ──────────────────────────────

export function hashFloat(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967295;
}

// ─── Fibonacci sphere placement ───────────────────────────────

export function fibonacciSphere(index: number, total: number, radius: number): THREE.Vector3 {
  if (total <= 1) return new THREE.Vector3(0, 0, radius);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const theta = Math.acos(1 - (2 * (index + 0.5)) / total);
  const phi = (2 * Math.PI * index) / goldenRatio;
  return new THREE.Vector3(
    radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.sin(phi)
  );
}

// ─── Cluster detection (topic → tag → type) ───────────────────

const MAX_CLUSTERS = 8;

function clusterLabelOf(c: Crystal): string {
  return c.topics?.[0] ?? c.tags?.[0]?.toLowerCase() ?? c.type ?? 'general';
}

export function detectClusters(crystals: Crystal[]): {
  assignment: Map<string, number>;
  labels: string[];
} {
  const labelCount = new Map<string, number>();
  crystals.forEach(c => {
    const label = clusterLabelOf(c);
    labelCount.set(label, (labelCount.get(label) ?? 0) + 1);
  });
  const topLabels = [...labelCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CLUSTERS)
    .map(([l]) => l);
  const labelToIndex = new Map(topLabels.map((l, i) => [l, i]));
  const assignment = new Map<string, number>();
  crystals.forEach(c => {
    assignment.set(c.id, labelToIndex.get(clusterLabelOf(c)) ?? 0);
  });
  return { assignment, labels: topLabels };
}

// ─── Importance scoring ───────────────────────────────────────

function computeImportance(c: Crystal, degree: number, maxDegree: number): number {
  const conn = maxDegree > 0 ? degree / maxDegree : 0;
  const pinned = c.pinned ? 0.22 : 0;
  const ageDays = (Date.now() - c.createdAt) / 86_400_000;
  const recency = ageDays < 7 ? 0.12 * (1 - ageDays / 7) : 0;
  return Math.min(1, conn * 0.75 + pinned + recency + 0.06);
}

// ─── Edges ────────────────────────────────────────────────────

function buildEdges(
  crystals: Crystal[],
  assignment: Map<string, number>
): { edges: GraphEdge[]; degree: Map<string, number>; neighbors: Map<string, string[]> } {
  const ids = new Set(crystals.map(c => c.id));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  const degree = new Map<string, number>();
  const neighbors = new Map<string, string[]>();

  const bump = (id: string, other: string) => {
    degree.set(id, (degree.get(id) ?? 0) + 1);
    if (!neighbors.has(id)) neighbors.set(id, []);
    neighbors.get(id)!.push(other);
  };

  crystals.forEach(c => {
    (c.linkedNoteIds ?? []).forEach(tid => {
      if (!ids.has(tid) || tid === c.id) return;
      const key = c.id < tid ? `${c.id}|${tid}` : `${tid}|${c.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({
        a: c.id,
        b: tid,
        confidence: c.connectionConfidence?.[tid] ?? 0.45,
        clusterIndex: assignment.get(c.id) ?? 0,
      });
      bump(c.id, tid);
      bump(tid, c.id);
    });
  });
  return { edges, degree, neighbors };
}

// ─── Node sizing (adapts to universe scale) ───────────────────

function baseSizeFor(count: number): number {
  if (count <= 6) return 0.42;
  if (count <= 50) return 0.30;
  if (count <= 250) return 0.24;
  return 0.18;
}

// ─── Layout builders ──────────────────────────────────────────

function tierOf(degree: number): LayoutNode['tier'] {
  return degree >= 4 ? 'hub' : degree > 0 ? 'connected' : 'isolated';
}

/** Small universe (≤6 notes): a tight orbital ring — intimate, not lonely. */
function layoutSmallUniverse(
  crystals: Crystal[],
  assignment: Map<string, number>,
  degree: Map<string, number>,
  maxDegree: number
): LayoutNode[] {
  const sorted = [...crystals].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0)
  );
  const size = baseSizeFor(crystals.length);
  return sorted.map((c, i) => {
    const d = degree.get(c.id) ?? 0;
    const importance = computeImportance(c, d, maxDegree);
    // Most connected note sits at the heart of the small universe
    const pos = i === 0 && sorted.length > 2
      ? new THREE.Vector3(0, (hashFloat(c.id, 3) - 0.5) * 0.5, 0)
      : (() => {
          const ringCount = sorted.length > 2 ? sorted.length - 1 : sorted.length;
          const ringIdx = sorted.length > 2 ? i - 1 : i;
          const angle = (ringIdx / ringCount) * Math.PI * 2 + hashFloat(c.id, 1) * 0.35;
          const r = 2.3 + hashFloat(c.id, 2) * 0.5;
          return new THREE.Vector3(
            Math.cos(angle) * r,
            (hashFloat(c.id, 3) - 0.5) * 1.1,
            Math.sin(angle) * r
          );
        })();
    return {
      id: c.id,
      crystal: c,
      position: pos,
      clusterIndex: assignment.get(c.id) ?? 0,
      degree: d,
      importance,
      size: size * (0.8 + importance * 0.8),
      tier: tierOf(d),
    };
  });
}

/** Galaxy: each cluster occupies its own spatial region; hubs gravitate to cluster cores. */
function layoutGalaxy(
  crystals: Crystal[],
  assignment: Map<string, number>,
  degree: Map<string, number>,
  maxDegree: number
): LayoutNode[] {
  const byCluster = new Map<number, Crystal[]>();
  crystals.forEach(c => {
    const ci = assignment.get(c.id) ?? 0;
    if (!byCluster.has(ci)) byCluster.set(ci, []);
    byCluster.get(ci)!.push(c);
  });

  const clusterIndices = [...byCluster.keys()].sort((a, b) => a - b);
  const clusterCount = clusterIndices.length;
  const orbit = clusterCount <= 1 ? 0 : 2.6 + Math.sqrt(crystals.length) * 0.62;
  const size = baseSizeFor(crystals.length);
  const nodes: LayoutNode[] = [];

  clusterIndices.forEach((ci, order) => {
    const members = byCluster.get(ci)!
      .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0));
    const anchor = clusterCount <= 1
      ? new THREE.Vector3(0, 0, 0)
      : fibonacciSphere(order, clusterCount, orbit);
    const cr = 1.5 + Math.sqrt(members.length) * 0.55;

    members.forEach((c, rank) => {
      const d = degree.get(c.id) ?? 0;
      const importance = computeImportance(c, d, maxDegree);
      // Connected thoughts nest near the cluster core; loose ones drift outward
      const rankNorm = members.length > 1 ? rank / (members.length - 1) : 0;
      const shell = cr * (0.22 + 0.78 * Math.pow(rankNorm, 0.72));
      const local = fibonacciSphere(rank, members.length, Math.max(0.001, shell));
      const jitter = new THREE.Vector3(
        (hashFloat(c.id, 11) - 0.5),
        (hashFloat(c.id, 12) - 0.5),
        (hashFloat(c.id, 13) - 0.5)
      ).multiplyScalar(cr * 0.14);
      nodes.push({
        id: c.id,
        crystal: c,
        position: anchor.clone().add(local).add(jitter),
        clusterIndex: ci,
        degree: d,
        importance,
        size: size * (0.75 + importance * 0.9),
        tier: tierOf(d),
      });
    });
  });
  return nodes;
}

/** Sphere: one unified constellation shell — hubs inside, isolated on the rim. */
function layoutSphere(
  crystals: Crystal[],
  assignment: Map<string, number>,
  degree: Map<string, number>,
  maxDegree: number
): LayoutNode[] {
  const sortByCluster = (a: Crystal, b: Crystal) =>
    (assignment.get(a.id) ?? 0) - (assignment.get(b.id) ?? 0);
  const conn = (c: Crystal) => degree.get(c.id) ?? 0;

  const hubs = crystals.filter(c => conn(c) >= 4).sort(sortByCluster);
  const connected = crystals.filter(c => conn(c) > 0 && conn(c) < 4).sort(sortByCluster);
  const isolated = crystals.filter(c => conn(c) === 0).sort(sortByCluster);

  const R = 4.2 + Math.sqrt(crystals.length) * 0.68;
  const size = baseSizeFor(crystals.length);
  const nodes: LayoutNode[] = [];

  const addShell = (group: Crystal[], radius: number) => {
    group.forEach((c, i) => {
      const d = conn(c);
      const importance = computeImportance(c, d, maxDegree);
      const jitter = new THREE.Vector3(
        (hashFloat(c.id, 21) - 0.5),
        (hashFloat(c.id, 22) - 0.5),
        (hashFloat(c.id, 23) - 0.5)
      ).multiplyScalar(radius * 0.08);
      nodes.push({
        id: c.id,
        crystal: c,
        position: fibonacciSphere(i, group.length, radius).add(jitter),
        clusterIndex: assignment.get(c.id) ?? 0,
        degree: d,
        importance,
        size: size * (0.75 + importance * 0.9),
        tier: tierOf(d),
      });
    });
  };

  addShell(hubs, R * 0.3);
  addShell(connected, R * 0.66);
  addShell(isolated, R);
  return nodes;
}

// ─── Cluster meta (centroid + radius) ─────────────────────────

function buildClusterMeta(nodes: LayoutNode[], labels: string[]): ClusterMeta[] {
  const groups = new Map<number, LayoutNode[]>();
  nodes.forEach(n => {
    if (!groups.has(n.clusterIndex)) groups.set(n.clusterIndex, []);
    groups.get(n.clusterIndex)!.push(n);
  });
  return [...groups.entries()]
    .map(([index, members]) => {
      const centroid = members
        .reduce((acc, n) => acc.add(n.position), new THREE.Vector3())
        .divideScalar(members.length);
      const radius = Math.max(
        1.4,
        members.reduce((max, n) => Math.max(max, centroid.distanceTo(n.position)), 0) + 0.9
      );
      return {
        index,
        label: labels[index] ?? 'general',
        count: members.length,
        centroid,
        radius,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── Public entry point ───────────────────────────────────────

export function computeLayout(crystals: Crystal[], mode: ViewMode): GraphLayout {
  const { assignment, labels } = detectClusters(crystals);
  const { edges, degree, neighbors } = buildEdges(crystals, assignment);
  const maxDegree = Math.max(1, ...[...degree.values()]);

  let nodes: LayoutNode[];
  if (crystals.length <= 6) {
    nodes = layoutSmallUniverse(crystals, assignment, degree, maxDegree);
  } else if (mode === 'sphere') {
    nodes = layoutSphere(crystals, assignment, degree, maxDegree);
  } else {
    nodes = layoutGalaxy(crystals, assignment, degree, maxDegree);
  }

  const boundingRadius = Math.max(
    3,
    nodes.reduce((max, n) => Math.max(max, n.position.length() + n.size), 0)
  );

  return {
    nodes,
    nodeById: new Map(nodes.map(n => [n.id, n])),
    edges,
    neighbors,
    clusters: buildClusterMeta(nodes, labels),
    boundingRadius,
  };
}

// ─── Device quality tiers ─────────────────────────────────────

export type QualityTier = 'high' | 'medium' | 'low';

export function getQualityTier(nodeCount: number): QualityTier {
  let tier: QualityTier = nodeCount <= 80 ? 'high' : nodeCount <= 350 ? 'medium' : 'low';
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const isMobile = !!nav && nav.maxTouchPoints > 0 && window.innerWidth < 820;
  const weakCpu = !!nav && typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
  if ((isMobile || weakCpu) && tier === 'high') tier = 'medium';
  else if ((isMobile || weakCpu) && tier === 'medium') tier = 'low';
  return tier;
}

export function getLabelBudget(nodeCount: number, isMobile: boolean): number {
  let budget: number;
  if (nodeCount <= 30) budget = nodeCount;
  else if (nodeCount <= 100) budget = 42;
  else if (nodeCount <= 300) budget = 30;
  else budget = 24;
  return isMobile ? Math.max(8, Math.round(budget * 0.6)) : budget;
}
