import React, { useState, useCallback } from 'react';
import { ScrollText } from 'lucide-react';
import { useAmbient } from '../../contexts/AmbientContext';
import { IDLE_WHISPERS, LEGENDARY_WHISPERS } from '../../constants/ambientManifest';
import { DispatchLog } from './DispatchLog';

export const Dispatch: React.FC = () => {
  const { history, triggerWhisper, activeQuests, currentContext } = useAmbient();
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Check if all active quests are completed OR if we are on the last step of deployment
  const isAligned = (activeQuests.length > 0 && activeQuests.every(q => q.completed)) ||
                    (currentContext.tab === 'deploy' && currentContext.step === 5) ||
                    (currentContext.tab === 'quick-publish' && currentContext.step === 3);

  const handleSummon = useCallback(() => {
    // 5% chance for legendary whisper, 95% chance for normal whisper
    const isLegendary = Math.random() < 0.05;

    if (isLegendary) {
      const randomWhisper = LEGENDARY_WHISPERS[Math.floor(Math.random() * LEGENDARY_WHISPERS.length)];
      triggerWhisper(randomWhisper.unit, randomWhisper.text, { rare: true });
    } else {
      const allQuotes = [...IDLE_WHISPERS];
      const randomWhisper = allQuotes[Math.floor(Math.random() * allQuotes.length)];
      triggerWhisper(randomWhisper.unit, randomWhisper.text);
    }
  }, [triggerWhisper]);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[60] h-8 border-t border-slate-200/50 bg-white/60 backdrop-blur-md pointer-events-none">
        <div className="flex h-full items-center justify-end px-6">
          <div className="flex items-center gap-1">
            {/* Dispatch Log Button */}
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setIsLogOpen(!isLogOpen)}
                className="pointer-events-auto flex items-center gap-2 opacity-60 hover:opacity-100 transition-all group px-3 py-1 rounded-md hover:bg-slate-100/50"
                title="View whisper history"
              >
                <ScrollText size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Dispatch ({history.length})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSummon}
              className="pointer-events-auto flex items-center gap-2 opacity-60 hover:opacity-100 transition-all group px-3 py-1 rounded-md hover:bg-slate-100/50"
              title="Summon a random whisper"
            >
               <div className={`h-1.5 w-1.5 rounded-full ${isAligned ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'} animate-pulse group-hover:bg-indigo-500 transition-colors`} />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Nodes {isAligned ? 'Aligned' : 'Unaligned'}
               </span>
            </button>
          </div>
        </div>
      </div>

      {/* Dispatch Log Panel */}
      <DispatchLog isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
    </>
  );
};
