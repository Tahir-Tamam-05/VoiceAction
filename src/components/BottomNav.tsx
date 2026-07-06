import React from 'react';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { Home, History, Settings, Mic, Network, LucideIcon } from 'lucide-react';

interface BottomNavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

// Four destinations composed symmetrically around the primary Record action.
// Search intentionally lives in the TopBar only — no duplicate entry here.
const LEFT_ITEMS: Array<{ id: Screen; icon: LucideIcon; label: string }> = [
  { id: 'home',    icon: Home,    label: 'Home'    },
  { id: 'history', icon: History, label: 'History' },
];
const RIGHT_ITEMS: Array<{ id: Screen; icon: LucideIcon; label: string }> = [
  { id: 'thoughtgraph', icon: Network,  label: 'Graph'    },
  { id: 'settings',     icon: Settings, label: 'Settings' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, setScreen }) => {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-color)',
        boxShadow: '0 -1px 0 var(--border-color), 0 -12px 32px rgba(0,0,0,0.08)',
      }}
    >
      {/* Floating record action — the product's primary interaction */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
        <motion.button
          onClick={() => setScreen('recording')}
          aria-label="Record a thought"
          whileTap={{ scale: 0.88 }}
          className="w-14 h-14 rounded-full flex items-center justify-center text-black transition-shadow duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{
            background: 'radial-gradient(circle at 32% 28%, #ffa057 0%, #f97316 55%, #d95b06 100%)',
            boxShadow: currentScreen === 'recording'
              ? '0 0 0 3px var(--surface), 0 0 0 4.5px rgba(249,115,22,0.55), 0 8px 28px rgba(249,115,22,0.55)'
              : '0 0 0 3px var(--surface), 0 0 0 4px rgba(249,115,22,0.25), 0 8px 24px rgba(249,115,22,0.45)',
          }}
        >
          <Mic size={22} fill="currentColor" aria-hidden />
        </motion.button>
      </div>

      <div className="flex items-stretch h-[58px] max-w-md mx-auto px-1">
        {/* Two destinations per side — equal halves, balanced around the action */}
        <div className="flex flex-1">
          {LEFT_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={currentScreen === item.id}
              onPress={() => setScreen(item.id)}
            />
          ))}
        </div>

        {/* Center well for the record button */}
        <div className="w-[72px] flex-shrink-0" aria-hidden />

        <div className="flex flex-1">
          {RIGHT_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={currentScreen === item.id}
              onPress={() => setScreen(item.id)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
};

// ─── Individual nav button ────────────────────────────────────

interface NavButtonProps {
  item: { id: Screen; icon: LucideIcon; label: string };
  isActive: boolean;
  onPress: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onPress }) => {
  const Icon = item.icon;

  return (
    <button
      onClick={onPress}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      className="flex-1 min-w-[64px] flex flex-col items-center justify-center gap-0.5 relative transition-transform duration-150 active:scale-90 focus-visible:outline-none group"
    >
      {/* Focus ring drawn inside so it isn't clipped by the nav edge */}
      <span
        aria-hidden
        className="absolute inset-1.5 rounded-xl opacity-0 group-focus-visible:opacity-100 transition-opacity"
        style={{ boxShadow: '0 0 0 2px rgba(249,115,22,0.5)' }}
      />

      <div className="relative flex items-center justify-center h-6">
        {isActive && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -top-1.5 w-1 h-1 rounded-full bg-primary"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <motion.div animate={{ y: isActive ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }}>
          <Icon
            size={20}
            strokeWidth={isActive ? 2.2 : 1.8}
            aria-hidden
            className="transition-colors duration-200"
            style={{
              color: isActive ? 'var(--color-primary, #f97316)' : 'var(--text-secondary)',
              filter: isActive ? 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' : 'none',
            }}
          />
        </motion.div>
      </div>
      <span
        className="text-[9px] font-bold uppercase transition-all duration-200"
        style={{
          color: isActive ? 'var(--color-primary, #f97316)' : 'var(--text-secondary)',
          opacity: isActive ? 1 : 0.7,
          letterSpacing: '0.08em',
        }}
      >
        {item.label}
      </span>
    </button>
  );
};
