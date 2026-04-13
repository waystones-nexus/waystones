import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CheckCircle2, Circle, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useAmbient } from '../../contexts/AmbientContext';
import { QUESTS, UNIT_THEMES } from '../../constants/ambientManifest';

export const QuestLog: React.FC = () => {
  const { activeQuests, triggerWhisper, stats, currentContext } = useAmbient();
  const [isOpen, setIsOpen] = useState(false);

  const completedCount = activeQuests.filter(q => q.completed).length;
  const totalCount = activeQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleQuestHint = (questId: string) => {
    const quest = QUESTS.find(q => q.id === questId);
    if (quest) {
      triggerWhisper(quest.unit, quest.hint, { targetId: quest.targetElementId });
    }
  };

  const renderQuestItem = (state: any, isSide?: boolean) => {
    const quest = QUESTS.find(q => q.id === state.id);
    if (!quest) return null;
    const isCompleted = state.completed;
    const theme = UNIT_THEMES[quest.unit];

    return (
      <div 
        key={quest.id}
        className={`group relative p-3.5 rounded-2xl border transition-all duration-300 ${
          isCompleted 
            ? 'bg-emerald-500/5 border-emerald-500/20' 
            : isSide 
              ? 'bg-slate-50 border-slate-100 hover:border-indigo-300'
              : 'bg-white border-white hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {isCompleted ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <CheckCircle2 size={12} strokeWidth={3} />
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full border-2 border-slate-200 transition-colors group-hover:border-indigo-400`} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`text-[11px] font-black uppercase tracking-tight ${isCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>
                {state.titleOverride || quest.title}
              </h4>
              <div className="flex items-center gap-2">
                {quest.isMandatory && !isCompleted && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200 animate-pulse">
                     REQUIRED
                  </span>
                )}
                {state.progress && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                    {state.progress}
                  </span>
                )}
              </div>
            </div>
            <p className={`text-[10px] mt-0.5 font-medium leading-relaxed ${isCompleted ? 'text-emerald-600/70' : 'text-slate-400'}`}>
              {quest.taskTitle}
            </p>
          </div>

          {/* Character Avatar (Clickable for guidance) */}
          <button 
            onClick={() => !isCompleted && handleQuestHint(quest.id)}
            disabled={isCompleted}
            className={`shrink-0 w-8 h-8 rounded-xl border-2 ${theme.border} bg-white flex items-center justify-center overflow-hidden transition-all duration-300 ${
              isCompleted 
                ? 'grayscale opacity-30 shadow-none' 
                : 'shadow-sm hover:scale-110 active:scale-95 cursor-pointer hover:border-indigo-400'
            }`}
            title={isCompleted ? "Quest Archive" : "Seek Guidance"}
          >
            <img src={`/units/${quest.unit}.png`} alt="" className="w-full h-full object-contain" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-24 right-6 z-[200] flex flex-col items-end gap-3 pointer-events-none">
      {/* Trigger: Minimal Ritual Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto flex items-center gap-3 pl-2 pr-6 py-2 rounded-full shadow-2xl transition-all duration-300 active:scale-90 group border relative ${
          isOpen 
            ? 'bg-slate-900 text-white border-slate-800' 
            : 'bg-white/80 backdrop-blur-md border-white/50 text-slate-700 hover:bg-white hover:border-indigo-200'
        }`}
      >
        {/* Circular Progress Avatar */}
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="transparent"
              stroke={isOpen ? '#ffffff10' : '#f1f5f9'}
              strokeWidth="2.5"
            />
            <motion.circle
              cx="20"
              cy="20"
              r="18"
              fill="transparent"
              stroke={progressPercent === 100 ? '#10b981' : '#6366f1'}
              strokeWidth="2.5"
              strokeDasharray={113}
              initial={{ strokeDashoffset: 113 }}
              animate={{ strokeDashoffset: 113 - (113 * progressPercent) / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center p-1.5">
            <div className={`w-full h-full rounded-full overflow-hidden border-2 shadow-inner transition-transform duration-300 group-hover:scale-110 ${isOpen ? 'border-white/20' : 'border-slate-50'}`}>
               <img 
                 src={`/units/${isOpen ? 'shade' : (activeQuests.find(q => !q.completed)?.id ? QUESTS.find(q => q.id === activeQuests.find(q => !q.completed)?.id)?.unit : 'peon')}.png`} 
                 className="w-full h-full object-contain" 
                 alt="" 
               />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start">
          <span className={`text-[9px] font-black uppercase tracking-[0.25em] transition-colors ${isOpen ? 'text-indigo-400' : 'text-slate-400'}`}>
            {isOpen ? 'Minimize' : 'Alignment Status'}
          </span>
          <span className="text-[12px] font-black tracking-tight leading-none mt-0.5">
            {isOpen ? 'Close Log' : `${completedCount}/${totalCount} Complete`}
          </span>
        </div>
        
        {/* Badge for hidden side quests */}
        {!isOpen && totalCount - completedCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border border-white text-[8px] font-black text-white items-center justify-center">
              {totalCount - completedCount}
            </span>
          </div>
        )}
      </button>

      {/* Scroll Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-80 bg-white/40 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-auto"
          >
            {/* Header: Ritual Ledger Style */}
            <div className="bg-gradient-to-br from-slate-900/95 to-indigo-950/95 px-7 py-6 flex items-center justify-between relative overflow-hidden">
              {/* Subtle light effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 border border-white/10">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300/80">Ambient Alignments</h3>
                  <p className="text-[13px] font-black text-white mt-0.5 tracking-tight">Active Processes</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end relative z-10">
                <div className="text-[16px] font-black text-white tabular-nums leading-none">
                  {progressPercent}<span className="text-[10px] opacity-40 ml-0.5">%</span>
                </div>
                <div className="text-[9px] font-bold text-indigo-300/40 uppercase tracking-widest mt-1">Convergence</div>
              </div>
            </div>

            {/* List with improved spacing and contrast */}
            <div className="p-5 space-y-8 max-h-[420px] overflow-y-auto custom-scrollbar">
              {activeQuests.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle size={20} className="text-slate-300" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">The Path is Clear</p>
                  <p className="text-[9px] font-medium text-slate-300 mt-1 uppercase tracking-widest">No active alignments found</p>
                </div>
              ) : (
                <>
                  {/* Quest Grouping Logic */}
                  {(() => {
                    const mandatory = activeQuests.filter(s => QUESTS.find(q => q.id === s.id)?.isMandatory);
                    const currentStepQuests = activeQuests.filter(s => {
                       const q = QUESTS.find(q => q.id === s.id);
                       const questSteps = Array.isArray(q?.step) ? q?.step : (q?.step !== undefined ? [q?.step] : null);
                       return !q?.isMandatory && questSteps?.includes(currentContext.step);
                    });
                    const auxiliary = activeQuests.filter(s => {
                       const q = QUESTS.find(q => q.id === s.id);
                       const questSteps = Array.isArray(q?.step) ? q?.step : (q?.step !== undefined ? [q?.step] : null);
                       return !q?.isMandatory && !questSteps?.includes(currentContext.step);
                    });

                    return (
                      <>
                        {/* Mandatory Path */}
                        {mandatory.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 px-1 mb-4">
                              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/80">Required Alignments</h4>
                              <div className="h-[1px] flex-1 bg-amber-50" />
                            </div>
                            {mandatory.map((state) => renderQuestItem(state))}
                          </div>
                        )}

                        {/* Current Stage Side Quests */}
                        {currentStepQuests.length > 0 && (
                          <div className="space-y-3 pt-4">
                            <div className="flex items-center gap-3 px-1 mb-4">
                              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Section Goals</h4>
                              <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>
                            {currentStepQuests.map((state) => renderQuestItem(state))}
                          </div>
                        )}

                        {/* Auxiliary Ancient Alignments */}
                        {auxiliary.length > 0 && (
                          <div className="space-y-3 pt-4">
                             <div className="flex items-center gap-3 px-1 mb-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400/60">Auxiliary Rites</h4>
                               <div className="h-[1px] flex-1 bg-indigo-50" />
                             </div>
                             {auxiliary.map((state) => renderQuestItem(state, true))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Footer: Minimal & Refined */}
            <div className="px-7 py-4 bg-slate-50/50 border-t border-slate-100/50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${completedCount === totalCount ? 'bg-emerald-500' : 'bg-indigo-400 animate-pulse'}`} />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    {completedCount === totalCount ? 'Alignment Complete' : 'Gathering Symmetry...'}
                  </p>
               </div>
               <div className="flex -space-x-2">
                  {QUESTS.slice(0, 3).map((q, i) => (
                    <div key={i} className={`w-6 h-6 rounded-lg border-2 border-white bg-white shadow-sm overflow-hidden transform hover:-translate-y-1 transition-transform cursor-help`}>
                      <img src={`/units/${q.unit}.png`} className="w-full h-full object-contain" alt="" title={q.unit} />
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
