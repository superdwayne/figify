/**
 * AI Provider module
 *
 * Provides a unified interface for different AI providers (Anthropic, Ollama, OpenAI, Gemini).
 * Use createAIProvider() to instantiate the appropriate provider.
 */

import type { AIProvider, AIProviderConfig, AIProviderType } from './types';
import { AnthropicProvider, getAnthropicErrorMessage } from './anthropicProvider';
import { OpenAIProvider, OpenAIError, getOpenAIErrorMessage } from './openaiProvider';
import { GeminiProvider, GeminiError, getGeminiErrorMessage } from './geminiProvider';
import { OllamaProvider, OllamaError, getOllamaErrorMessage } from './ollamaProvider';
import { AnalysisParseError } from '../../utils/parseAnalysis';
import {
  isAIProviderError,
  isAbortError,
  isNetworkError,
} from './errors';
import {
  type ErrorWithSteps,
  getErrorForStatus,
  getNetworkError as getNetworkErrorWithSteps,
  getOllamaError,
  getParseError,
  ERROR_CATALOG,
} from '../../utils/errorMessages';

// Re-export getConfigurationError for use by hooks
export { getConfigurationError } from '../../utils/errorMessages';

// Re-export types
export type { AIProvider, AIProviderConfig, AIProviderType, ImageInput, AnalysisOptions } from './types';
export { DEFAULT_PROVIDER_CONFIGS } from './types';

// Re-export base class and shared errors
export { BaseProvider } from './BaseProvider';
export {
  AIProviderError,
  ResponseTruncatedError,
  EmptyResponseError,
  NetworkError,
  ProviderNotConfiguredError,
  isAIProviderError,
  isAbortError,
  isNetworkError,
} from './errors';

// Re-export provider-specific errors (for backward compatibility)
export { OllamaError } from './ollamaProvider';
export { OpenAIError } from './openaiProvider';
export { GeminiError } from './geminiProvider';
export { AnthropicAPIError } from './anthropicProvider';
export { AnalysisParseError } from '../../utils/parseAnalysis';

/**
 * Create an AI provider instance based on configuration
 *
 * @param config - Provider configuration
 * @returns Configured AI provider instance
 *
 * @example
 * ```ts
 * // Create Anthropic provider
 * const claude = createAIProvider({
 *   type: 'anthropic',
 *   apiKey: 'sk-ant-...',
 * });
 *
 * // Create Ollama provider
 * const ollama = createAIProvider({
 *   type: 'ollama',
 *   baseUrl: 'http://localhost:11434',
 *   model: 'llava:latest',
 * });
 * ```
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown AI provider type: ${(config as AIProviderConfig).type}`);
  }
}

/**
 * Get a user-friendly error message for any AI provider error
 *
 * @param error - The error thrown by an AI provider
 * @returns User-friendly error message, or empty string for cancelled requests
 */
export function getAIErrorMessage(error: unknown): string {
  // Check for AbortError first (request cancelled)
  if (isAbortError(error)) {
    return '';
  }

  // Check for unified AIProviderError (new pattern)
  if (isAIProviderError(error)) {
    console.error('[AI Error]', error.provider, error.status, error.message);
    return error.getUserMessage();
  }

  // Check for AnalysisParseError (response parsing failed)
  if (error instanceof AnalysisParseError) {
    console.error('[AI Error] Analysis parse error:', error.message);
    console.error('[AI Error] Raw response (first 500 chars):', error.rawResponse.substring(0, 500));
    return error.message;
  }

  // Try Anthropic-specific error handling (legacy, for SDK errors)
  const anthropicMessage = getAnthropicErrorMessage(error);
  if (anthropicMessage) {
    return anthropicMessage;
  }

  // Try OpenAI-specific error handling (legacy)
  const openaiMessage = getOpenAIErrorMessage(error);
  if (openaiMessage) {
    return openaiMessage;
  }

  // Try Gemini-specific error handling (legacy)
  const geminiMessage = getGeminiErrorMessage(error);
  if (geminiMessage) {
    return geminiMessage;
  }

  // Try Ollama-specific error handling (legacy)
  const ollamaMessage = getOllamaErrorMessage(error);
  if (ollamaMessage) {
    return ollamaMessage;
  }

  // Check for network errors
  if (error instanceof Error) {
    if (isNetworkError(error)) {
      return 'Network error. Please check your internet connection.';
    }

    console.error('[AI Error] Unhandled error type:', error.name, error.message);
    return `Error: ${error.message}`;
  }

  // Fallback for unknown errors
  console.error('[AI Error] Unknown error type:', typeof error, error);
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get a structured error with troubleshooting steps
 *
 * @param error - The error thrown by an AI provider
 * @param providerType - The AI provider type for context-specific messages
 * @returns Structured error with message and troubleshooting steps
 */
export function getAIErrorWithSteps(error: unknown, providerType: AIProviderType): ErrorWithSteps | null {
  // Check for AbortError first (request cancelled) - return null to ignore
  if (isAbortError(error)) {
    return null;
  }

  // Check for unified AIProviderError
  if (isAIProviderError(error)) {
    console.error('[AI Error]', error.provider, error.status, error.message);

    // Handle Ollama-specific errors
    if (providerType === 'ollama') {
      return getOllamaError(error.message);
    }

    // Handle by status code
    return getErrorForStatus(error.status, providerType);
  }

  // Check for AnalysisParseError (response parsing failed)
  if (error instanceof AnalysisParseError) {
    console.error('[AI Error] Analysis parse error:', error.message);
    return getParseError(error.message);
  }

  // Check for Ollama-specific errors (legacy)
  if (error instanceof OllamaError) {
    return getOllamaError(error.message);
  }

  // Check for OpenAI errors (legacy)
  if (error instanceof OpenAIError) {
    return getErrorForStatus(error.status, 'openai');
  }

  // Check for Gemini errors (legacy)
  if (error instanceof GeminiError) {
    return getErrorForStatus(error.status, 'gemini');
  }

  // Check for network errors
  if (error instanceof Error && isNetworkError(error)) {
    return getNetworkErrorWithSteps(error.message);
  }

  // Generic error
  if (error instanceof Error) {
    console.error('[AI Error] Unhandled error type:', error.name, error.message);
    return {
      message: error.message,
      steps: [
        'Try your request again',
        'If the problem persists, try a different image',
        'Check the console for more details',
      ],
      category: 'unknown',
      recoverable: true,
    };
  }

  // Fallback for unknown errors
  console.error('[AI Error] Unknown error type:', typeof error, error);
  return ERROR_CATALOG.unknown.default;
}

/**
 * Get display information for provider types
 */
export const PROVIDER_INFO: Record<AIProviderType, { name: string; description: string }> = {
  anthropic: {
    name: 'Claude (Anthropic)',
    description: 'Cloud-based AI with excellent vision capabilities. Requires API key.',
  },
  openai: {
    name: 'GPT-4 (OpenAI)',
    description: 'OpenAI\'s GPT-4 with vision capabilities. Requires API key.',
  },
  gemini: {
    name: 'Gemini (Google)',
    description: 'Google\'s Gemini with vision capabilities. Requires API key.',
  },
  ollama: {
    name: 'Ollama (Local)',
    description: 'Run AI locally with models like LLaVA. Free, private, requires Ollama.',
  },
};
