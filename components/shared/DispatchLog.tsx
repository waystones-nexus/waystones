import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScrollText } from 'lucide-react';
import { useAmbient } from '../../contexts/AmbientContext';
import { UNIT_THEMES } from '../../constants/ambientManifest';

interface DispatchLogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DispatchLog: React.FC<DispatchLogProps> = ({ isOpen, onClose }) => {
  const { history } = useAmbient();

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-[90]"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-10 left-6 right-6 max-w-[400px] bg-white/95 backdrop-blur-lg rounded-2xl border border-slate-200/50 shadow-2xl z-[95] pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200/50">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-indigo-400" />
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Dispatch Log
                </div>
                {history.length > 0 && (
                  <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                    {history.length} entries
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar-indigo p-1">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  No whispers yet. Units are silent.
                </div>
              ) : (
                <div className="divide-y divide-slate-100/50">
                  {history.map((entry) => {
                    const theme = UNIT_THEMES[entry.unit];
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 hover:bg-slate-50/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Unit Icon */}
                          <div
                            className={`relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border-2 ${theme?.border || 'border-slate-200'} bg-white p-1 transition-all group-hover:scale-110 shadow-sm`}
                          >
                            <img
                              src={`/units/${entry.unit}.png`}
                              alt=""
                              className="h-full w-full object-contain grayscale opacity-60 mix-blend-multiply"
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                {entry.unit}
                              </span>
                              {entry.rare && (
                                <span className="text-amber-500 text-[10px]">✦</span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium leading-relaxed text-slate-600 italic mt-0.5 break-words">
                              "{entry.text}"
                            </p>
                            <span className="text-[9px] font-bold text-slate-300 mt-2 block uppercase tracking-tighter">
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
