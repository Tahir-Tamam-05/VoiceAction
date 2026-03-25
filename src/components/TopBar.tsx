import React from 'react';
import { Screen, AuthUser } from '../types';
import { Search, ArrowLeft } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
  onSetScreen?: (s: Screen) => void;
  isDark?: boolean;
  onToggleDarkMode?: () => void;
  onExport?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  title, 
  onBack, 
  user, 
  onLogout, 
  onSetScreen, 
  isDark, 
  onToggleDarkMode,
  onExport
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md bg-gradient-to-b from-primary/5 to-transparent h-20 flex items-center justify-between px-4 sm:px-6 border-b border-primary/5">
      <div className="flex items-center gap-4">
        {onBack ? (
          <button onClick={onBack} className="text-primary active:scale-90 transition-transform">
            <ArrowLeft size={24} />
          </button>
        ) : (
          <button className="text-primary active:scale-90 transition-transform">
            <div className="w-6 h-0.5 bg-current mb-1.5" />
            <div className="w-4 h-0.5 bg-current" />
          </button>
        )}
        <h1 className="font-headline font-extrabold tracking-tighter uppercase text-xl sm:text-2xl text-on-surface truncate max-w-[150px] sm:max-w-none">{title}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Search size={20} className="text-text-secondary/60 cursor-pointer hover:text-primary transition-colors" />
        {user && onLogout && onSetScreen && onToggleDarkMode && onExport && (
          <ProfileMenu 
            user={user} 
            onLogout={onLogout} 
            onSetScreen={onSetScreen} 
            isDark={!!isDark} 
            onToggleDarkMode={onToggleDarkMode}
            onExport={onExport}
          />
        )}
      </div>
    </header>
  );
};
