import React from 'react';
import { Screen } from '../types';
import { Home, Search, History, Settings, Mic } from 'lucide-react';

interface BottomNavProps {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, setScreen }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-2xl border-t border-primary/10 shadow-[0_-4px_20px_rgba(249,115,22,0.08)] rounded-t-3xl"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      {/* Floating Mic button — positioned absolute center */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 transition-transform">
        <button 
          onClick={() => setScreen('recording')}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:scale-105 active:scale-90 transition-all duration-300"
        >
          <Mic size={24} className="sm:w-7 sm:h-7" fill="currentColor" />
        </button>
      </div>

      {/* Nav items container */}
      <div className="flex justify-between items-center px-4 md:px-6 h-[68px] sm:h-[76px] max-w-lg mx-auto relative">
        <div className="flex flex-1 justify-between pr-10">
          {navItems.slice(0, 2).map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as Screen)}
                className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer ${
                  isActive ? 'text-primary' : 'text-text-secondary/60 hover:text-text-secondary'
                }`}
              >
                <item.icon 
                  size={22} 
                  className={isActive ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] fill-current' : ''} 
                />
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase mt-1 opacity-80">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-1 justify-between pl-10">
          {navItems.slice(2).map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as Screen)}
                className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer ${
                  isActive ? 'text-primary' : 'text-text-secondary/60 hover:text-text-secondary'
                }`}
              >
                <item.icon 
                  size={22} 
                  className={isActive ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] fill-current' : ''} 
                />
                <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase mt-1 opacity-80">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
