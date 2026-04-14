import React from 'react';
import type { Translations } from '../../i18n/index';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UNIT_THEMES } from '../../constants/ambientManifest';

const ConfirmDeleteDialog: React.FC<{
  t: Translations,
  isDeleting?: boolean,
  deletingQuote?: string,
  onClose: () => void,
  onConfirm: () => void
}> = ({ t, isDeleting, deletingQuote, onClose, onConfirm }) => {
  const theme = UNIT_THEMES['void-entity'];

  return (
    <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        <div className="p-8 text-center space-y-6">
          <AnimatePresence mode="wait">
            {isDeleting ? (
              <motion.div
                key="deleting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 py-4"
              >
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                    className={`absolute -inset-4 rounded-full blur-2xl ${theme.pulse}`}
                  />
                  <div className={`relative z-10 w-full h-full rounded-[32px] border-2 bg-white overflow-hidden p-2 ${theme.border} shadow-xl`}>
                    <img
                      src="/units/void-entity.png"
                      alt="void-entity"
                      className="w-full h-full object-contain grayscale opacity-60 mix-blend-multiply"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 opacity-60">
                    Void Entity
                  </p>
                  <p className="text-sm text-slate-600 font-medium italic leading-relaxed px-4">
                    "{deletingQuote || 'Consumption is the only law.'}"
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="space-y-6"
              >
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto shadow-inner border border-rose-100">
                  <Trash2 size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">{t.confirmDeleteTitle}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{t.confirmDelete}</p>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <button onClick={onConfirm} className="w-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-rose-200">
                    {t.confirmDeleteBtn}
                  </button>
                  <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                    {t.cancel}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteDialog;
