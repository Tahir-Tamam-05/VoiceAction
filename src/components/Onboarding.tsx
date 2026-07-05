import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles, Network, ChevronRight, X } from 'lucide-react';

interface OnboardingProps {
  isDark: boolean;
  onComplete: () => void;
}

const SLIDES = [
  {
    key: 'capture',
    icon: Mic,
    accent: '#f97316',
    title: 'Speak your mind',
    description:
      'Tap the mic and talk. VoiceAction turns your voice into a structured note in seconds — no typing, no formatting.',
    hint: 'Just say it. AI does the rest.',
    visual: (
      <div className="relative w-24 h-24 mx-auto">
        {/* Outer pulse ring */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-primary/30"
        />
        {/* Inner glow */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-2 rounded-full bg-primary/20"
        />
        {/* Core orb */}
        <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center shadow-[0_0_32px_rgba(249,115,22,0.5)]">
          <Mic size={22} className="text-black" fill="currentColor" />
        </div>
      </div>
    ),
  },
  {
    key: 'ai',
    icon: Sparkles,
    accent: '#8b5cf6',
    title: 'AI does the heavy lifting',
    description:
      'Every note is automatically titled, tagged, and connected to related ideas. Your thoughts become organized knowledge.',
    hint: 'No manual tagging or sorting needed.',
    visual: (
      <div className="flex flex-wrap justify-center gap-2 max-w-[220px] mx-auto">
        {['#IDEA', '#STARTUP', '#DESIGN', '#LEARNING', '#PERSONAL', '#FOCUS'].map(
          (tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{
                background: `${['rgba(249,115,22', 'rgba(139,92,246', 'rgba(59,130,246', 'rgba(34,197,94', 'rgba(236,72,153', 'rgba(245,158,11'][i % 6]},0.15)`,
                color: ['#f97316', '#8b5cf6', '#3b82f6', '#22c55e', '#ec4899', '#f59e0b'][i % 6],
                border: `1px solid ${['rgba(249,115,22', 'rgba(139,92,246', 'rgba(59,130,246', 'rgba(34,197,94', 'rgba(236,72,153', 'rgba(245,158,11'][i % 6]},0.3)`,
              }}
            >
              {tag}
            </motion.span>
          )
        )}
      </div>
    ),
  },
  {
    key: 'graph',
    icon: Network,
    accent: '#22c55e',
    title: 'Your second brain',
    description:
      'Watch your ideas form a living knowledge graph. Discover hidden connections between thoughts you captured weeks apart.',
    hint: 'The more you capture, the smarter it gets.',
    visual: (
      <div className="relative w-28 h-28 mx-auto">
        {/* Connection lines */}
        <svg
          className="absolute inset-0"
          viewBox="0 0 112 112"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {[
            [56, 56, 20, 20],
            [56, 56, 90, 20],
            [56, 56, 20, 90],
            [56, 56, 90, 90],
            [56, 56, 56, 10],
          ].map(([x1, y1, x2, y2], i) => (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(34,197,94,0.35)"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
            />
          ))}
        </svg>
        {/* Outer nodes */}
        {[
          { x: 8, y: 6, size: 8, color: '#f97316' },
          { x: 80, y: 6, size: 7, color: '#8b5cf6' },
          { x: 8, y: 80, size: 9, color: '#3b82f6' },
          { x: 80, y: 80, size: 7, color: '#22c55e' },
          { x: 44, y: 0, size: 6, color: '#f59e0b' },
        ].map((node, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 250, damping: 18 }}
            className="absolute rounded-full"
            style={{
              left: node.x,
              top: node.y,
              width: node.size * 2,
              height: node.size * 2,
              background: node.color,
              boxShadow: `0 0 10px ${node.color}60`,
            }}
          />
        ))}
        {/* Center hub */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full bg-primary"
          style={{
            left: 44,
            top: 44,
            width: 24,
            height: 24,
            boxShadow: '0 0 20px rgba(249,115,22,0.6)',
          }}
        />
      </div>
    ),
  },
] as const;

const ONBOARDING_KEY = 'va_onboarding_complete';

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export const Onboarding: React.FC<OnboardingProps> = ({ isDark, onComplete }) => {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  const handleNext = () => {
    if (isLast) {
      markOnboardingComplete();
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  const bg = isDark ? 'rgba(0,0,0,0.96)' : 'rgba(249,248,246,0.98)';
  const textPrimary = isDark ? '#fdf4e3' : '#0a0a0a';
  const textSecondary = isDark ? 'rgba(253,244,227,0.45)' : 'rgba(0,0,0,0.45)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: '"Manrope", sans-serif',
      }}
    >
      {/* Skip */}
      <button
        onClick={handleSkip}
        style={{
          position: 'absolute',
          top: 'max(env(safe-area-inset-top, 0px), 20px)',
          right: 20,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '8px',
        }}
      >
        Skip <X size={14} />
      </button>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.key}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: 340,
            width: '100%',
          }}
        >
          {/* Visual */}
          <div style={{ marginBottom: 40, height: 120, display: 'flex', alignItems: 'center' }}>
            {slide.visual}
          </div>

          {/* Step badge */}
          <div
            style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: slide.accent,
              marginBottom: 12,
              background: `${slide.accent}18`,
              border: `1px solid ${slide.accent}30`,
              borderRadius: 999,
              padding: '4px 12px',
            }}
          >
            {step + 1} of {SLIDES.length}
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: textPrimary,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 14px',
              fontFamily: '"Space Grotesk", sans-serif',
            }}
          >
            {slide.title}
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: textSecondary,
              lineHeight: 1.65,
              margin: '0 0 12px',
            }}
          >
            {slide.description}
          </p>

          {/* Hint pill */}
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: slide.accent,
              marginBottom: 0,
            }}
          >
            {slide.hint}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginTop: 48 }}>
        {SLIDES.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === step ? 20 : 6, opacity: i === step ? 1 : 0.3 }}
            transition={{ duration: 0.25 }}
            style={{
              height: 6,
              borderRadius: 999,
              background: i === step ? '#f97316' : textSecondary,
            }}
          />
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={handleNext}
        style={{
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#f97316',
          color: '#000',
          border: 'none',
          borderRadius: 999,
          padding: '14px 36px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          boxShadow: '0 0 32px rgba(249,115,22,0.35)',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
      >
        {isLast ? 'Start capturing' : 'Next'}
        <ChevronRight size={14} />
      </button>
    </motion.div>
  );
};
