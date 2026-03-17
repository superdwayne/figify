/**
 * Base AI Provider abstract class
 *
 * Provides shared functionality for AI provider implementations including:
 * - Configuration management
 * - Error handling and wrapping
 * - Response validation
 * - Logging utilities
 *
 * Extend this class to create new provider implementations.
 */

import { buildAnalysisPrompt, SHADCN_ANALYSIS_PROMPT } from '../../prompts/shadcn-analysis';
import type { UIAnalysisResponse } from '../../types/analysis';
import { parseAnalysisResponse, AnalysisParseError } from '../../utils/parseAnalysis';
import type {
  AIProvider,
  AIProviderConfig,
  AIProviderType,
  ImageInput,
  AnalysisOptions,
} from './types';
import {
  AIProviderError,
  ResponseTruncatedError,
  EmptyResponseError,
  NetworkError,
  ProviderNotConfiguredError,
  isAbortError,
  isNetworkError,
} from './errors';

// Re-export error types for convenience
export {
  AIProviderError,
  ResponseTruncatedError,
  EmptyResponseError,
  NetworkError,
  ProviderNotConfiguredError,
  AnalysisParseError,
};

/**
 * Default system prompt for JSON-only responses
 */
export const DEFAULT_SYSTEM_PROMPT =
  'You are a UI analysis assistant. You MUST respond with ONLY valid JSON. No markdown code fences (no ```). No explanation. No text before or after. Your entire response must be a single JSON object starting with { and ending with }.';

/**
 * Default system prompt for general assistance
 */
export const DEFAULT_ASSISTANT_PROMPT = 'You are a helpful assistant.';

/**
 * Abstract base class for AI providers
 *
 * Implements common functionality and defines the contract for
 * provider-specific implementations.
 *
 * @example
 * ```ts
 * class MyProvider extends BaseProvider {
 *   readonly type = 'myProvider' as const;
 *   readonly name = 'My Provider';
 *
 *   protected async makeAnalysisRequest(
 *     image: ImageInput,
 *     options?: AnalysisOptions
 *   ): Promise<string> {
 *     // Provider-specific API call
 *   }
 *
 *   protected async makeDescribeRequest(
 *     image: ImageInput,
 *     prompt: string,
 *     options?: AnalysisOptions
 *   ): Promise<string> {
 *     // Provider-specific API call
 *   }
 * }
 * ```
 */
export abstract class BaseProvider implements AIProvider {
  /** Provider type identifier - must be set by subclass */
  abstract readonly type: AIProviderType;

  /** Provider display name - must be set by subclass */
  abstract readonly name: string;

  /** Provider name for error messages */
  protected abstract readonly providerName: string;

  /** API key (for cloud providers) */
  protected readonly apiKey: string | null;

  /** Base URL (for self-hosted providers) */
  protected readonly baseUrl: string | null;

  /** Model name to use (set via config or defaults to provider's default) */
  protected readonly configModel: string | undefined;

  /** Default model for this provider - subclasses should override */
  protected abstract readonly defaultModel: string;

  /** Get the model to use (config model or default) */
  protected get model(): string {
    return this.configModel || this.defaultModel;
  }

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl || null;
    this.configModel = config.model;
  }

  /**
   * Check if the provider is properly configured
   *
   * Default implementation checks for API key.
   * Override for providers with different requirements (e.g., Ollama).
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  /**
   * Ensure the provider is configured, throw if not
   *
   * Call this at the start of API methods.
   */
  protected ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new ProviderNotConfiguredError(this.providerName);
    }
  }

  /**
   * Analyze a UI screenshot and return structured component data
   *
   * Wraps the provider-specific implementation with common error handling
   * and response parsing.
   */
  async analyzeScreenshot(
    image: ImageInput,
    options?: AnalysisOptions
  ): Promise<UIAnalysisResponse> {
    this.ensureConfigured();

    try {
      const response = await this.makeAnalysisRequest(image, options);
      this.logResponse('analyzeScreenshot', response.length);
      return parseAnalysisResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Simple image description (for testing/debugging)
   *
   * Wraps the provider-specific implementation with common error handling.
   */
  async describeImage(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string> {
    this.ensureConfigured();

    try {
      return await this.makeDescribeRequest(image, prompt, options);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make the actual analysis API request
   *
   * Subclasses must implement this to call their specific API.
   * Should return the raw text response from the AI.
   *
   * @param image - Image input with base64 data
   * @param options - Analysis options including abort signal
   * @returns Raw text response from the AI
   */
  protected abstract makeAnalysisRequest(
    image: ImageInput,
    options?: AnalysisOptions
  ): Promise<string>;

  /**
   * Make the actual describe API request
   *
   * Subclasses must implement this to call their specific API.
   *
   * @param image - Image input with base64 data
   * @param prompt - Text prompt for the description
   * @param options - Analysis options including abort signal
   * @returns Text response from the AI
   */
  protected abstract makeDescribeRequest(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string>;

  /**
   * Get the system prompt for analysis requests
   */
  protected getSystemPrompt(options?: AnalysisOptions): string {
    return options?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Get the analysis prompt (the detailed instructions)
   */
  protected getAnalysisPrompt(options?: AnalysisOptions): string {
    if (options?.imageDimensions) {
      return buildAnalysisPrompt(options.imageDimensions.width, options.imageDimensions.height);
    }
    return SHADCN_ANALYSIS_PROMPT;
  }

  /**
   * Get max tokens for analysis requests
   */
  protected getMaxTokens(options?: AnalysisOptions, defaultValue: number = 16384): number {
    return options?.maxTokens || defaultValue;
  }

  /**
   * Handle and wrap errors from API calls
   *
   * Converts provider-specific errors to AIProviderError types.
   * Override to add provider-specific error handling.
   */
  protected handleError(error: unknown): never {
    // AbortError should be re-thrown as-is
    if (isAbortError(error)) {
      throw error;
    }

    // Already an AIProviderError
    if (error instanceof AIProviderError) {
      throw error;
    }

    // AnalysisParseError should be re-thrown
    if (error instanceof AnalysisParseError) {
      throw error;
    }

    // Network errors
    if (error instanceof Error && isNetworkError(error)) {
      throw new NetworkError(this.providerName);
    }

    // Generic errors
    if (error instanceof Error) {
      throw new AIProviderError(error.message, 500, this.providerName);
    }

    // Unknown error type
    throw new AIProviderError('Unknown error occurred', 500, this.providerName);
  }

  /**
   * Log response information for debugging
   */
  protected logResponse(method: string, length: number): void {
    console.log(`[${this.type}Provider] ${method} response length:`, length);
  }

  /**
   * Log debug information
   */
  protected log(message: string, ...args: unknown[]): void {
    console.log(`[${this.type}Provider]`, message, ...args);
  }

  /**
   * Log error information
   */
  protected logError(message: string, ...args: unknown[]): void {
    console.error(`[${this.type}Provider]`, message, ...args);
  }

  /**
   * Check if response was truncated based on finish reason
   *
   * @param finishReason - The finish reason from the API response
   * @param truncationReasons - Reasons that indicate truncation (varies by provider)
   * @param partialResponse - The partial response text for error reporting
   */
  protected checkTruncation(
    finishReason: string | undefined | null,
    truncationReasons: string[],
    partialResponse: string
  ): void {
    if (finishReason && truncationReasons.includes(finishReason)) {
      throw new ResponseTruncatedError(this.providerName, partialResponse);
    }
  }

  /**
   * Check if response is empty and throw appropriate error
   *
   * @param content - The response content to check
   */
  protected checkEmptyResponse(content: unknown): void {
    if (!content) {
      throw new EmptyResponseError(this.providerName);
    }
  }
}
