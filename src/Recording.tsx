import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen, Note } from './types';
import { X, Mic, Square, Sparkles, Check } from 'lucide-react';
import { processVoiceNote } from './services/geminiService';

interface RecordingScreenProps {
  setScreen: (s: Screen) => void;
  onSaveNote: (n: Note) => void;
  isDark: boolean;
}

export const RecordingScreen: React.FC<RecordingScreenProps> = ({ setScreen, onSaveNote, isDark }) => {
  const [isRecording, setIsRecording] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [timer, setTimer] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
        // Mock transcript generation
        if (timer % 5 === 0) {
          setTranscript(prev => prev + " " + MOCK_PHRASES[Math.floor(Math.random() * MOCK_PHRASES.length)]);
        }
      }, 1000);
    } else {
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
  }, [isRecording, timer]);

  // Auto-save logic if user navigates away or browser sleeps
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isRecording && transcript.trim()) {
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
  }, [isRecording, transcript, onSaveNote]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    
    try {
      const aiResult = await processVoiceNote(transcript);
      
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: aiResult?.title || `Voice Note ${new Date().toLocaleDateString()}`,
        content: aiResult?.content || transcript.slice(0, 100) + "...",
        body: aiResult?.body || transcript,
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
      // Fallback
      const fallbackNote: Note = {
        id: crypto.randomUUID(),
        title: `Voice Note ${new Date().toLocaleDateString()}`,
        content: transcript.slice(0, 100) + "...",
        body: transcript,
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

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-6 relative overflow-hidden transition-colors duration-300">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
      
      <button 
        onClick={() => setScreen('home')}
        className="absolute top-12 right-6 text-text-secondary/40 hover:text-on-surface transition-colors"
      >
        <X size={32} />
      </button>

      <div className="text-center z-10">
        <div className="mb-4">
          <p className="text-[11px] font-bold text-primary uppercase tracking-[0.4em] mb-2">
            {isProcessing ? 'Processing with AI' : 'Live Recording'}
          </p>
          <h2 className="text-6xl font-headline font-extrabold text-on-surface tracking-tighter">{formatTime(timer)}</h2>
        </div>

        {/* Waveform Visualization */}
        <div className="h-32 flex items-center justify-center gap-1.5 mb-12">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                height: isRecording ? [20, Math.random() * 80 + 20, 20] : 4,
                opacity: isRecording ? 1 : 0.2
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

        {/* Transcript Preview */}
        <div className="max-w-md mx-auto mb-16 h-24 overflow-hidden relative">
          <p className="text-lg text-on-surface/60 font-medium leading-relaxed italic">
            {transcript || "Listening for your voice..."}
          </p>
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-base to-transparent" />
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
                  <span className="text-sm font-bold uppercase tracking-widest">Recalibrating...</span>
                </div>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleStop}
                className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-black shadow-[0_0_40px_rgba(249,115,22,0.4)] hover:scale-105 active:scale-95 transition-all"
              >
                <Square size={32} fill="currentColor" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const MOCK_PHRASES = [
  "The Solar Monolith aesthetic",
  "linguistic processing module",
  "cryptographic privacy standards",
  "recalibrate the core",
  "high-end editorial layouts",
  "cinematic interfaces",
  "ghost borders implementation",
  "Q3 roadmap blockers"
];
