/**
 * Custom hook for API key state and message-based storage operations
 *
 * Encapsulates all API key management including:
 * - Loading key from persistent storage on mount
 * - Saving key with format validation
 * - Clearing stored key
 * - Loading/saving state tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateCorrelationId, ApiKeyResponse, SuccessResponse } from '../../shared/messages';

/**
 * Validate API key format
 * Anthropic keys start with 'sk-ant-' and are at least 50 characters
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith('sk-ant-') && key.length >= 50;
}

/**
 * Return type for useApiKey hook
 */
export interface UseApiKeyReturn {
  /** The current API key, or null if not set */
  apiKey: string | null;
  /** True while loading the API key from storage */
  isLoading: boolean;
  /** True while saving the API key to storage */
  isSaving: boolean;
  /** Error message, or null if no error */
  error: string | null;
  /** Load API key from storage */
  loadApiKey: () => Promise<void>;
  /** Save API key to storage (validates format first) */
  saveApiKey: (key: string) => Promise<boolean>;
  /** Clear API key from storage */
  clearApiKey: () => Promise<boolean>;
}

// Pending response handlers for correlation ID tracking
const pendingResponses = new Map<string, (payload: unknown) => void>();

/**
 * Send message to plugin main thread
 */
function postToPlugin(message: {
  type: 'REQUEST';
  correlationId: string;
  action: string;
  payload?: unknown;
}): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * Send request and await response using correlation ID
 */
function requestFromPlugin<T>(action: string, payload?: unknown): Promise<T> {
  return new Promise((resolve) => {
    const correlationId = generateCorrelationId();
    pendingResponses.set(correlationId, resolve as (payload: unknown) => void);

    postToPlugin({
      type: 'REQUEST',
      correlationId,
      action,
      ...(payload !== undefined && { payload }),
    });
  });
}

/**
 * Hook for managing API key state and storage operations
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const { apiKey, isLoading, isSaving, error, saveApiKey, clearApiKey } = useApiKey();
 *
 *   if (isLoading) return <p>Loading...</p>;
 *
 *   return (
 *     <div>
 *       <input defaultValue={apiKey || ''} />
 *       <button onClick={() => saveApiKey(inputValue)} disabled={isSaving}>
 *         {isSaving ? 'Saving...' : 'Save'}
 *       </button>
 *       {error && <p className="error">{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if mounted to prevent state updates after unmount
  const mountedRef = useRef(true);

  /**
   * Set up message listener for RESPONSE messages
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg || msg.type !== 'RESPONSE') return;

      const handler = pendingResponses.get(msg.correlationId);
      if (handler) {
        handler(msg.payload);
        pendingResponses.delete(msg.correlationId);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      mountedRef.current = false;
    };
  }, []);

  /**
   * Load API key from storage
   */
  const loadApiKey = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestFromPlugin<ApiKeyResponse>('GET_API_KEY');
      if (mountedRef.current) {
        setApiKey(response.apiKey);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to load API key');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Save API key to storage
   * Returns true on success, false on failure
   */
  const saveApiKey = useCallback(async (key: string): Promise<boolean> => {
    // Validate format before sending
    if (!isValidApiKeyFormat(key)) {
      setError('Invalid API key format. Key must start with "sk-ant-" and be at least 50 characters.');
      return false;
    }

    if (!mountedRef.current) return false;

    setIsSaving(true);
    setError(null);

    try {
      const response = await requestFromPlugin<SuccessResponse>('SET_API_KEY', { key });
      if (mountedRef.current) {
        if (response.success) {
          setApiKey(key);
          return true;
        } else {
          setError('Failed to save API key');
          return false;
        }
      }
      return false;
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to save API key');
      }
      return false;
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, []);

  /**
   * Clear API key from storage
   * Returns true on success, false on failure
   */
  const clearApiKey = useCallback(async (): Promise<boolean> => {
    if (!mountedRef.current) return false;

    setIsSaving(true);
    setError(null);

    try {
      const response = await requestFromPlugin<SuccessResponse>('CLEAR_API_KEY');
      if (mountedRef.current) {
        if (response.success) {
          setApiKey(null);
          return true;
        } else {
          setError('Failed to clear API key');
          return false;
        }
      }
      return false;
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to clear API key');
      }
      return false;
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, []);

  // Load API key on mount
  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  return {
    apiKey,
    isLoading,
    isSaving,
    error,
    loadApiKey,
    saveApiKey,
    clearApiKey,
  };
}
