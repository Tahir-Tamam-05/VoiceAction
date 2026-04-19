import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Web Speech API typings ──────────────────────────────
// These aren't in lib.dom.d.ts for all browsers, so we declare them inline.

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
};

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

// ─── Hook ────────────────────────────────────────────────

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'paused' | 'error' | 'unsupported';

export interface UseSpeechRecognitionReturn {
  /** Full finalized transcript accumulated so far */
  transcript: string;
  /** Current interim (unfinalized) text being spoken */
  interimText: string;
  /** Concatenation of transcript + interimText for live display */
  liveText: string;
  /** Whether the recognition is actively listening */
  isListening: boolean;
  /** Current status */
  status: SpeechRecognitionStatus;
  /** Human-readable error message, if any */
  error: string | null;
  /** Whether the browser supports Web Speech API */
  isSupported: boolean;
  /** Start listening */
  startListening: () => void;
  /** Stop listening and finalize */
  stopListening: () => void;
  /** Reset transcript to empty */
  resetTranscript: () => void;
}

export function useSpeechRecognition(lang: string = 'en-US'): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);

  const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
  const isSupported = !!SpeechRecognitionCtor;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setStatus('unsupported');
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    // If already listening, don't restart
    if (isListeningRef.current && recognitionRef.current) return;

    setError(null);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setStatus('listening');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalPart = '';
      let interimPart = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalPart += text;
        } else {
          interimPart += text;
        }
      }

      if (finalPart) {
        setTranscript(prev => {
          const separator = prev.trim() ? ' ' : '';
          return prev + separator + finalPart.trim();
        });
      }

      setInterimText(interimPart);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('SpeechRecognition error:', event.error);
      
      // 'no-speech' and 'aborted' are not critical errors
      if (event.error === 'no-speech') {
        // Will auto-restart via onend if shouldRestart is true
        return;
      }
      
      if (event.error === 'aborted') {
        return;
      }

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
        setStatus('error');
        shouldRestartRef.current = false;
        return;
      }

      if (event.error === 'network') {
        setError('Network error. Speech recognition requires an internet connection in some browsers.');
        setStatus('error');
        shouldRestartRef.current = false;
        return;
      }

      setError(`Speech recognition error: ${event.error}`);
      setStatus('error');
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setInterimText('');

      // Auto-restart if we should still be listening
      // (SpeechRecognition auto-stops after silence or max duration)
      if (shouldRestartRef.current && SpeechRecognitionCtor) {
        try {
          const newRecognition = new SpeechRecognitionCtor();
          newRecognition.continuous = true;
          newRecognition.interimResults = true;
          newRecognition.lang = lang;
          newRecognition.maxAlternatives = 1;
          newRecognition.onstart = recognition.onstart;
          newRecognition.onresult = recognition.onresult;
          newRecognition.onerror = recognition.onerror;
          newRecognition.onend = recognition.onend;
          recognitionRef.current = newRecognition;
          
          // Small delay before restart to avoid rapid cycling
          setTimeout(() => {
            if (shouldRestartRef.current) {
              try {
                newRecognition.start();
              } catch (e) {
                console.warn('Failed to restart speech recognition:', e);
                setStatus('idle');
                shouldRestartRef.current = false;
              }
            }
          }, 100);
        } catch (e) {
          console.warn('Failed to create new recognition instance:', e);
          setStatus('idle');
          shouldRestartRef.current = false;
        }
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;

    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setError('Failed to start speech recognition. Please try again.');
      setStatus('error');
      shouldRestartRef.current = false;
    }
  }, [SpeechRecognitionCtor, lang]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    isListeningRef.current = false;
    setInterimText('');
    setStatus('idle');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
  }, []);

  const liveText = interimText
    ? (transcript ? transcript + ' ' + interimText : interimText)
    : transcript;

  return {
    transcript,
    interimText,
    liveText,
    isListening: status === 'listening',
    status,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
