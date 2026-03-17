/**
 * Custom hook for AI provider integration
 *
 * Provides React state management for AI API calls including:
 * - Loading state during API requests
 * - Error state with user-friendly messages
 * - Result state for analysis output
 * - Request cancellation on unmount
 * - Support for multiple AI providers (Anthropic, Ollama)
 * - Step-by-step progress tracking
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  createAIProvider,
  getAIErrorMessage,
  getAIErrorWithSteps,
  type AIProvider,
  type AIProviderConfig,
  type AIProviderType,
} from '../services/ai';
import type { UIAnalysisResponse } from '../types/analysis';
import { uint8ArrayToBase64 } from '../utils/base64';
import { getImageDimensions } from '../utils/imageUtils';
import { refineColorsFromScreenshot } from '../utils/colorSampler';
import { refinePositions } from '../utils/gridSnapper';
import type { AnalysisStep } from '../components/AnalysisProgress';
import type { ErrorWithSteps } from '../utils/errorMessages';
import { getConfigurationError } from '../utils/errorMessages';

/**
 * Analysis progress state
 */
export interface AnalysisProgressState {
  /** Current step in the analysis process */
  step: AnalysisStep;
  /** Timestamp when analysis started */
  startTime: number;
}

/**
 * Return type for useAI hook
 */
export interface UseAIReturn {
  /** Trigger analysis of an image */
  analyze: (imageData: Uint8Array, mimeType: string) => Promise<void>;
  /** True while API request is in progress */
  isLoading: boolean;
  /** User-friendly error message, or null */
  error: string | null;
  /** Structured error with troubleshooting steps, or null */
  errorWithSteps: ErrorWithSteps | null;
  /** Structured analysis result, or null */
  result: UIAnalysisResponse | null;
  /** Cancel any in-flight request */
  cancel: () => void;
  /** Reset all state (result, error, and abort any pending request) */
  reset: () => void;
  /** Whether the provider is configured and ready */
  isConfigured: boolean;
  /** Current provider type */
  providerType: AIProviderType;
  /** Current provider display name */
  providerName: string;
  /** Current progress state for step-by-step display */
  progress: AnalysisProgressState | null;
}

/**
 * Configuration options for the useAI hook
 */
export interface UseAIOptions {
  /** Provider type to use */
  type: AIProviderType;
  /** API key (for Anthropic) */
  apiKey?: string | null;
  /** Base URL (for Ollama) */
  baseUrl?: string;
  /** Model to use */
  model?: string;
}

/**
 * Hook for managing AI API calls with React state
 *
 * Handles the full lifecycle of API requests including:
 * - Converting image data to base64
 * - Managing loading/error/result states
 * - Cancelling requests on unmount to prevent memory leaks
 * - Switching between different AI providers
 *
 * @param options - Configuration options including provider type and credentials
 * @returns Hook state and functions for API interaction
 *
 * @example
 * ```tsx
 * function AnalysisPanel() {
 *   const { analyze, isLoading, error, result, reset, isConfigured } = useAI({
 *     type: 'anthropic',
 *     apiKey: userApiKey,
 *   });
 *
 *   // Or use Ollama
 *   const ollamaAI = useAI({
 *     type: 'ollama',
 *     baseUrl: 'http://localhost:11434',
 *     model: 'llava:latest',
 *   });
 *
 *   const handleAnalyze = () => {
 *     if (capturedImage && isConfigured) {
 *       analyze(capturedImage.uint8Array, capturedImage.mimeType);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleAnalyze} disabled={isLoading || !isConfigured}>
 *         {isLoading ? 'Analyzing...' : 'Analyze'}
 *       </button>
 *       {error && <p className="error">{error}</p>}
 *       {result && <AnalysisResult result={result} onClear={reset} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAI(options: UseAIOptions): UseAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorWithSteps, setErrorWithSteps] = useState<ErrorWithSteps | null>(null);
  const [result, setResult] = useState<UIAnalysisResponse | null>(null);
  const [progress, setProgress] = useState<AnalysisProgressState | null>(null);

  // Track AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create provider instance (memoized to prevent recreating on every render)
  const provider = useMemo<AIProvider | null>(() => {
    const config: AIProviderConfig = {
      type: options.type,
      apiKey: options.apiKey || undefined,
      baseUrl: options.baseUrl,
      model: options.model,
    };

    try {
      return createAIProvider(config);
    } catch (err) {
      console.error('[useAI] Failed to create provider:', err);
      return null;
    }
  }, [options.type, options.apiKey, options.baseUrl, options.model]);

  const isConfigured = provider?.isConfigured() ?? false;
  const providerType = options.type;
  const providerName = provider?.name ?? 'Unknown';

  /**
   * Analyze an image using the configured AI provider
   *
   * @param imageData - Binary image data (Uint8Array from useImageCapture)
   * @param mimeType - Image MIME type ('image/png', 'image/jpeg', etc.)
   */
  const analyze = useCallback(
    async (imageData: Uint8Array, mimeType: string): Promise<void> => {
      // Check for provider first
      if (!provider) {
        setError('AI provider not available.');
        return;
      }

      // Check configuration
      if (!isConfigured) {
        const configError = getConfigurationError(options.type);
        setError(configError.message);
        setErrorWithSteps(configError);
        return;
      }

      // Cancel any existing request
      abortControllerRef.current?.abort();

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Reset state for new request
      const startTime = Date.now();
      setIsLoading(true);
      setError(null);
      setErrorWithSteps(null);
      setResult(null);
      setProgress({ step: 'preparing', startTime });

      try {
        // Step 1: Preparing - Convert image to base64 format required by AI APIs
        const base64 = uint8ArrayToBase64(imageData);

        // Extract image dimensions for coordinate-aware prompt
        const imageBlob = new Blob([imageData.buffer as ArrayBuffer], { type: mimeType });
        const imageDimensions = await getImageDimensions(imageBlob) || undefined;
        if (imageDimensions) {
          console.log(`[useAI] Image dimensions: ${imageDimensions.width}x${imageDimensions.height}`);
        }

        // Check if cancelled
        if (abortControllerRef.current.signal.aborted) {
          return;
        }

        // Step 2: Sending to provider
        setProgress({ step: 'sending', startTime });

        // Step 3: Analyzing - The API call is in progress
        // We transition to 'analyzing' immediately after sending since
        // the actual network request includes both sending and receiving
        const analyzePromise = provider.analyzeScreenshot(
          {
            base64,
            mimeType: mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          },
          {
            signal: abortControllerRef.current.signal,
            imageDimensions,
          }
        );

        // Transition to analyzing after a brief moment to show sending
        setTimeout(() => {
          if (!abortControllerRef.current?.signal.aborted) {
            setProgress((prev) => prev ? { ...prev, step: 'analyzing' } : null);
          }
        }, 500);

        const response = await analyzePromise;

        // Check if cancelled
        if (abortControllerRef.current.signal.aborted) {
          return;
        }

        // Step 4: Parsing response (parsing is done in the provider, but we show it briefly)
        setProgress({ step: 'parsing', startTime });

        // Post-process: refine colors from actual pixels in the screenshot
        let refined = response;
        try {
          refined = await refineColorsFromScreenshot(refined, imageData, mimeType);
        } catch (err) {
          console.warn('[useAI] Color sampling failed, using AI colors:', err);
        }

        // Post-process: snap positions to grid and align siblings
        try {
          refined = refinePositions(refined);
        } catch (err) {
          console.warn('[useAI] Grid snapping failed, using AI positions:', err);
        }

        // Complete
        setProgress({ step: 'complete', startTime });
        setResult(refined);
        setError(null);
      } catch (err) {
        // Don't set error for cancelled requests (component unmounted or new request started)
        if (err instanceof Error && err.name === 'AbortError') {
          setProgress(null);
          return;
        }

        // Log the raw error for debugging
        console.error('[useAI] Analysis error:', err);

        // Convert error to user-friendly message with steps
        const structuredError = getAIErrorWithSteps(err, options.type);
        if (structuredError) {
          setError(structuredError.message);
          setErrorWithSteps(structuredError);
        } else {
          // Fallback to simple message
          const errorMessage = getAIErrorMessage(err);
          setError(errorMessage);
          setErrorWithSteps(null);
        }
        setProgress((prev) => prev ? { ...prev, step: 'error' } : null);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, isConfigured, options.type]
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
    setErrorWithSteps(null);
    setIsLoading(false);
    setProgress(null);
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
    errorWithSteps,
    result,
    cancel,
    reset,
    isConfigured,
    providerType,
    providerName,
    progress,
  };
}

/**
 * Legacy hook name for backwards compatibility
 * @deprecated Use useAI instead
 */
export const useClaude = (apiKey: string | null) =>
  useAI({ type: 'anthropic', apiKey });
