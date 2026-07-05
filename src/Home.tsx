import React, { useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note, AuthUser, Crystal } from './types';
import { TopBar, NoteCard, StreakBadge } from './components';
import {
  Mic, Sparkles, Pin, ChevronRight, Lightbulb, Brain,
  TrendingUp, BarChart2, Zap, BookOpen,
} from 'lucide-react';
import { calculateStreakFromUser, hasCapturedToday } from './utils/streakHelpers';
import { processNoteWithTimeout } from './features/intelligence/IntelligenceEngine';
import { useAuth } from './hooks/useAuth';
import { extractTagsFromText, normalizeTags } from './utils/tagHelpers';
import { logEvent } from './utils/logEvent';
import { notifications } from './features/notifications/notificationService';
import { useNotes } from './hooks/useNotes';
import { generateWeeklyDigest, getStoredDigest, shouldGenerateDigest } from './features/digest/weeklyDigestService';
import { WeeklyDigestCard } from './features/digest/WeeklyDigestCard';
import { generateInsightSummary } from './features/knowledge/insightService';
import { getQueueStats } from './features/flashcards/reviewQueue';
import { DEMO_NOTES, isDemoLoaded, markDemoLoaded } from './utils/demoData';

interface HomeScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  onEditNote: (n: Note) => void;
  onAddNote?: (n: Note) => Promise<void>;
  onDeleteNote: (id: string) => void;
  user: AuthUser | null;
  isDark: boolean;
  onToggleDarkMode: () => void;
}

// ─── Daily Moment messages ────────────────────────────────────

function buildDailyMoments(notes: Note[], insights: ReturnType<typeof generateInsightSummary>): string[] {
  const msgs: string[] = [];
  const total = notes.length;
  if (total > 0) msgs.push(`You've captured ${total} idea${total !== 1 ? 's' : ''} so far.`);

  const { topThemes, emergingTopics, weeklyTopicVelocity } = insights;
  if (topThemes[0]) {
    const t = topThemes[0];
    const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
    if (pct > 0) msgs.push(`"${t.label}" appears in ${pct}% of your thoughts.`);
  }
  if (emergingTopics[0]) msgs.push(`New interest emerging: "${emergingTopics[0]}".`);
  if (weeklyTopicVelocity > 3) msgs.push(`${weeklyTopicVelocity} new topics this week. You're exploring!`);

  const topMood = insights.topThemes.find(t => t.trend === 'rising');
  if (topMood) msgs.push(`"${topMood.label}" is a rising theme in your notes.`);

  if (msgs.length === 0) msgs.push('Start capturing ideas. Your knowledge graph grows with you.');
  return msgs;
}

// ─── Component ────────────────────────────────────────────────

export const HomeScreen: React.FC<HomeScreenProps> = ({
  setScreen, notes, onEditNote, onAddNote, onDeleteNote, user, isDark, onToggleDarkMode,
}) => {
  const { logout } = useAuth();
  const { forgottenGems, weeklyStats } = useNotes(user?.id);

  const pinnedNotes = useMemo(() => notes.filter((n) => n?.pinned), [notes]);
  const recentNotes = useMemo(() => notes.filter((n) => !n?.pinned).slice(0, 3), [notes]);

  // Streak
  const { currentStreak, isStreakAtRisk, isFrozen, freezeAvailable } =
    calculateStreakFromUser(user);
  const capturedToday = hasCapturedToday(user);

  // Insights (memoised — expensive only on note array change)
  const insights = useMemo(() => generateInsightSummary(notes), [notes]);

  // Daily moment (rotate by day-of-month index)
  const dailyMoments = useMemo(() => buildDailyMoments(notes, insights), [notes, insights]);
  const momentIndex = new Date().getDate() % Math.max(dailyMoments.length, 1);
  const dailyMoment = dailyMoments[momentIndex];

  // Flashcard queue stats
  const flashStats = useMemo(() => getQueueStats(notes), [notes]);

  // Quick capture state
  const [quickNoteText, setQuickNoteText] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = React.useState(false);
  const lastSaveTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 750;

  // Weekly digest state
  const [showDigest, setShowDigest] = React.useState(false);
  const [digest, setDigest] = React.useState<ReturnType<typeof generateWeeklyDigest>>(null);

  React.useEffect(() => {
    if (notes.length > 0) {
      const stored = getStoredDigest();
      if (shouldGenerateDigest()) {
        const newDigest = generateWeeklyDigest(notes as Crystal[]);
        if (newDigest) { setDigest(newDigest); setShowDigest(true); }
      } else if (stored) {
        setDigest(stored);
      }
    }
  }, [notes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Quick save ──────────────────────────────────────────────

  const handleQuickSave = useCallback(async () => {
    if (!quickNoteText.trim() || isProcessing) return;
    const now = Date.now();
    if (now - lastSaveTimeRef.current < DEBOUNCE_MS) return;
    lastSaveTimeRef.current = now;
    setIsProcessing(true);
    try {
      // Local intelligence — works offline, no API race, no fallback tier
      const aiResult = await processNoteWithTimeout(quickNoteText);
      const aiData = aiResult.success ? aiResult.data : undefined;
      const tags: string[] = aiResult.success
        ? aiResult.tags
        : extractTagsFromText(quickNoteText);
      logEvent('QUICK_SAVE_AI_SUCCESS', { tags });

      const normTags = normalizeTags(tags);
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: aiData?.title || quickNoteText.slice(0, 50) || 'Quick Note',
        content: aiData?.summary || quickNoteText.slice(0, 100),
        body: quickNoteText,
        type: aiData?.type || 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false,
        createdAt: Date.now(),
        mood: aiData?.mood || 'Neutral',
        attachments: [],
        tags: normTags,
      };

      if (onAddNote) await onAddNote(newNote);
      onEditNote(newNote);
      setQuickNoteText('');
    } catch (error) {
      logEvent('QUICK_SAVE_ERROR', { error });
      notifications.error('Quick save failed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  }, [quickNoteText, isProcessing, onAddNote, onEditNote]);

  // ─── Demo workspace loader ───────────────────────────────────

  const handleLoadDemo = useCallback(async () => {
    if (!onAddNote || isLoadingDemo || isDemoLoaded()) return;
    setIsLoadingDemo(true);
    try {
      for (const note of DEMO_NOTES) {
        await onAddNote(note);
      }
      markDemoLoaded();
      notifications.success('Demo workspace loaded! Explore your sample knowledge graph.');
    } catch {
      notifications.error('Could not load demo. Please try again.');
    } finally {
      setIsLoadingDemo(false);
    }
  }, [onAddNote, isLoadingDemo]);

  // ─── Derived flags ───────────────────────────────────────────

  const hasIdeaNotes = notes.some(n => n.type === 'idea');
  const hasFlashcardsEnabled = notes.some(n => n.flashcardEnabled);
  const showFlashcardDiscovery = hasIdeaNotes && !hasFlashcardsEnabled;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full pb-safe-nav pt-24 px-4 sm:px-6 max-w-2xl mx-auto">
      <TopBar
        title="VoiceAction"
        user={user}
        onLogout={logout}
        onSetScreen={setScreen}
        isDark={isDark}
        onToggleDarkMode={onToggleDarkMode}
        onExport={() => setScreen('settings')}
      />

      {/* ── Info banners row ────────────────────────────────── */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar w-full">

        {/* AI Status */}
        <div className="flex-shrink-0 min-w-[140px] max-w-[200px] bg-primary/10 border border-primary/20 rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-primary/60 truncate">AI Status</p>
            <p className="text-xs sm:text-sm font-bold text-on-surface truncate">Ready</p>
          </div>
        </div>

        {/* Streak badge (compact) */}
        <div className="flex-shrink-0">
          <StreakBadge
            user={user}
            currentStreak={currentStreak}
            isAtRisk={isStreakAtRisk}
            isFrozen={isFrozen}
            variant="compact"
          />
        </div>

        {/* Flashcard due badge */}
        {flashStats.total > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setScreen('flashcards')}
            className="flex-shrink-0 min-w-[140px] max-w-[200px] bg-surface-low border border-primary/5 rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 active:scale-95 transition-transform"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-highest flex items-center justify-center text-primary flex-shrink-0">
              <BookOpen size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-text-secondary/60 truncate">Review</p>
              <p className="text-xs sm:text-sm font-bold text-on-surface truncate">
                {flashStats.total} due
                {flashStats.overdue > 0 && <span className="text-red-400"> ({flashStats.overdue} overdue)</span>}
              </p>
            </div>
          </motion.button>
        )}
      </div>

      {/* ── Greeting ────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface mb-1">
          HELLO, <span className="text-primary">{user?.name?.split(' ')[0]?.toUpperCase() || 'USER'}</span>
        </h2>
        <p className="text-text-secondary text-sm">What's on your mind today?</p>
      </div>

      {/* ── Daily Moment card ───────────────────────────────── */}
      {dailyMoment && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-primary/10 to-surface-high border border-primary/10 rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          <Zap size={16} className="text-primary flex-shrink-0" />
          <p className="text-xs font-medium text-on-surface/80 leading-snug">{dailyMoment}</p>
        </motion.div>
      )}

      {/* ── Quick capture card ──────────────────────────────── */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.2, bottom: 0 }}
        whileHover={{ scale: 1.005 }}
        className="bg-surface-high border border-primary/10 rounded-3xl p-4 sm:p-6 mb-8 shadow-2xl relative overflow-hidden group cursor-grab active:cursor-grabbing"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
        <textarea
          placeholder="Type or tap the mic to start..."
          value={quickNoteText}
          onChange={(e) => setQuickNoteText(e.target.value)}
          disabled={isProcessing}
          className="w-full bg-transparent border-none outline-none text-on-surface placeholder:text-text-secondary/40 resize-none h-20 sm:h-24 font-medium text-sm sm:text-base"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-primary ${isProcessing ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-primary/60">
              {isProcessing ? 'AI Processing' : 'AI Ready'}
            </span>
          </div>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {quickNoteText.trim() && (
              <button
                onClick={handleQuickSave}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-primary text-black rounded-full px-3 sm:px-4 py-2 transition-all font-bold text-[10px] sm:text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {isProcessing ? '...' : 'Save'}
              </button>
            )}
            <button
              onClick={() => setScreen('recording')}
              className="flex items-center gap-2 bg-surface-low hover:bg-surface-high border border-primary/10 rounded-full px-3 sm:px-4 py-2 transition-all"
            >
              <Mic size={14} className="text-primary sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-bold text-on-surface uppercase tracking-wider">Voice Mode</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Weekly Digest ───────────────────────────────────── */}
      {showDigest && digest && (
        <WeeklyDigestCard digest={digest} onDismiss={() => setShowDigest(false)} />
      )}

      {/* ── Your Week in Thoughts ───────────────────────────── */}
      {!showDigest && weeklyStats.count > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Your Week in Thoughts</h3>
            <Brain size={16} className="text-primary" />
          </div>
          <div className="bg-gradient-to-br from-primary/5 to-surface-high border border-primary/10 rounded-2xl p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-headline font-extrabold text-primary">{weeklyStats.count}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary/60 mt-1">Notes</p>
              </div>
              <div className="text-center border-x border-primary/10">
                <p className="text-2xl sm:text-3xl font-headline font-extrabold text-primary">{weeklyStats.connections}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary/60 mt-1">Links</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-xl font-headline font-extrabold text-on-surface truncate">{weeklyStats.topMood}</p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary/60 mt-1">Top Mood</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Streak full card (only if streak > 0) ──────────── */}
      {currentStreak > 0 && (
        <div className="mb-8">
          <StreakBadge
            user={user}
            currentStreak={currentStreak}
            isAtRisk={isStreakAtRisk}
            isFrozen={isFrozen}
            variant="full"
          />
        </div>
      )}

      {/* ── Insight Dashboard ────────────────────────────────── */}
      {insights.topThemes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Your Knowledge</h3>
            <BarChart2 size={16} className="text-primary" />
          </div>

          <div className="space-y-2">
            {/* Top themes bar chart */}
            {insights.topThemes.slice(0, 4).map((theme, i) => (
              <div key={theme.label} className="flex items-center gap-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/60 w-20 truncate flex-shrink-0">
                  {theme.label}
                </span>
                <div className="flex-1 h-1.5 bg-surface-highest rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: theme.trend === 'rising' ? '#f97316' : theme.trend === 'fading' ? '#6b7280' : '#3b82f6',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((theme.count / Math.max(insights.topThemes[0]?.count, 1)) * 100, 100)}%` }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-text-secondary/50">{theme.count}</span>
                  {theme.trend === 'rising' && <TrendingUp size={9} className="text-primary" />}
                </div>
              </div>
            ))}

            {/* Emerging topics */}
            {insights.emergingTopics.length > 0 && (
              <div className="mt-3 pt-3 border-t border-primary/5">
                <p className="text-[9px] uppercase tracking-widest font-bold text-primary/60 mb-2">Emerging</p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.emergingTopics.slice(0, 4).map((t) => (
                    <span key={t} className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Flashcard discovery banner ──────────────────────── */}
      <AnimatePresence>
        {showFlashcardDiscovery && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-surface-low border border-primary/10 rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen size={15} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface">Turn ideas into memory</p>
              <p className="text-[10px] text-text-secondary leading-snug">
                Open any idea note and enable flashcards to review with spaced repetition.
              </p>
            </div>
            <button
              onClick={() => setScreen('flashcards')}
              className="flex-shrink-0 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20 rounded-lg px-3 py-1.5 hover:bg-primary/5 active:scale-95 transition-all"
            >
              Try it
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pinned Notes ─────────────────────────────────────── */}
      {pinnedNotes.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Pinned</h3>
            <ChevronRight size={16} className="text-text-secondary/40" />
          </div>
          <div className="grid gap-3 sm:gap-4">
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
            ))}
          </div>
        </div>
      )}

      {/* ── Forgotten Gems ────────────────────────────────────── */}
      {forgottenGems.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Forgotten Gems</h3>
            <Lightbulb size={16} className="text-amber-500" />
          </div>
          <div className="grid gap-3 sm:gap-4">
            {forgottenGems.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.01 }}
                className="relative"
              >
                <NoteCard note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
                {(note as Crystal).moodColor && (
                  <div
                    className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
                    style={{ backgroundColor: (note as Crystal).moodColor }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Activity ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Recent</h3>
          <button onClick={() => setScreen('history')} className="text-[10px] uppercase tracking-widest font-bold text-primary hover:underline">
            View All
          </button>
        </div>
        <div className="grid gap-3 sm:gap-4">
          {recentNotes.map((note) => (
            <motion.div
              key={note.id}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <NoteCard note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
              {(note as Crystal).moodColor && (
                <div
                  className="absolute left-0 top-4 bottom-4 w-1 rounded-full opacity-60"
                  style={{
                    backgroundColor: (note as Crystal).moodColor,
                    boxShadow: `0 0 10px ${(note as Crystal).moodColor}40`,
                  }}
                />
              )}
            </motion.div>
          ))}
          {recentNotes.length === 0 && notes.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-10 flex flex-col items-center gap-5"
            >
              {/* Icon */}
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-primary/20"
                />
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Mic size={26} className="text-primary" />
                </div>
              </div>

              {/* Copy */}
              <div className="text-center">
                <p className="font-headline font-extrabold text-lg tracking-tight text-on-surface mb-1">
                  Your knowledge space is empty
                </p>
                <p className="text-text-secondary text-sm max-w-xs">
                  Record your first thought, or explore the app with a sample workspace.
                </p>
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => setScreen('recording')}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 transition-transform text-xs"
              >
                <Mic size={14} /> Record first thought
              </button>

              {/* Demo option */}
              {!isDemoLoaded() && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary/40">or</p>
                  <button
                    onClick={handleLoadDemo}
                    disabled={isLoadingDemo}
                    className="flex items-center gap-2 px-5 py-2.5 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    {isLoadingDemo ? 'Loading demo…' : 'Try demo workspace'}
                  </button>
                  <p className="text-[9px] text-text-secondary/30 uppercase tracking-wide">
                    8 sample notes · pre-built knowledge graph
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
