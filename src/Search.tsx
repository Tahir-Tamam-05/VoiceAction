import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TopBar, NoteCard } from './components';
import { Screen, Note } from './types';
import {
  Search as SearchIcon, TrendingUp, Clock, X, Filter,
  ArrowUpDown, Calendar, Pin, Tag, Sparkles,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { semanticRank, keywordRank, matchTypeBadge, RankedResult } from './features/intelligence/semantic/semanticSearch';
import { backgroundEnrichEmbeddings } from './features/intelligence/semantic/embeddings';

interface SearchScreenProps {
  setScreen: (s: Screen) => void;
  notes: Note[];
  onEditNote: (n: Note) => void;
  onDeleteNote: (id: string) => void;
  isDark: boolean;
  onToggleDarkMode: () => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  setScreen,
  notes,
  onEditNote,
  onDeleteNote,
  isDark,
  onToggleDarkMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical' | 'pinned'>('newest');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Two-tier search state
  const [rankedResults, setRankedResults] = useState<RankedResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  // ─── Background embedding enrichment ──────────────────────────
  // Kick off embedding generation for all notes when the search screen mounts.
  // Fire-and-forget — makes future searches faster.
  useEffect(() => {
    if (notes.length > 0) {
      backgroundEnrichEmbeddings(notes);
    }
  }, [notes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Two-tier search ──────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setRankedResults([]);
      setIsSearching(false);
      return;
    }

    // Abort any running search
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    // Step 1 — keyword results (instant, ≤10ms)
    const kwResults = keywordRank(searchQuery, applyFilters(notes));
    setRankedResults(kwResults);

    // Step 2 — embedding + semantic results (async, ~1–3s)
    setIsSearching(true);
    const debounce = setTimeout(async () => {
      if (controller.signal.aborted) return;
      try {
        const filtered = applyFilters(notes);
        const semantic = await semanticRank(searchQuery, filtered, { maxResults: 50 });
        if (!controller.signal.aborted) {
          setRankedResults(semantic.length > 0 ? semantic : kwResults);
        }
      } catch {
        // keep keyword results on error
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 450); // slightly longer debounce to let keyword results settle first

    return () => {
      clearTimeout(debounce);
      controller.abort();
      setIsSearching(false);
    };
  }, [searchQuery, notes, activeFilter, onlyPinned, startDate, endDate, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Filters ──────────────────────────────────────────────────

  function applyFilters(noteList: Note[]): Note[] {
    return noteList.filter((note) => {
      const matchesType = activeFilter === 'All' || note?.type === activeFilter;
      const matchesPinned = !onlyPinned || note?.pinned;
      const noteDate = new Date(note?.createdAt || 0);
      const matchesStart = !startDate || noteDate >= new Date(startDate);
      const matchesEnd = !endDate || noteDate <= new Date(endDate);
      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => note?.tags?.includes(tag));
      return matchesType && matchesPinned && matchesStart && matchesEnd && matchesTags;
    });
  }

  // ─── Sorted browse (no query) ─────────────────────────────────
  const browsedNotes = useMemo(() => {
    const filtered = applyFilters(notes);
    return filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b?.createdAt || 0) - (a?.createdAt || 0);
      if (sortBy === 'oldest') return (a?.createdAt || 0) - (b?.createdAt || 0);
      if (sortBy === 'alphabetical') return (a?.title || '').localeCompare(b?.title || '');
      if (sortBy === 'pinned') return (b?.pinned ? 1 : 0) - (a?.pinned ? 1 : 0);
      return 0;
    });
  }, [notes, activeFilter, sortBy, onlyPinned, startDate, endDate, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Display list ─────────────────────────────────────────────
  const displayedResults = searchQuery.trim() ? rankedResults : [];
  const displayedNotes = displayedResults.map((r) => r.note);
  const matchTypeMap = new Map(displayedResults.map((r) => [r.note.id, r]));
  const hasAIResults = displayedResults.some(
    (r) => r.matchType === 'embedding' || r.matchType === 'hybrid'
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((n) => n?.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  const filters = ['All', 'voice', 'text', 'task', 'idea'];

  return (
    <div className="min-h-screen w-full pt-24 pb-safe-nav px-4 sm:px-6 max-w-2xl mx-auto">
      <TopBar title="Search" onSetScreen={setScreen} isDark={isDark} onToggleDarkMode={onToggleDarkMode} />

      {/* Search Input */}
      <section className="relative mb-6 flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-secondary/60">
            {isSearching
              ? <Sparkles size={18} className="animate-pulse text-primary" />
              : <SearchIcon size={18} />
            }
          </div>
          <input
            className="w-full h-[42px] pl-10 pr-10 bg-surface-low border border-primary/10 rounded-xl text-on-surface placeholder:text-text-secondary/40 focus:ring-1 focus:ring-primary/40 focus:bg-surface-bright transition-all duration-300 outline-none"
            placeholder="Search by meaning, not just keywords..."
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

      {/* Advanced Filters */}
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
                  onClick={() => { setStartDate(''); setEndDate(''); setOnlyPinned(false); setSelectedTags([]); setActiveFilter('All'); setSortBy('newest'); }}
                  className="text-[10px] font-bold text-text-secondary hover:text-on-surface uppercase tracking-widest"
                >Reset All</button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                  <ArrowUpDown size={12} /><span>Sort Order</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['newest', 'oldest', 'alphabetical', 'pinned'] as const).map((opt) => (
                    <button key={opt} onClick={() => setSortBy(opt)}
                      className={`h-[28px] px-3 flex items-center font-bold rounded-lg transition-all uppercase text-[9px] tracking-widest ${sortBy === opt ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface-highest text-text-secondary border border-primary/5'}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                  <Calendar size={12} /><span>Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-surface-low border border-primary/10 rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/40" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-surface-low border border-primary/10 rounded-lg px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/40" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                  <Pin size={12} /><span>Only Pinned</span>
                </div>
                <button onClick={() => setOnlyPinned(!onlyPinned)}
                  className={`w-10 h-5 rounded-full transition-all relative ${onlyPinned ? 'bg-primary' : 'bg-surface-highest'}`}
                >
                  <motion.div animate={{ x: onlyPinned ? 22 : 2 }} className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {allTags.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">
                    <Tag size={12} /><span>Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button key={tag}
                        onClick={() => setSelectedTags(selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag])}
                        className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${selectedTags.includes(tag) ? 'bg-primary text-black' : 'bg-surface-highest text-text-secondary border border-primary/5'}`}
                      >{tag}</button>
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
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`flex-shrink-0 h-[34px] px-5 flex items-center font-bold rounded-full transition-all uppercase text-[10px] tracking-widest ${activeFilter === f ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-transparent text-on-surface-variant border border-primary/10'}`}
            >{f}</button>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-headline font-extrabold text-2xl tracking-tighter text-on-surface">
            {searchQuery ? 'RESULTS' : 'RECENT'}
          </h2>
          <div className="flex items-center gap-2">
            {hasAIResults && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/10 rounded-full px-2 py-0.5">
                <Sparkles size={9} /> AI Ranked
              </span>
            )}
            <span className="text-[10px] font-bold tracking-widest text-text-secondary uppercase">
              {searchQuery ? displayedNotes.length : browsedNotes.length} Found
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {searchQuery ? (
            displayedNotes.length > 0 ? (
              displayedNotes.map((note) => {
                const result = matchTypeMap.get(note.id);
                const badge = result ? matchTypeBadge(result.matchType) : '';
                return (
                  <div key={note.id} className="relative">
                    <NoteCard note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
                    {badge && (
                      <span className="absolute top-3 right-10 text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5 py-0.5 pointer-events-none">
                        {badge}
                      </span>
                    )}
                  </div>
                );
              })
            ) : isSearching ? (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <Sparkles size={24} className="text-primary animate-pulse" />
                <p className="text-text-secondary/40 font-bold uppercase tracking-widest text-xs">Searching semantically…</p>
              </div>
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-low border border-primary/10 flex items-center justify-center">
                  <SearchIcon size={20} className="text-text-secondary/40" />
                </div>
                <p className="font-bold text-on-surface text-sm">No results for "{searchQuery}"</p>
                <p className="text-text-secondary text-xs max-w-xs text-center">
                  Try different words, or search by topic, mood, or tag — AI understands meaning, not just keywords.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 rounded-lg px-4 py-2 hover:bg-primary/5 active:scale-95 transition-all"
                >
                  Clear search
                </button>
              </div>
            )
          ) : notes.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-low border border-primary/10 flex items-center justify-center">
                <SearchIcon size={20} className="text-text-secondary/30" />
              </div>
              <p className="font-bold text-on-surface text-sm">Nothing to search yet</p>
              <p className="text-text-secondary text-xs max-w-xs text-center">
                Record your first thought and it'll appear here. Search by meaning, topic, or keyword.
              </p>
              <button
                onClick={() => setScreen('recording')}
                className="text-[10px] font-black uppercase tracking-widest text-black bg-primary rounded-xl px-5 py-2.5 shadow-[0_0_16px_rgba(249,115,22,0.3)] active:scale-95 transition-all"
              >
                Record a thought
              </button>
            </div>
          ) : (
            browsedNotes.map((note) => (
              <NoteCard key={note.id} note={note} onClick={() => onEditNote(note)} onDelete={onDeleteNote} />
            ))
          )}

          {/* Bento Insights – shown when not searching */}
          {!searchQuery && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-4 bg-surface-low rounded-xl ghost-border space-y-1">
                <TrendingUp size={16} className="text-primary" />
                <h4 className="text-text-secondary/40 font-bold uppercase text-[9px] tracking-widest">Top Type</h4>
                <p className="text-on-surface text-base font-bold leading-tight uppercase">{notes.length > 0 ? notes[0]?.type : 'N/A'}</p>
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
