import React from 'react';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { Home, Search, History, Settings, Mic, Network, LucideIcon } from 'lucide-react';

interface BottomNavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

const NAV_ITEMS: Array<{ id: string; icon: LucideIcon; label: string }> = [
  { id: 'home',         icon: Home,     label: 'Home'    },
  { id: 'search',       icon: Search,   label: 'Search'  },
  { id: 'history',      icon: History,  label: 'History' },
  { id: 'thoughtgraph', icon: Network,  label: 'Graph'   },
  { id: 'settings',     icon: Settings, label: 'Settings'},
];

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, setScreen }) => {
  const left  = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-color)',
        boxShadow: '0 -1px 0 var(--border-color), 0 -12px 32px rgba(0,0,0,0.08)',
      }}
    >
      {/* Floating record button */}
      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => setScreen('recording')}
          className="w-14 h-14 rounded-full flex items-center justify-center text-black active:scale-90 transition-all duration-200"
          style={{
            background: '#f97316',
            boxShadow: '0 0 0 3px var(--surface), 0 0 0 4px rgba(249,115,22,0.25), 0 8px 24px rgba(249,115,22,0.45)',
          }}
        >
          <Mic size={22} fill="currentColor" />
        </button>
      </div>

      <div
        className="flex items-stretch h-[58px] max-w-md mx-auto"
        style={{ paddingLeft: 4, paddingRight: 4 }}
      >
        {/* Left two items */}
        <div className="flex flex-1">
          {left.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={currentScreen === item.id}
              onPress={() => setScreen(item.id as Screen)}
            />
          ))}
        </div>

        {/* Center spacer for mic button */}
        <div className="w-14 flex-shrink-0" />

        {/* Right three items */}
        <div className="flex flex-1">
          {right.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={currentScreen === item.id}
              onPress={() => setScreen(item.id as Screen)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
};

// ─── Individual nav button ────────────────────────────────────

interface NavButtonProps {
  item: { id: string; icon: LucideIcon; label: string };
  isActive: boolean;
  onPress: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onPress }) => {
  const Icon = item.icon;

  return (
    <button
      onClick={onPress}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200 active:scale-90"
    >
      {/* Active indicator dot */}
      <div className="relative flex items-center justify-center">
        {isActive && (
          <motion.div
            layoutId="nav-active-dot"
            className="absolute -top-1 w-1 h-1 rounded-full bg-primary"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <Icon
          size={20}
          strokeWidth={isActive ? 2.2 : 1.8}
          className="transition-all duration-200"
          style={{
            color: isActive ? 'var(--color-primary, #f97316)' : 'var(--text-secondary)',
            filter: isActive ? 'drop-shadow(0 0 6px rgba(249,115,22,0.5))' : 'none',
          }}
        />
      </div>
      <span
        className="text-[9px] font-bold uppercase tracking-widest transition-all duration-200"
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
