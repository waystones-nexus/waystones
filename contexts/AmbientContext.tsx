import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { WorkerUnit, Whisper, Quest, QUESTS, QUEST_WHISPERS, QUEST_CELEBRATIONS, IDLE_WHISPERS, LEGENDARY_WHISPERS, ACTION_WHISPERS, WELCOME_WHISPERS } from '../constants/ambientManifest';
import { DataModel, ImportValidationResult } from '../types';

interface UserStats {
  modelsCreated: number;
  unitsMet: string[];
  lastSeen: number;
  totalGeometriesCrunched: number;
  alignmentsAchieved: number;
}

export interface LogEntry {
  id: string;
  type: 'whisper' | 'system' | 'success' | 'error';
  unit: WorkerUnit;
  text: string;
  timestamp: number;
  rare?: boolean;
}

export interface AmbientContextState {
  tab: DataModel['id'] | 'landing' | 'quick-publish' | 'deploy' | 'editor';
  step: number;
}

interface AmbientContextType {
  activeWhisper: Whisper | null;
  activeHighlight: { id: string; unit: WorkerUnit } | null;
  triggerWhisper: (unit: WorkerUnit, text: string, options?: { rare?: boolean; duration?: number; targetId?: string }) => void;
  triggerQuestWhisper: (questId: string) => void;
  triggerActionWhisper: (actionId: string) => void;
  addLog: (text: string, type?: LogEntry['type'], unit?: WorkerUnit) => void;
  clearWhisper: () => void;
  history: LogEntry[];
  stats: UserStats;
  activeQuests: { id: string; completed: boolean; progress?: string; titleOverride?: string }[];
  currentContext: AmbientContextState;
  updateQuests: (model: DataModel | null, validation: ImportValidationResult | null, contextId?: string, subStep?: number) => void;
  lastQuestAction: { id: string; ts: number } | null;
  markQuestVisited: (id: string) => void;
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
  alignmentsAchieved: 0,
};

interface QueuedWhisper {
  unit: WorkerUnit;
  text: string;
  options?: { rare?: boolean; duration?: number; targetId?: string };
}

export const AmbientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeWhisper, setActiveWhisper] = useState<Whisper | null>(null);
  const activeWhisperRef = useRef<Whisper | null>(null);
  useEffect(() => {
    activeWhisperRef.current = activeWhisper;
  }, [activeWhisper]);

  const [activeHighlight, setActiveHighlight] = useState<{ id: string; unit: WorkerUnit } | null>(null);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [activeQuests, setActiveQuests] = useState<{ id: string; completed: boolean; progress?: string; titleOverride?: string }[]>([]);
  const [currentContext, setCurrentContext] = useState<AmbientContextState>({ tab: 'landing', step: 0 });
  const [lastQuestAction, setLastQuestAction] = useState<{ id: string; ts: number } | null>(null);
  const [visitedQuests, setVisitedQuests] = useState<string[]>([]);
  const contextRef = useRef(currentContext);
  useEffect(() => {
    contextRef.current = currentContext;
  }, [currentContext]);
  const timeoutRef = useRef<any>(null);
  const whisperQueueRef = useRef<QueuedWhisper[]>([]);
  const suggestedSideQuestsRef = useRef<Set<string>>(new Set()); // Track suggested side quests (context:step)

  // Load stats from localStorage
  useEffect(() => {
    try {
      const storedStats = localStorage.getItem('waystones_ambient_stats');
      if (storedStats) setStats(JSON.parse(storedStats));
      
      const storedHistory = localStorage.getItem('waystones_ambient_history');
      if (storedHistory) setHistory(JSON.parse(storedHistory));

      const storedVisited = localStorage.getItem('waystones_ambient_visited');
      if (storedVisited) setVisitedQuests(JSON.parse(storedVisited));
    } catch (e) {
      console.error("Failed to load ambient persistence", e);
    }
  }, []);


  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('waystones_ambient_stats', JSON.stringify(stats));
  }, [stats]);

  // Persist visited quests
  useEffect(() => {
    localStorage.setItem('waystones_ambient_visited', JSON.stringify(visitedQuests));
  }, [visitedQuests]);

  const markQuestVisited = useCallback((id: string) => {
    setVisitedQuests(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const triggerWhisper = useCallback((unit: WorkerUnit, text: string, options?: { rare?: boolean; duration?: number; targetId?: string; priority?: boolean }) => {
    const displayWhisper = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Set highlight if provided
      if (options?.targetId) {
        setActiveHighlight({ id: options.targetId, unit });
      } else {
        setActiveHighlight(null);
      }

      const whisper: Whisper = { unit, text, rare: options?.rare };
      setActiveWhisper(whisper);

      // Update history
      const entry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'whisper',
        unit,
        text,
        timestamp: Date.now(),
        rare: options?.rare
      };
      setHistory(prev => [entry, ...prev].slice(0, 50));

      // Update stats
      setStats(prev => {
        const unitsMet = prev.unitsMet.includes(unit) ? prev.unitsMet : [...prev.unitsMet, unit];
        return { ...prev, unitsMet, lastSeen: Date.now() };
      });

      const duration = options?.duration ?? (options?.rare ? 15000 : 8000);
      timeoutRef.current = setTimeout(() => {
        setActiveWhisper(null);
        setActiveHighlight(null);
        // Process next queued whisper if any
        if (whisperQueueRef.current.length > 0) {
          const next = whisperQueueRef.current.shift();
          if (next) {
            triggerWhisper(next.unit, next.text, next.options);
          }
        }
      }, duration);
    };

    // Priority interrupt: clear everything and speak NOW
    if (options?.priority) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      whisperQueueRef.current = []; // Clear the queue since user is taking direct action
      setActiveWhisper(null);
      setActiveHighlight(null);
      displayWhisper();
      return;
    }

    // If a whisper is already active, queue this one instead
    if (activeWhisperRef.current) {
      whisperQueueRef.current.push({ unit, text, options });
    } else {
      displayWhisper();
    }
  }, []); // triggerWhisper is now completely stable

  const addLog = useCallback((text: string, type: LogEntry['type'] = 'system', unit: WorkerUnit = 'peon') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      unit,
      text,
      timestamp: Date.now()
    };
    setHistory(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const triggerQuestWhisper = useCallback((questId: string, options?: { priority?: boolean }) => {
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) return;

    // Set the action for navigation listeners
    setLastQuestAction({ id: questId, ts: Date.now() });

    // Set highight if target exists
    if (quest.targetElementId) {
      setActiveHighlight({ id: quest.targetElementId, unit: quest.unit });
    }

    const pool = QUEST_WHISPERS[questId];
    if (pool && pool.length > 0) {
      // Mood variety: Pick a random response from the pool
      const random = pool[Math.floor(Math.random() * pool.length)];
      triggerWhisper(random.unit, random.text, { 
        rare: random.rare, 
        targetId: quest?.targetElementId,
        priority: options?.priority
      });
    } else if (quest) {
      // Fallback: Use the generic hint from the QUESTS manifest
      triggerWhisper(quest.unit, quest.hint, { 
        targetId: quest.targetElementId,
        priority: options?.priority
      });
    }
  }, [triggerWhisper]);

  const triggerActionWhisper = useCallback((actionId: string) => {
    const pool = ACTION_WHISPERS[actionId];
    if (pool && pool.length > 0) {
      const random = pool[Math.floor(Math.random() * pool.length)];
      triggerWhisper(random.unit, random.text, { rare: random.rare });
    }
  }, [triggerWhisper]);

  const updateQuests = useCallback((model: DataModel | null, validation: ImportValidationResult | null, contextId?: string, subStep?: number) => {
    // Update internal context if changed
    if (contextId || subStep !== undefined) {
      setCurrentContext(prev => {
        const nextTab = contextId || prev.tab;
        const nextStep = subStep !== undefined ? subStep : prev.step;
        if (prev.tab === nextTab && prev.step === nextStep) return prev;
        
        // Clear active highlight when navigating between stages
        setActiveHighlight(null);
        
        return { tab: nextTab as any, step: nextStep };
      });
    }

    let newQuests: { id: string; completed: boolean; progress?: string; titleOverride?: string }[] = [];

    if (!model) {
      // On landing, only show BIND_DATA
      newQuests = QUESTS.filter(q => q.id === 'BIND_DATA').map(q => ({ id: q.id, completed: false }));
    } else {
      const currentTab = contextId || contextRef.current.tab;
      const currentStep = subStep !== undefined ? subStep : contextRef.current.step;

      const visibleQuests = QUESTS.filter(q => {
        const isCorrectContext = q.context === currentTab || q.context === 'all';
        if (!isCorrectContext) return false;

        // New: Step-aware filtering
        const questSteps = Array.isArray(q.step) ? q.step : (q.step !== undefined ? [q.step] : null);
        
        if (questSteps && currentStep !== undefined) {
          // Only show quests for the current step — past and future steps are hidden
          return questSteps.includes(currentStep);
        }
        
        // Side quest 'Unlocking' logic for Editor
        if (q.isSideQuest && currentTab === 'editor') {
          switch (q.id) {
            case 'NAV_ALIGNMENT': return model.layers.length > 1;
            default: return true;
          }
        }
        return true;
      });

      // Sort quests: Mandatory first, then by step
      const sortedPool = [...visibleQuests].sort((a, b) => {
        if (a.isMandatory && !b.isMandatory) return -1;
        if (!a.isMandatory && b.isMandatory) return 1;
        const stepA = Array.isArray(a.step) ? a.step[0] : (a.step ?? 0);
        const stepB = Array.isArray(b.step) ? b.step[0] : (b.step ?? 0);
        return stepA - stepB;
      });
      
      // Fallback if no specific quests for this tab
      const questPool = sortedPool.length > 0 ? sortedPool : QUESTS.filter(q => q.context === 'editor');

      newQuests = questPool.map(q => {
      let completed = false;
      let progress = '';
      let titleOverride = q.title;
      
      switch (q.id) {
        case 'BIND_DATA':
          completed = model.layers.length > 0;
          break;
        case 'DEFINE_KEYS': {
          const pkLayers = model.layers.filter(l => 
            !!l.primaryKeyColumn || (l.properties || []).some(p => !!p.constraints?.isPrimaryKey)
          ).length;
          completed = pkLayers === model.layers.length && model.layers.length > 0;
          progress = `${pkLayers}/${model.layers.length}`;
          break;
        }
        case 'RECORD_LORE':
          const layersWithDesc = model.layers.filter(l => l.description && l.description.length > 5).length;
          const totalL = model.layers.length;
          completed = totalL > 0 && layersWithDesc === totalL;
          progress = totalL > 0 ? `${layersWithDesc}/${totalL} descriptions` : '';
          break;
        case 'NAMESPACE_ALIGNMENT':
          completed = !!model.namespace;
          break;
        case 'QP_LAYER_ALIGNMENT':
          completed = currentStep > 0;
          break;
        case 'QP_STYLE_ALIGNMENT':
          completed = currentStep > 1;
          break;
        case 'QP_STYLING_ORDER':
          completed = !!model.renderingOrder && model.renderingOrder.length > 0;
          break;
        case 'QP_STYLING_PALETTE':
          completed = model.layers.filter(l => !!l.style && (l.style.simpleColor || l.style.type === 'categorized')).length > 1;
          break;
        case 'QP_META_NAME':
          completed = !!model.name && model.name !== 'Untitled'; 
          break;
        case 'QP_META_DESC':
          completed = !!model.description && model.description.length > 20;
          break;
        case 'QP_META_CONTACT':
          completed = !!model.metadata?.contactEmail && !!model.metadata?.contactName;
          break;
        case 'QP_META_THEME':
          completed = !!model.metadata?.theme;
          break;
        case 'QP_META_KEYWORDS':
          completed = (model.metadata?.keywords || []).length > 0;
          break;
        case 'QP_META_BBOX':
          completed = !!model.metadata?.bboxVerified;
          break;
        case 'QP_LAYER_META':
          const layersWithDescQ = model.layers.filter(l => l.description && l.description.length > 5).length;
          completed = layersWithDescQ > 0; 
          progress = `${layersWithDescQ}/${model.layers.length}`;
          break;
        case 'QP_PUBLISH_ALIGNMENT':
          completed = currentStep > 3;
          break;
        case 'DP_SOURCE_ALIGNMENT':
          completed = currentStep > 0;
          break;
        case 'DP_CONN_ALIGNMENT':
          completed = currentStep > 1;
          break;
        case 'DP_MAPPING_ALIGNMENT':
          completed = currentStep > 2;
          break;
        case 'DP_PUBLISH_ALIGNMENT':
          completed = currentStep > 5;
          break;
        case 'DP_CONN_HOST': {
          const sc = model.sourceConnection;
          if (!sc) break;
          if (sc.type === 'postgis' && 'host' in sc.config) completed = !!sc.config.host;
          if (sc.type === 'supabase' && 'projectUrl' in sc.config) completed = !!sc.config.projectUrl;
          if (sc.type === 'databricks' && 'host' in sc.config) completed = !!sc.config.host;
          if (sc.type === 'geopackage' && 'filename' in sc.config) completed = !!sc.config.filename;
          break;
        }
        case 'DP_CONN_DB': {
          const sc = model.sourceConnection;
          if (!sc) break;
          if (sc.type === 'postgis' && 'dbname' in sc.config) completed = !!sc.config.dbname;
          if (sc.type === 'supabase') completed = true; // Supabase uses one DB per project usually
          if (sc.type === 'databricks' && 'catalog' in sc.config) completed = !!sc.config.catalog;
          break;
        }
        case 'DP_MAPPING_TABLES': {
          const sc = model.sourceConnection;
          if (!sc) break;
          const mappedLayers = model.layers.filter(l => !l.isAbstract);
          completed = mappedLayers.every(l => !!sc.layerMappings[l.id]?.sourceTable);
          progress = `${mappedLayers.filter(l => !!sc.layerMappings[l.id]?.sourceTable).length}/${mappedLayers.length}`;
          break;
        }
        case 'DP_MAPPING_PK': {
          const sc = model.sourceConnection;
          if (!sc) break;
          const mappedWithTable = model.layers.filter(l => !l.isAbstract && !!sc.layerMappings[l.id]?.sourceTable);
          completed = mappedWithTable.length > 0 && mappedWithTable.every(l => !!sc.layerMappings[l.id]?.primaryKeyColumn);
          progress = `${mappedWithTable.filter(l => !!sc.layerMappings[l.id]?.primaryKeyColumn).length}/${mappedWithTable.length}`;
          break;
        }
        case 'DP_STYLE_ALIGNMENT':
          completed = currentStep > 3;
          break;
        case 'DP_STYLING_ORDER':
          completed = !!model.renderingOrder && model.renderingOrder.length > 0;
          break;
        case 'DP_STYLING_PALETTE':
          completed = model.layers.filter(l => !!l.style && (l.style.simpleColor || l.style.type === 'categorized')).length > 1;
          break;
        case 'DP_META_NAME':
          completed = !!model.name && model.name !== 'Untitled';
          break;
        case 'DP_META_DESC':
          completed = !!model.description && model.description.length > 20;
          break;
        case 'DP_META_CONTACT':
          completed = !!model.metadata?.contactEmail && !!model.metadata?.contactName;
          break;
        case 'DP_META_THEME':
          completed = !!model.metadata?.theme;
          break;
        case 'DP_META_KEYWORDS':
          completed = (model.metadata?.keywords || []).length > 0;
          break;
        case 'DP_META_BBOX':
          const dpSpatial = model.metadata?.spatialExtent;
          completed = !!(dpSpatial?.westBoundLongitude && dpSpatial?.eastBoundLongitude && dpSpatial?.southBoundLatitude && dpSpatial?.northBoundLatitude);
          break;
        case 'DP_LAYER_META':
          const dpLayersWithDesc = model.layers.filter(l => l.description && l.description.length > 5).length;
          completed = dpLayersWithDesc > 0;
          progress = `${dpLayersWithDesc}/${model.layers.length}`;
          break;
        case 'NAV_ALIGNMENT':
          completed = model.layers.length > 1 && visitedQuests.includes('NAV_ALIGNMENT');
          break;
        case 'ORACLE_ALIGNMENT':
          completed = !!model.description && model.description.length > 20;
          break;
        case 'COMMON_TONGUE':
          completed = model.sharedTypes.length > 0;
          break;
        case 'RULE_ALIGNMENT':
          completed = model.layers.some(l => (l.layerConstraints?.length ?? 0) > 0);
          break;
        case 'STYLE_ALIGNMENT_ADV':
          completed = model.layers.some(l => !!l.style && Object.keys(l.style).length > 0) && visitedQuests.includes('STYLE_ALIGNMENT_ADV');
          break;
        case 'ENUM_ALIGNMENT':
          completed = (model.sharedEnums?.length ?? 0) > 0;
          break;
        case 'SYNC_ALIGNMENT':
          completed = !!model.githubMeta;
          break;
        case 'EDITOR_META_NAME':
          completed = !!model.name && model.name !== 'Untitled';
          break;
        case 'EDITOR_META_CONTACT':
          completed = !!model.metadata?.contactEmail && !!model.metadata?.contactName;
          break;
        case 'EDITOR_META_THEME':
          completed = !!model.metadata?.theme;
          break;
        case 'EDITOR_META_KEYWORDS':
          completed = (model.metadata?.keywords || []).length > 0;
          break;
        case 'EDITOR_META_BBOX':
          completed = !!model.metadata?.bboxVerified;
          break;
        case 'EDITOR_LAYER_TITLE': {
          const titledLayers = model.layers.filter(l => !!l.title && l.title !== l.name).length;
          completed = titledLayers > 0;
          progress = `${titledLayers}/${model.layers.length}`;
          break;
        }
        case 'EDITOR_LAYER_KEYWORDS': {
          const keywordedLayers = model.layers.filter(l => (l.keywords || []).length > 0).length;
          completed = keywordedLayers > 0;
          progress = `${keywordedLayers}/${model.layers.length}`;
          break;
        }
      }

      return { id: q.id, completed, progress, titleOverride };
    });
  }

    setActiveQuests(prev => {
      // Only update if something actually changed to avoid infinite loops
      const hasChanged = newQuests.some((nq, i) => 
        !prev[i] || nq.id !== prev[i].id || nq.completed !== prev[i].completed || nq.progress !== prev[i].progress
      );

      if (!hasChanged && prev.length === newQuests.length) return prev;

      // Detect newly completed quests and celebrate
      newQuests.forEach(nq => {
        const prevQuest = prev.find(pq => pq.id === nq.id);
        if (nq.completed && (!prevQuest || !prevQuest.completed)) {
          const questDef = QUESTS.find(q => q.id === nq.id);
          
          // Clear highlight if it was targeting the element associated with this completed quest
          setActiveHighlight(current => {
            if (current && questDef?.targetElementId === current.id) return null;
            return current;
          });

          const pool = QUEST_CELEBRATIONS[nq.id];
          if (pool && pool.length > 0) {
            triggerWhisper(pool[0].unit, pool[0].text);
          }
        }
      });

      // Surface side quests when all mandatory quests on current step are complete
      const currentStep = subStep !== undefined ? subStep : contextRef.current.step;
      const currentTab = contextId || contextRef.current.tab;
      const mandatoryOnStep = newQuests.filter(nq => {
        const quest = QUESTS.find(q => q.id === nq.id);
        if (!quest?.isMandatory) return false;
        const questSteps = Array.isArray(quest.step) ? quest.step : (quest.step !== undefined ? [quest.step] : null);
        return questSteps?.includes(currentStep);
      });

      const allMandatoryComplete = mandatoryOnStep.length > 0 && mandatoryOnStep.every(q => q.completed);
      if (allMandatoryComplete && currentTab && currentStep !== undefined) {
        const sideQuestKey = `${currentTab}:${currentStep}`;
        if (!suggestedSideQuestsRef.current.has(sideQuestKey)) {
          const availableSideQuests = newQuests.filter(nq => {
            const quest = QUESTS.find(q => q.id === nq.id);
            if (!quest?.isSideQuest || nq.completed) return false;
            const questSteps = Array.isArray(quest.step) ? quest.step : (quest.step !== undefined ? [quest.step] : null);
            return questSteps?.includes(currentStep);
          });

          if (availableSideQuests.length > 0) {
            suggestedSideQuestsRef.current.add(sideQuestKey);
            const randomSideQuest = availableSideQuests[Math.floor(Math.random() * availableSideQuests.length)];
            const sideQuestDef = QUESTS.find(q => q.id === randomSideQuest.id);
            if (sideQuestDef) {
              const introTexts = [
                `Great work on the mandatory tasks! But wait—${sideQuestDef.title} awaits the brave. Care to explore?`,
                `All required alignments complete! But there's more to discover: ${sideQuestDef.title}. Curious?`,
                `The path is clear for now. But ${sideQuestDef.title} calls to those with time to spare.`
              ];
              const introText = introTexts[Math.floor(Math.random() * introTexts.length)];
              triggerWhisper('wisp', introText);
            }
          }
        }
      }

      return newQuests;
    });
  }, [triggerWhisper]); // currentContext removed to break infinite loop

  const clearWhisper = useCallback(() => {
    setActiveWhisper(null);
    setActiveHighlight(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    whisperQueueRef.current = [];
  }, []);

  // Idle Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeWhisper && Math.random() < 0.15) {
        const isRare = Math.random() < 0.05;
        const pool = isRare ? LEGENDARY_WHISPERS : IDLE_WHISPERS;
        const random = pool[Math.floor(Math.random() * pool.length)];
        triggerWhisper(random.unit, random.text, { rare: isRare });
      }
    }, 1000 * 60 * 10); // Every 10 mins

    return () => clearInterval(interval);
  }, [activeWhisper, triggerWhisper]);

  // Welcome session logic
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('waystones_welcomed');
    if (!hasSeenWelcome) {
      const random = WELCOME_WHISPERS[Math.floor(Math.random() * WELCOME_WHISPERS.length)];
      
      // Delay it slightly to let the site settle
      const timer = setTimeout(() => {
        triggerWhisper(random.unit, random.text, { priority: true });
        sessionStorage.setItem('waystones_welcomed', 'true');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [triggerWhisper]);

  return (
    <AmbientContext.Provider value={{ 
      activeWhisper, 
      activeHighlight,
      triggerWhisper, 
      triggerQuestWhisper, 
      triggerActionWhisper,
      addLog,
      clearWhisper, 
      history, 
      stats, 
      activeQuests,
      currentContext,
      updateQuests,
      lastQuestAction,
      markQuestVisited
    }}>
      {children}
    </AmbientContext.Provider>
  );
};
