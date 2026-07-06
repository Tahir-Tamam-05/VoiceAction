// LandingHero — the first-open product story.
//
// Not decoration: a looping demonstration of what VoiceAction actually does.
//   CHAOS      six real saved-thing fragments drift, disconnected
//   CAPTURE    they pull into orbit around the VoiceAction core
//   CONNECT    related memories link into a typed constellation
//   RETRIEVE   a natural query lights up exactly the right memory
//
// Reduced motion: the loop is skipped and the final connected+retrieval
// state renders statically — the story is still told, without animation.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, Film, ShoppingBag, CalendarDays, Lightbulb, Link2,
  Search, ListChecks, LucideIcon,
} from 'lucide-react';

type Stage = 0 | 1 | 2 | 3; // scatter, capture, connect, retrieve

interface Fragment {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
  scatter: { x: number; y: number; r: number }; // % of container
  orbit: { x: number; y: number };
}

// Two believable memory clusters: fitness and product work
const FRAGMENTS: Fragment[] = [
  { id: 'reel',  icon: Film,         label: 'reel · warm-up routine',  color: '#ec4899', scatter: { x: 12, y: 12, r: -8 }, orbit: { x: 20, y: 26 } },
  { id: 'shoes', icon: ShoppingBag,  label: 'buy running shoes',       color: '#22c55e', scatter: { x: 74, y: 6,  r: 6 },  orbit: { x: 50, y: 12 } },
  { id: 'gym',   icon: CalendarDays, label: 'gym trial · fri 5 pm',    color: '#3b82f6', scatter: { x: 6,  y: 66, r: 5 },  orbit: { x: 16, y: 58 } },
  { id: 'idea',  icon: Lightbulb,    label: 'idea · faster onboarding',color: '#f59e0b', scatter: { x: 78, y: 74, r: -6 }, orbit: { x: 82, y: 38 } },
  { id: 'link',  icon: Link2,        label: 'article · user retention',color: '#8b5cf6', scatter: { x: 44, y: 88, r: 9 },  orbit: { x: 78, y: 68 } },
  { id: 'task',  icon: ListChecks,   label: 'send deck to sarah',      color: '#f97316', scatter: { x: 40, y: 34, r: -4 }, orbit: { x: 52, y: 84 } },
];

// Constellation edges (fragment index pairs) — fitness cluster, work cluster
const EDGES: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 2],   // reel — shoes — gym
  [3, 4], [4, 5], [3, 5],   // idea — article — task
];

const RETRIEVAL_TARGET = 0; // "that warm-up reel"
const STAGE_DURATIONS = [2400, 2600, 2600, 3400]; // ms per stage

export const LandingHero: React.FC<{
  isDark: boolean;
  reducedMotion: boolean;
}> = ({ isDark, reducedMotion }) => {
  const [stage, setStage] = useState<Stage>(reducedMotion ? 3 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    const t = setTimeout(
      () => setStage((s) => ((s + 1) % 4) as Stage),
      STAGE_DURATIONS[stage]
    );
    return () => clearTimeout(t);
  }, [stage, reducedMotion]);

  const connected = stage >= 2;
  const retrieving = stage === 3;
  const captured = stage >= 1;

  const chipBg = isDark ? 'rgba(10,8,6,0.72)' : 'rgba(255,255,255,0.82)';
  const chipBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const chipText = isDark ? 'rgba(253,244,227,0.85)' : 'rgba(20,14,8,0.85)';

  return (
    <div className="relative w-full aspect-square max-w-[400px] mx-auto select-none" aria-hidden>
      {/* Spatial stage: vignette + orbital paths the memories live on */}
      <div
        className="absolute inset-[-12%] rounded-full pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(249,115,22,0.055) 0%, rgba(249,115,22,0.02) 45%, transparent 70%)'
            : 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, rgba(249,115,22,0.025) 45%, transparent 70%)',
        }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={reducedMotion ? {} : { rotate: 360 }}
        transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ overflow: 'visible' }}>
          <ellipse cx="50" cy="46" rx="40" ry="33" fill="none"
            stroke={isDark ? 'rgba(249,115,22,0.13)' : 'rgba(200,90,10,0.14)'}
            strokeWidth="0.25" strokeDasharray="0.8 2.6" vectorEffect="non-scaling-stroke" />
          <ellipse cx="50" cy="46" rx="27" ry="21" fill="none"
            stroke={isDark ? 'rgba(249,115,22,0.09)' : 'rgba(200,90,10,0.1)'}
            strokeWidth="0.25" strokeDasharray="0.5 3.2" vectorEffect="non-scaling-stroke" />
        </svg>
      </motion.div>

      {/* Connection edges */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {EDGES.map(([a, b], i) => {
          const fa = FRAGMENTS[a].orbit;
          const fb = FRAGMENTS[b].orbit;
          const hot = retrieving && (a === RETRIEVAL_TARGET || b === RETRIEVAL_TARGET);
          const tr = { duration: 0.9, delay: connected ? i * 0.12 : 0, ease: [0.2, 0, 0, 1] as const };
          return (
            <g key={i}>
              {/* soft halo beneath the line — neural-pathway depth */}
              <motion.line
                x1={fa.x} y1={fa.y} x2={fb.x} y2={fb.y}
                stroke={hot ? '#f97316' : FRAGMENTS[a].color}
                strokeWidth={hot ? 3 : 2.2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{
                  pathLength: connected ? 1 : 0,
                  opacity: connected ? (retrieving && !hot ? 0.05 : hot ? 0.28 : 0.14) : 0,
                }}
                transition={tr}
              />
              <motion.line
                x1={fa.x} y1={fa.y} x2={fb.x} y2={fb.y}
                stroke={hot ? '#f97316' : FRAGMENTS[a].color}
                strokeWidth={hot ? 0.8 : 0.55}
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{
                  pathLength: connected ? 1 : 0,
                  opacity: connected ? (retrieving && !hot ? 0.3 : hot ? 0.95 : 0.65) : 0,
                }}
                transition={tr}
              />
            </g>
          );
        })}
        {/* Spokes from core to each captured memory */}
        {FRAGMENTS.map((f, i) => (
          <motion.line
            key={`c-${i}`}
            x1={50} y1={46} x2={f.orbit.x} y2={f.orbit.y}
            stroke="#f97316"
            strokeWidth={0.3}
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={{ opacity: captured && !connected ? 0.35 : captured ? 0.08 : 0 }}
            transition={{ duration: 0.7, delay: i * 0.08 }}
          />
        ))}
      </svg>

      {/* Core — the VoiceAction identity, miniaturized */}
      <motion.div
        className="absolute"
        style={{ left: '50%', top: '46%', x: '-50%', y: '-50%' }}
        animate={reducedMotion ? {} : { scale: captured ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="w-[76px] h-[76px] rounded-full flex items-center justify-center"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 32% 28%, #ff7c38 0%, #c04a00 45%, #4a1400 100%)'
              : 'radial-gradient(circle at 32% 28%, #ff9d5c 0%, #e05c10 50%, #7a2a00 100%)',
            boxShadow: `0 0 0 1px rgba(249,115,22,0.25), 0 0 ${captured ? 44 : 24}px rgba(249,115,22,${isDark ? 0.4 : 0.28}), inset 0 -8px 18px rgba(0,0,0,0.45)`,
            transition: 'box-shadow 0.8s ease',
          }}
        >
          <Mic size={26} className="text-black/70" />
        </div>
      </motion.div>

      {/* Memory fragments */}
      {FRAGMENTS.map((f, i) => {
        const pos = captured ? f.orbit : f.scatter;
        const isTarget = retrieving && i === RETRIEVAL_TARGET;
        const dimmed = retrieving && !isTarget;
        const Icon = f.icon;
        return (
          <motion.div
            key={f.id}
            className="absolute"
            style={{ left: 0, top: 0 }}
            initial={false}
            animate={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              rotate: captured ? 0 : f.scatter.r,
              opacity: dimmed ? 0.5 : captured ? 1 : 0.65,
              scale: isTarget ? 1.08 : captured ? 0.94 : 1,
            }}
            transition={{ type: 'spring', stiffness: 60, damping: 14, delay: captured ? i * 0.09 : i * 0.05 }}
          >
            <div
              className="flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
              style={{
                background: chipBg,
                border: `1px solid ${isTarget ? 'rgba(249,115,22,0.65)' : chipBorder}`,
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: isTarget
                  ? '0 0 20px rgba(249,115,22,0.45), inset 0 1px 0 rgba(255,255,255,0.12)'
                  : isDark
                    ? '0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 2px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
                transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
              }}
            >
              <span
                className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${f.color}26` }}
              >
                <Icon size={10} style={{ color: f.color }} />
              </span>
              <span className="text-[9px] font-bold tracking-wide lowercase" style={{ color: chipText }}>
                {f.label}
              </span>
            </div>
          </motion.div>
        );
      })}

      {/* Retrieval query */}
      <AnimatePresence>
        {retrieving && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            className="absolute left-1/2 -translate-x-1/2 bottom-[-8%] flex items-center gap-2 rounded-full px-4 py-2.5"
            style={{
              background: isDark ? 'rgba(12,9,6,0.85)' : 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(249,115,22,0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <Search size={12} className="text-primary flex-shrink-0" />
            <span className="text-[11px] font-semibold" style={{ color: chipText }}>
              “that warm-up reel I saved”
            </span>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 18 }}
              className="text-[9px] font-black uppercase tracking-wider text-primary"
            >
              found
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage caption — tells the story in four words */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[-10%] h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/70 whitespace-nowrap"
          >
            {['everywhere · disconnected', 'captured once', 'understood · connected', 'found instantly'][stage]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};
