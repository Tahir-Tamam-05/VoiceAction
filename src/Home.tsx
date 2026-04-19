import React from 'react';
import { motion } from 'motion/react';
import { Screen, Note, AuthUser } from './types';
import { TopBar, NoteCard } from './components';
import { Mic, Sparkles, Pin, Clock, ChevronRight } from 'lucide-react';
import { calculateStreak } from './utils/streakHelpers';
import { processVoiceNote } from './services/geminiService';

interface HomeScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  onEditNote: (n: Note) => void;
  onDeleteNote: (id: string) => void;
  user: AuthUser | null;
  isDark: boolean;
  onToggleDarkMode: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ setScreen, notes, onEditNote, onDeleteNote, user, isDark, onToggleDarkMode }) => {
  const pinnedNotes = notes.filter(n => n?.pinned);
  const recentNotes = notes.filter(n => !n?.pinned).slice(0, 3);
  const streak = calculateStreak(notes);

  const [quickNoteText, setQuickNoteText] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleQuickSave = async () => {
    if (!quickNoteText.trim()) return;
    setIsProcessing(true);
    try {
      const aiResult = await processVoiceNote(quickNoteText);
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: aiResult?.title || "Quick Note",
        content: aiResult?.content || quickNoteText.slice(0, 100),
        body: aiResult?.body || quickNoteText,
        type: aiResult?.type || 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false,
        createdAt: Date.now(),
        mood: aiResult?.mood || 'Neutral',
        attachments: []
      };
      onEditNote(newNote); // Open for further editing
      setQuickNoteText("");
    } catch (error) {
      console.error("Quick save failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full pb-safe-nav pt-24 px-4 sm:px-6 max-w-2xl mx-auto overflow-y-auto">
      <TopBar 
        title="VoiceAction" 
        user={user} 
        onLogout={() => {}} // Handled by App.tsx
        onSetScreen={setScreen}
        isDark={isDark}
        onToggleDarkMode={onToggleDarkMode}
        onExport={() => {}} // Handled by App.tsx
      />
      
      {/* Info Banners */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar w-full">
        <div className="flex-shrink-0 min-w-[140px] max-w-[200px] bg-primary/10 border border-primary/20 rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles size={14} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-primary/60 truncate">AI Status</p>
            <p className="text-xs sm:text-sm font-bold text-on-surface truncate">Ready to process</p>
          </div>
        </div>
        
        <div className="flex-shrink-0 min-w-[140px] max-w-[200px] bg-surface-low border border-primary/5 rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface-highest flex items-center justify-center text-text-secondary flex-shrink-0">
            <Clock size={14} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold text-text-secondary/60 truncate">Streak</p>
            <p className="text-xs sm:text-sm font-bold text-on-surface truncate">{streak} Days</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
          HELLO, <span className="text-primary">{user?.name?.split(' ')[0]?.toUpperCase() || 'USER'}</span>
        </h2>
        <p className="text-text-secondary text-sm">What's on your mind today?</p>
      </div>

      {/* Quick Capture Card */}
      <motion.div 
        whileHover={{ scale: 1.01 }}
        className="bg-surface-high border border-primary/10 rounded-3xl p-4 sm:p-6 mb-10 shadow-2xl relative overflow-hidden group"
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

      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Pinned Notes</h3>
            <ChevronRight size={16} className="text-text-secondary/40" />
          </div>
          
          <div className="grid gap-3 sm:gap-4">
            {pinnedNotes.map(note => (
              <NoteCard key={note.id} note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-black text-text-secondary/40">Recent Activity</h3>
          <button onClick={() => setScreen('history')} className="text-[10px] uppercase tracking-widest font-bold text-primary hover:underline">View All</button>
        </div>
        
        <div className="grid gap-3 sm:gap-4">
          {recentNotes.map(note => (
            <NoteCard key={note.id} note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
          ))}
        </div>
      </div>
    </div>
  );
};

