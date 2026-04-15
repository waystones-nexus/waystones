import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search, Globe } from 'lucide-react';
import { useAiContext } from '../../contexts/AiContext';
import { SUPPORTED_LANGUAGES } from '../../utils/aiService';
import type { Translations } from '../../i18n/index';

interface AiLanguageSelectorProps {
  t: Translations;
  lang: string; // Current UI language
}

const AiLanguageSelector: React.FC<AiLanguageSelectorProps> = ({ t, lang }) => {
  const { aiLang, setAiLang } = useAiContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === (aiLang || lang)) || SUPPORTED_LANGUAGES[0];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const groupedLanguages = [
    { key: 'nordic', label: t.ai?.groups?.nordic || 'Nordic' },
    { key: 'european', label: t.ai?.groups?.european || 'European' },
    { key: 'global', label: t.ai?.groups?.global || 'Global' }
  ].map(group => ({
    ...group,
    languages: filteredLanguages.filter(l => l.group === group.key)
  })).filter(g => g.languages.length > 0);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
        {t.ai?.targetLanguage || 'Response Language'}
      </label>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold transition-all hover:bg-slate-100 hover:border-slate-200 active:scale-[0.98] ${isOpen ? 'ring-4 ring-indigo-500/10 border-indigo-200 bg-white' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Globe size={12} />
          </div>
          <span className="text-slate-700">{currentLang.name}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400"
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-[500] overflow-hidden flex flex-col max-h-[380px]"
          >
            {/* Search */}
            <div className="relative mb-2 px-2 pt-2 pb-1">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 mt-1.5 text-slate-300 pointer-events-none">
                <Search size={14} />
              </div>
              <input
                autoFocus
                type="text"
                placeholder={t.quickPublish?.reorderingDesc ? 'Search…' : 'Search language…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
              />
            </div>

            {/* Language List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-1 py-1 space-y-4">
              {groupedLanguages.map(group => (
                <div key={group.key} className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/80 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.languages.map(l => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setAiLang(l.code);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                          (aiLang || lang) === l.code 
                            ? 'bg-indigo-50 text-indigo-700' 
                            : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="text-[11px] font-bold">{l.name}</span>
                        {(aiLang || lang) === l.code && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            <Check size={14} className="text-indigo-600" />
                          </motion.div>
                        )}
                        {(aiLang || lang) !== l.code && (
                          <div className="text-slate-200 group-hover:text-slate-300 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            {l.code}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              {groupedLanguages.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs font-bold text-slate-300">No languages found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-2 px-3 pb-2 pt-2 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">
                Waystones AI
              </span>
              <div className="flex items-center gap-1.5 opacity-30 grayscale active:grayscale-0 transition-all cursor-default">
                 <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                 <span className="text-[9px] font-bold text-indigo-600">Enhanced Flow</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiLanguageSelector;
