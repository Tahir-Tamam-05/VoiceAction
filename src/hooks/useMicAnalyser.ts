// useMicAnalyser — real microphone signal for the capture visualization.
//
// Runs alongside (not instead of) the Web Speech API: SpeechRecognition does
// transcription; this hook opens a parallel getUserMedia stream purely to
// drive AnalyserNode frequency/level data. Fully self-cleaning: tracks are
// stopped and the AudioContext closed on stop() and on unmount, so the
// browser's mic indicator never lingers after leaving the screen.

import { useCallback, useEffect, useRef, useState } from 'react';

export type MicAnalyserStatus = 'idle' | 'active' | 'denied' | 'unsupported' | 'error';

export interface MicAnalyser {
  status: MicAnalyserStatus;
  /** Copies the current frequency spectrum (0–255 per bin) into `target`. */
  readFrequencies: (target: Uint8Array) => number; // returns bin count
  /** Current RMS level 0–1 from time-domain data. */
  readLevel: () => number;
  start: () => Promise<void>;
  stop: () => void;
  /** Analyser bin count (fftSize/2) once active; 0 before. */
  binCount: number;
}

const FFT_SIZE = 512; // 256 bins — plenty for a radial spectrum

export function useMicAnalyser(): MicAnalyser {
  const [status, setStatus] = useState<MicAnalyserStatus>('idle');
  const [binCount, setBinCount] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeBufRef = useRef<Uint8Array | null>(null);
  const startingRef = useRef(false);

  const stop = useCallback(() => {
    startingRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => { /* already closing */ });
    }
    ctxRef.current = null;
    setStatus('idle');
    setBinCount(0);
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || analyserRef.current) return; // single stream
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia ||
        typeof AudioContext === 'undefined') {
      setStatus('unsupported');
      return;
    }
    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      // stop() may have been called while the permission prompt was open
      if (!startingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);

      streamRef.current = stream;
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      timeBufRef.current = new Uint8Array(analyser.fftSize);
      setBinCount(analyser.frequencyBinCount);
      setStatus('active');
    } catch (err) {
      const name = (err as DOMException)?.name;
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
    } finally {
      startingRef.current = false;
    }
  }, []);

  const readFrequencies = useCallback((target: Uint8Array): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    analyser.getByteFrequencyData(target as Uint8Array<ArrayBuffer>);
    return analyser.frequencyBinCount;
  }, []);

  const readLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    const buf = timeBufRef.current;
    if (!analyser || !buf) return 0;
    analyser.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 2.2);
  }, []);

  // Unmount safety net
  useEffect(() => stop, [stop]);

  return { status, readFrequencies, readLevel, start, stop, binCount };
}
