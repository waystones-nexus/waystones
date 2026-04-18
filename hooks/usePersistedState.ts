import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { encryptValue, decryptValue } from '../utils/encryption';

export function usePersistedState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return initialValue;
      
      const decrypted = decryptValue(saved);
      return JSON.parse(decrypted);
    } catch (err) {
      console.warn(`[usePersistedState] Failed to load/decrypt key "${key}":`, err);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(state);
      const encrypted = encryptValue(serialized);
      localStorage.setItem(key, encrypted);
    } catch (err) {
      console.error(`[usePersistedState] Failed to save/encrypt key "${key}":`, err);
    }
  }, [key, state]);

  return [state, setState];
}
