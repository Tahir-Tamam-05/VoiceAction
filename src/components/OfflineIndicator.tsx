import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Non-intrusive banner shown at the top of the screen when offline or syncing.
 * Disappears after reconnect + sync (3 s).
 */
export const OfflineIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  const visible = !isOnline || wasOffline;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            backdropFilter: 'blur(8px)',
            borderBottom: isOnline
              ? '1px solid rgba(34,197,94,0.3)'
              : '1px solid rgba(239,68,68,0.3)',
          }}
        >
          {isOnline ? (
            <>
              <RefreshCw size={11} className="text-green-400 animate-spin" />
              <span className="text-green-400">Syncing…</span>
            </>
          ) : (
            <>
              <WifiOff size={11} className="text-red-400" />
              <span className="text-red-400">Offline — notes saved locally</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
