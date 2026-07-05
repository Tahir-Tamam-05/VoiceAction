// Surfacing Service for Forgotten Gems and Contextual Recall
// Phase 2: Enhanced Forgotten Gems Resurfacing

import { Crystal, Note } from '../../../types';
// findSimilarNotes moved to semanticSearch.ts — import removed

export interface SurfacingSignal {
  crystalId: string;
  score: number;
  reason: 'semantic_relevance' | 'high_engagement' | 'pattern_similarity' | 'time_lapsed';
}

/**
 * Enhanced logic for finding "Forgotten Gems"
 * Uses semantic similarity, engagement metrics, and time decay.
 */
export async function getForgottenGems(allNotes: Crystal[], recentNotes: Crystal[]): Promise<Crystal[]> {
  if (allNotes.length < 5) return [];

  const now = Date.now();
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  const candidates = allNotes.filter(n => {
    const lastSeen = n.lastSeen || n.createdAt || 0;
    // Must not be a recent note and should have some age
    return lastSeen < (now - (7 * 24 * 60 * 60 * 1000));
  });

  const scoredCandidates = candidates.map(candidate => {
    let score = 0;
    let reasons: SurfacingSignal['reason'][] = [];

    // Signal 1: Recency Decay (older is often "more forgotten")
    const ageInDays = (now - (candidate.createdAt || 0)) / (24 * 60 * 60 * 1000);
    if (ageInDays > 30) {
      score += 2;
      reasons.push('time_lapsed');
    }

    // Signal 2: Engagement (Pinned or many connections)
    if (candidate.pinned) score += 3;
    if ((candidate.connections || 0) > 2) {
      score += 2;
      reasons.push('high_engagement');
    }

    // Signal 3: Semantic overlap with recent activity
    // We can check if recent notes share tags or themes
    const recentTags = new Set(recentNotes.flatMap(r => r.tags || []));
    const sharedTags = (candidate.tags || []).filter(t => recentTags.has(t));
    if (sharedTags.length > 0) {
      score += (sharedTags.length * 1.5);
      reasons.push('semantic_relevance');
    }

    return { crystal: candidate, score, reasons };
  });

  // Sort by score and take top 3
  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.crystal);
}

/**
 * Finds "Ghost Notes" - notes that are strongly related but not yet linked
 */
export function findPotentialLinks(target: Crystal, others: Crystal[]): Crystal[] {
  const targetTags = new Set(target.tags || []);
  return others
    .filter(other => other.id !== target.id)
    .filter(other => {
      const otherTags = other.tags || [];
      const commonTags = otherTags.filter(t => targetTags.has(t));
      return commonTags.length >= 2; // threshold for "basic" potential link
    })
    .slice(0, 3);
}
