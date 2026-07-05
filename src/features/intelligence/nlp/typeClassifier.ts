// Note-type classification within the existing VoiceAction schema:
// 'task' | 'event' | 'idea' | 'text' ('voice'/'audio' are set by capture mode).
//
// Weighted-signal scoring over linguistic patterns. Deterministic, explainable,
// and biased toward 'text' when signals are weak — a wrong 'task' label is
// worse than a plain note.

export type ClassifiedType = 'task' | 'event' | 'idea' | 'text';

const TASK_PATTERNS: Array<[RegExp, number]> = [
  [/\b(need to|have to|has to|must|should|remember to|don'?t forget( to)?|make sure( to)?)\b/i, 3],
  [/\b(todo|to-do|to do list|task|action item|checklist)\b/i, 3],
  [/\b(buy|purchase|order|pick up|call|email|text|send|submit|finish|complete|fix|pay|renew|book|schedule|cancel|return|clean|prepare)\b/i, 2],
  [/\b(by (tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|end of|next week|eod|eow))\b/i, 3],
  [/\b(deadline|due (date|by|on))\b/i, 3],
  [/करना है|करनी है|करने हैं|खरीदना|भेजना|याद रखना/, 3], // Hindi task markers
  [/ಮಾಡಬೇಕು|ಖರೀದಿಸಬೇಕು|ನೆನಪಿಡಬೇಕು/, 3],                // Kannada task markers
];

const EVENT_PATTERNS: Array<[RegExp, number]> = [
  [/\b(meeting|appointment|interview|conference|webinar|standup|sync|1:1|one-on-one)\b/i, 3],
  [/\b(lunch|dinner|coffee|party|birthday|anniversary|wedding|concert|flight|train)( with| at| on)?\b/i, 2],
  [/\b(at \d{1,2}([:.]\d{2})?\s?(am|pm|AM|PM))\b/, 3],
  [/\b(on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i, 2],
  [/\b(tomorrow|tonight|next week|next month) at\b/i, 3],
  [/\b\d{1,2}(st|nd|rd|th)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i, 2],
  [/मीटिंग|मुलाकात|शादी|जन्मदिन/, 3],
  [/ಸಭೆ|ಭೇಟಿ|ಮದುವೆ|ಹುಟ್ಟುಹಬ್ಬ/, 3],
];

const IDEA_PATTERNS: Array<[RegExp, number]> = [
  [/\b(idea|concept|what if|imagine|brainstorm|hypothesis|theory)\b/i, 3],
  [/\b(could (build|create|make|design|write|start)|we could|i could|might be cool|would be (cool|great|interesting))\b/i, 3],
  [/\b(feature|prototype|mvp|startup|app idea|product idea)\b/i, 2],
  [/^(idea|concept)[:\s]/i, 4],
  [/विचार|आइडिया/, 3],
  [/ಆಲೋಚನೆ|ಕಲ್ಪನೆ/, 3],
];

// Imperative opening verb → strong task signal ("Call the dentist tomorrow")
const IMPERATIVE_OPENERS = /^(buy|call|email|text|send|submit|finish|fix|pay|renew|book|schedule|cancel|clean|prepare|pick|order|review|update|write|read|check|remind|ask|tell|get|bring|return)\b/i;

function scorePatterns(text: string, patterns: Array<[RegExp, number]>): number {
  let score = 0;
  for (const [re, weight] of patterns) {
    if (re.test(text)) score += weight;
  }
  return score;
}

export interface TypeClassification {
  type: ClassifiedType;
  confidence: number; // 0–1
}

export function classifyType(text: string): TypeClassification {
  if (!text.trim()) return { type: 'text', confidence: 0 };

  let task = scorePatterns(text, TASK_PATTERNS);
  const event = scorePatterns(text, EVENT_PATTERNS);
  const idea = scorePatterns(text, IDEA_PATTERNS);

  if (IMPERATIVE_OPENERS.test(text.trim())) task += 3;

  const scores: Array<[ClassifiedType, number]> = [
    ['task', task], ['event', event], ['idea', idea],
  ];
  scores.sort((a, b) => b[1] - a[1]);

  const [best, bestScore] = scores[0];
  const total = task + event + idea;

  // Weak or ambiguous signals → plain text
  if (bestScore < 3) return { type: 'text', confidence: bestScore / 6 };

  return { type: best, confidence: Math.min(bestScore / (total + 2), 1) };
}
