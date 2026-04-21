import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, CheckCircle2, HelpCircle, RotateCcw, Anchor } from 'lucide-react';
import { useAmbient } from '../../contexts/AmbientContext';
import { QUESTS, UNIT_THEMES } from '../../constants/ambientManifest';

interface QuestPanelProps {
  onClose?: () => void;
  onReset?: () => void;
  onUndock?: () => void;
  onDock?: () => void;
  isDocked?: boolean;
  quadrant?: { isLeft: boolean; isTop: boolean };
}

export const QuestPanel: React.FC<QuestPanelProps> = ({
  onClose,
  onReset,
  onUndock,
  onDock,
  isDocked,
  quadrant = { isLeft: false, isTop: true }
}) => {
  const { activeQuests, triggerQuestWhisper, currentContext } = useAmbient();

  const completedCount = activeQuests.filter(q => q.completed).length;
  const totalCount = activeQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleQuestHint = (questId: string) => {
    triggerQuestWhisper(questId, { priority: true });
  };

  const renderQuestItem = (state: any) => {
    const quest = QUESTS.find(q => q.id === state.id);
    if (!quest) return null;
    const isCompleted = state.completed;

    return (
      <div 
        key={quest.id}
        className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
          isCompleted 
            ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' 
            : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {isCompleted ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
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
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-widest">
                     REQUIRED
                  </span>
                )}
                {state.progress && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-100">
                    {state.progress}
                  </span>
                )}
              </div>
            </div>
            <p className={`text-[10px] mt-0.5 font-medium leading-relaxed ${isCompleted ? 'text-emerald-600/70' : 'text-slate-500'}`}>
              {quest.taskTitle}
            </p>
          </div>

          <button 
            onClick={() => !isCompleted && handleQuestHint(quest.id)}
            disabled={isCompleted}
            className={`shrink-0 w-8 h-8 rounded-xl border border-slate-100 bg-white flex items-center justify-center overflow-hidden transition-all duration-300 ${
              isCompleted 
                ? 'grayscale opacity-30 shadow-none' 
                : 'shadow-sm hover:scale-110 active:scale-95 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30'
            }`}
            title={isCompleted ? "Quest Archive" : "Seek Guidance"}
          >
            <img src={`/units/${quest.unit}.png`} alt="" className="w-full h-full object-contain p-1" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={isDocked ? { opacity: 0, y: 10 } : { 
        y: quadrant.isTop ? 20 : -20, 
        x: 0,
        opacity: 0, 
        scale: 0.95 
      }}
      animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
      exit={isDocked ? { opacity: 0, y: 10 } : { 
        y: quadrant.isTop ? 20 : -20, 
        x: 0,
        opacity: 0, 
        scale: 0.95 
      }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-80 bg-white border border-slate-100 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] overflow-hidden pointer-events-auto"
    >
      {/* Header */}
      <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-7 flex items-center justify-between relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Ambient Alignments</h3>
            <p className="text-[15px] font-black text-slate-800 mt-0.5 tracking-tight">Active Quests</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end relative z-10">
          <div className="text-[18px] font-black text-slate-900 tabular-nums leading-none">
            {progressPercent}<span className="text-[11px] text-slate-400 ml-0.5">%</span>
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Aligned</div>
        </div>
      </div>

      {/* List */}
      <div className="p-6 space-y-8 max-h-[420px] overflow-y-auto custom-scrollbar">
        {activeQuests.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <HelpCircle size={22} className="text-slate-300" />
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">The Path is Clear</p>
            <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-widest">No active alignments</p>
          </div>
        ) : (
          <>
            {(() => {
              const mandatory = activeQuests
                .filter(s => QUESTS.find(q => q.id === s.id)?.isMandatory)
                .sort((a, b) => {
                   if (a.completed !== b.completed) return a.completed ? 1 : -1;
                   const weightA = QUESTS.find(q => q.id === a.id)?.weight || 99;
                   const weightB = QUESTS.find(q => q.id === b.id)?.weight || 99;
                   return weightA - weightB;
                });

              const nicheQuests = activeQuests
                .filter(s => {
                   const q = QUESTS.find(q => q.id === s.id);
                   return !q?.isMandatory && q?.isNiche;
                })
                .sort((a, b) => {
                   if (a.completed !== b.completed) return a.completed ? 1 : -1;
                   const weightA = QUESTS.find(q => q.id === a.id)?.weight || 99;
                   const weightB = QUESTS.find(q => q.id === b.id)?.weight || 99;
                   return weightA - weightB;
                });

              const currentStepQuests = activeQuests
                .filter(s => {
                   const q = QUESTS.find(q => q.id === s.id);
                   const questSteps = Array.isArray(q?.step) ? q?.step : (q?.step !== undefined ? [q?.step] : null);
                   return !q?.isMandatory && !q?.isNiche && questSteps?.includes(currentContext.step);
                })
                .sort((a, b) => {
                   if (a.completed !== b.completed) return a.completed ? 1 : -1;
                   const weightA = QUESTS.find(q => q.id === a.id)?.weight || 99;
                   const weightB = QUESTS.find(q => q.id === b.id)?.weight || 99;
                   return weightA - weightB;
                });

              const auxiliary = activeQuests
                .filter(s => {
                   const q = QUESTS.find(q => q.id === s.id);
                   const questSteps = Array.isArray(q?.step) ? q?.step : (q?.step !== undefined ? [q?.step] : null);
                   return !q?.isMandatory && !q?.isNiche && !questSteps?.includes(currentContext.step);
                })
                .sort((a, b) => {
                   if (a.completed !== b.completed) return a.completed ? 1 : -1;
                   const weightA = QUESTS.find(q => q.id === a.id)?.weight || 99;
                   const weightB = QUESTS.find(q => q.id === b.id)?.weight || 99;
                   return weightA - weightB;
                });

              return (
                <>
                  {mandatory.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-1 mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/80">Required Alignments</h4>
                        <div className="h-[1px] flex-1 bg-indigo-50" />
                      </div>
                      {mandatory.map((state) => renderQuestItem(state))}
                    </div>
                  )}

                  {currentStepQuests.length > 0 && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center gap-3 px-1 mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80">Section Goals</h4>
                        <div className="h-[1px] flex-1 bg-slate-100" />
                      </div>
                      {currentStepQuests.map((state) => renderQuestItem(state))}
                    </div>
                  )}

                  {auxiliary.length > 0 && (
                    <div className="space-y-3 pt-4">
                       <div className="flex items-center gap-3 px-1 mb-4">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/50">Auxiliary Alignments</h4>
                         <div className="h-[1px] flex-1 bg-slate-50" />
                       </div>
                       {auxiliary.map((state) => renderQuestItem(state))}
                    </div>
                  )}

                  {nicheQuests.length > 0 && (
                    <div className="space-y-3 pt-4">
                       <div className="flex items-center gap-3 px-1 mb-4">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/40">Niche Alignments</h4>
                         <div className="h-[1px] flex-1 bg-indigo-50/50" />
                       </div>
                       {nicheQuests.map((state) => renderQuestItem(state))}
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100/50 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${completedCount === totalCount ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.4)]'}`} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
              {completedCount === totalCount ? 'Alignment Complete' : 'Harmonizing Nodes...'}
            </p>
         </div>
         <div className="flex -space-x-1.5 hover:space-x-0.5 transition-all duration-500 group/units">
            {['peasant', 'peon', 'acolyte', 'wisp', 'homunculus', 'shade'].map((unit) => (
              <div key={unit} className="w-6 h-6 rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden transform hover:-translate-y-2 hover:scale-125 hover:z-10 transition-all cursor-help relative group/unit">
                <img src={`/units/${unit}.png`} className="w-full h-full object-contain p-0.5" alt="" title={unit} />
              </div>
            ))}
         </div>
      </div>

      {/* Admin/Settings Footer */}
      <div className="px-8 py-3 bg-white border-t border-slate-100 flex justify-end gap-4">
         {onReset && (
           <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors group"
           >
             <RotateCcw size={10} className="group-hover:rotate-[-120deg] transition-transform" />
             Reset Position
           </button>
         )}
         {isDocked && onUndock && (
           <button
            onClick={onUndock}
            className="hidden md:flex items-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors group"
           >
             <Anchor size={10} className="group-hover:scale-110 transition-transform" />
             Undock Character
           </button>
         )}
         {!isDocked && onDock && (
           <button
            onClick={onDock}
            className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors group"
           >
             <Anchor size={10} className="group-hover:scale-110 transition-transform" />
             Dock Character
           </button>
         )}
      </div>
    </motion.div>
  );
};
