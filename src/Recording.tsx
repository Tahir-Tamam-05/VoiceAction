import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note } from './types';
import { X, Mic, Square, Sparkles, AlertTriangle } from 'lucide-react';
import { processVoiceNote } from './services/geminiService';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

interface RecordingScreenProps {
  setScreen: (s: Screen) => void;
  onSaveNote: (n: Note) => void;
  isDark: boolean;
}

export const RecordingScreen: React.FC<RecordingScreenProps> = ({ setScreen, onSaveNote, isDark }) => {
  const [timer, setTimer] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    transcript,
    liveText,
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  // Start listening on mount
  useEffect(() => {
    if (isSupported) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // Timer
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    } else if (!isProcessing) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isListening, isProcessing]);

  // Auto-save logic if user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isListening && transcript.trim()) {
        const partialNote: Note = {
          id: crypto.randomUUID(),
          title: `Unfinished Note ${new Date().toLocaleDateString()}`,
          content: transcript.slice(0, 100) + "...",
          body: transcript,
          type: 'voice',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pinned: false,
          createdAt: Date.now(),
          mood: 'Neutral',
          attachments: []
        };
        onSaveNote(partialNote);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isListening, transcript, onSaveNote]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    stopListening();
    setIsProcessing(true);
    
    const finalText = transcript.trim();
    
    if (!finalText) {
      // Nothing was captured — go back
      setIsProcessing(false);
      setScreen('home');
      return;
    }

    try {
      const aiResult = await processVoiceNote(finalText);
      
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: aiResult?.title || `Voice Note ${new Date().toLocaleDateString()}`,
        content: aiResult?.content || finalText.slice(0, 100) + "...",
        body: aiResult?.body || finalText,
        type: aiResult?.type || 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false,
        createdAt: Date.now(),
        mood: aiResult?.mood || 'Neutral',
        attachments: []
      };
      onSaveNote(newNote);
    } catch (error) {
      console.error("Failed to process note:", error);
      const fallbackNote: Note = {
        id: crypto.randomUUID(),
        title: `Voice Note ${new Date().toLocaleDateString()}`,
        content: finalText.slice(0, 100) + "...",
        body: finalText,
        type: 'voice',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pinned: false,
        createdAt: Date.now(),
        mood: 'Neutral',
        attachments: []
      };
      onSaveNote(fallbackNote);
    } finally {
      setIsProcessing(false);
      setScreen('home');
    }
  };

  const handleCancel = () => {
    stopListening();
    setScreen('home');
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
      
      <button 
        onClick={handleCancel}
        className="absolute top-12 right-6 text-text-secondary/40 hover:text-on-surface transition-colors z-20"
      >
        <X size={32} />
      </button>

      <div className="text-center z-10 w-full max-w-md">
        <div className="mb-4">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.4em] mb-2">
            {isProcessing ? 'Processing with AI' : isListening ? 'Live Recording' : 'Ready'}
          </p>
          <h2 className="text-6xl font-headline font-extrabold text-on-surface tracking-tighter">{formatTime(timer)}</h2>
        </div>

        {/* Browser support warning */}
        {!isSupported && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-on-surface/80 text-left">
              Speech recognition is not supported in this browser. Please use <strong>Chrome</strong> or <strong>Edge</strong> for voice capture.
            </p>
          </motion.div>
        )}

        {/* Speech error */}
        {speechError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-on-surface/80 text-left">{speechError}</p>
          </motion.div>
        )}

        {/* Waveform Visualization */}
        <div className="h-32 flex items-center justify-center gap-1.5 mb-12">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                height: isListening ? [20, Math.random() * 80 + 20, 20] : 4,
                opacity: isListening ? 1 : 0.2
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 0.5 + Math.random() * 0.5,
                ease: "easeInOut"
              }}
              className="w-1.5 bg-primary rounded-full"
            />
          ))}
        </div>

        {/* Live Transcript Preview */}
        <div className="max-w-md mx-auto mb-16 min-h-[96px] max-h-48 overflow-y-auto relative px-2">
          <p className={`text-lg font-medium leading-relaxed ${
            liveText 
              ? 'text-on-surface/80' 
              : 'text-on-surface/25 italic'
          }`}>
            {liveText || (isSupported ? 'Listening for your voice...' : 'Voice capture unavailable')}
          </p>
          <div className="sticky bottom-0 left-0 w-full h-8 bg-gradient-to-t from-base to-transparent pointer-events-none" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles size={18} />
                  <span className="text-sm font-bold uppercase tracking-widest">Processing...</span>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleStop}
                disabled={!liveText.trim() && !transcript.trim()}
                className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-black shadow-[0_0_40px_rgba(249,115,22,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Square size={32} fill="currentColor" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Hint */}
        {isListening && !liveText && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="mt-8 text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest"
          >
            Speak clearly into your microphone
          </motion.p>
        )}
      </div>
    </div>
  );
};
