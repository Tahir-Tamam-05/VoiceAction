import { describe, it, expect } from 'vitest';
import { normalizeForAnalysis, decodeEntities } from '../nlp/normalizeText';
import { detectLanguage } from '../nlp/languageDetection';
import { segmentSentences } from '../nlp/sentenceSegmentation';
import { tokenize } from '../nlp/tokenize';
import { extractKeywords } from '../nlp/keywordExtractor';
import { generateTitle } from '../nlp/titleGenerator';
import { classifyType } from '../nlp/typeClassifier';
import { classifyMood } from '../nlp/moodClassifier';
import { detectActions, actionsToChecklist } from '../nlp/actionDetector';
import { summarize, extractiveSummary } from '../nlp/summarizer';
import { tagsForText } from '../nlp/tagger';
import { processNoteWithTimeout, transformConcise, transformExtractActions, transformBullets } from '../IntelligenceEngine';

// ─── Normalization ────────────────────────────────────────────

describe('normalizeForAnalysis', () => {
  it('decodes HTML entities', () => {
    expect(decodeEntities('Tom &amp; Jerry &lt;3')).toBe('Tom & Jerry <3');
  });

  it('strips URLs into a separate list', () => {
    const r = normalizeForAnalysis('check https://example.com/docs for info');
    expect(r.text).not.toContain('https://');
    expect(r.urls[0]).toContain('example.com');
  });

  it('extracts emojis and collapses elongations + whitespace', () => {
    const r = normalizeForAnalysis('sooooo   excited 🎉🎉 about   this');
    expect(r.emojis).toEqual(['🎉', '🎉']);
    expect(r.text).toBe('soo excited about this');
  });

  it('handles empty and malformed input', () => {
    expect(normalizeForAnalysis('').text).toBe('');
    expect(normalizeForAnalysis('   \n\n  ').text).toBe('');
  });
});

// ─── Language detection ───────────────────────────────────────

describe('detectLanguage', () => {
  it('detects English, Hindi, Kannada, and mixed text', () => {
    expect(detectLanguage('this is a plain english note').primary).toBe('en');
    expect(detectLanguage('कल मुझे बाजार जाना है और सब्जी खरीदनी है').primary).toBe('hi');
    expect(detectLanguage('ನಾಳೆ ನಾನು ಪರೀಕ್ಷೆಗೆ ಓದಬೇಕು').primary).toBe('kn');
    const mixed = detectLanguage('meeting tomorrow के बारे में याद रखना बहुत जरूरी है');
    expect(mixed.mixed).toBe(true);
  });
});

// ─── Sentence segmentation ────────────────────────────────────

describe('segmentSentences', () => {
  it('splits on terminators and newlines, keeps abbreviations and decimals', () => {
    const s = segmentSentences('Dr. Smith arrived at 3.5 pm. He was late! Why?');
    expect(s).toHaveLength(3);
    expect(s[0]).toContain('Dr. Smith');
    expect(s[0]).toContain('3.5');
  });

  it('handles Devanagari danda', () => {
    const s = segmentSentences('यह पहला वाक्य है। यह दूसरा वाक्य है।');
    expect(s).toHaveLength(2);
  });
});

// ─── Tokenization ─────────────────────────────────────────────

describe('tokenize', () => {
  it('removes English stopwords and transcription fillers', () => {
    const t = tokenize('um so basically the project deadline is like tomorrow');
    expect(t).toContain('project');
    expect(t).toContain('deadline');
    expect(t).not.toContain('um');
    expect(t).not.toContain('basically');
    expect(t).not.toContain('the');
  });

  it('keeps Hindi content words, drops Hindi stopwords', () => {
    const t = tokenize('मुझे परीक्षा के लिए पढ़ना है');
    expect(t).toContain('परीक्षा');
    expect(t).not.toContain('के');
  });
});

// ─── Keyword extraction ───────────────────────────────────────

describe('extractKeywords', () => {
  it('extracts meaningful concepts, not stopword fragments', () => {
    const { keywords, keyphrases } = extractKeywords(
      'The firebase deployment failed again. I need to check the firebase security rules and the deployment pipeline configuration.'
    );
    const kw = keywords.map((k) => k.term);
    expect(kw).toContain('firebase');
    expect(kw).toContain('deployment');
    expect(keyphrases.length).toBeGreaterThan(0);
    expect(keyphrases.some((p) => p.term.includes('firebase'))).toBe(true);
  });

  it('returns empty on empty text', () => {
    expect(extractKeywords('').keywords).toHaveLength(0);
  });
});

// ─── Title generation ─────────────────────────────────────────

describe('generateTitle', () => {
  const kp = (text: string) => extractKeywords(text).keyphrases;

  it('uses a concise first sentence directly, stripping fillers', () => {
    const text = 'Okay so um plan the product launch next week. There is a lot to do.';
    const title = generateTitle(segmentSentences(text), kp(text));
    expect(title.toLowerCase()).toContain('plan the product launch');
    expect(title.toLowerCase()).not.toMatch(/^okay/);
  });

  it('cuts long first sentences at a natural clause boundary, ≤60 chars', () => {
    const text = 'I have been thinking about the quarterly budget review process, because the finance team keeps asking for revised projections every single week and it never ends.';
    const title = generateTitle(segmentSentences(text), kp(text));
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.length).toBeGreaterThan(10);
  });

  it('never returns an empty title', () => {
    expect(generateTitle([], []).length).toBeGreaterThan(0);
  });
});

// ─── Type classification ──────────────────────────────────────

describe('classifyType', () => {
  it('classifies tasks, events, ideas, and plain text', () => {
    expect(classifyType('Need to buy groceries and pay the electricity bill by Friday').type).toBe('task');
    expect(classifyType('Meeting with Sarah tomorrow at 3pm about the roadmap').type).toBe('event');
    expect(classifyType('Idea: what if we could build an app that turns voice into a knowledge graph').type).toBe('idea');
    expect(classifyType('The weather was nice this afternoon and the walk felt refreshing').type).toBe('text');
  });

  it('treats imperative openers as tasks', () => {
    expect(classifyType('Call the dentist about the appointment').type).toBe('task');
  });
});

// ─── Mood classification ──────────────────────────────────────

describe('classifyMood', () => {
  it('detects clear moods and defaults to Neutral on weak signal', () => {
    expect(classifyMood('I am so stressed about this deadline, totally overwhelmed').mood).toBe('Stressed');
    expect(classifyMood('feeling calm and peaceful after meditation this morning').mood).toBe('Calm');
    expect(classifyMood('the report is on the table').mood).toBe('Neutral');
  });

  it('handles negation — "not stressed" is not Stressed', () => {
    expect(classifyMood('I am not stressed at all today').mood).not.toBe('Stressed');
  });

  it('uses emoji signals', () => {
    expect(classifyMood('what a day', ['🎉', '🚀']).mood).toBe('Excited');
  });
});

// ─── Action detection ─────────────────────────────────────────

describe('detectActions', () => {
  it('finds explicit tasks with verbatim due hints, never inventing dates', () => {
    const actions = detectActions(segmentSentences(
      'Need to submit the tax documents by Friday. The weather was nice. Call mom tomorrow.'
    ));
    expect(actions).toHaveLength(2);
    expect(actions[0].dueHint?.toLowerCase()).toContain('friday');
    expect(actions[1].dueHint?.toLowerCase()).toBe('tomorrow');
  });

  it('reports no due hint when none is written', () => {
    const actions = detectActions(['Remember to water the plants']);
    expect(actions[0].dueHint).toBeUndefined();
  });

  it('renders a markdown checklist', () => {
    const list = actionsToChecklist([{ text: 'Buy milk', dueHint: 'tomorrow' }]);
    expect(list).toBe('- [ ] Buy milk  (tomorrow)');
  });
});

// ─── Summarization ────────────────────────────────────────────

describe('summarize / extractiveSummary', () => {
  const long = 'The migration to the new database is almost complete. We moved all user tables last week. Performance improved by forty percent after the index changes. The team celebrated with pizza. Next month we tackle the analytics pipeline migration.';

  it('short notes are returned as-is (no synthetic summary)', () => {
    const text = 'Buy milk today.';
    expect(summarize(text, segmentSentences(text), [])).toBe(text);
  });

  it('long notes get a single representative sentence ≤140 chars', () => {
    const sentences = segmentSentences(long);
    const { keywords } = extractKeywords(long);
    const s = summarize(long, sentences, keywords);
    expect(s.length).toBeLessThanOrEqual(140);
    expect(long).toContain(s.replace('…', ''));
  });

  it('extractive summary only contains original sentences, in order', () => {
    const sentences = segmentSentences(long);
    const { keywords } = extractKeywords(long);
    const result = extractiveSummary(sentences, keywords, 2);
    for (const s of segmentSentences(result)) {
      expect(sentences).toContain(s);
    }
  });
});

// ─── Tagger ───────────────────────────────────────────────────

describe('tagsForText', () => {
  it('maps content signals onto the taxonomy', () => {
    expect(tagsForText('buy groceries and order milk from the store')).toContain('SHOPPING');
    expect(tagsForText('gym workout then doctor appointment')).toContain('HEALTH');
    expect(tagsForText('pay rent and check the bank balance')).toContain('FINANCE');
  });

  it('falls back to OTHER when nothing matches', () => {
    expect(tagsForText('zzz qqq xxx')).toEqual(['OTHER']);
  });
});

// ─── Full pipeline ────────────────────────────────────────────

describe('processNoteWithTimeout (full local pipeline)', () => {
  it('produces a complete structured note deterministically', async () => {
    const r1 = await processNoteWithTimeout('Need to prepare the exam study schedule for next week. Focus on physics and chemistry chapters first.');
    const r2 = await processNoteWithTimeout('Need to prepare the exam study schedule for next week. Focus on physics and chemistry chapters first.');
    expect(r1.success).toBe(true);
    if (r1.success && r2.success) {
      expect(r1.data).toEqual(r2.data); // deterministic
      expect(r1.data.title.length).toBeGreaterThan(0);
      expect(r1.data.type).toBe('task');
      expect(r1.tags.length).toBeGreaterThan(0);
    }
  });

  it('rejects empty input explicitly', async () => {
    const r = await processNoteWithTimeout('   ');
    expect(r.success).toBe(false);
  });

  it('handles Hindi and malformed transcription without corruption', async () => {
    const r = await processNoteWithTimeout('कल मुझे बाजार जाना है और सब्जी खरीदनी है। umm soooo यह जरूरी है।');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title.length).toBeGreaterThan(0);
  });
});

// ─── Transforms ───────────────────────────────────────────────

describe('local text transforms', () => {
  it('transformConcise returns fewer sentences from the original text', () => {
    const body = 'First point about budget. Second point about hiring plans. Third point about the office move. Fourth point about the annual party. Fifth point about tools.';
    const r = transformConcise(body);
    expect(r).not.toBeNull();
    expect(segmentSentences(r!.body!).length).toBeLessThan(5);
  });

  it('transformExtractActions returns a checklist or null when no actions', () => {
    expect(transformExtractActions('Need to call the bank. Must renew the passport.')!.body).toContain('- [ ]');
    expect(transformExtractActions('The sky was blue and calm.')).toBeNull();
  });

  it('transformBullets converts sentences to bullets', () => {
    const r = transformBullets('First thing. Second thing.');
    expect(r!.body!.split('\n')).toHaveLength(2);
    expect(r!.body).toContain('• First thing');
  });
});
