/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { lazy, Suspense } from 'react';
const ThoughtGraph = lazy(() => import('./features/thought-graph/ThoughtGraph'));
const SearchScreen = lazy(() => import('./Search').then(m => ({ default: m.SearchScreen })));
const HistoryScreen = lazy(() => import('./History').then(m => ({ default: m.HistoryScreen })));
const SettingsScreen = lazy(() => import('./Settings').then(m => ({ default: m.SettingsScreen })));
const EditNoteScreen = lazy(() => import('./EditNote').then(m => ({ default: m.EditNoteScreen })));
const FlashcardsScreen = lazy(() => import('./Flashcards').then(m => ({ default: m.FlashcardsScreen })));
const SignInScreen = lazy(() => import('./Auth').then(m => ({ default: m.SignInScreen })));

import { Screen, Note } from './types';
import { BottomNav, OfflineIndicator, DevModeBadge, Onboarding, isOnboardingComplete } from './components';
import { IntelligenceIndicator } from './components/IntelligenceIndicator';
import { scheduleIntelligencePreload } from './features/intelligence/IntelligenceEngine';
import { authPhase, resolveView, guardRedirect, shouldShowOnboarding } from './routing/appRouting';
import { HomeScreen } from './Home';
import { LandingRecordScreen } from './LandingRecord';
import { RecordingScreen } from './Recording';
import { useAuth } from './hooks/useAuth';
import { useNotes } from './hooks/useNotes';
import { useDarkMode } from './hooks/useDarkMode';
import { updateStreakOnCapture } from './utils/streakHelpers';
import { Toaster } from 'sonner';
import { initializeNotifications } from './features/notifications/notificationService';

const FIRST_NOTE_KEY = 'va_first_note_celebrated';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, isAuthenticated, isLoading, logout, login, signup, updateUser } = useAuth();
  const { notes, addNote, updateNote, deleteNote } = useNotes(user?.id);
  const { isDark, toggle: toggleDarkMode } = useDarkMode();

  // --- ROUTING & AUTH GUARDS (canonical state machine: src/routing/appRouting.ts) ---
  const phase = authPhase(isLoading, isAuthenticated);

  useEffect(() => {
    const quickLaunch = localStorage.getItem('va_setting_quicklaunch') === 'true';
    const redirect = guardRedirect(phase, currentScreen, quickLaunch);
    if (redirect) setCurrentScreen(redirect);
  }, [phase, currentScreen]);

  // Show onboarding to newly authenticated users who haven't seen it yet
  useEffect(() => {
    if (shouldShowOnboarding(phase, isOnboardingComplete())) {
      setShowOnboarding(true);
    }
  }, [phase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isRecordShortcut = (e.code === 'Space') || (isCmdOrCtrl && e.shiftKey && e.code === 'KeyV');

      if (isRecordShortcut && isAuthenticated && !isLoading) {
        e.preventDefault();
        setCurrentScreen('recording');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, isLoading]);

  // Phase 2: Initialize smart notifications
  useEffect(() => {
    if (isAuthenticated) {
      initializeNotifications();
    }
  }, [isAuthenticated]);

  // Idle-preload the local intelligence model — never blocks startup
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      scheduleIntelligencePreload();
    }
  }, [isAuthenticated, isLoading]);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setCurrentScreen('edit');
  };

  // Phase 1+ Streak tracking wrapper + first-note micro-delight
  const handleAddNote = async (note: Note) => {
    const isFirstEver = notes.length === 0 && !localStorage.getItem(FIRST_NOTE_KEY);
    await addNote(note);
    if (user) {
      const { updateStreakOnCapture } = await import('./utils/streakHelpers');
      const updatedUser = updateStreakOnCapture(user);
      updateUser(updatedUser);
    }
    if (isFirstEver) {
      localStorage.setItem(FIRST_NOTE_KEY, 'true');
      const { notifications } = await import('./features/notifications/notificationService');
      notifications.success('✨ First thought captured! Your knowledge journey begins.');
    }
  };

  const renderScreen = () => {
    const view = resolveView(phase, currentScreen);

    // 1. Auth initializing
    if (view.kind === 'loading') {
      return (
        <div className="min-h-screen bg-base flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // 2. Unauthenticated: only the two public views exist
    if (view.kind === 'auth') {
      return <Suspense fallback={null}><SignInScreen setScreen={setCurrentScreen} /></Suspense>;
    }
    if (view.kind === 'landing') {
      return <LandingRecordScreen setScreen={setCurrentScreen} onSaveNote={handleAddNote} isDark={isDark} />;
    }

    // 3. Authenticated: protected routes (view.screen never equals landing/signin)
    switch (view.screen) {
      case 'home': 
        return <HomeScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onAddNote={handleAddNote} user={user} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
      
      case 'recording': 
        return <RecordingScreen setScreen={setCurrentScreen} onSaveNote={handleAddNote} isDark={isDark} />;
      
      case 'search': 
        return <Suspense fallback={null}><SearchScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} /></Suspense>;
      
      case 'history': 
        return <Suspense fallback={null}><HistoryScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} /></Suspense>;
      
      case 'settings': 
        return <Suspense fallback={null}><SettingsScreen setScreen={setCurrentScreen} logout={logout} user={user} toggleDarkMode={toggleDarkMode} isDark={isDark} notes={notes} /></Suspense>;
      
      case 'flashcards':
        return <Suspense fallback={null}><FlashcardsScreen setScreen={setCurrentScreen} notes={notes} onUpdateNote={updateNote} isDark={isDark} /></Suspense>;
      
      case 'thoughtgraph':
        return (
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-base"><p className="text-text-secondary font-bold uppercase tracking-widest text-[10px]">Loading Thought Graph...</p></div>}>
            <ThoughtGraph setScreen={setCurrentScreen} crystals={notes} onSelectCrystal={(c) => setEditingNote(c)} onUpdateNote={updateNote} onDeleteNote={deleteNote} isDark={isDark} />
          </Suspense>
        );
      
      case 'edit': 
        return editingNote 
          ? <Suspense fallback={null}><EditNoteScreen setScreen={setCurrentScreen} note={editingNote} notes={notes} onUpdateNote={updateNote} onDeleteNote={deleteNote} isDark={isDark} onEditNote={handleEditNote} /></Suspense>
          : <HomeScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onAddNote={handleAddNote} user={user} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;

      case 'landing':
      case 'signin':
      default:
        // Auth'd users shouldn't be here; the useEffect will redirect them.
        // Fallback to Home to prevent rendering Landing while redirecting.
        return <HomeScreen setScreen={setCurrentScreen} notes={notes} onEditNote={handleEditNote} onAddNote={handleAddNote} user={user} onDeleteNote={deleteNote} isDark={isDark} onToggleDarkMode={toggleDarkMode} />;
    }
  };

  const showNav = !['landing', 'signin', 'recording', 'edit'].includes(currentScreen) && isAuthenticated;

  return (
    <div className={`min-h-screen w-full bg-base overflow-x-hidden relative ${isDark ? 'dark' : ''}`}>
      {/* First-launch onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding isDark={isDark} onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>

      {/* Offline / sync status banner */}
      <OfflineIndicator />

      {/* Local intelligence model readiness — only on nav-bearing screens
          (its bottom offset is tuned to sit above the BottomNav; on the
          recording screen it would collide with the Stop control) */}
      {isAuthenticated && showNav && <IntelligenceIndicator />}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          // Crossfade only — a transform here would become the containing
          // block for every position:fixed child (TopBar!), making the fixed
          // bars scroll away with the page.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="w-full"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      {showNav && (
        <BottomNav currentScreen={currentScreen} setScreen={setCurrentScreen} />
      )}

      {/* Dev mode indicator — renders nothing in production */}
      <DevModeBadge />

      {/* Phase 2: Smart Notifications Toast Container */}
      <Toaster
        position="top-center"
        // Clear the fixed TopBar (h-20 = 80px) + iOS notch; on bar-less screens
        // (recording/landing) this still sits comfortably below the status row.
        // sonner applies `mobileOffset` instead of `offset` below 600px.
        offset="calc(max(env(safe-area-inset-top, 0px), 8px) + 84px)"
        mobileOffset="calc(max(env(safe-area-inset-top, 0px), 8px) + 84px)"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            border: '1px solid var(--border-color)',
            color: 'var(--on-surface)',
            fontFamily: '"Manrope", sans-serif',
          },
        }}
        richColors
        closeButton
      />
    </div>
  );
}
