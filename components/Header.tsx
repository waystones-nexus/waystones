import React, { useRef, useEffect } from 'react';
import { HelpCircle, Sparkles, X, Activity, Check, AlertTriangle, Github, ChevronDown } from 'lucide-react';
import { Language } from '../types';
import { AiProvider, getProvider, setProvider, getApiKey, saveApiKey, clearApiKey, getTrialUsesLeft, SUPPORTED_LANGUAGES } from '../utils/aiService';
import { useAiStatus } from '../hooks/useAiStatus';
import { useAiContext } from '../contexts/AiContext';
import AiLanguageSelector from './ai/AiLanguageSelector';
import AiErrorHandler from './ai/AiErrorHandler';
import { useAmbient } from '../contexts/AmbientContext';
import { QuestPanel } from './shared/QuestPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { QUESTS } from '../constants/ambientManifest';

const Header: React.FC<{
  t: any;
  lang: Language;
  onShowGuide: () => void;
  onHome?: () => void;
}> = ({ t, lang, onShowGuide, onHome }) => {
  const [showAiPanel, setShowAiPanel] = React.useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { aiLang, setAiLang, configureApiKey } = useAiContext();
  const aiStatus = useAiStatus();
  const { activeQuests, isDocked, setIsDocked } = useAmbient();
  const [showQuestPanel, setShowQuestPanel] = React.useState(false);
  const questPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAiPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowAiPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAiPanel]);

  useEffect(() => {
    if (!showQuestPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (questPanelRef.current && !questPanelRef.current.contains(e.target as Node)) {
        setShowQuestPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuestPanel]);



  const handleAiButtonClick = () => {
    if (!aiStatus.hasKey) {
      configureApiKey();
    } else {
      setShowAiPanel(!showAiPanel);
    }
  };

  const getAiStatusColor = () => {
    if (aiStatus.error) return 'text-rose-500 hover:bg-rose-50';
    if (aiStatus.isActive) return 'text-indigo-600 hover:bg-indigo-50';
    if (aiStatus.hasKey) return 'text-indigo-500 hover:bg-indigo-50';
    return 'text-slate-300 hover:text-slate-500 hover:bg-slate-50';
  };

  const getAiStatusIcon = () => {
    if (aiStatus.error) return <AlertTriangle size={18} />;
    if (aiStatus.isActive) return <Activity size={18} className="animate-pulse" />;
    if (aiStatus.hasKey) return <Sparkles size={18} />;
    return <Sparkles size={18} />;
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50 px-4 md:px-12 flex items-center justify-between">
      <button onClick={onHome} className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left group cursor-pointer">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-300">
          <svg width="100%" height="100%" viewBox="0 0 200 200">
            {/* Same SVG content as before */}
            <defs>
              <linearGradient id="stoneFace" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#eef0ff" />
                <stop offset="28%" stopColor="#f3f4ff" />
                <stop offset="52%" stopColor="#f5f6ff" />
                <stop offset="78%" stopColor="#f3f4ff" />
                <stop offset="100%" stopColor="#eef0ff" />
              </linearGradient>
              <radialGradient id="cosmicCore" cx="46%" cy="44%" r="58%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="8%" stopColor="#c7d2fe" stopOpacity="0.95" />
                <stop offset="22%" stopColor="#4338ca" stopOpacity="0.75" />
                <stop offset="42%" stopColor="#4338ca" stopOpacity="0.5" />
                <stop offset="65%" stopColor="#eef0ff" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#f5f5ff" stopOpacity="1" />
              </radialGradient>
              <radialGradient id="nebula1" cx="60%" cy="38%" r="50%">
                <stop offset="0%" stopColor="#4338ca" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="nebula2" cx="35%" cy="65%" r="45%">
                <stop offset="0%" stopColor="#4338ca" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
              </radialGradient>
              <filter id="bigBloom" x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="8" result="b1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b2" />
                <feMerge><feMergeNode in="b1" /><feMergeNode in="b2" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="rockGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <clipPath id="hexClip">
                <polygon points="100,14 171,55 171,137 100,178 29,137 29,55" />
              </clipPath>
              <clipPath id="portalClip">
                <ellipse cx="100" cy="96" rx="48" ry="58" />
              </clipPath>
            </defs>
            {/* Transparent background */}
            <polygon points="100,11 174,53 174,139 100,181 26,139 26,53" fill="#dde0ff" />
            <polygon points="100,14 171,55 171,137 100,178 29,137 29,55" fill="url(#stoneFace)" />
            <g clipPath="url(#hexClip)" fill="none" strokeLinecap="round">
              <path d="M 46,68 Q 40,82 45,98" stroke="#4338ca" strokeWidth="1.1" opacity="0.35" />
              <path d="M 154,68 Q 160,82 155,98" stroke="#4338ca" strokeWidth="1.1" opacity="0.35" />
            </g>
            <polygon points="100,14 171,55 171,137 100,178 29,137 29,55" fill="none" stroke="#4338ca" strokeWidth="1.5" opacity="0.45" filter="url(#glow)" />
            <polygon points="84,18 90,6 97,0 103,0 110,6 116,18 108,26 100,24 92,26" fill="#dde0ff" stroke="#c7d2fe" strokeWidth="0.5" />
            <polygon points="86,18 91,8 97,2 103,2 109,8 114,18 107,25 100,23 93,25" fill="#eef0ff" />
            <path d="M 84,18 L 92,26 L 100,24 L 108,26 L 116,18" fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" filter="url(#rockGlow)" />
            <polygon points="165,42 172,33 180,30 187,36 192,46 188,58 178,64 170,60 166,50" fill="#dde0ff" stroke="#c7d2fe" strokeWidth="0.5" />
            <path d="M 165,42 L 166,50 L 170,60 L 178,64" fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" filter="url(#rockGlow)" />
            <polygon points="165,150 170,132 178,128 188,134 192,146 188,158 180,164 172,160 166,152" fill="#dde0ff" stroke="#c7d2fe" strokeWidth="0.5" />
            <path d="M 165,150 L 166,152 L 170,132 L 178,128" fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" filter="url(#rockGlow)" />
            <polygon points="84,174 92,166 100,168 108,166 116,174 110,186 103,192 97,192 90,186" fill="#dde0ff" stroke="#c7d2fe" strokeWidth="0.5" />
            <path d="M 84,174 L 92,166 L 100,168 L 108,166 L 116,174" fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" filter="url(#rockGlow)" />
            <polygon points="22,128 30,128 34,132 35,150 30,160 20,164 12,158 8,146 12,136" fill="#dde0ff" stroke="#c7d2fe" strokeWidth="0.5" />
            <path d="M 22,128 L 30,128 L 34,132 L 35,150" fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" filter="url(#rockGlow)" />
            <polygon points="22,64 12,58 8,46 13,36 21,30 30,32 35,42 34,54 28,62" fill="#dde0ff" stroke="#c7d2fe" strokeWidth="0.5" />
            <path d="M 22,64 L 34,54 L 35,42 L 30,32" fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" opacity="0.9" filter="url(#rockGlow)" />
            <ellipse cx="100" cy="96" rx="50" ry="60" fill="#f5f6ff" />
            <ellipse cx="100" cy="96" rx="49" ry="59" fill="url(#cosmicCore)" />
            <ellipse cx="100" cy="96" rx="49" ry="59" fill="none" stroke="#4338ca" strokeWidth="2.5" opacity="0.8" filter="url(#glow)" />
            <path d="M 100,96 C 106,88 116,87 121,95 C 127,104 122,118 110,122 C 97,127 82,120 77,106 C 71,91 78,73 94,69 C 113,65 130,78 132,99 C 135,123 119,140 100,141 C 77,143 59,124 58,101"
              fill="none" stroke="#4338ca" strokeWidth="2.2" strokeLinecap="round" filter="url(#glow)" />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xl font-black text-slate-800 tracking-tighter leading-none">{t.appTitle}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-1.5 leading-none">
            {t.appSubtitle}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-1 md:gap-3 shrink-0">

        {/* AI settings button */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleAiButtonClick}
            title={aiStatus.hasKey ? `AI: ${aiStatus.provider}` : 'AI settings - click to configure'}
            className={`p-2.5 md:p-3.5 rounded-2xl transition-all flex items-center gap-2 border border-transparent ${getAiStatusColor() === 'text-slate-300 hover:text-slate-500 hover:bg-slate-50' ? 'text-slate-400 border-slate-100 hover:border-slate-200' : getAiStatusColor()}`}
          >
            {getAiStatusIcon()}
            {aiStatus.hasKey && (
              <span className="hidden md:block text-[11px] font-black uppercase tracking-[0.2em] pl-1">
                {aiStatus.provider}
              </span>
            )}
            {aiStatus.hasDefaultKey && !getApiKey() && aiStatus.trialUsesLeft > 0 && (
              <span className="hidden md:block text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg ml-1">
                {aiStatus.trialUsesLeft} {t.ai?.left || 'LEFT'}
              </span>
            )}
            {aiStatus.isActive && (
              <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse border-2 border-white" />
            )}
          </button>

          {showAiPanel && (
            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[calc(100%+8px)] sm:top-full mt-2 w-auto sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 z-[300] animate-in zoom-in-95 slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 rounded-lg">
                    <Sparkles size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">{t.ai?.aiAssistant || 'AI Assistant'}</p>
                    <p className="text-[9px] text-slate-500">{aiStatus.provider} • {t.ai?.ready || 'Ready'}</p>
                  </div>
                </div>
                <button onClick={() => setShowAiPanel(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Status */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{t.ai?.status || 'Status'}</span>
                  <div className="flex items-center gap-2">
                    {aiStatus.isActive ? (
                      <>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                        <span className="text-indigo-600 font-medium">{t.ai?.active || 'Active'}</span>
                      </>
                    ) : (
                      <>
                        <Check size={12} className="text-emerald-500" />
                        <span className="text-emerald-600 font-medium">{t.ai?.ready || 'Ready'}</span>
                      </>
                    )}
                  </div>
                </div>

                {aiStatus.operationCount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{t.ai?.operations || 'Operations'}</span>
                    <span className="text-slate-700 font-medium">{aiStatus.operationCount} {t.ai?.completed || 'completed'}</span>
                  </div>
                )}

                {aiStatus.lastOperation && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{t.ai?.lastUsed || 'Last used'}</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(aiStatus.lastOperation.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Language Selection */}
              <div className="mb-4 pt-3 border-t border-slate-100">
                <AiLanguageSelector
                  t={t}
                  lang={lang}
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowAiPanel(false);
                    configureApiKey();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <Sparkles size={14} />
                  {t.ai?.configureApiKeyButton || 'Configure API Key'}
                </button>

                {aiStatus.error && (
                  <AiErrorHandler
                    error={aiStatus.error}
                    onConfigure={() => {
                      setShowAiPanel(false);
                      configureApiKey();
                    }}
                    onRetry={aiStatus.clearError}
                    onDismiss={aiStatus.clearError}
                    className="text-xs"
                    t={t}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <a
            href="https://github.com/waystones-nexus/waystones"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub - View Source Code"
            className="hidden md:flex p-2.5 md:p-3.5 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all shrink-0"
          >
            <Github size={20} className="md:w-[24px] md:h-[24px]" />
          </a>

          <button aria-label="Hjelp" onClick={onShowGuide} className="p-2.5 md:p-3.5 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all shrink-0">
            <HelpCircle size={20} className="md:w-[24px] md:h-[24px]" />
          </button>
        </div>

        {/* Quest Docked Icon */}
        <AnimatePresence>
          {isDocked && (
            <div className="relative" ref={questPanelRef}>
              <button
                onClick={() => setShowQuestPanel(!showQuestPanel)}
                className={`flex items-center gap-2 p-1.5 pl-1.5 pr-3 md:pr-4 rounded-2xl transition-all duration-300 border relative ${
                  showQuestPanel 
                    ? 'bg-slate-900 border-slate-800 text-white shadow-xl' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                {/* Compact Progress Avatar */}
                <div className="relative w-9 h-9 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="transparent" stroke={showQuestPanel ? '#ffffff10' : '#f8fafc'} strokeWidth="2" />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="transparent"
                      stroke={activeQuests.every(q => q.completed) && activeQuests.length > 0 ? '#10b981' : '#4f46e5'}
                      strokeWidth="2"
                      strokeDasharray={100}
                      initial={{ strokeDashoffset: 100 }}
                      animate={{ strokeDashoffset: 100 - (100 * (activeQuests.filter(q => q.completed).length / (activeQuests.length || 1))) }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center p-1">
                    <div className="w-full h-full rounded-full overflow-hidden border border-slate-100/50">
                      <img 
                        src={`/units/${activeQuests.find(q => !q.completed) ? (QUESTS.find(q => q.id === activeQuests.find(q => !q.completed)?.id)?.unit || 'peon') : 'shade'}.png`} 
                        className="w-full h-full object-contain p-0.5" 
                        alt="" 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <span className={`hidden md:block text-[8px] font-black uppercase tracking-widest ${showQuestPanel ? 'text-indigo-400' : 'text-slate-400'}`}>QUESTS</span>
                  <span className="text-[11px] font-black tracking-tight leading-none">
                    {activeQuests.filter(q => q.completed).length}/{activeQuests.length}
                  </span>
                </div>
                <ChevronDown size={14} className={`hidden md:block transition-transform duration-300 ${showQuestPanel ? 'rotate-180' : ''}`} />
              </button>

              {showQuestPanel && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-[calc(100%+8px)] sm:top-full mt-2 z-[300] animate-in zoom-in-95 slide-in-from-top-1 duration-150">
                  <QuestPanel 
                    isDocked
                    onUndock={() => {
                      setIsDocked(false);
                      setShowQuestPanel(false);
                    }}
                    onClose={() => setShowQuestPanel(false)}
                  />
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

      </div>

    </header>
  );
};

export default Header;