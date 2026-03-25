import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, LogOut, Download, Moon, Sun, User } from 'lucide-react';
import { AuthUser, Screen } from '../types';
import { getInitials } from '../utils/authHelpers';

interface ProfileMenuProps {
  user: AuthUser | null;
  onLogout: () => void;
  onSetScreen: (s: Screen) => void;
  isDark: boolean;
  onToggleDarkMode: () => void;
  onExport: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ 
  user, 
  onLogout, 
  onSetScreen, 
  isDark, 
  onToggleDarkMode,
  onExport
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black font-extrabold text-sm tracking-tight cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:scale-105 transition-transform"
      >
        {getInitials(user.name)}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-56 bg-surface border border-primary/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-primary/5">
                <p className="text-on-surface font-bold text-sm">{user.name}</p>
                <p className="text-text-secondary text-[10px] uppercase tracking-wider">{user.email}</p>
              </div>
              
              <div className="p-2">
                <button 
                  onClick={() => { onSetScreen('settings'); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-on-surface hover:bg-surface-low rounded-lg transition-colors"
                >
                  <Settings size={16} className="text-primary" />
                  <span>Settings</span>
                </button>
                <button 
                  onClick={() => { onExport(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-on-surface hover:bg-surface-low rounded-lg transition-colors"
                >
                  <Download size={16} className="text-primary" />
                  <span>Export Notes</span>
                </button>
                <button 
                  onClick={() => { onToggleDarkMode(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-on-surface hover:bg-surface-low rounded-lg transition-colors"
                >
                  {isDark ? <Sun size={16} className="text-primary" /> : <Moon size={16} className="text-primary" />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>

              <div className="p-2 border-t border-primary/5">
                <button 
                  onClick={() => { onLogout(); setIsOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
