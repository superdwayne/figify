/**
 * useProviderSettings Hook
 *
 * Consolidates provider state management for AI provider settings.
 * Replaces scattered useState calls with a centralized useReducer pattern.
 * Handles storage synchronization internally.
 */

import { useReducer, useEffect, useCallback } from 'react';
import type { AIProviderType } from '../services/ai';
import { getStorageItem, STORAGE_KEYS } from '../utils/storage';

/**
 * Provider settings state shape
 */
export type ProviderSettingsState = {
  providerType: AIProviderType;
  ollamaUrl: string;
  ollamaModel: string;
  openaiKey: string | null;
  geminiKey: string | null;
};

/**
 * Actions for the provider settings reducer
 */
export type ProviderSettingsAction =
  | { type: 'SET_PROVIDER'; payload: AIProviderType }
  | { type: 'SET_OLLAMA_URL'; payload: string }
  | { type: 'SET_OLLAMA_MODEL'; payload: string }
  | { type: 'SET_OPENAI_KEY'; payload: string | null }
  | { type: 'SET_GEMINI_KEY'; payload: string | null }
  | { type: 'LOAD_FROM_STORAGE'; payload: Partial<ProviderSettingsState> };

/**
 * Default state values
 */
const initialState: ProviderSettingsState = {
  providerType: 'anthropic',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llava:latest',
  openaiKey: null,
  geminiKey: null,
};

/**
 * Reducer for provider settings state management
 */
function providerSettingsReducer(
  state: ProviderSettingsState,
  action: ProviderSettingsAction
): ProviderSettingsState {
  switch (action.type) {
    case 'SET_PROVIDER':
      return { ...state, providerType: action.payload };
    case 'SET_OLLAMA_URL':
      return { ...state, ollamaUrl: action.payload };
    case 'SET_OLLAMA_MODEL':
      return { ...state, ollamaModel: action.payload };
    case 'SET_OPENAI_KEY':
      return { ...state, openaiKey: action.payload };
    case 'SET_GEMINI_KEY':
      return { ...state, geminiKey: action.payload };
    case 'LOAD_FROM_STORAGE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/**
 * Return type for the useProviderSettings hook
 */
export interface UseProviderSettingsReturn {
  settings: ProviderSettingsState;
  setProviderType: (type: AIProviderType) => void;
  setOllamaUrl: (url: string) => void;
  setOllamaModel: (model: string) => void;
  setOpenaiKey: (key: string | null) => void;
  setGeminiKey: (key: string | null) => void;
}

/**
 * Load settings from storage
 */
function loadSettingsFromStorage(): Partial<ProviderSettingsState> {
  const settings: Partial<ProviderSettingsState> = {};

  const savedProvider = getStorageItem(STORAGE_KEYS.AI_PROVIDER) as AIProviderType | null;
  const savedUrl = getStorageItem(STORAGE_KEYS.OLLAMA_URL);
  const savedModel = getStorageItem(STORAGE_KEYS.OLLAMA_MODEL);
  const savedOpenaiKey = getStorageItem(STORAGE_KEYS.OPENAI_API_KEY);
  const savedGeminiKey = getStorageItem(STORAGE_KEYS.GEMINI_API_KEY);

  if (savedProvider) settings.providerType = savedProvider;
  if (savedUrl) settings.ollamaUrl = savedUrl;
  if (savedModel) settings.ollamaModel = savedModel;
  // Always set keys even if null (to clear state if removed from storage)
  settings.openaiKey = savedOpenaiKey;
  settings.geminiKey = savedGeminiKey;

  return settings;
}

/**
 * Custom hook for managing AI provider settings
 *
 * Consolidates provider state management using useReducer pattern.
 * Automatically syncs with localStorage and listens for storage changes.
 *
 * @returns Provider settings state and setter functions
 *
 * @example
 * ```tsx
 * const {
 *   settings,
 *   setProviderType,
 *   setOllamaUrl,
 *   setOllamaModel,
 *   setOpenaiKey,
 *   setGeminiKey,
 * } = useProviderSettings();
 *
 * // Access current settings
 * console.log(settings.providerType); // 'anthropic'
 *
 * // Update provider type
 * setProviderType('ollama');
 * ```
 */
export function useProviderSettings(): UseProviderSettingsReturn {
  const [state, dispatch] = useReducer(providerSettingsReducer, initialState);

  // Sync settings from storage on mount and listen for changes
  useEffect(() => {
    // Load initial settings from storage
    const savedSettings = loadSettingsFromStorage();
    if (Object.keys(savedSettings).length > 0) {
      dispatch({ type: 'LOAD_FROM_STORAGE', payload: savedSettings });
    }

    // Listen for storage changes (when settings are updated from Settings panel)
    // Note: This won't work in Figma sandbox, but we keep it for development
    const handleStorageChange = () => {
      const newSettings = loadSettingsFromStorage();
      dispatch({ type: 'LOAD_FROM_STORAGE', payload: newSettings });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Memoized setter functions
  const setProviderType = useCallback((type: AIProviderType) => {
    dispatch({ type: 'SET_PROVIDER', payload: type });
  }, []);

  const setOllamaUrl = useCallback((url: string) => {
    dispatch({ type: 'SET_OLLAMA_URL', payload: url });
  }, []);

  const setOllamaModel = useCallback((model: string) => {
    dispatch({ type: 'SET_OLLAMA_MODEL', payload: model });
  }, []);

  const setOpenaiKey = useCallback((key: string | null) => {
    dispatch({ type: 'SET_OPENAI_KEY', payload: key });
  }, []);

  const setGeminiKey = useCallback((key: string | null) => {
    dispatch({ type: 'SET_GEMINI_KEY', payload: key });
  }, []);

  return {
    settings: state,
    setProviderType,
    setOllamaUrl,
    setOllamaModel,
    setOpenaiKey,
    setGeminiKey,
  };
}
