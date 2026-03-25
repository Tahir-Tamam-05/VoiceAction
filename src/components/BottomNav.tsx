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
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 sm:px-4 h-[80px] bg-surface/90 backdrop-blur-2xl border-t border-primary/10 shadow-[0_-4px_20px_rgba(249,115,22,0.08)] rounded-t-3xl">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
            className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer ${
              isActive ? 'text-primary' : 'text-text-secondary/60 hover:text-text-secondary'
            }`}
          >
            <item.icon 
              size={24} 
              className={isActive ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.6)] fill-current' : ''} 
            />
            <span className="text-[9px] font-bold tracking-widest uppercase mt-1">{item.label}</span>
          </button>
        );
      })}
      
      {/* Floating Mic for quick access */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
        <button 
          onClick={() => setScreen('recording')}
          className="w-[64px] h-[64px] bg-primary rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:scale-105 active:scale-90 transition-all duration-300"
        >
          <Mic size={28} fill="currentColor" />
        </button>
      </div>
    </nav>
  );
};
