// LandingRecord — VoiceAction's first-open experience + instant capture.
//
//   idle       → the product story: scattered memories → captured →
//                connected → retrieved (LandingHero), copy, CTAs
//   recording  → the same VoiceField capture experience as the Recording
//                screen — one visual language for capture everywhere
//   processing → field collapses while the local engine structures the note
//
// Contract preserved: setScreen/onSaveNote/isDark props, auth-gated CTA
// (unauthenticated → signin, authenticated → record instantly), the exact
// note shape, silence auto-stop, and full mic/recognition teardown.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note } from './types';
import { processNoteWithTimeout } from './features/intelligence/IntelligenceEngine';
import { useAuth } from './hooks/useAuth';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useMicAnalyser } from './hooks/useMicAnalyser';
import { VoiceField, usePrefersReducedMotion } from './components/VoiceField';
import { LandingHero } from './components/LandingHero';
import { MemoryBackdrop } from './components/MemoryBackdrop';
import {
  X, AlertTriangle, Square, Sparkles,
  Mic, Link2, Film, ListChecks, CalendarDays, Lightbulb, ShieldCheck,
} from 'lucide-react';

type Phase = 'idle' | 'recording' | 'processing';

interface LandingRecordProps {
  setScreen: (s: Screen) => void;
  onSaveNote: (n: Note) => void;
  isDark: boolean;
}

const CAPTURE_TYPES = [
  { icon: Mic,          label: 'Voice'  },
  { icon: Link2,        label: 'Links'  },
  { icon: Film,         label: 'Reels'  },
  { icon: ListChecks,   label: 'Tasks'  },
  { icon: CalendarDays, label: 'Events' },
  { icon: Lightbulb,    label: 'Ideas'  },
];

const STEPS = [
  { n: '01', title: 'Capture in one tap', body: 'Speak it or paste it — a thought, a reel, a task, a link. No folders, no filing.' },
  { n: '02', title: 'It understands', body: 'On-device AI titles it, types it, and connects it to everything related you already saved.' },
  { n: '03', title: 'Ask for it later', body: 'Search the way you think — “that reel about warm-ups” — and it’s just there.' },
];

export const LandingRecordScreen: React.FC<LandingRecordProps> = ({ setScreen, onSaveNote, isDark }) => {
  const { isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopOnceRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  const {
    transcript, liveText, isListening,
    isSupported: isSpeechSupported, error: speechError,
    startListening, stopListening, resetTranscript,
  } = useSpeechRecognition();

  const analyser = useMicAnalyser();

  // ── Teardown on unmount: never leave the mic open ──
  useEffect(() => {
    return () => {
      stopListening();
      analyser.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer ──
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Start capture ──
  const handleStartRecording = useCallback(() => {
    if (!isSpeechSupported) {
      setScreen('recording'); // dedicated screen owns the unsupported-browser UI
      return;
    }
    stopOnceRef.current = false;
    resetTranscript();
    setTimer(0);
    setPhase('recording');
    startListening();
    analyser.start();
  }, [isSpeechSupported, setScreen, resetTranscript, startListening, analyser]);

  // ── Primary CTA: sign in first, or capture instantly when authenticated ──
  const handleActivate = useCallback(() => {
    if (phase !== 'idle') return;
    if (!isAuthenticated) {
      setScreen('signin');
      return;
    }
    handleStartRecording();
  }, [phase, isAuthenticated, handleStartRecording, setScreen]);

  // ── Stop: guarded to run exactly once ──
  const handleStop = useCallback(async () => {
    if (stopOnceRef.current || phase !== 'recording') return;
    stopOnceRef.current = true;

    stopListening();
    analyser.stop();
    setPhase('processing');

    const finalText = transcript.trim();
    if (!finalText) {
      stopOnceRef.current = false;
      setPhase('idle');
      return;
    }

    try {
      const aiResult = await processNoteWithTimeout(finalText);
      const aiData = aiResult.success ? aiResult.data : null;
      const now = Date.now();
      onSaveNote({
        id: crypto.randomUUID(),
        title: aiData?.title || `Voice Note ${new Date().toLocaleDateString()}`,
        content: aiData?.summary || finalText.slice(0, 120),
        body: finalText,
        type: aiData?.type || 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false, createdAt: now, updatedAt: now,
        mood: aiData?.mood || 'Neutral',
        tags: aiResult.tags || [], attachments: [],
      });
    } catch {
      const now = Date.now();
      onSaveNote({
        id: crypto.randomUUID(), title: `Voice Note ${new Date().toLocaleDateString()}`,
        content: finalText.slice(0, 120), body: finalText, type: 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false, createdAt: now, updatedAt: now, mood: 'Neutral', tags: [], attachments: [],
      });
    } finally {
      setScreen('home');
    }
  }, [phase, transcript, stopListening, analyser, onSaveNote, setScreen]);

  // ── Silence auto-stop ──
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript.trim() && phase === 'recording' && !stopOnceRef.current) {
      handleStop();
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript, phase, handleStop]);

  // ── Cancel: back to the landing story, everything torn down ──
  const handleCancelRecording = useCallback(() => {
    stopOnceRef.current = true;
    stopListening();
    analyser.stop();
    stopOnceRef.current = false;
    setPhase('idle');
  }, [stopListening, analyser]);

  const isIdle = phase === 'idle';
  const isCapturing = phase === 'recording' || phase === 'processing';

  const bg = isDark ? '#050403' : '#faf9f7';
  const textPrimary = isDark ? 'rgba(253,244,227,0.96)' : 'rgba(18,12,6,0.95)';
  const textSecondary = isDark ? 'rgba(253,244,227,0.45)' : 'rgba(0,0,0,0.5)';
  const textFaint = isDark ? 'rgba(253,244,227,0.28)' : 'rgba(0,0,0,0.35)';

  const fieldSize = Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.78 : 300);

  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden"
      style={{ background: bg, transition: 'background 0.5s ease' }}
    >
      {/* Grain */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='${isDark ? '0.04' : '0.025'}'/%3E%3C/svg%3E")`,
          opacity: 0.7,
        }}
      />
      {/* Page-wide connected-memory field (idle only) */}
      {isIdle && <MemoryBackdrop isDark={isDark} reducedMotion={reducedMotion} />}

      {/* Ambient bloom */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: '30%', left: '65%', transform: 'translate(-50%, -50%)',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,1) 0%, transparent 70%)',
          filter: 'blur(110px)',
          opacity: isCapturing ? (isDark ? 0.12 : 0.08) : (isDark ? 0.07 : 0.05),
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* ════════ IDLE — the product story ════════ */}
      <AnimatePresence>
        {isIdle && (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-6xl mx-auto px-6"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 40px, 56px)', paddingBottom: 48 }}
          >
            {/* Hero: copy + living demo */}
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-8 lg:min-h-[78svh]">
              {/* Copy */}
              <div className="flex-1 max-w-xl text-center lg:text-left order-2 lg:order-1">
                <motion.p
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0, 0, 1] }}
                  className="text-[10px] font-black uppercase tracking-[0.34em] text-primary mb-5"
                >
                  VoiceAction · Your second memory
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="font-headline font-extrabold leading-[1.04] tracking-tighter"
                  style={{ fontSize: 'clamp(34px, 6.5vw, 64px)', color: textPrimary }}
                >
                  Remember everything{' '}
                  <span
                    style={{
                      background: isDark
                        ? 'linear-gradient(95deg, #fdf4e3 0%, #ffb266 45%, #f97316 100%)'
                        : 'linear-gradient(95deg, #2a1508 0%, #b4470b 55%, #f97316 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    you almost forgot.
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.32, ease: [0.2, 0, 0, 1] }}
                  className="mt-5 text-[15px] leading-relaxed max-w-md mx-auto lg:mx-0"
                  style={{ color: textSecondary }}
                >
                  Reels, links, tasks, ideas, plans — capture them once. VoiceAction understands
                  each one, connects it to what you already saved, and finds it the moment you ask.
                </motion.p>

                {/* What can go in */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.45 }}
                  className="mt-7 flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2.5"
                >
                  {CAPTURE_TYPES.map(({ icon: Icon, label }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <Icon size={13} className="text-primary/80" aria-hidden />
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: textFaint }}>
                        {label}
                      </span>
                    </span>
                  ))}
                </motion.div>

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.55, ease: [0.2, 0, 0, 1] }}
                  className="mt-9 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                >
                  <button
                    onClick={handleActivate}
                    className="rounded-full px-10 h-[52px] text-[11px] font-black uppercase tracking-[0.22em] text-black transition-transform hover:scale-[1.03] active:scale-[0.97]"
                    style={{
                      background: 'linear-gradient(180deg, #ff8c3a 0%, #f97316 55%, #ea6408 100%)',
                      boxShadow: isDark
                        ? 'inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1px rgba(249,115,22,0.25), 0 0 0 5px rgba(249,115,22,0.08), 0 0 40px rgba(249,115,22,0.32)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.45), 0 0 0 1px rgba(249,115,22,0.25), 0 0 0 5px rgba(249,115,22,0.08), 0 8px 28px rgba(249,115,22,0.28)',
                    }}
                  >
                    {isAuthenticated ? 'Capture a thought' : 'Start remembering'}
                  </button>
                  {!isAuthenticated && (
                    <button
                      onClick={() => setScreen('signin')}
                      className="h-[44px] px-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:text-primary"
                      style={{ color: textFaint }}
                    >
                      I already have an account →
                    </button>
                  )}
                </motion.div>

                {/* Trust line */}
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.75 }}
                  className="mt-6 flex items-center justify-center lg:justify-start gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: textFaint }}
                >
                  <ShieldCheck size={12} className="text-primary/70" aria-hidden />
                  AI runs privately on your device · syncs everywhere
                </motion.p>
              </div>

              {/* Living product demo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.35, ease: [0.2, 0, 0, 1] }}
                className="flex-1 w-full px-2 pt-12 pb-14 lg:pb-6 order-1 lg:order-2"
              >
                <LandingHero isDark={isDark} reducedMotion={reducedMotion} />
              </motion.div>
            </div>

            {/* Three steps — nodes on a connection line, not cards */}
            <div className="relative mt-10 max-w-4xl mx-auto">
              {/* connector: horizontal on sm+, vertical rail on mobile */}
              <div
                aria-hidden
                className="absolute hidden sm:block left-[12%] right-[12%] top-[14px] h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.4) 18%, rgba(249,115,22,0.4) 82%, transparent)' }}
              />
              <div
                aria-hidden
                className="absolute sm:hidden left-[13px] top-6 bottom-6 w-px"
                style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.4), rgba(249,115,22,0.08))' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-7 sm:gap-4">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={step.n}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.55, delay: i * 0.14, ease: [0.2, 0, 0, 1] }}
                    className="relative flex sm:flex-col items-start gap-4 sm:gap-0 sm:text-center"
                  >
                    <div
                      className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 sm:mx-auto"
                      style={{
                        background: isDark ? '#120b05' : '#fff7ef',
                        border: '1.5px solid rgba(249,115,22,0.55)',
                        boxShadow: '0 0 14px rgba(249,115,22,0.25)',
                      }}
                    >
                      <span className="text-[9px] font-black text-primary">{step.n}</span>
                    </div>
                    <div className="sm:mt-4">
                      <h3 className="font-headline font-extrabold text-[15px] tracking-tight" style={{ color: textPrimary }}>
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed max-w-[260px] sm:mx-auto" style={{ color: textSecondary }}>
                        {step.body}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <p
              className="text-center mt-12 text-[9px] font-bold uppercase tracking-[0.22em]"
              style={{ color: textFaint }}
            >
              Privacy first · No data sold · Free to start
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ CAPTURE — same language as the Recording screen ════════ */}
      <AnimatePresence>
        {isCapturing && (
          <motion.div
            key="capture"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-20 flex flex-col items-center"
            style={{ background: bg }}
          >
            {/* Status row */}
            <div
              className="w-full max-w-md flex items-center justify-between px-6"
              style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 28px)' }}
            >
              <div className="flex items-center gap-2.5 min-h-[44px]">
                {phase === 'recording' && (
                  <motion.span
                    animate={reducedMotion ? {} : { opacity: [1, 0.25, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                )}
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-primary" role="status">
                  {phase === 'processing' ? 'Crystallizing your thought' : 'Listening'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-headline font-extrabold tabular-nums" style={{ color: textPrimary }}>
                  {formatTime(timer)}
                </span>
                <button
                  onClick={handleCancelRecording}
                  disabled={phase === 'processing'}
                  aria-label="Cancel recording"
                  className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center transition-colors disabled:opacity-25"
                  style={{ color: textFaint }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Field + transcript */}
            <div className="flex-1 flex flex-col items-center justify-center w-full px-6 min-h-0">
              <VoiceField
                phase={phase === 'processing' ? 'processing' : speechError ? 'error' : 'listening'}
                readFrequencies={analyser.status === 'active' ? analyser.readFrequencies : undefined}
                readLevel={analyser.status === 'active' ? analyser.readLevel : undefined}
                isDark={isDark}
                size={fieldSize}
                reducedMotion={reducedMotion}
              />

              {speechError && (
                <div className="mt-4 max-w-sm flex items-center gap-3 rounded-2xl p-4"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-left" style={{ color: textPrimary }}>{speechError}</p>
                </div>
              )}

              <div
                className="w-full max-w-md mt-6 rounded-2xl border px-5 py-4 max-h-32 overflow-y-auto"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                  borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                }}
                aria-live="polite"
              >
                <p className="text-[15px] font-medium leading-relaxed"
                  style={{ color: liveText ? (isDark ? 'rgba(253,244,227,0.8)' : 'rgba(0,0,0,0.7)') : textFaint, fontStyle: liveText ? 'normal' : 'italic' }}>
                  {liveText || 'Say what you want to remember…'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div
              className="w-full flex items-center justify-center"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 28px, 44px)' }}
            >
              {phase === 'processing' ? (
                <div className="flex items-center gap-2.5 text-primary py-6">
                  <Sparkles size={16} />
                  <span className="text-[11px] font-black uppercase tracking-[0.25em]">Saving…</span>
                </div>
              ) : (
                <button
                  onClick={handleStop}
                  aria-label="Stop recording and save"
                  className="flex items-center gap-3 pl-5 pr-7 h-[64px] rounded-full transition-all active:scale-95"
                  style={{
                    background: '#f97316', color: '#000',
                    boxShadow: '0 0 0 1px rgba(249,115,22,0.3), 0 0 44px rgba(249,115,22,0.4)',
                  }}
                >
                  <span className="w-11 h-11 rounded-full bg-black/15 flex items-center justify-center">
                    <Square size={17} fill="currentColor" />
                  </span>
                  <span className="text-[12px] font-black uppercase tracking-[0.2em]">Stop &amp; Save</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
