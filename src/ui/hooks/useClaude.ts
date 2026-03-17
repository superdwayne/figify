/**
 * Custom hook for Claude API integration
 *
 * @deprecated Use useAI from './useAI' instead for multi-provider support.
 *
 * This file now re-exports from the new useAI hook for backwards compatibility.
 * The useAI hook supports both Anthropic (Claude) and Ollama providers.
 */

import { useAI, type UseAIReturn } from './useAI';

/**
 * Return type for useClaude hook
 * @deprecated Use UseAIReturn from './useAI' instead
 */
export interface UseClaudeReturn {
  /** Trigger analysis of an image */
  analyze: (imageData: Uint8Array, mimeType: string) => Promise<void>;
  /** True while API request is in progress */
  isLoading: boolean;
  /** User-friendly error message, or null */
  error: string | null;
  /** Structured analysis result, or null */
  result: UseAIReturn['result'];
  /** Cancel any in-flight request */
  cancel: () => void;
  /** Reset all state (result, error, and abort any pending request) */
  reset: () => void;
}

/**
 * Hook for managing Claude API calls with React state
 *
 * @deprecated Use useAI from './useAI' instead for multi-provider support.
 *
 * @param apiKey - User's Anthropic API key, or null if not configured
 * @returns Hook state and functions for API interaction
 *
 * @example
 * ```tsx
 * // Old way (deprecated):
 * const { analyze, isLoading, error, result, reset } = useClaude(apiKey);
 *
 * // New way (recommended):
 * const { analyze, isLoading, error, result, reset } = useAI({
 *   type: 'anthropic',
 *   apiKey,
 * });
 *
 * // Or use Ollama:
 * const { analyze, isLoading, error, result, reset } = useAI({
 *   type: 'ollama',
 *   baseUrl: 'http://localhost:11434',
 *   model: 'llava:latest',
 * });
 * ```
 */
export function useClaude(apiKey: string | null): UseClaudeReturn {
  const aiHook = useAI({
    type: 'anthropic',
    apiKey,
  });

  // Return only the fields from the original interface for backwards compatibility
  return {
    analyze: aiHook.analyze,
    isLoading: aiHook.isLoading,
    error: aiHook.error,
    result: aiHook.result,
    cancel: aiHook.cancel,
    reset: aiHook.reset,
  };
}
