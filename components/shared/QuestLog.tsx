import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAmbient } from '../../contexts/AmbientContext';
import { usePersistedState } from '../../hooks/usePersistedState';
import { QUESTS } from '../../constants/ambientManifest';
import { useWindowWidth } from '../../hooks/useWindowWidth';
import { QuestPanel } from './QuestPanel';


export const QuestLog: React.FC = () => {
  const { activeQuests, currentContext, isDocked, setIsDocked } = useAmbient();
  const { isDesktop } = useWindowWidth();

  // Use absolute screen coordinates (top-0, left-0) for total stability
  const [position, setPosition] = usePersistedState('waystones_quest_log_pos_abs', { x: -1, y: -1 });
  const [isOpen, setIsOpen] = useState(false);
  const [quadrant, setQuadrant] = useState({ isLeft: false, isTop: true });
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [constraints, setConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  // Update quadrant and constraints based on absolute position
  const getSystemState = (x_val: number, y_val: number) => {
    const isLeft = x_val < window.innerWidth / 2;
    const isTop = y_val < window.innerHeight / 2;
    
    // Constraints are simple screen boundaries now. 
    const padding = 24; // Increased padding to avoid scrollbar
    const newConstraints = {
      left: padding,
      right: window.innerWidth - (pillRef.current?.offsetWidth || 180) - padding,
      top: 12,
      bottom: window.innerHeight - (pillRef.current?.offsetHeight || 48) - 12
    };

    return { isLeft, isTop, newConstraints };
  };

  const updateSystem = (x_val?: number, y_val?: number) => {
    const { isLeft, isTop, newConstraints } = getSystemState(
      x_val !== undefined ? x_val : position.x,
      y_val !== undefined ? y_val : position.y
    );
    
    setQuadrant({ isLeft, isTop });
    setConstraints(newConstraints);
  };

  useEffect(() => {
    // Initial position logic (Default to top-right if not set)
    if (position.x === -1) {
      const defaultX = window.innerWidth - 260; // Further from the right edge
      const defaultY = 96;
      setPosition({ x: defaultX, y: defaultY });
    }

    const handleResize = () => {
      updateSystem();
      // Snap to boundaries
      setPosition(prev => ({
        x: Math.min(Math.max(prev.x, 12), window.innerWidth - 220),
        y: Math.min(Math.max(prev.y, 12), window.innerHeight - 80)
      }));
    };
    
    updateSystem();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position.x]);

  const handleReset = () => {
    const defaultX = window.innerWidth - 260;
    const defaultY = 96;
    setPosition({ x: defaultX, y: defaultY });
    setQuadrant({ isLeft: false, isTop: true });
    updateSystem(defaultX, defaultY);
  };

  const handleUndock = () => {
    setIsDocked(false);
    setIsOpen(false);
  };

  const handleDock = () => {
    setIsDocked(true);
    setIsOpen(false);
  };

  const completedCount = activeQuests.filter(q => q.completed).length;
  const totalCount = activeQuests.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  
  // Refactor avatar logic for clarity
  const firstIncompleteQuest = activeQuests.find(q => !q.completed);
  const nextUnit = firstIncompleteQuest 
    ? (QUESTS.find(q => q.id === firstIncompleteQuest.id)?.unit || 'peon') 
    : 'peon';
  const avatarUnit = isOpen ? 'shade' : nextUnit;

  if (!isDesktop || isDocked) return null;

  return (
    <motion.div 
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={constraints}
      onDragStart={() => {
        setIsDragging(true);
        document.body.style.userSelect = 'none';
      }}
      onDragEnd={(e, info) => {
        const nextX = info.point.x - (pillRef.current?.offsetWidth || 180) / 2;
        const nextY = info.point.y - (pillRef.current?.offsetHeight || 48) / 2;
        
        // Finalize state and orientation
        setPosition({ x: nextX, y: nextY });
        updateSystem(nextX, nextY);
        
        document.body.style.userSelect = '';
        setTimeout(() => setIsDragging(false), 50);
      }}
      animate={{ x: position.x, y: position.y }}
      transition={isDragging ? { type: false } : { type: 'spring', damping: 25, stiffness: 200 }}
      id="quest-log-container"
      className="fixed top-0 left-0 z-[9999] pointer-events-none select-none cursor-grab active:cursor-grabbing"
    >
      {/* Anchor Point (The Pill) */}
      <div ref={pillRef} className="relative pointer-events-auto flex items-center gap-2">
        <button
          onClick={(e) => {
            if (isDragging) return;
            setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-3 pl-3 pr-6 py-2.5 rounded-full shadow-2xl transition-all duration-300 active:scale-95 group border relative ${
            isOpen 
              ? 'bg-slate-900 text-white border-slate-800' 
              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-indigo-200'
          }`}
        >
        {/* Circular Progress Avatar */}
        <div className="relative w-11 h-11 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="transparent"
              stroke={isOpen ? '#ffffff10' : '#f8fafc'}
              strokeWidth="2.5"
            />
            <motion.circle
              cx="22"
              cy="22"
              r="19"
              fill="transparent"
              stroke={progressPercent === 100 ? '#10b981' : '#4f46e5'}
              strokeWidth="2.5"
              strokeDasharray={119}
              initial={{ strokeDashoffset: 119 }}
              animate={{ strokeDashoffset: 119 - (119 * progressPercent) / 100 }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center p-1.5">
            <div className={`w-full h-full rounded-full overflow-hidden border-2 shadow-inner transition-transform duration-300 group-hover:scale-110 ${isOpen ? 'border-indigo-400/30' : 'border-slate-100'}`}>
               <img 
                 src={`/units/${avatarUnit}.png`} 
                 className="w-full h-full object-contain p-0.5" 
                 alt="" 
               />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start pr-1">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${isOpen ? 'text-indigo-400' : 'text-slate-400'}`}>
            {isOpen ? 'Minimize' : 'Alignment Status'}
          </span>
          <span className="text-[13px] font-black tracking-tight leading-none mt-0.5">
            {isOpen ? 'Close Log' : `${completedCount}/${totalCount} Complete`}
          </span>
        </div>
        
        {/* Badge for hidden side quests */}
        {!isOpen && totalCount - completedCount > 0 && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600 border border-white text-[8px] font-black text-white items-center justify-center">
              {totalCount - completedCount}
            </span>
          </div>
        )}
        </button>

        {/* Quest Log Scroll Panel (Positioned Absolutely relative to the Pill) */}
        <AnimatePresence>
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                [quadrant.isTop ? 'top' : 'bottom']: 'calc(100% + 16px)',
                left: quadrant.isLeft ? 0 : 'auto',
                right: quadrant.isLeft ? 'auto' : 0,
                zIndex: 100
              }}
            >
              <QuestPanel
                onReset={handleReset}
                quadrant={quadrant}
                onClose={() => setIsOpen(false)}
                onUndock={handleUndock}
                onDock={handleDock}
                isDocked={isDocked}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
