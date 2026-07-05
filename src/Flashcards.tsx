import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note, Crystal } from './types';
import { TopBar } from './components';
import { Layers, Zap, AlertCircle, Star } from 'lucide-react';
import { applyReview, previewNextInterval, REVIEW_BUTTONS, ReviewButton } from './features/flashcards/sm2';
import { buildReviewQueue, getQueueStats, QueuedCard } from './features/flashcards/reviewQueue';

interface FlashcardsScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  onUpdateNote: (n: Note) => Promise<void>;
  isDark: boolean;
}

// ─── Session stats ────────────────────────────────────────────

interface SessionStats {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

// ─── Component ────────────────────────────────────────────────

export const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({
  setScreen,
  notes,
  onUpdateNote,
  isDark,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    reviewed: 0, again: 0, hard: 0, good: 0, easy: 0,
  });
  const [showCelebration, setShowCelebration] = useState(false);

  // Build queue (memoised — only rebuilds when notes array identity changes)
  const queue: QueuedCard[] = useMemo(() => buildReviewQueue(notes), [notes]);
  const stats = useMemo(() => getQueueStats(notes), [notes]);

  const isDone = queue.length === 0 || currentIndex >= queue.length;
  const current = isDone ? null : queue[currentIndex];

  // ─── Review handler ─────────────────────────────────────────

  const handleReview = useCallback(async (button: ReviewButton) => {
    if (!current) return;
    const crystal = current.note as Crystal;
    const nextReview = applyReview(crystal.flashcardReview, button);

    // Persist updated flashcard state
    const updatedNote: Note = {
      ...current.note,
      flashcardEnabled: true,
      flashcardReview: nextReview,
      updatedAt: Date.now(),
    };
    await onUpdateNote(updatedNote);

    setSessionStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      [button]: prev[button] + 1,
    }));

    setIsFlipped(false);
    setTimeout(() => {
      const nextIdx = currentIndex + 1;
      if (nextIdx >= queue.length) {
        setShowCelebration(true);
      }
      setCurrentIndex(nextIdx);
    }, 200);
  }, [current, currentIndex, queue.length, onUpdateNote]);

  // ─── Completion / Empty screens ──────────────────────────────

  if (showCelebration || isDone) {
    const retention = sessionStats.reviewed > 0
      ? Math.round(((sessionStats.good + sessionStats.easy) / sessionStats.reviewed) * 100)
      : 0;

    return (
      <div className="min-h-screen w-full bg-base pb-24">
        <TopBar title="Flashcards" onBack={() => setScreen('home')} isDark={isDark} onToggleDarkMode={() => {}} />
        <div className="flex flex-col items-center justify-center h-[80vh] px-6 text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 relative"
          >
            <Star size={40} className="text-primary" fill="currentColor" />
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: 3, duration: 1 }}
            />
          </motion.div>

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-headline font-extrabold text-on-surface mb-2 tracking-tighter"
          >
            {sessionStats.reviewed === 0 ? 'Nothing Due Today' : 'Session Complete!'}
          </motion.h2>

          {sessionStats.reviewed > 0 ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="space-y-3 mb-8 w-full max-w-xs"
            >
              <p className="text-text-secondary text-sm">
                Reviewed <span className="text-primary font-bold">{sessionStats.reviewed}</span> cards
                — {retention}% retention
              </p>
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { label: 'Again', count: sessionStats.again, color: 'text-red-400' },
                  { label: 'Hard',  count: sessionStats.hard,  color: 'text-orange-400' },
                  { label: 'Good',  count: sessionStats.good,  color: 'text-primary' },
                  { label: 'Easy',  count: sessionStats.easy,  color: 'text-green-400' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="bg-surface-low rounded-xl p-2 text-center border border-primary/5">
                    <p className={`text-lg font-headline font-extrabold ${color}`}>{count}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary/60">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col items-center gap-3 mb-8 max-w-xs text-center"
            >
              <p className="text-text-secondary text-sm">
                No cards are due today. To build your deck, open any note and enable the flashcard toggle.
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                Tip: idea-type notes make the best flashcards.
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3"
          >
            {sessionStats.reviewed === 0 && (
              <button
                onClick={() => setScreen('search')}
                className="px-5 py-3 border border-primary/20 text-primary font-black uppercase tracking-widest rounded-xl hover:bg-primary/5 active:scale-95 transition-all text-[10px]"
              >
                Find Notes
              </button>
            )}
            <button
              onClick={() => setScreen('home')}
              className="px-8 py-3 bg-primary text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 transition-transform text-[10px]"
            >
              Back Home
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Active review ───────────────────────────────────────────

  const currentCrystal = current!.note as Crystal;
  const remaining = queue.length - currentIndex;

  return (
    <div className="min-h-screen w-full bg-base pb-24 flex flex-col overflow-hidden">
      <TopBar title="Flashcards" onBack={() => setScreen('home')} isDark={isDark} onToggleDarkMode={() => {}} />

      <div className="pt-20 px-4 sm:px-6 flex-1 flex flex-col items-center max-w-lg mx-auto w-full">

        {/* Queue header */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="w-28 h-1.5 bg-surface-highest rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${((currentIndex) / queue.length) * 100}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
              {currentIndex + 1}/{queue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {current!.overdueBy > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-red-400 border border-red-400/20 rounded-full px-2 py-0.5">
                <AlertCircle size={9} /> {current!.overdueBy}d overdue
              </span>
            )}
            {current!.isNew && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-green-400 border border-green-400/20 rounded-full px-2 py-0.5">
                <Zap size={9} /> New
              </span>
            )}
            <div className="flex items-center gap-1 text-primary">
              <Layers size={13} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{remaining} left</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="relative w-full cursor-pointer select-none mb-4"
          style={{ perspective: '1200px', aspectRatio: '3/4', maxHeight: '55vh' }}
          onClick={() => !isFlipped && setIsFlipped(true)}
        >
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              /* Front */
              <motion.div
                key={`front-${currentIndex}`}
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 bg-surface border border-primary/15 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden"
              >
                <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black">Q</div>
                {currentCrystal.type && (
                  <span className="absolute top-5 right-5 text-[9px] font-bold uppercase tracking-widest text-text-secondary/40 border border-primary/10 rounded-full px-2 py-0.5">
                    {currentCrystal.type}
                  </span>
                )}
                {currentCrystal.moodColor && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-full" style={{ backgroundColor: currentCrystal.moodColor }} />
                )}
                <h3 className="text-2xl sm:text-3xl font-headline font-extrabold text-on-surface tracking-tighter leading-tight px-4">
                  {currentCrystal.title}
                </h3>
                {currentCrystal.tags && currentCrystal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                    {currentCrystal.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary rounded-full px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="absolute bottom-6 text-[10px] font-bold text-text-secondary/30 uppercase tracking-widest animate-pulse">
                  Tap to reveal
                </p>
              </motion.div>
            ) : (
              /* Back */
              <motion.div
                key={`back-${currentIndex}`}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 bg-surface-low border border-primary/30 rounded-3xl shadow-[0_0_30px_rgba(249,115,22,0.08)] flex flex-col overflow-hidden"
              >
                <div className="absolute top-5 left-5 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black text-xs font-black z-10">A</div>
                <div className="pt-16 pb-6 px-8 flex-1 overflow-y-auto">
                  <p className="text-base sm:text-lg font-medium text-on-surface/90 leading-relaxed whitespace-pre-wrap">
                    {currentCrystal.body || currentCrystal.content}
                  </p>
                  {currentCrystal.topics && currentCrystal.topics.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {currentCrystal.topics.slice(0, 4).map((t) => (
                        <span key={t} className="text-[9px] font-medium text-text-secondary/60 border border-primary/10 rounded-full px-2 py-0.5">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Review buttons — only shown after flip */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full grid grid-cols-4 gap-2"
            >
              {REVIEW_BUTTONS.map((btn) => {
                const nextInterval = previewNextInterval(currentCrystal.flashcardReview, btn.key);
                return (
                  <button
                    key={btn.key}
                    onClick={() => handleReview(btn.key)}
                    className={`flex flex-col items-center justify-center gap-1 py-3 border rounded-2xl transition-all active:scale-95 ${btn.bgClass}`}
                  >
                    <span className={`text-xs font-black uppercase tracking-widest ${btn.colorClass}`}>
                      {btn.label}
                    </span>
                    <span className="text-[9px] font-medium text-text-secondary/50">
                      {nextInterval}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats footer */}
        {sessionStats.reviewed > 0 && (
          <div className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary/40">
            <span className="text-red-400">{sessionStats.again} again</span>
            <span>·</span>
            <span className="text-orange-400">{sessionStats.hard} hard</span>
            <span>·</span>
            <span className="text-primary">{sessionStats.good} good</span>
            <span>·</span>
            <span className="text-green-400">{sessionStats.easy} easy</span>
          </div>
        )}
      </div>
    </div>
  );
};
