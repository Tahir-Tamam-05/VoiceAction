import { useState, useEffect } from 'react';
import { Note, MOCK_NOTES } from '../types';
import { sanitize } from '../utils/sanitization';

const sanitizeNote = (note: Note): Note => ({
  ...note,
  title: sanitize(note.title),
  content: sanitize(note.content),
  body: note.body ? sanitize(note.body) : '',
  tags: note.tags?.map(sanitize) || [],
});

export function useNotes(userId: string | undefined) {
  const STORAGE_KEY = userId ? `voiceaction_notes_${userId}` : null;
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!STORAGE_KEY) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved notes:", e);
        setNotes([]);
      }
    } else {
      const sanitizedMock = MOCK_NOTES.map(sanitizeNote);
      setNotes(sanitizedMock);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedMock));
    }
  }, [STORAGE_KEY]);

  const addNote = (note: Note) => {
    const sanitized = sanitizeNote(note);
    const newNotes = [sanitized, ...notes];
    setNotes(newNotes);
    if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  };

  const updateNote = (updatedNote: Note) => {
    const sanitized = sanitizeNote(updatedNote);
    const newNotes = notes.map(n => n.id === sanitized.id ? sanitized : n);
    setNotes(newNotes);
    if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  };

  const deleteNote = (id: string) => {
    const newNotes = notes.filter(n => n.id !== id);
    setNotes(newNotes);
    if (STORAGE_KEY) localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  };

  return { notes, addNote, updateNote, deleteNote };
}
