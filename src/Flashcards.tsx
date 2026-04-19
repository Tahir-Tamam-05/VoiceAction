import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note } from './types';
import { TopBar } from './components';
import { Check, RefreshCw, Layers } from 'lucide-react';

interface FlashcardsScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  isDark: boolean;
}

export const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({ setScreen, notes, isDark }) => {
  const [deck, setDeck] = useState<Note[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, retained: 0 });

  useEffect(() => {
    const lastReviewedStr = localStorage.getItem('va_flashcards_reviewed') || '{}';
    const lastReviewed = JSON.parse(lastReviewedStr);
    
    const today = new Date().toDateString();
    
    const dueNotes = notes.filter(n => {
      if (n.type !== 'idea') return false;
      const last = lastReviewed[n.id];
      return !last || last !== today;
    });

    setDeck(dueNotes.sort(() => Math.random() - 0.5));
  }, [notes]);

  const recordReview = (id: string, retained: boolean) => {
    const lastReviewedStr = localStorage.getItem('va_flashcards_reviewed') || '{}';
    const lastReviewed = JSON.parse(lastReviewedStr);
    lastReviewed[id] = new Date().toDateString();
    localStorage.setItem('va_flashcards_reviewed', JSON.stringify(lastReviewed));
    
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      retained: prev.retained + (retained ? 1 : 0)
    }));
  };

  const handleNext = (retained: boolean) => {
    recordReview(deck[currentIndex].id, retained);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 150);
  };

  if (deck.length === 0 || currentIndex >= deck.length) {
    return (
      <div className="min-h-screen w-full bg-base pb-24">
        <TopBar title="Flashcards" onBack={() => setScreen('history')} isDark={isDark} onToggleDarkMode={() => {}} />
        <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
            <Check size={40} />
          </div>
          <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-2 tracking-tight">Session Complete</h2>
          <p className="text-text-secondary mb-8">You reviewed {sessionStats.reviewed} ideas today.</p>
          <button 
            onClick={() => setScreen('history')}
            className="px-8 py-3 bg-primary text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 transition-transform"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const currentNote = deck[currentIndex];

  return (
    <div className="min-h-screen w-full bg-base pb-24 flex flex-col overflow-hidden">
      <TopBar title="Flashcards" onBack={() => setScreen('history')} isDark={isDark} onToggleDarkMode={() => {}} />
      
      <div className="pt-24 px-6 flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        <div className="w-full flex justify-between items-center mb-6 px-4">
          <span className="text-xs font-bold text-text-secondary/60 uppercase tracking-widest">
            {currentIndex + 1} of {deck.length}
          </span>
          <div className="flex items-center gap-1.5 text-primary">
            <Layers size={14} />
            <span className="text-xs font-bold uppercase tracking-widest">{deck.length - currentIndex - 1} Remaining</span>
          </div>
        </div>

        <div 
          className="relative w-full aspect-[3/4] cursor-pointer"
          style={{ perspective: '1000px' }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="front"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-surface border border-primary/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl"
              >
                <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="text-xs font-black">Q</span>
                </div>
                {currentNote.coverImage && (
                  <div className="absolute inset-x-0 top-0 h-32 rounded-t-3xl overflow-hidden opacity-20 mask-to-bottom pointer-events-none">
                    <img src={currentNote.coverImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="text-3xl font-headline font-extrabold text-on-surface tracking-tighter leading-tight relative z-10">
                  {currentNote.title}
                </h3>
                <p className="absolute bottom-8 text-xs font-bold text-text-secondary/40 uppercase tracking-widest animate-pulse">
                  Tap to flip
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-surface-low border border-primary/40 rounded-3xl p-8 shadow-[0_0_30px_rgba(249,115,22,0.1)] flex flex-col"
              >
                <div className="absolute top-6 left-6 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black z-10">
                  <span className="text-xs font-black">A</span>
                </div>
                <div className="pt-12 pb-24 flex-1 overflow-y-auto w-full relative z-0">
                  <p className="text-lg font-medium text-on-surface/90 leading-relaxed whitespace-pre-wrap">
                    {currentNote.body || currentNote.content}
                  </p>
                </div>
                
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[280px] flex justify-between gap-4 z-20 bg-surface-low/80 backdrop-blur-md p-2 rounded-3xl">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(false); }}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-surface hover:bg-surface-high border border-primary/10 rounded-2xl transition-all active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                      <RefreshCw size={16} />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">Again</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(true); }}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-2xl transition-all active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                      <Check size={16} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">Got it</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
