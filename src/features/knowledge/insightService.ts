// Insight Generation Service
// Pure computation layer — no API calls, no UI.
// Provides data for future insight panels, weekly digests, and smart suggestions.
//
// All functions are synchronous and work from the Crystal array in memory.

import { Crystal, Note } from '../../types';

// ─── Types ────────────────────────────────────────────────────

export interface Theme {
  label: string;       // topic label
  count: number;       // how many notes contain this topic
  noteIds: string[];   // notes that carry this topic
  trend: 'rising' | 'stable' | 'fading';
}

export interface ConceptCluster {
  centroid: string;    // most representative topic
  topics: string[];    // all topics in this cluster
  noteIds: string[];
  strength: number;    // 0–1, based on note count and recency
}

export interface InsightSummary {
  topThemes: Theme[];
  emergingTopics: string[];
  mostConnectedNotes: Note[];
  recurringConcepts: ConceptCluster[];
  totalTopicsTracked: number;
  weeklyTopicVelocity: number; // new unique topics added this week
}

// ─── Internal helpers ─────────────────────────────────────────

function getTopics(note: Note): string[] {
  const crystal = note as Crystal;
  const topics: string[] = [...(crystal.topics || [])];
  // Supplement with tags if no AI topics yet
  if (topics.length === 0) {
    (crystal.tags || []).forEach((t) => topics.push(t.toLowerCase()));
  }
  return topics;
}

function recentNotes(notes: Note[], days = 7): Note[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return notes.filter((n) => (n.createdAt || 0) > cutoff);
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Counts topic frequency across all notes and returns ranked themes.
 * Marks a topic as "rising" if it appeared more in the last 7 days than before.
 */
export function getTopThemes(notes: Note[], topN = 10): Theme[] {
  const allTopicNotes = new Map<string, string[]>(); // topic → noteIds
  const recentTopicNotes = new Map<string, string[]>();
  const recent = new Set(recentNotes(notes, 7).map((n) => n.id));

  notes.forEach((note) => {
    getTopics(note).forEach((topic) => {
      if (!allTopicNotes.has(topic)) allTopicNotes.set(topic, []);
      allTopicNotes.get(topic)!.push(note.id);
      if (recent.has(note.id)) {
        if (!recentTopicNotes.has(topic)) recentTopicNotes.set(topic, []);
        recentTopicNotes.get(topic)!.push(note.id);
      }
    });
  });

  const themes: Theme[] = [];
  for (const [label, noteIds] of allTopicNotes) {
    const recentCount = recentTopicNotes.get(label)?.length ?? 0;
    const totalCount = noteIds.length;
    const recentRatio = totalCount > 0 ? recentCount / totalCount : 0;

    let trend: Theme['trend'] = 'stable';
    if (recentRatio > 0.6 && totalCount >= 2) trend = 'rising';
    else if (recentRatio === 0 && totalCount >= 3) trend = 'fading';

    themes.push({ label, count: totalCount, noteIds, trend });
  }

  return themes.sort((a, b) => b.count - a.count).slice(0, topN);
}

/**
 * Topics that appeared for the first time in the last 7 days.
 */
export function getEmergingTopics(notes: Note[]): string[] {
  const recent = recentNotes(notes, 7);
  const older = notes.filter((n) => !recent.includes(n));

  const olderTopics = new Set(older.flatMap(getTopics));
  const recentTopics = new Set(recent.flatMap(getTopics));

  return [...recentTopics].filter((t) => !olderTopics.has(t));
}

/**
 * Notes ranked by their connection count (most connected first).
 * These are the "hub" notes in the knowledge graph.
 */
export function getMostConnectedNotes(notes: Note[], topN = 5): Note[] {
  return [...notes]
    .sort((a, b) => ((b as Crystal).connections || 0) - ((a as Crystal).connections || 0))
    .slice(0, topN);
}

/**
 * Groups related topics into clusters using simple co-occurrence.
 * Topics that frequently appear in the same notes are clustered together.
 */
export function getRecurringConcepts(notes: Note[]): ConceptCluster[] {
  // Build co-occurrence map
  const coOccurrence = new Map<string, Map<string, number>>();

  notes.forEach((note) => {
    const topics = getTopics(note);
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const [a, b] = [topics[i], topics[j]].sort();
        if (!coOccurrence.has(a)) coOccurrence.set(a, new Map());
        const inner = coOccurrence.get(a)!;
        inner.set(b, (inner.get(b) || 0) + 1);
      }
    }
  });

  // Greedy clustering: merge strongly co-occurring topics
  const visited = new Set<string>();
  const clusters: ConceptCluster[] = [];

  for (const [topic, neighbors] of coOccurrence) {
    if (visited.has(topic)) continue;

    const clusterTopics = [topic];
    visited.add(topic);

    // Add neighbours with co-occurrence ≥ 2
    for (const [neighbor, count] of neighbors) {
      if (!visited.has(neighbor) && count >= 2) {
        clusterTopics.push(neighbor);
        visited.add(neighbor);
      }
    }

    if (clusterTopics.length < 2) continue;

    // Find notes that contain any cluster topic
    const clusterNoteIds = new Set<string>();
    notes.forEach((n) => {
      if (getTopics(n).some((t) => clusterTopics.includes(t))) {
        clusterNoteIds.add(n.id);
      }
    });

    // Strength: normalised by total notes
    const strength = Math.min(clusterNoteIds.size / Math.max(notes.length * 0.2, 1), 1);

    clusters.push({
      centroid: topic,
      topics: clusterTopics,
      noteIds: [...clusterNoteIds],
      strength,
    });
  }

  return clusters.sort((a, b) => b.strength - a.strength).slice(0, 8);
}

/**
 * Composite summary — single call that returns all insight dimensions.
 */
export function generateInsightSummary(notes: Note[]): InsightSummary {
  const allTopics = notes.flatMap(getTopics);
  const uniqueTopics = new Set(allTopics);
  const weekTopics = new Set(recentNotes(notes, 7).flatMap(getTopics));

  return {
    topThemes: getTopThemes(notes, 10),
    emergingTopics: getEmergingTopics(notes),
    mostConnectedNotes: getMostConnectedNotes(notes, 5),
    recurringConcepts: getRecurringConcepts(notes),
    totalTopicsTracked: uniqueTopics.size,
    weeklyTopicVelocity: weekTopics.size,
  };
}
