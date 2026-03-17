/**
 * Safe storage utilities for Figma plugin environment
 * 
 * Figma plugins run in sandboxed iframes with data: URLs,
 * where localStorage is not available. This module provides
 * safe wrappers that catch errors and use in-memory fallback.
 */

// In-memory fallback storage when localStorage is unavailable
const memoryStorage = new Map<string, string>();

// Check if localStorage is available (once at module load)
let localStorageAvailable: boolean | null = null;

function isLocalStorageAvailable(): boolean {
  if (localStorageAvailable !== null) {
    return localStorageAvailable;
  }
  
  try {
    const testKey = '__figma_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    localStorageAvailable = true;
    return true;
  } catch {
    localStorageAvailable = false;
    console.warn('[Storage] localStorage not available, using in-memory fallback');
    return false;
  }
}

/**
 * Get a value from storage (localStorage or memory fallback)
 */
export function getStorageItem(key: string): string | null {
  try {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

/**
 * Set a value in storage (localStorage or memory fallback)
 */
export function setStorageItem(key: string, value: string): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    } else {
      memoryStorage.set(key, value);
    }
  } catch {
    memoryStorage.set(key, value);
  }
}

/**
 * Remove a value from storage
 */
export function removeStorageItem(key: string): void {
  try {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
    memoryStorage.delete(key);
  } catch {
    memoryStorage.delete(key);
  }
}

/**
 * Storage keys used in the application
 */
export const STORAGE_KEYS = {
  AI_PROVIDER: 'ai-provider',
  OLLAMA_URL: 'ollama-url',
  OLLAMA_MODEL: 'ollama-model',
  OPENAI_API_KEY: 'openai-api-key',
  GEMINI_API_KEY: 'gemini-api-key',
  THEME: 'theme',
} as const;
