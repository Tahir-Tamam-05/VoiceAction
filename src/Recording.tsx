// Recording — VoiceAction's capture moment.
//
// One authoritative phase drives everything:
//   initializing → listening → processing → (navigates home) | error
//
// Reliability guarantees (each was a real defect before this rebuild):
//  • handleStop is guarded by stopOnceRef — rapid Stop taps and the
//    silence-auto-stop can never double-save a note
//  • the UI can never indicate recording after capture stopped (phase is the
//    single source of truth; the visualization reads it directly)
//  • speech recognition AND the analyser mic stream are both torn down on
//    stop, cancel, and unmount — no lingering mic indicator
//  • Cancel is disabled during processing (no double navigation mid-save)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note } from './types';
import { X, Square, Sparkles, AlertTriangle, MicOff } from 'lucide-react';
import { processNoteWithTimeout } from './features/intelligence/IntelligenceEngine';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useMicAnalyser } from './hooks/useMicAnalyser';
import { VoiceField, usePrefersReducedMotion } from './components/VoiceField';

interface RecordingScreenProps {
  setScreen: (s: Screen) => void;
  onSaveNote: (n: Note) => void;
  isDark: boolean;
}

type Phase = 'initializing' | 'listening' | 'processing' | 'error';

export const RecordingScreen: React.FC<RecordingScreenProps> = ({ setScreen, onSaveNote, isDark }) => {
  const [phase, setPhase] = useState<Phase>('initializing');
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopOnceRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  const {
    transcript, liveText, isListening, isSupported,
    error: speechError, startListening, stopListening,
  } = useSpeechRecognition();

  const analyser = useMicAnalyser();

  // ── Field size: responsive, capped ──
  const fieldSize = Math.min(
    340,
    typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.8, window.innerHeight * 0.4) : 300
  );

  // ── Lifecycle: start both capture paths on mount, tear down on unmount ──
  useEffect(() => {
    if (isSupported) {
      startListening();
      analyser.start(); // parallel stream purely for the visualization
    } else {
      setPhase('error');
    }
    return () => {
      stopListening();
      analyser.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase follows the recognition status while not stopping
  useEffect(() => {
    if (stopOnceRef.current) return;
    if (speechError) setPhase('error');
    else if (isListening) setPhase('listening');
  }, [isListening, speechError]);

  // ── Timer: runs while the mic is live (speech handshake may lag) ──
  const analyserActive = analyser.status === 'active';
  useEffect(() => {
    if (phase === 'listening' || (phase === 'initializing' && analyserActive)) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [phase, analyserActive]);

  // ── Stop: guarded so it runs exactly once ──
  const handleStop = useCallback(async () => {
    if (stopOnceRef.current) return;
    stopOnceRef.current = true;

    stopListening();
    analyser.stop();
    setPhase('processing');

    const finalText = transcript.trim();
    if (!finalText) {
      setScreen('home');
      return;
    }

    try {
      const aiResult = await processNoteWithTimeout(finalText);
      const aiData = aiResult.success ? aiResult.data : null;
      const now = Date.now();
      onSaveNote({
        id: crypto.randomUUID(),
        title: aiData?.title || `Voice Note ${new Date().toLocaleDateString()}`,
        content: aiData?.summary || finalText.slice(0, 100) + '…',
        body: finalText,
        type: aiData?.type || 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false, createdAt: now, updatedAt: now,
        tags: aiResult.tags || [],
        mood: aiData?.mood || 'Neutral',
        attachments: [],
      });
    } catch (error) {
      console.error('[RecordingScreen] Failed to process note:', error);
      const now = Date.now();
      onSaveNote({
        id: crypto.randomUUID(),
        title: `Voice Note ${new Date().toLocaleDateString()}`,
        content: finalText.slice(0, 100) + '…',
        body: finalText, type: 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false, createdAt: now, updatedAt: now,
        tags: [], mood: 'Neutral', attachments: [],
      });
    } finally {
      setScreen('home');
    }
  }, [transcript, stopListening, analyser, onSaveNote, setScreen]);

  // Silence auto-stop: recognition ended on its own with content captured
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (wasListeningRef.current && !isListening && transcript.trim() && !stopOnceRef.current && !speechError) {
      handleStop();
    }
    wasListeningRef.current = isListening;
  }, [isListening, transcript, speechError, handleStop]);

  // Partial-save safety net if the tab closes mid-recording
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (phase === 'listening' && transcript.trim()) {
        const now = Date.now();
        onSaveNote({
          id: crypto.randomUUID(),
          title: `Unfinished Note ${new Date().toLocaleDateString()}`,
          content: transcript.slice(0, 100) + '…',
          body: transcript, type: 'voice',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pinned: false, createdAt: now, updatedAt: now, mood: 'Neutral', attachments: [],
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase, transcript, onSaveNote]);

  const handleCancel = useCallback(() => {
    if (phase === 'processing') return; // save in flight — let it finish
    stopOnceRef.current = true;         // block any late auto-stop save
    stopListening();
    analyser.stop();
    setScreen('home');
  }, [phase, stopListening, analyser, setScreen]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const isProcessing = phase === 'processing';
  const micDenied = analyser.status === 'denied';

  // The analyser goes live the instant the mic opens — the field (and the
  // status) shouldn't wait for the speech service handshake.
  const micLive = analyser.status === 'active';
  const statusLabel =
    isProcessing ? 'Crystallizing your thought'
    : phase === 'listening' || micLive ? 'Listening'
    : phase === 'error' ? 'Microphone unavailable'
    : 'Preparing microphone';

  return (
    <div className="min-h-screen bg-base flex flex-col items-center relative overflow-hidden transition-colors duration-300">

      {/* ── Top status row ── */}
      <div
        className="w-full max-w-md flex items-center justify-between px-6 z-20"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 28px)' }}
      >
        <div className="flex items-center gap-2.5 min-h-[44px]">
          {phase === 'listening' && (
            <motion.span
              animate={reducedMotion ? {} : { opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-primary" role="status">
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-xl font-headline font-extrabold text-on-surface tabular-nums"
            aria-label={`Recording duration ${formatTime(timer)}`}
          >
            {formatTime(timer)}
          </span>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            aria-label="Cancel recording"
            className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-text-secondary/50 hover:text-on-surface transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* ── Voice field ── */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6 z-10 min-h-0">
        <VoiceField
          phase={
            isProcessing ? 'processing'
            : phase === 'error' ? 'error'
            : phase === 'listening' || micLive ? 'listening'
            : 'idle'
          }
          readFrequencies={analyser.status === 'active' ? analyser.readFrequencies : undefined}
          readLevel={analyser.status === 'active' ? analyser.readLevel : undefined}
          isDark={isDark}
          size={fieldSize}
          reducedMotion={reducedMotion}
        />

        {/* Error panels */}
        <AnimatePresence>
          {!isSupported && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 max-w-sm bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3"
            >
              <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" aria-hidden />
              <p className="text-sm text-on-surface/80 text-left">
                Speech recognition is not supported in this browser. Please use <strong>Chrome</strong> or <strong>Edge</strong> for voice capture.
              </p>
            </motion.div>
          )}
          {speechError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 max-w-sm bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3"
            >
              <MicOff size={20} className="text-red-500 flex-shrink-0" aria-hidden />
              <p className="text-sm text-on-surface/80 text-left">{speechError}</p>
            </motion.div>
          )}
          {micDenied && !speechError && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mt-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary/50"
            >
              Visualizer muted — mic access denied for level data
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Live transcript ── */}
        <div
          className="w-full max-w-md mt-6 rounded-2xl border px-5 py-4 max-h-36 overflow-y-auto"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
          }}
          aria-live="polite"
        >
          <p className={`text-[15px] font-medium leading-relaxed ${
            liveText ? 'text-on-surface/80' : 'text-on-surface/25 italic'
          }`}>
            {liveText || (isSupported ? 'Say what you want to remember…' : 'Voice capture unavailable')}
          </p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div
        className="w-full flex items-center justify-center z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 28px, 44px)' }}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5 text-primary py-6"
            >
              <Sparkles size={16} aria-hidden />
              <span className="text-[11px] font-black uppercase tracking-[0.25em]">Saving…</span>
            </motion.div>
          ) : (
            <motion.button
              key="stop"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              onClick={handleStop}
              disabled={phase === 'error' && !transcript.trim()}
              aria-label="Stop recording and save"
              className="group flex items-center gap-3 pl-5 pr-7 h-[64px] rounded-full transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                background: '#f97316',
                color: '#000',
                boxShadow: '0 0 0 1px rgba(249,115,22,0.3), 0 0 44px rgba(249,115,22,0.4)',
              }}
            >
              <span className="w-11 h-11 rounded-full bg-black/15 flex items-center justify-center">
                <Square size={17} fill="currentColor" aria-hidden />
              </span>
              <span className="text-[12px] font-black uppercase tracking-[0.2em]">Stop &amp; Save</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
