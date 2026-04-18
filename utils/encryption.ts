import CryptoJS from 'crypto-js';

// Internal key used for transparent encryption/obfuscation.
// In a future version, this should be replaced with a key derived from a 
// User Master Password for true Zero-Knowledge security.
const INTERNAL_SECRET = 'waystones-internal-storage-v1';

/**
 * Encrypts a value using AES.
 * Prefixes with a version header to allow future algorithm pivots.
 */
export function encryptValue(value: string): string {
  if (!value) return value;
  try {
    const encrypted = CryptoJS.AES.encrypt(value, INTERNAL_SECRET).toString();
    return `v1:${encrypted}`;
  } catch (err) {
    console.error('[encryption] Failed to encrypt:', err);
    return value;
  }
}

/**
 * Decrypts a value using AES.
 * Handles both encrypted (with version prefix) and plain-text (migration fallback).
 */
export function decryptValue(value: string): string {
  if (!value) return value;
  
  // If it doesn't have our version prefix, assume it's legacy plain-text data
  if (!value.startsWith('v1:')) {
    return value;
  }

  try {
    const ciphertext = value.substring(3); // Strip 'v1:'
    const bytes = CryptoJS.AES.decrypt(ciphertext, INTERNAL_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return decrypted;
  } catch (err) {
    console.error('[encryption] Failed to decrypt:', err);
    // Returning the original value is dangerous if it's ciphertext, 
    // but useful if it was somehow plain text without a prefix.
    // In this case, we prefer to return empty or error if it was clearly intended to be encrypted.
    return ''; 
  }
}

/**
 * Helper to check if a value is encrypted.
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith('v1:');
}
