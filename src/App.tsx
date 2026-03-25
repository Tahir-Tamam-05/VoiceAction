/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note } from './types';
import { BottomNav } from './components';
import { HomeScreen } from './Home';
import { SearchScreen } from './Search';
import { HistoryScreen } from './History';
import { SettingsScreen } from './Settings';
import { RecordingScreen } from './Recording';
import { EditNoteScreen } from './EditNote';
import { LandingScreen, SignInScreen } from './Auth';
import { useAuth } from './hooks/useAuth';
import { useNotes } from './hooks/useNotes';
import { useDarkMode } from './hooks/useDarkMode';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { user, isAuthenticated, isLoading, logout, login, signup } = useAuth();
  const { notes, addNote, updateNote, deleteNote } = useNotes(user?.id);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  useEffect(() => {
    if (!isLoading && isAuthenticated && (currentScreen === 'landing' || currentScreen === 'signin')) {
      setCurrentScreen('home');
    } else if (!isLoading && !isAuthenticated && !['landing', 'signin'].includes(currentScreen)) {
      setCurrentScreen('landing');
    }
  }, [isLoading, isAuthenticated, currentScreen]);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setCurrentScreen('edit');
  };

  const renderScreen = () => {
    if (isLoading) return <div className="min-h-screen bg-base flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    switch (currentScreen) {
      case 'landing': return <LandingScreen setScreen={setCurrentScreen} />;
      case 'signin': return <SignInScreen setScreen={setCurrentScreen} />;
      case 'home': return <HomeScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} user={user} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
      case 'search': return <SearchScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
      case 'history': return <HistoryScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
      case 'settings': return <SettingsScreen setScreen={setCurrentScreen} logout={logout} user={user} toggleDarkMode={toggleDarkMode} isDark={isDark} notes={notes} />;
      case 'recording': return <RecordingScreen setScreen={setCurrentScreen} onSaveNote={addNote} isDark={isDark} />;
      case 'edit': return editingNote ? <EditNoteScreen setScreen={setCurrentScreen} note={editingNote} onUpdateNote={updateNote} onDeleteNote={deleteNote} isDark={isDark} /> : <HomeScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} user={user} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
      default: return <HomeScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} user={user} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
    }
  };

  const showNav = !['landing', 'signin', 'recording', 'edit'].includes(currentScreen) && isAuthenticated;

  return (
    <div className={`min-h-screen w-full bg-base overflow-x-hidden relative ${isDark ? 'dark' : ''}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="w-full"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {showNav && (
        <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />
      )}
    </div>
  );
}
