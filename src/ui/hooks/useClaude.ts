/**
 * Custom hook for Claude API integration
 *
 * Provides React state management for Claude API calls including:
 * - Loading state during API requests
 * - Error state with user-friendly messages
 * - Result state for analysis output
 * - Request cancellation on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClaudeClient, analyzeScreenshot, getErrorMessage } from '../services/claude';
import type { UIAnalysisResponse } from '../types/analysis';
import { uint8ArrayToBase64 } from '../utils/base64';

/**
 * Return type for useClaude hook
 */
export interface UseClaudeReturn {
  /** Trigger analysis of an image */
  analyze: (imageData: Uint8Array, mimeType: string) => Promise<void>;
  /** True while API request is in progress */
  isLoading: boolean;
  /** User-friendly error message, or null */
  error: string | null;
  /** Structured analysis result, or null */
  result: UIAnalysisResponse | null;
  /** Cancel any in-flight request */
  cancel: () => void;
  /** Reset all state (result, error, and abort any pending request) */
  reset: () => void;
}

/**
 * Hook for managing Claude API calls with React state
 *
 * Handles the full lifecycle of API requests including:
 * - Converting image data to base64
 * - Managing loading/error/result states
 * - Cancelling requests on unmount to prevent memory leaks
 *
 * @param apiKey - User's Anthropic API key, or null if not configured
 * @returns Hook state and functions for API interaction
 *
 * @example
 * ```tsx
 * function AnalysisPanel() {
 *   const { apiKey } = useApiKey();
 *   const { analyze, isLoading, error, result, reset } = useClaude(apiKey);
 *   const { capturedImage } = useImageCapture();
 *
 *   const handleAnalyze = () => {
 *     if (capturedImage) {
 *       analyze(capturedImage.uint8Array, capturedImage.mimeType);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleAnalyze} disabled={isLoading}>
 *         {isLoading ? 'Analyzing...' : 'Analyze'}
 *       </button>
 *       {error && <p className="error">{error}</p>}
 *       {result && <AnalysisResult result={result} onClear={reset} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useClaude(apiKey: string | null): UseClaudeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UIAnalysisResponse | null>(null);

  // Track AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Analyze an image using Claude's vision capabilities
   *
   * @param imageData - Binary image data (Uint8Array from useImageCapture)
   * @param mimeType - Image MIME type ('image/png', 'image/jpeg', etc.)
   */
  const analyze = useCallback(
    async (imageData: Uint8Array, mimeType: string): Promise<void> => {
      // Check for API key first - provide helpful message directing to Settings
      if (!apiKey) {
        setError('API key not configured. Please add your key in Settings.');
        return;
      }

      // Cancel any existing request
      abortControllerRef.current?.abort();

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Reset state for new request
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        // Convert image to base64 format required by Claude API
        const base64 = uint8ArrayToBase64(imageData);

        // Create client and call API
        const client = createClaudeClient(apiKey);
        const response = await analyzeScreenshot(
          client,
          base64,
          mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          abortControllerRef.current.signal
        );

        setResult(response);
        setError(null);
      } catch (err) {
        // Don't set error for cancelled requests (component unmounted or new request started)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        // Convert error to user-friendly message
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [apiKey]
  );

  /**
   * Cancel any in-flight request
   */
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Reset all state - clears result, error, and aborts any pending request
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Cleanup: cancel any in-flight request on unmount
   * This prevents state updates on unmounted components
   */
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    analyze,
    isLoading,
    error,
    result,
    cancel,
    reset,
  };
}
