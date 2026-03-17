/**
 * AI Provider abstraction types
 *
 * Defines a common interface for different AI providers (Anthropic, Ollama, etc.)
 * to enable swapping between local and cloud-based LLMs.
 */

import type { UIAnalysisResponse } from '../../types/analysis';

/**
 * Supported AI provider types
 */
export type AIProviderType = 'anthropic' | 'openai' | 'gemini' | 'ollama';

/**
 * Configuration for AI providers
 */
export interface AIProviderConfig {
  /** Provider type */
  type: AIProviderType;
  /** API key (for cloud providers like Anthropic) */
  apiKey?: string;
  /** Base URL (for self-hosted providers like Ollama) */
  baseUrl?: string;
  /** Model name to use */
  model?: string;
}

/**
 * Supported image media types
 */
export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

/**
 * Image input for analysis
 */
export interface ImageInput {
  /** Base64-encoded image data (without data: prefix) */
  base64: string;
  /** Image MIME type */
  mimeType: ImageMediaType;
}

/**
 * Options for analysis requests
 */
export interface AnalysisOptions {
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
  /** System prompt override */
  systemPrompt?: string;
  /** Max tokens for response */
  maxTokens?: number;
  /** Image dimensions for coordinate-aware prompt generation */
  imageDimensions?: { width: number; height: number };
}

/**
 * Abstract AI provider interface
 *
 * All AI providers must implement this interface to be used
 * interchangeably in the application.
 */
export interface AIProvider {
  /** Provider type identifier */
  readonly type: AIProviderType;

  /** Provider display name */
  readonly name: string;

  /**
   * Check if the provider is properly configured and ready
   */
  isConfigured(): boolean;

  /**
   * Analyze a UI screenshot and return structured component data
   *
   * @param image - Image input with base64 data and MIME type
   * @param options - Analysis options including abort signal
   * @returns Parsed UIAnalysisResponse
   */
  analyzeScreenshot(
    image: ImageInput,
    options?: AnalysisOptions
  ): Promise<UIAnalysisResponse>;

  /**
   * Simple image description (for testing/debugging)
   *
   * @param image - Image input
   * @param prompt - Text prompt for the analysis
   * @param options - Analysis options
   * @returns Text response
   */
  describeImage(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string>;
}

/**
 * Default configurations for each provider
 */
export const DEFAULT_PROVIDER_CONFIGS: Record<AIProviderType, Partial<AIProviderConfig>> = {
  anthropic: {
    model: 'claude-sonnet-4-20250514',
  },
  openai: {
    model: 'gpt-4.1',
  },
  gemini: {
    model: 'gemini-2.5-flash',
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llava:latest',
  },
};
