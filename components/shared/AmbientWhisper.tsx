import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAmbient } from '../../contexts/AmbientContext';
import { UNIT_THEMES } from '../../constants/ambientManifest';

export const AmbientWhisper: React.FC = () => {
  const { activeWhisper, clearWhisper } = useAmbient();
  
  if (!activeWhisper) return null;

  const isRare = activeWhisper.rare ?? false;
  const theme = UNIT_THEMES[activeWhisper.unit];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
        className={`fixed bottom-14 left-6 z-[9999] flex items-center gap-4 max-w-[320px] select-none ${isRare ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
        onClick={isRare ? clearWhisper : undefined}
      >
        <div className="relative shrink-0">
          {/* Pulse Effect */}
          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: isRare ? 2 : 3,
              repeat: Infinity,
            }}
            className={`absolute -inset-2 rounded-full blur-xl ${theme.pulse}`}
          />
          
          <div className={`relative z-10 w-12 h-12 rounded-full border-2 bg-white overflow-hidden p-1 ${theme.border} shadow-lg`}>
            <img 
              src={`/units/${activeWhisper.unit}.png`} 
              alt={activeWhisper.unit}
              className="w-full h-full object-contain grayscale opacity-60 mix-blend-multiply" 
            />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-[20px] p-3.5 shadow-2xl relative">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5 opacity-60">
            {activeWhisper.unit}
          </p>
          <p className="text-[11px] font-medium leading-relaxed text-slate-600 italic">
            "{activeWhisper.text}"
          </p>
          
          {/* Small notch */}
          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-white/90 border-l border-b border-slate-200 rotate-45" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
