import React from 'react';
import { motion } from 'motion/react';
import { getStreakLevel, getStreakLevelProgress, getStreakMessage, hasAvailableFreeze, StreakLevelInfo } from '../utils/streakHelpers';
import { AuthUser } from '../types';
import { Snowflake } from 'lucide-react';

interface StreakBadgeProps {
  user: AuthUser | null;
  currentStreak: number;
  isAtRisk: boolean;
  isFrozen?: boolean;
  /** compact = small pill for header; full = larger card for home feed */
  variant?: 'compact' | 'full';
}

// ─── Progress ring (SVG) ──────────────────────────────────────

const ProgressRing: React.FC<{
  progress: number;   // 0-1
  size: number;
  strokeWidth: number;
  color: string;
}> = ({ progress, size, strokeWidth, color }) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-surface-highest"
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
  );
};

// ─── Compact badge ────────────────────────────────────────────

const CompactBadge: React.FC<{
  streak: number;
  info: StreakLevelInfo;
  progress: number;
  isAtRisk: boolean;
  isFrozen: boolean;
  freezeAvailable: boolean;
}> = ({ streak, info, progress, isAtRisk, isFrozen, freezeAvailable }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${
      isAtRisk
        ? 'bg-red-500/10 border-red-500/20'
        : 'bg-surface-low border-primary/5'
    }`}
  >
    {/* Ring + emoji */}
    <div className="relative flex-shrink-0">
      <ProgressRing progress={progress} size={32} strokeWidth={3} color={isAtRisk ? '#ef4444' : info.color} />
      <span className="absolute inset-0 flex items-center justify-center text-[13px]">
        {isFrozen ? '❄️' : info.emoji}
      </span>
    </div>

    <div className="min-w-0">
      <p className={`text-[9px] uppercase tracking-widest font-bold truncate ${isAtRisk ? 'text-red-500/70' : 'text-text-secondary/60'}`}>
        {isFrozen ? 'Frozen' : info.label}
      </p>
      <p className={`text-xs font-bold truncate ${isAtRisk ? 'text-red-400' : 'text-on-surface'}`}>
        {streak} {streak === 1 ? 'day' : 'days'}
        {freezeAvailable && !isFrozen && (
          <span className="ml-1 text-[8px] text-blue-400 font-bold">❄</span>
        )}
      </p>
    </div>
  </motion.div>
);

// ─── Full badge card ──────────────────────────────────────────

const FullBadge: React.FC<{
  user: AuthUser | null;
  streak: number;
  info: StreakLevelInfo;
  progress: number;
  isAtRisk: boolean;
  isFrozen: boolean;
}> = ({ user, streak, info, progress, isAtRisk, isFrozen }) => {
  const longestStreak = user?.longestStreak ?? streak;
  const freezeAvailable = hasAvailableFreeze(user);
  const daysToNext = info.nextLevel && info.maxDays !== null
    ? info.maxDays - streak + 1
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-4 border relative overflow-hidden ${
        isAtRisk
          ? 'bg-red-500/5 border-red-500/15'
          : 'bg-surface-low border-primary/5'
      }`}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: info.color }}
      />

      <div className="flex items-center gap-4 relative z-10">
        {/* Large progress ring */}
        <div className="relative flex-shrink-0">
          <ProgressRing progress={progress} size={64} strokeWidth={5} color={isAtRisk ? '#ef4444' : info.color} />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">
            {isFrozen ? '❄️' : info.emoji}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p
              className="text-2xl font-headline font-extrabold tracking-tighter"
              style={{ color: isAtRisk ? '#ef4444' : info.color }}
            >
              {streak}
            </p>
            <p className="text-sm font-bold text-on-surface">days</p>
            {isFrozen && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400 border border-blue-400/20 rounded-full px-1.5 py-0.5">
                <Snowflake size={8} /> Freeze Used
              </span>
            )}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
             style={{ color: info.color }}>
            {isFrozen ? 'Streak Protected' : info.label}
            {info.level === 'phoenix' && ' ✦'}
          </p>

          <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-text-secondary/50 font-bold">
            <span>Best: {longestStreak}d</span>
            {daysToNext !== null && daysToNext > 0 && (
              <span>{daysToNext}d → {info.nextLevel}</span>
            )}
            {freezeAvailable && !isFrozen && (
              <span className="text-blue-400">❄ Freeze ready</span>
            )}
          </div>
        </div>
      </div>

      {isAtRisk && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-[10px] font-bold text-red-400 uppercase tracking-widest text-center"
        >
          Capture today to keep your streak!
        </motion.p>
      )}
    </motion.div>
  );
};

// ─── Public component ─────────────────────────────────────────

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  user,
  currentStreak,
  isAtRisk,
  isFrozen = false,
  variant = 'compact',
}) => {
  const info = getStreakLevel(currentStreak);
  const progress = getStreakLevelProgress(currentStreak);
  const freezeAvailable = hasAvailableFreeze(user);

  if (variant === 'full') {
    return (
      <FullBadge
        user={user}
        streak={currentStreak}
        info={info}
        progress={progress}
        isAtRisk={isAtRisk}
        isFrozen={isFrozen}
      />
    );
  }

  return (
    <CompactBadge
      streak={currentStreak}
      info={info}
      progress={progress}
      isAtRisk={isAtRisk}
      isFrozen={isFrozen}
      freezeAvailable={freezeAvailable}
    />
  );
};
