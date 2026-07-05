// Lightweight local mood estimation within the existing 8-mood schema:
// Focused · Creative · Neutral · Energetic · Reflective · Stressed · Calm · Excited
//
// Lexicon scoring with negation handling, intensifiers, emoji signals, and
// punctuation energy. Honest about its limits: below a confidence floor it
// returns Neutral rather than guessing.

const MOOD_LEXICON: Record<string, string[]> = {
  Excited: [
    'excited', 'amazing', 'awesome', 'incredible', 'thrilled', 'fantastic',
    'love', 'wonderful', 'wow', 'yay', 'finally', 'best', "can't wait",
    'cant wait', 'stoked', 'brilliant',
  ],
  Energetic: [
    'energy', 'energized', 'pumped', 'motivated', 'momentum', 'workout',
    'run', 'gym', 'crush', 'hustle', 'productive', 'sprint', "let's go",
    'lets go', 'fired up',
  ],
  Stressed: [
    'stressed', 'stress', 'worried', 'worry', 'anxious', 'anxiety',
    'overwhelmed', 'pressure', 'panic', 'deadline', 'exhausted', 'burnout',
    'burned out', 'frustrated', 'frustrating', 'annoyed', 'angry', 'upset',
    'scared', 'afraid', 'behind on', 'too much',
  ],
  Calm: [
    'calm', 'peaceful', 'peace', 'relaxed', 'relaxing', 'quiet', 'rest',
    'restful', 'serene', 'gentle', 'breathe', 'meditation', 'meditate',
    'unwind', 'slow down', 'at ease',
  ],
  Reflective: [
    'thinking about', 'wonder', 'wondering', 'reflect', 'reflecting',
    'realized', 'realize', 'looking back', 'remember when', 'grateful',
    'gratitude', 'feel like', 'felt like', 'learned', 'lesson', 'noticed',
    'perspective', 'meaning',
  ],
  Creative: [
    'idea', 'ideas', 'create', 'creative', 'design', 'imagine', 'build',
    'invent', 'sketch', 'write', 'story', 'art', 'music', 'compose',
    'brainstorm', 'concept', 'prototype', 'inspired', 'inspiration',
  ],
  Focused: [
    'focus', 'focused', 'plan', 'planning', 'priority', 'priorities',
    'goal', 'goals', 'strategy', 'organize', 'organized', 'schedule',
    'deep work', 'concentrate', 'finish', 'complete', 'task', 'discipline',
  ],
};

const MOOD_EMOJI: Record<string, string[]> = {
  Excited: ['🎉', '🚀', '🤩', '😍', '🥳', '❤️', '🔥'],
  Energetic: ['💪', '⚡', '🏃', '🏋️'],
  Stressed: ['😰', '😫', '😩', '😭', '😡', '😤', '💀'],
  Calm: ['🌿', '🧘', '😌', '🌊', '☁️'],
  Reflective: ['🤔', '💭', '🪞'],
  Creative: ['🎨', '✨', '💡', '🎵'],
  Focused: ['🎯', '📝', '✅', '📋'],
};

const NEGATIONS = /\b(not|no|never|don'?t|doesn'?t|didn'?t|can'?t|won'?t|isn'?t|wasn'?t|without)\s+(\w+\s+)?$/i;
const INTENSIFIERS = /\b(very|really|so|extremely|super|totally|incredibly)\s+$/i;

export interface MoodResult {
  mood: string;
  confidence: number; // 0–1
}

export function classifyMood(text: string, emojis: string[] = []): MoodResult {
  const scores: Record<string, number> = {};
  const lower = text.toLowerCase();

  for (const [mood, terms] of Object.entries(MOOD_LEXICON)) {
    let score = 0;
    for (const term of terms) {
      let idx = lower.indexOf(term);
      while (idx !== -1) {
        const before = lower.slice(Math.max(0, idx - 24), idx);
        if (NEGATIONS.test(before)) {
          // negated hit contributes nothing
        } else {
          score += INTENSIFIERS.test(before) ? 1.5 : 1;
        }
        idx = lower.indexOf(term, idx + term.length);
      }
    }
    scores[mood] = score;
  }

  // Emoji signals — strong, deliberate expressions of mood
  for (const [mood, list] of Object.entries(MOOD_EMOJI)) {
    for (const e of emojis) {
      if (list.includes(e)) scores[mood] = (scores[mood] ?? 0) + 1.5;
    }
  }

  // Exclamation energy
  const bangs = (text.match(/!/g) ?? []).length;
  if (bangs >= 2) {
    scores.Excited = (scores.Excited ?? 0) + Math.min(bangs * 0.5, 2);
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  const total = ranked.reduce((s, [, v]) => s + v, 0);

  // Confidence floor — weak or conflicting evidence stays Neutral
  if (bestScore < 1.5 || (ranked[1] && ranked[1][1] === bestScore)) {
    return { mood: 'Neutral', confidence: 0 };
  }

  return { mood: best, confidence: Math.min(bestScore / (total + 1), 1) };
}
