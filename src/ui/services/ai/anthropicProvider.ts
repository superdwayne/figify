/**
 * Anthropic (Claude) AI Provider implementation
 *
 * Wraps the Anthropic SDK for use with the unified AI provider interface.
 * Extends BaseProvider to inherit shared functionality.
 */

import Anthropic from '@anthropic-ai/sdk';

import type { AIProviderConfig, ImageInput, AnalysisOptions } from './types';
import { BaseProvider, AIProviderError } from './BaseProvider';

/**
 * Default model for Anthropic
 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Anthropic AI Provider
 *
 * Uses Claude's vision capabilities for UI analysis.
 * Extends BaseProvider for shared error handling and response parsing.
 */
export class AnthropicProvider extends BaseProvider {
  readonly type = 'anthropic' as const;
  readonly name = 'Claude (Anthropic)';
  protected readonly providerName = 'Claude';
  protected readonly defaultModel = DEFAULT_MODEL;

  private client: Anthropic | null = null;

  constructor(config: AIProviderConfig) {
    super(config);

    if (this.apiKey) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });
    }
  }

  /**
   * Override isConfigured to check for client initialization
   */
  isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  /**
   * Make the analysis API request using Anthropic SDK
   */
  protected async makeAnalysisRequest(
    image: ImageInput,
    options?: AnalysisOptions
  ): Promise<string> {
    if (!this.client) {
      throw new AIProviderError('Client not initialized', 500, this.providerName);
    }

    const stream = await this.client.messages.stream(
      {
        model: this.model,
        max_tokens: this.getMaxTokens(options, 64000),
        system: this.getSystemPrompt(options),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: image.mimeType,
                  data: image.base64,
                },
              },
              {
                type: 'text',
                text: this.getAnalysisPrompt(options),
              },
            ],
          },
        ],
      },
      { signal: options?.signal }
    );

    const message = await stream.finalMessage();

    this.log('Stop reason:', message.stop_reason);
    this.log('Usage:', message.usage);

    // Check for truncation
    this.checkTruncation(
      message.stop_reason,
      ['max_tokens'],
      JSON.stringify(message.content)
    );

    // Extract text content
    const firstBlock = message.content[0];
    if (firstBlock.type !== 'text') {
      throw new AIProviderError(
        'Unexpected response format - no text content',
        500,
        this.providerName
      );
    }

    return firstBlock.text;
  }

  /**
   * Make the describe API request using Anthropic SDK
   */
  protected async makeDescribeRequest(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string> {
    if (!this.client) {
      throw new AIProviderError('Client not initialized', 500, this.providerName);
    }

    const message = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: this.getMaxTokens(options, 4096),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: image.mimeType,
                  data: image.base64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      },
      { signal: options?.signal }
    );

    const firstBlock = message.content[0];
    if (firstBlock.type === 'text') {
      return firstBlock.text;
    }

    return '';
  }

  /**
   * Override error handling to include Anthropic SDK specific errors
   */
  protected handleError(error: unknown): never {
    // Check for Anthropic SDK errors first
    if (error instanceof Anthropic.APIError) {
      // Log full error details for debugging
      console.error('[AnthropicProvider] API Error Details:', {
        status: error.status,
        message: error.message,
        error: error,
      });
      this.logError('API Error', error.status, error.message);
      throw new AnthropicAPIError(error.message, error.status);
    }

    // Fall back to base error handling
    return super.handleError(error);
  }
}

/**
 * Anthropic-specific API error
 *
 * Provides Anthropic-specific error messages while extending AIProviderError.
 */
export class AnthropicAPIError extends AIProviderError {
  constructor(message: string, status: number) {
    super(message, status, 'Claude');
    this.name = 'AnthropicAPIError';
  }

  /**
   * Override to provide Anthropic-specific messages
   */
  getUserMessage(): string {
    switch (this.status) {
      case 413:
        return 'Image is too large. Please use a smaller image (max 5MB).';
      case 529:
        return 'Claude is temporarily overloaded. Please try again in a few minutes.';
      default:
        return super.getUserMessage();
    }
  }
}

/**
 * Translates Anthropic API errors to user-friendly messages
 *
 * @deprecated Use error.getUserMessage() instead. Kept for backward compatibility.
 */
export function getAnthropicErrorMessage(error: unknown): string {
  if (error instanceof AnthropicAPIError) {
    return error.getUserMessage();
  }

  if (error instanceof Anthropic.APIError) {
    console.error('[Anthropic API Error]', error.status, error.message);

    switch (error.status) {
      case 400:
        return `Invalid request: ${error.message || 'Please try a different image.'}`;
      case 401:
        return 'Invalid API key. Please check your settings.';
      case 403:
        return 'API key does not have permission for this operation.';
      case 413:
        return 'Image is too large. Please use a smaller image (max 5MB).';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return 'Claude is experiencing issues. Please try again later.';
      case 529:
        return 'Claude is temporarily overloaded. Please try again in a few minutes.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  if (error instanceof AIProviderError) {
    return error.getUserMessage();
  }

  return '';
}
