// IntelligenceIndicator — unobtrusive readiness state for the local model.
// Shows only while the semantic model is downloading/initializing; explains
// the on-device privacy model exactly once. Renders nothing when idle/ready.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { modelManager } from '../features/intelligence/IntelligenceEngine';
import { ModelStatus } from '../features/intelligence/types';
import { INTEL_NOTICE_KEY } from '../features/intelligence/config';

export const IntelligenceIndicator: React.FC = () => {
  const [status, setStatus] = useState<ModelStatus>({ state: 'idle' });
  const [showNotice] = useState(() => !localStorage.getItem(INTEL_NOTICE_KEY));

  useEffect(() => modelManager.subscribe(setStatus), []);

  // Mark the privacy notice as seen once the first load completes
  useEffect(() => {
    if (status.state === 'ready' && showNotice) {
      localStorage.setItem(INTEL_NOTICE_KEY, 'true');
    }
  }, [status.state, showNotice]);

  const visible = status.state === 'loading' || status.state === 'error';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-2rem)]"
          style={{ bottom: 'calc(58px + max(env(safe-area-inset-bottom, 0px), 6px) + 44px)' }}
        >
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface border border-primary/15 shadow-lg">
            {status.state === 'loading' ? (
              <>
                <Sparkles size={13} className="text-primary animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-on-surface whitespace-nowrap">
                    Preparing local intelligence…
                    {status.progress !== null && ` ${status.progress}%`}
                  </p>
                  {showNotice && (
                    <p className="text-[9px] text-text-secondary whitespace-nowrap overflow-hidden text-ellipsis">
                      VoiceAction processes your thoughts privately on this device.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold text-on-surface">
                  Smart features paused
                </p>
                <button
                  onClick={() => modelManager.retry()}
                  className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-primary active:scale-95 transition-transform min-h-[28px] px-1.5"
                >
                  <RefreshCw size={10} /> Retry
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
