import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Note, Crystal } from '../types';
import { desanitize } from '../utils/sanitization';
import { crystalService, LocalStorageCrystalService } from '../features/crystals/services/crystalService';
import { FirestoreCrystalService } from '../features/crystals/services/firestoreCrystalService';
import { isFirebaseConfigured } from '../config/firebase';

// React renders text nodes safely without any HTML-entity encoding — applying
// sanitize() on write corrupts notes that contain &, <, >, ', ".
// We apply desanitize() on READ to repair data written by earlier versions.
const repairNote = (note: Note): Note => ({
  ...note,
  title:   desanitize(note.title   ?? ''),
  content: desanitize(note.content ?? ''),
  body:    desanitize(note.body    ?? ''),
  tags:    note.tags?.map(desanitize) ?? [],
});

export interface UseNotesReturn {
  notes: Note[];
  pinnedNotes: Note[];
  recentNotes: Note[];
  forgottenGems: Note[];
  weeklyStats: { count: number; topMood: string; connections: number };
  isLoading: boolean;
  addNote: (note: Note) => Promise<void>;
  updateNote: (updatedNote: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

export function useNotes(userId: string | undefined): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether we're currently subscribed to avoid double-subscribe
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ─── Note loading / realtime subscription ──────────────────

  const loadNotes = useCallback(async () => {
    if (!userId) { setNotes([]); setIsLoading(false); return; }
    try {
      setIsLoading(true);
      const crystals = await crystalService.getAll(userId);
      setNotes(crystals.map(c => repairNote(c as Note)));
    } catch (err) {
      console.error('[useNotes] Failed to load notes:', err);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Tear down any existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!userId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    if (isFirebaseConfigured && crystalService instanceof FirestoreCrystalService) {
      // ── Realtime path: Firestore onSnapshot ─────────────────
      setIsLoading(true);
      const unsub = (crystalService as FirestoreCrystalService).subscribe(
        userId,
        (crystals) => {
          setNotes(crystals.map(c => repairNote(c as Note)));
          setIsLoading(false);
        },
        (err) => {
          console.error('[useNotes] Firestore subscription error:', err);
          // Fall back to a one-time read
          loadNotes();
        }
      );
      unsubscribeRef.current = unsub;
      return () => {
        unsub();
        unsubscribeRef.current = null;
      };
    } else {
      // ── Offline/fallback path: localStorage ─────────────────
      loadNotes();
    }
  }, [userId, loadNotes]);

  // ─── Write operations ─────────────────────────────────────

  const addNote = async (note: Note) => {
    if (!userId) return;
    await crystalService.create(userId, note as Crystal);
    // When Firestore is active the onSnapshot listener picks up the change automatically.
    // When using localStorage we need to refresh manually.
    if (!(crystalService instanceof FirestoreCrystalService)) {
      await loadNotes();
    }
  };

  const updateNote = async (updatedNote: Note) => {
    if (!userId) return;
    await crystalService.update(userId, updatedNote.id, updatedNote as Crystal);
    if (!(crystalService instanceof FirestoreCrystalService)) {
      await loadNotes();
    }
  };

  const deleteNote = async (id: string) => {
    if (!userId) return;
    await crystalService.delete(userId, id);
    // Incremental intelligence cleanup: drop the local vector + topic cache.
    // Stale graph edges pointing at this id are filtered on read by the graph.
    import('../features/intelligence/semantic/embeddings')
      .then((m) => m.removeEmbedding(id))
      .catch(() => { /* cleanup is best-effort */ });
    try { localStorage.removeItem(`va_topics_${id}`); } catch { /* ignore */ }
    if (!(crystalService instanceof FirestoreCrystalService)) {
      await loadNotes();
    }
  };

  // ─── Derived state ────────────────────────────────────────

  const pinnedNotes = useMemo(() => notes.filter((n) => n.pinned), [notes]);
  const recentNotes = useMemo(
    () => notes.filter((n) => !n.pinned).slice(0, 10),
    [notes]
  );

  const forgottenGems = useMemo(() => {
    const now = Date.now();
    return notes
      .filter((n) => {
        const lastSeen = (n as Crystal).lastSeen || n.createdAt || 0;
        return lastSeen < now - 7 * 24 * 60 * 60 * 1000;
      })
      .map((n) => {
        let score = 0;
        const c = n as Crystal;
        const ageInDays = (now - (c.createdAt || 0)) / 86400000;
        if (ageInDays > 30) score += 2;
        if (c.pinned) score += 3;
        if ((c.connections || 0) > 2) score += 2;
        const recentTypes = new Set(notes.slice(0, 5).map((rn) => rn.type));
        if (recentTypes.has(c.type)) score += 1;
        return { note: n, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.note);
  }, [notes]);

  const weeklyStats = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = notes.filter((n) => n.createdAt > oneWeekAgo);
    const moodCounts: Record<string, number> = {};
    thisWeek.forEach((n) => {
      const mood = (n as Crystal).mood || 'Neutral';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    const topMood =
      Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
    const connections = thisWeek.reduce(
      (sum, n) => sum + ((n as Crystal).connections || 0),
      0
    );
    return { count: thisWeek.length, topMood, connections };
  }, [notes]);

  return {
    notes,
    pinnedNotes,
    recentNotes,
    forgottenGems,
    weeklyStats,
    isLoading,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes: loadNotes,
  };
}
