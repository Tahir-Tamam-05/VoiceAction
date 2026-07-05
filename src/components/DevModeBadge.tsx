import React from 'react';
import { isDevBypass } from '../config/devBypass';

/**
 * Renders a small fixed badge when VITE_DEV_BYPASS_AUTH=true.
 * Renders nothing in production or when bypass is off.
 */
export const DevModeBadge: React.FC = () => {
  if (!isDevBypass) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed bottom-24 right-3 flex items-center gap-1.5 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-lg pointer-events-none select-none"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse inline-block" />
      DEV MODE
    </div>
  );
};
