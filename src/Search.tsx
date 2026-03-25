import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { TopBar, NoteCard } from './components';
import { Screen, Note } from './types';
import { Search as SearchIcon, TrendingUp, Clock, X, Filter, ArrowUpDown, Calendar, Pin, Tag } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

interface SearchScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  onEditNote: (n: Note) => void;
  onDeleteNote: (id: string) => void;
  isDark: boolean;
  onToggleDarkMode: () => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ setScreen, notes, onEditNote, onDeleteNote, isDark, onToggleDarkMode }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical' | 'pinned'>('newest');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filters = ['All', 'voice', 'text', 'task', 'idea'];

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note?.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [notes]);

  const filteredAndSortedNotes = useMemo(() => {
    const filtered = notes.filter(note => {
      const matchesQuery = (note?.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (note?.content?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (note?.body?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesType = activeFilter === 'All' || note?.type === activeFilter;
      
      const matchesPinned = !onlyPinned || note?.pinned;
      
      const noteDate = new Date(note?.createdAt || 0);
      const matchesStart = !startDate || noteDate >= new Date(startDate);
      const matchesEnd = !endDate || noteDate <= new Date(endDate);
      
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => note?.tags?.includes(tag));

      return matchesQuery && matchesType && matchesPinned && matchesStart && matchesEnd && matchesTags;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b?.createdAt || 0) - (a?.createdAt || 0);
      if (sortBy === 'oldest') return (a?.createdAt || 0) - (b?.createdAt || 0);
      if (sortBy === 'alphabetical') return (a?.title || '').localeCompare(b?.title || '');
      if (sortBy === 'pinned') return (b?.pinned ? 1 : 0) - (a?.pinned ? 1 : 0);
      return 0;
    });
  }, [notes, searchQuery, activeFilter, sortBy, onlyPinned, startDate, endDate, selectedTags]);


  return (
    <div className="min-h-screen w-full pt-24 pb-32 px-4 sm:px-6 max-w-2xl mx-auto">
      <TopBar 
        title="Search" 
        onSetScreen={setScreen} 
        isDark={isDark} 
        onToggleDarkMode={onToggleDarkMode} 
      />

      {/* Search Input */}
      <section className="relative mb-6 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-secondary/60">
            <SearchIcon size={18} />
          </div>
          <input 
            className="w-full h-[42px] pl-10 pr-10 bg-surface-low border border-primary/10 rounded-xl text-on-surface placeholder:text-text-secondary/40 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all duration-300 outline-none" 
            placeholder="Search entries, tags..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-text-secondary/60 hover:text-on-surface"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`w-[42px] h-[42px] flex items-center justify-center rounded-xl border transition-all ${
            showAdvanced || onlyPinned || startDate || endDate || selectedTags.length > 0
              ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
              : 'bg-surface-low border-primary/10 text-text-secondary hover:border-primary/30'
          }`}
        >
          <Filter size={18} />
        </button>
      </section>

      {/* Advanced Filters & Sort Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
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
                    setActiveFilter('All');
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

      {/* Filter Chips */}
      <section className="mb-6">
        <div className="flex overflow-x-auto gap-2 no-scrollbar -mx-4 px-4">
          {filters.map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-shrink-0 h-[34px] px-5 flex items-center font-bold rounded-full transition-all uppercase text-[10px] tracking-widest ${
                activeFilter === filter 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'bg-transparent text-on-surface-variant border border-primary/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline font-extrabold text-2xl tracking-tighter text-on-surface">
            {searchQuery ? 'RESULTS' : 'RECENT'}
          </h2>
          <span className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
            {filteredAndSortedNotes.length} Found
          </span>
        </div>

        <div className="grid gap-2">
          {filteredAndSortedNotes.map((note) => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onClick={() => onEditNote(note)} 
              onDelete={onDeleteNote} 
            />
          ))}

          {filteredAndSortedNotes.length === 0 && (
            <div className="text-center py-20">
              <p className="text-text-secondary/40 font-bold uppercase tracking-widest text-xs">No matching entries</p>
            </div>
          )}

          {/* Bento Insights (Only show when not searching) */}
          {!searchQuery && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-4 bg-surface-low rounded-xl ghost-border space-y-1">
                <TrendingUp size={16} className="text-primary" />
                <h4 className="text-text-secondary/40 font-bold uppercase text-[9px] tracking-widest">Top Type</h4>
                <p className="text-on-surface text-base font-bold leading-tight uppercase">
                  {notes.length > 0 ? notes[0]?.type : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-surface-low rounded-xl ghost-border space-y-1">
                <Clock size={16} className="text-primary" />
                <h4 className="text-text-secondary/40 font-bold uppercase text-[9px] tracking-widest">Total Notes</h4>
                <p className="text-on-surface text-base font-bold leading-tight">{notes.length}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
