// VoiceField — VoiceAction's capture visualization.
//
// A radial frequency architecture: 96 spokes around a breathing core map
// log-scaled AnalyserNode frequency bins, and a particle constellation emits
// from the ring on real speech energy — thought energy visibly becoming
// memory. During processing the field collapses inward (the thought
// crystallizing); on error it freezes and desaturates.
//
// Driven by REAL microphone data (AnalyserNode FFT + RMS) when available.
// With no analyser (permission denied / unsupported), it degrades to a calm
// deterministic time-based breathing — never Math.random() pretending to be
// audio — and the status text carries the truth.
//
// Canvas 2D on purpose: full control, zero added dependencies, no three.js
// in the eager bundle, and comfortable 60fps on mobile (one path stroke pass
// + ≤140 pooled particles; no allocations inside the frame loop).

import React, { useEffect, useRef } from 'react';

export type VoiceFieldPhase = 'idle' | 'listening' | 'processing' | 'error';

interface VoiceFieldProps {
  phase: VoiceFieldPhase;
  /** Live audio taps — omit for the deterministic fallback rendering. */
  readFrequencies?: (target: Uint8Array) => number;
  readLevel?: () => number;
  isDark: boolean;
  /** Canvas CSS size in px (square). */
  size: number;
  reducedMotion?: boolean;
}

const SPOKES = 96;
const PARTICLE_POOL = 140;
const TAU = Math.PI * 2;

export const VoiceField: React.FC<VoiceFieldProps> = ({
  phase, readFrequencies, readLevel, isDark, size, reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const readFreqRef = useRef(readFrequencies);
  readFreqRef.current = readFrequencies;
  const readLevelRef = useRef(readLevel);
  readLevelRef.current = readLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const half = size / 2;
    const ringR = half * 0.34;          // core ring radius
    const maxSpoke = half * 0.52;       // max spoke length beyond the ring

    // ── Persistent buffers (no per-frame allocation) ──
    const freqData = new Uint8Array(512);
    const spokeVals = new Float32Array(SPOKES);   // eased 0–1 per spoke
    const spokeBins = new Int16Array(SPOKES);     // log-scaled bin lookup
    let binsMapped = 0;

    // Particle pool: [x, y, vx, vy, life, maxLife, size]
    const P = 7;
    const particles = new Float32Array(PARTICLE_POOL * P);
    let nextParticle = 0;

    let level = 0;          // eased RMS 0–1
    let rotation = 0;
    let collapse = 0;       // 0 = open field, 1 = fully collapsed (processing)
    let errorMix = 0;       // 0 = normal color, 1 = error tint
    let last = performance.now();
    let raf = 0;

    const mapBins = (binCount: number) => {
      if (binsMapped === binCount) return;
      binsMapped = binCount;
      // Log mapping: voice energy lives in the low bins — spread them out
      const maxBin = Math.floor(binCount * 0.72); // drop near-silent top end
      for (let i = 0; i < SPOKES; i++) {
        const t = i / (SPOKES - 1);
        spokeBins[i] = Math.min(maxBin - 1, Math.floor(Math.pow(t, 1.7) * maxBin));
      }
    };

    const emit = (angle: number, energy: number) => {
      const i = nextParticle * P;
      nextParticle = (nextParticle + 1) % PARTICLE_POOL;
      const speed = 22 + energy * 55;
      const jitter = Math.sin(angle * 13.37) * 0.35; // deterministic spread
      particles[i]     = half + Math.cos(angle) * (ringR + 6);
      particles[i + 1] = half + Math.sin(angle) * (ringR + 6);
      particles[i + 2] = Math.cos(angle + jitter) * speed;
      particles[i + 3] = Math.sin(angle + jitter) * speed;
      particles[i + 5] = 1.6 + energy;               // maxLife (s)
      particles[i + 4] = particles[i + 5];           // life
      particles[i + 6] = 1.2 + energy * 1.8;         // size
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const ph = phaseRef.current;

      // ── Read real audio ──
      const binCount = readFreqRef.current?.(freqData) ?? 0;
      const rawLevel = readLevelRef.current?.() ?? 0;
      const hasAudio = binCount > 0;
      if (hasAudio) mapBins(binCount);

      // ── Ease globals ──
      const targetLevel = ph === 'listening'
        ? (hasAudio ? rawLevel : 0.10 + 0.05 * Math.sin(now / 900))
        : 0;
      level += (targetLevel - level) * (targetLevel > level ? 0.4 : 0.08);
      collapse += ((ph === 'processing' ? 1 : 0) - collapse) * 0.07;
      errorMix += ((ph === 'error' ? 1 : 0) - errorMix) * 0.1;

      const spin = reducedMotion ? 0
        : ph === 'processing' ? 1.6
        : ph === 'listening' ? 0.10 + level * 0.25
        : 0.03;
      rotation += spin * dt;

      // ── Per-spoke target from FFT (or deterministic ambience) ──
      for (let i = 0; i < SPOKES; i++) {
        let target: number;
        if (ph !== 'listening') {
          target = 0;
        } else if (hasAudio) {
          target = Math.pow(freqData[spokeBins[i]] / 255, 1.4);
        } else {
          // No mic data: calm deterministic wave, clearly ambient
          target = 0.06 + 0.05 * Math.sin(now / 700 + i * 0.42);
        }
        target *= 1 - collapse;
        const v = spokeVals[i];
        spokeVals[i] = v + (target - v) * (target > v ? 0.5 : 0.10);
      }

      // ── Palette ──
      const pr = 249 + (239 - 249) * errorMix;   // → red on error
      const pg = 115 + (68 - 115) * errorMix;
      const pb = 22  + (68 - 22)  * errorMix;
      const core = `rgba(${pr},${pg},${pb},`;
      const dim = isDark ? 0.16 : 0.22;

      ctx.clearRect(0, 0, size, size);

      // ── Core glow disc (breathes with RMS) ──
      const glowR = ringR * (0.66 + level * 0.5) * (1 - collapse * 0.35);
      const grad = ctx.createRadialGradient(half, half, 0, half, half, glowR);
      grad.addColorStop(0, core + (isDark ? 0.32 : 0.22) * (0.4 + level) + ')');
      grad.addColorStop(1, core + '0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(half, half, glowR, 0, TAU);
      ctx.fill();

      // ── Frequency spokes ──
      ctx.lineCap = 'round';
      const innerR = ringR + 5;
      for (let i = 0; i < SPOKES; i++) {
        const angle = rotation + (i / SPOKES) * TAU;
        const v = spokeVals[i];
        const len = 3 + v * maxSpoke * (1 - collapse);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        ctx.strokeStyle = core + (dim + v * 0.75) + ')';
        ctx.lineWidth = 1.6 + v * 1.8;
        ctx.beginPath();
        ctx.moveTo(half + cos * innerR, half + sin * innerR);
        ctx.lineTo(half + cos * (innerR + len), half + sin * (innerR + len));
        ctx.stroke();
      }

      // ── Core rings ──
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = core + (isDark ? 0.5 : 0.6) + ')';
      ctx.beginPath();
      ctx.arc(half, half, ringR * (1 + level * 0.05), 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = core + '0.18)';
      ctx.beginPath();
      ctx.arc(half, half, ringR * 0.82, 0, TAU);
      ctx.stroke();

      // ── Processing arc (crystallizing) ──
      if (collapse > 0.05) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = core + (0.85 * collapse) + ')';
        ctx.beginPath();
        ctx.arc(half, half, ringR, rotation * 2.4, rotation * 2.4 + Math.PI * 0.7);
        ctx.stroke();
      }

      // ── Particles (skip entirely under reduced motion) ──
      if (!reducedMotion) {
        // Emit from the loudest spokes while speaking
        if (ph === 'listening' && hasAudio && level > 0.1) {
          const bursts = level > 0.3 ? 3 : level > 0.18 ? 2 : 1;
          for (let b = 0; b < bursts; b++) {
            // Pick a hot spoke deterministically from the rotation phase
            let hot = 0, hotV = 0;
            const probe = ((now / 16 + b * 31) | 0) % SPOKES;
            for (let k = 0; k < 12; k++) {
              const idx = (probe + k * 8) % SPOKES;
              if (spokeVals[idx] > hotV) { hotV = spokeVals[idx]; hot = idx; }
            }
            if (hotV > 0.12) emit(rotation + (hot / SPOKES) * TAU, hotV);
          }
        }

        for (let i = 0; i < PARTICLE_POOL; i++) {
          const o = i * P;
          let life = particles[o + 4];
          if (life <= 0) continue;
          life -= dt;
          particles[o + 4] = life;
          if (life <= 0) continue;

          // Processing pulls every particle back into the core
          if (collapse > 0.05) {
            const dx = half - particles[o];
            const dy = half - particles[o + 1];
            particles[o + 2] += dx * collapse * dt * 6;
            particles[o + 3] += dy * collapse * dt * 6;
          }
          particles[o]     += particles[o + 2] * dt;
          particles[o + 1] += particles[o + 3] * dt;
          particles[o + 2] *= 0.995;
          particles[o + 3] *= 0.995;

          const a = (life / particles[o + 5]) * 0.85;
          ctx.fillStyle = isDark
            ? `rgba(255,178,102,${a})`
            : `rgba(217,91,6,${a})`;
          ctx.beginPath();
          ctx.arc(particles[o], particles[o + 1], particles[o + 6], 0, TAU);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, isDark, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={
        phase === 'listening' ? 'Live voice energy field — listening'
        : phase === 'processing' ? 'Processing your thought'
        : phase === 'error' ? 'Microphone error'
        : 'Voice field idle'
      }
      style={{ width: size, height: size, display: 'block' }}
    />
  );
};

/** Shared hook: respects the user's motion preference. */
export function usePrefersReducedMotion(): boolean {
  const ref = useRef<boolean>(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  return ref.current;
}
