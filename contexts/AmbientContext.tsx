import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { WorkerUnit, Whisper, QUEST_WHISPERS, IDLE_WHISPERS, LEGENDARY_WHISPERS } from '../constants/ambientManifest';

interface UserStats {
  modelsCreated: number;
  unitsMet: string[];
  lastSeen: number;
  totalGeometriesCrunched: number;
}

interface AmbientContextType {
  activeWhisper: Whisper | null;
  triggerWhisper: (unit: WorkerUnit, text: string, options?: { rare?: boolean; duration?: number }) => void;
  triggerQuestWhisper: (questId: string) => void;
  clearWhisper: () => void;
  history: Whisper[];
  stats: UserStats;
}

export const AmbientContext = createContext<AmbientContextType | undefined>(undefined);

export function useAmbient() {
  const context = useContext(AmbientContext);
  if (!context) {
    throw new Error('useAmbient must be used within an AmbientProvider');
  }
  return context;
}

const DEFAULT_STATS: UserStats = {
  modelsCreated: 0,
  unitsMet: [],
  lastSeen: Date.now(),
  totalGeometriesCrunched: 0,
};

export const AmbientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWhisper, setActiveWhisper] = useState<Whisper | null>(null);
  const [history, setHistory] = useState<Whisper[]>([]);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const timeoutRef = useRef<any>(null);

  // Load stats from localStorage
  useEffect(() => {
    try {
      const storedStats = localStorage.getItem('waystones_ambient_stats');
      if (storedStats) setStats(JSON.parse(storedStats));
      
      const storedHistory = localStorage.getItem('waystones_ambient_history');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (e) {
      console.error("Failed to load ambient persistence", e);
    }
  }, []);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('waystones_ambient_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('waystones_ambient_history', JSON.stringify(history));
  }, [history]);

  const triggerWhisper = useCallback((unit: WorkerUnit, text: string, options?: { rare?: boolean; duration?: number }) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const whisper: Whisper = { unit, text, rare: options?.rare };
    setActiveWhisper(whisper);
    
    // Update history and stats
    setHistory(prev => [whisper, ...prev].slice(0, 50));
    setStats(prev => {
      const unitsMet = prev.unitsMet.includes(unit) ? prev.unitsMet : [...prev.unitsMet, unit];
      return { ...prev, unitsMet, lastSeen: Date.now() };
    });

    const duration = options?.duration ?? (options?.rare ? 15000 : 8000);
    timeoutRef.current = setTimeout(() => {
      setActiveWhisper(null);
    }, duration);
  }, []);

  const triggerQuestWhisper = useCallback((questId: string) => {
    const pool = QUEST_WHISPERS[questId];
    if (pool && pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      triggerWhisper(random.unit, random.text, { rare: random.rare });
    }
  }, [triggerWhisper]);

  const clearWhisper = useCallback(() => {
    setActiveWhisper(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Idle Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeWhisper && Math.random() < 0.3) {
        const isRare = Math.random() < 0.05;
        const pool = isRare ? LEGENDARY_WHISPERS : IDLE_WHISPERS;
        const random = pool[Math.floor(Math.random() * pool.length)];
        triggerWhisper(random.unit, random.text, { rare: isRare });
      }
    }, 1000 * 60 * 5); // Every 5 mins

    return () => clearInterval(interval);
  }, [activeWhisper, triggerWhisper]);

  return (
    <AmbientContext.Provider value={{ activeWhisper, triggerWhisper, triggerQuestWhisper, clearWhisper, history, stats }}>
      {children}
    </AmbientContext.Provider>
  );
};
