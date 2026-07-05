import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WeeklyDigest } from './weeklyDigestService';
import { X, TrendingUp, Calendar, Sparkles, Brain, Link2, Clock, ChevronRight } from 'lucide-react';
import { notifications } from '../notifications/notificationService';

interface WeeklyDigestCardProps {
  digest: WeeklyDigest;
  onDismiss: () => void;
  onViewDetails?: () => void;
}

export const WeeklyDigestCard: React.FC<WeeklyDigestCardProps> = ({
  digest,
  onDismiss,
  onViewDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show notification on mount
  useEffect(() => {
    notifications.weeklyDigestReady({
      count: digest.totalNotes,
      topMood: digest.topMood,
    });
  }, [digest]);

  const weekStart = new Date(digest.weekStarting).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const weekEnd = new Date(digest.weekEnding).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      className="mb-8 relative overflow-hidden"
    >
      {/* Glass morphism card */}
      <div className="glass-card liquid-glow rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 rounded-full" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 blur-2xl -ml-12 -mb-12 rounded-full" />

        {/* Header */}
        <div className="relative flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-headline font-extrabold text-xl tracking-tight text-on-surface">
                Weekly Digest
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary/60 font-bold">
                {weekStart} - {weekEnd}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 rounded-xl hover:bg-surface-high/50 text-text-secondary/40 hover:text-text-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main stats grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatBox
            icon={Brain}
            value={digest.totalNotes}
            label="Thoughts"
            color="text-primary"
          />
          <StatBox
            icon={Link2}
            value={digest.totalConnections}
            label="Connections"
            color="text-blue-500"
          />
          <StatBox
            icon={TrendingUp}
            value={digest.topMood}
            label="Top Mood"
            color="text-green-500"
            isText
          />
          <StatBox
            icon={Clock}
            value={digest.mostActiveDay.slice(0, 3)}
            label="Active Day"
            color="text-amber-500"
            isText
          />
        </div>

        {/* Insights */}
        {digest.insights.length > 0 && (
          <div className="relative mb-4">
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-text-secondary/40 mb-3">
              Insights
            </h4>
            <ul className="space-y-2">
              {digest.insights.slice(0, isExpanded ? undefined : 2).map((insight, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <span className="text-primary mt-0.5">•</span>
                  <span>{insight}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Expand/Collapse button */}
        {digest.insights.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline mb-4"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}

        {/* Action buttons */}
        <div className="relative flex gap-3">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 py-3 bg-surface-highest hover:bg-surface-high border border-primary/10 rounded-xl text-xs font-bold uppercase tracking-widest text-on-surface transition-all"
            >
              View Details
            </button>
          )}
          <button
            onClick={onDismiss}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
          >
            Got It
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Stat box component
const StatBox: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
  isText?: boolean;
}> = ({ icon: Icon, value, label, color, isText }) => (
  <div className="bg-surface-low/50 border border-primary/5 rounded-2xl p-3 text-center hover:border-primary/20 transition-colors">
    <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
    <p className={`font-headline font-extrabold ${isText ? 'text-lg' : 'text-2xl'} text-on-surface mb-0.5`}>
      {value}
    </p>
    <p className="text-[9px] uppercase tracking-widest text-text-secondary/60 font-bold">
      {label}
    </p>
  </div>
);

// Compact version for inline display
export const WeeklyDigestBadge: React.FC<{
  digest: WeeklyDigest;
  onClick: () => void;
}> = ({ digest, onClick }) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className="w-full mb-6 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-4 flex items-center justify-between backdrop-blur-sm"
  >
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div className="text-left">
        <p className="font-bold text-sm text-on-surface">Weekly Digest Ready</p>
        <p className="text-[10px] text-text-secondary/60">
          {digest.totalNotes} thoughts captured this week
        </p>
      </div>
    </div>
    <ChevronRight className="w-5 h-5 text-primary" />
  </motion.button>
);
