// Cluster labeling — distinctive keyphrases, never "Cluster 1".
//
// Label = the keyphrase that is frequent INSIDE the cluster and rare in other
// clusters (TF × inverse-cluster-frequency). Falls back to the dominant tag,
// then the dominant note type — "General" only when no signal exists at all.

import { Crystal } from '../../../types';
import { titleCase } from '../nlp/titleGenerator';

export function labelCluster(
  members: Crystal[],
  allClusters: Crystal[][]
): string {
  if (members.length === 0) return 'General';

  // Phrase frequency inside this cluster (topics were extracted locally)
  const tf = new Map<string, number>();
  for (const c of members) {
    for (const topic of c.topics ?? []) {
      const t = topic.toLowerCase().trim();
      if (t) tf.set(t, (tf.get(t) ?? 0) + 1);
    }
  }

  if (tf.size > 0) {
    // Inverse cluster frequency: in how many clusters does this phrase appear?
    const clusterCount = Math.max(allClusters.length, 1);
    const icf = (phrase: string): number => {
      let appears = 0;
      for (const cluster of allClusters) {
        if (cluster.some((c) => (c.topics ?? []).some((t) => t.toLowerCase().trim() === phrase))) {
          appears++;
        }
      }
      return Math.log(1 + clusterCount / Math.max(appears, 1));
    };

    const ranked = [...tf.entries()]
      .map(([phrase, freq]) => ({
        phrase,
        // Prefer multi-word phrases — they read as themes, not words
        score: freq * icf(phrase) * (phrase.includes(' ') ? 1.3 : 1),
      }))
      .sort((a, b) => b.score - a.score);

    if (ranked.length > 0) return titleCase(ranked[0].phrase);
  }

  // Tag fallback
  const tagFreq = new Map<string, number>();
  for (const c of members) {
    for (const tag of c.tags ?? []) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
  }
  const topTag = [...tagFreq.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topTag && topTag[0] !== 'OTHER') return titleCase(topTag[0].toLowerCase());

  // Type fallback
  const typeFreq = new Map<string, number>();
  for (const c of members) typeFreq.set(c.type, (typeFreq.get(c.type) ?? 0) + 1);
  const topType = [...typeFreq.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topType && topType[0] !== 'text') return titleCase(topType[0]) + 's';

  return 'General';
}
