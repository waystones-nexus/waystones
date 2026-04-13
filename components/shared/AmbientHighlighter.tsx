import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAmbient } from '../../contexts/AmbientContext';

export const AmbientHighlighter: React.FC = () => {
  const { activeHighlight } = useAmbient();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const updateRef = useRef<number>(0);

  useEffect(() => {
    if (!activeHighlight) {
      setIsVisible(false);
      return;
    }

    const element = document.getElementById(activeHighlight.id);
    if (!element) {
      setIsVisible(false);
      return;
    }

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Track position
    const updatePosition = () => {
      const el = document.getElementById(activeHighlight.id);
      if (!el) return;
      
      const newRect = el.getBoundingClientRect();
      setRect(newRect);
      setIsVisible(true);
      updateRef.current = requestAnimationFrame(updatePosition);
    };

    updateRef.current = requestAnimationFrame(updatePosition);

    return () => {
      if (updateRef.current) cancelAnimationFrame(updateRef.current);
    };
  }, [activeHighlight]);

  if (!activeHighlight || !rect || !isVisible) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`pointer-events-none fixed z-[9999] transition-all duration-300 pulse-${activeHighlight.unit}`}
        style={{
          top: rect.top - 2,
          left: rect.left - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          borderRadius: '12px',
        }}
      >
        <div 
          className="absolute inset-0 ritual-highlight-pulse rounded-[12px]"
          style={{ 
            border: `1px solid rgba(var(--pulse-color), 0.25)`,
          }}
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
