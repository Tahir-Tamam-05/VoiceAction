// MemoryBackdrop — the connected-memory field as a page-wide atmosphere.
//
// A sparse, deterministic constellation of memory motes with faint links
// between near neighbors, drifting almost imperceptibly and shifting with
// pointer parallax. It extends the Thought-Graph identity to the landing
// itself: the visitor is already standing inside their future memory space.
//
// Restraint is the point — ~7% peak opacity, no bloom soup. Deterministic
// positions (hashed, never random per-render), Canvas 2D, DPR-capped,
// reduced-motion renders a single static frame.

import React, { useEffect, useRef } from 'react';

interface MemoryBackdropProps {
  isDark: boolean;
  reducedMotion?: boolean;
}

const MOTE_COUNT = 56;
const LINK_DIST = 0.085; // short links only — long faint diagonals read as smears

function hash(i: number, salt: number): number {
  let h = (2166136261 ^ (i * 971 + salt * 31)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 16777619) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export const MemoryBackdrop: React.FC<MemoryBackdropProps> = ({ isDark, reducedMotion = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0 });   // -1..1
  const eased = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // background — 1.5 is plenty
    let w = 0, h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / w) * 2 - 1;
      pointer.current.y = (e.clientY / h) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Deterministic motes: position, depth (parallax layer), drift phase
    const motes = Array.from({ length: MOTE_COUNT }, (_, i) => ({
      x: hash(i, 1), y: hash(i, 2),
      depth: 0.35 + hash(i, 3) * 0.65,      // far → near
      size: 0.7 + hash(i, 4) * 1.2,
      phase: hash(i, 5) * Math.PI * 2,
      speed: 0.12 + hash(i, 6) * 0.2,
    }));

    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      eased.current.x += (pointer.current.x - eased.current.x) * 0.03;
      eased.current.y += (pointer.current.y - eased.current.y) * 0.03;

      ctx.clearRect(0, 0, w, h);

      const diag = Math.hypot(w, h);
      const maxLink = diag * LINK_DIST;
      const px: number[] = new Array(MOTE_COUNT);
      const py: number[] = new Array(MOTE_COUNT);

      for (let i = 0; i < MOTE_COUNT; i++) {
        const m = motes[i];
        const drift = reducedMotion ? 0 : 1;
        px[i] = (m.x + Math.sin(t * m.speed + m.phase) * 0.012 * drift) * w
          + eased.current.x * 18 * m.depth;
        py[i] = (m.y + Math.cos(t * m.speed * 0.8 + m.phase) * 0.012 * drift) * h
          + eased.current.y * 12 * m.depth;
      }

      // Links between near neighbors — the "connected" signature
      ctx.lineWidth = 1;
      for (let i = 0; i < MOTE_COUNT; i++) {
        for (let j = i + 1; j < MOTE_COUNT; j++) {
          const dx = px[i] - px[j], dy = py[i] - py[j];
          const d = Math.hypot(dx, dy);
          if (d > maxLink) continue;
          const a = (1 - d / maxLink) * (isDark ? 0.035 : 0.04);
          ctx.strokeStyle = `rgba(249,115,22,${a})`;
          ctx.beginPath();
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[j], py[j]);
          ctx.stroke();
        }
      }

      // Motes
      for (let i = 0; i < MOTE_COUNT; i++) {
        const m = motes[i];
        const tw = reducedMotion ? 0.7 : 0.55 + 0.45 * Math.sin(t * 0.6 + m.phase);
        const a = m.depth * tw * (isDark ? 0.34 : 0.26);
        ctx.fillStyle = isDark ? `rgba(255,190,130,${a})` : `rgba(200,90,10,${a})`;
        ctx.beginPath();
        ctx.arc(px[i], py[i], m.size * m.depth, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [isDark, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 pointer-events-none z-0"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
