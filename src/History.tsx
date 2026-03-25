import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TopBar, NoteCard } from './components';
import { Screen, Note } from './types';
import { ArrowUpDown, Filter, Calendar, Pin, Tag } from 'lucide-react';

interface HistoryScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  onEditNote: (n: Note) => void;
  onDeleteNote: (id: string) => void;
  isDark: boolean;
  onToggleDarkMode: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ setScreen, notes, onEditNote, onDeleteNote, isDark, onToggleDarkMode }) => {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical' | 'pinned'>('newest');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note?.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [notes]);

  const filteredAndSortedNotes = useMemo(() => {
    const filtered = notes.filter(note => {
      const matchesPinned = !onlyPinned || note?.pinned;
      
      const noteDate = new Date(note?.createdAt || 0);
      const matchesStart = !startDate || noteDate >= new Date(startDate);
      const matchesEnd = !endDate || noteDate <= new Date(endDate);
      
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => note?.tags?.includes(tag));

      return matchesPinned && matchesStart && matchesEnd && matchesTags;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b?.createdAt || 0) - (a?.createdAt || 0);
      if (sortBy === 'oldest') return (a?.createdAt || 0) - (b?.createdAt || 0);
      if (sortBy === 'alphabetical') return (a?.title || '').localeCompare(b?.title || '');
      if (sortBy === 'pinned') return (b?.pinned ? 1 : 0) - (a?.pinned ? 1 : 0);
      return 0;
    });
  }, [notes, sortBy, onlyPinned, startDate, endDate, selectedTags]);

  // Group notes by date (only for newest/oldest sorting)
  const groupedNotes = useMemo(() => {
    return filteredAndSortedNotes.reduce((acc: { [key: string]: Note[] }, note) => {
      const date = new Date(note?.createdAt || 0).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(note);
      return acc;
    }, {});
  }, [filteredAndSortedNotes]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedNotes).sort((a, b) => {
      return new Date(groupedNotes[b][0]?.createdAt || 0).getTime() - new Date(groupedNotes[a][0]?.createdAt || 0).getTime();
    });
  }, [groupedNotes]);


  return (
    <div className="min-h-screen w-full pt-24 pb-32 px-4 sm:px-6 max-w-2xl mx-auto">
      <TopBar 
        title="History" 
        onSetScreen={setScreen} 
        isDark={isDark} 
        onToggleDarkMode={onToggleDarkMode} 
      />

      {/* Analytics Bento */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface-low rounded-xl px-4 py-3 h-[64px] flex flex-col justify-center ghost-border">
          <span className="text-[10px] font-bold tracking-wider text-primary/60 uppercase">{filteredAndSortedNotes.length} Notes</span>
          <span className="text-xs font-semibold text-on-surface/80">Filtered Volume</span>
        </div>
        <div className="bg-surface-low rounded-xl px-4 py-3 h-[64px] flex flex-col justify-center ghost-border">
          <span className="text-[10px] font-bold tracking-wider text-primary/60 uppercase">Pinned</span>
          <span className="text-xs font-semibold text-on-surface/80">
            {filteredAndSortedNotes.filter(n => n.pinned).length} Active
          </span>
        </div>
      </section>

      {/* Filter & Sort Toggle */}
      <section className="mb-6">
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`w-full h-[42px] flex items-center justify-center gap-2 rounded-xl border transition-all font-bold uppercase text-[10px] tracking-widest ${
            showAdvanced || onlyPinned || startDate || endDate || selectedTags.length > 0
              ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
              : 'bg-surface-low border-primary/10 text-text-secondary hover:border-primary/30'
          }`}
        >
          <Filter size={16} />
          <span>{showAdvanced ? 'Hide Options' : 'Filter & Sort'}</span>
          {(onlyPinned || startDate || endDate || selectedTags.length > 0) && (
            <div className="w-2 h-2 rounded-full bg-black ml-1 animate-pulse" />
          )}
        </button>
      </section>

      {/* Advanced Filters & Sort Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-surface border border-primary/10 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Advanced Options</h3>
                <button 
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setOnlyPinned(false);
                    setSelectedTags([]);
                    setSortBy('newest');
                  }}
                  className="text-[10px] font-bold text-text-secondary hover:text-on-surface uppercase tracking-widest"
                >
                  Reset All
                </button>
              </div>

              {/* Sort Options Inside Panel */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                  <ArrowUpDown size={12} />
                  <span>Sort Order</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['newest', 'oldest', 'alphabetical', 'pinned'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`h-[28px] px-3 flex items-center font-bold rounded-lg transition-all uppercase text-[9px] tracking-widest ${
                        sortBy === option
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-surface-highest text-text-secondary border border-primary/5'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                  <Calendar size={12} />
                  <span>Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-surface-low border border-primary/10 rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/40"
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-surface-low border border-primary/10 rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/40"
                  />
                </div>
              </div>

              {/* Pinned Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                  <Pin size={12} />
                  <span>Only Pinned</span>
                </div>
                <button 
                  onClick={() => setOnlyPinned(!onlyPinned)}
                  className={`w-10 h-5 rounded-full transition-all relative ${onlyPinned ? 'bg-primary' : 'bg-surface-highest'}`}
                >
                  <motion.div 
                    animate={{ x: onlyPinned ? 22 : 2 }}
                    className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm"
                  />
                </button>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                    <Tag size={12} />
                    <span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-black'
                            : 'bg-surface-highest text-text-secondary border border-primary/5'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <section className="relative space-y-8">
        {/* Timeline Line */}
        {(sortBy === 'newest' || sortBy === 'oldest') && (
          <div className="absolute left-[13px] top-4 bottom-0 w-[2px] bg-primary/10" />
        )}

        {sortBy === 'newest' || sortBy === 'oldest' ? (
          sortedDates.map((date, groupIdx) => (
            <div key={groupIdx} className="space-y-4">
              <div className="flex items-center gap-3 ml-8">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-text-secondary/60 uppercase">{date}</h2>
              </div>

              {groupedNotes[date].map((note) => (
                <div key={note.id} className="relative">
                  {/* Dot */}
                  <div className="absolute left-[13px] top-8 -translate-x-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.5)] z-10" />
                  
                  <div className="ml-8">
                    <NoteCard 
                      note={note} 
                      onClick={() => onEditNote(note)} 
                      onDelete={onDeleteNote} 
                    />
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="grid gap-3">
            {filteredAndSortedNotes.map((note) => (
              <NoteCard 
                key={note.id} 
                note={note} 
                onClick={() => onEditNote(note)} 
                onDelete={onDeleteNote} 
              />
            ))}
          </div>
        )}

        {filteredAndSortedNotes.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-secondary/40 font-bold uppercase tracking-widest text-xs">No entries found</p>
          </div>
        )}
      </section>
    </div>
  );
};
