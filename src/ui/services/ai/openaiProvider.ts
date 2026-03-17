/**
 * OpenAI (GPT-4) AI Provider implementation
 *
 * Uses OpenAI's vision capabilities for UI analysis.
 */

import { buildAnalysisPrompt, SHADCN_ANALYSIS_PROMPT } from '../../prompts/shadcn-analysis';
import type { UIAnalysisResponse } from '../../types/analysis';
import { parseAnalysisResponse, AnalysisParseError } from '../../utils/parseAnalysis';
import type {
  AIProvider,
  AIProviderConfig,
  ImageInput,
  AnalysisOptions,
} from './types';

/**
 * Default model for OpenAI
 */
const DEFAULT_MODEL = 'gpt-4o';

/**
 * OpenAI API response structure
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API error response
 */
interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code: string | null;
  };
}

/**
 * Custom error class for OpenAI errors
 */
export class OpenAIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

/**
 * OpenAI AI Provider
 *
 * Uses GPT-4 Vision capabilities for UI analysis.
 */
export class OpenAIProvider implements AIProvider {
  readonly type = 'openai' as const;
  readonly name = 'GPT-4 (OpenAI)';

  private model: string;
  private apiKey: string | null;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || null;
    this.model = config.model || DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  async analyzeScreenshot(
    image: ImageInput,
    options?: AnalysisOptions
  ): Promise<UIAnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please provide an API key.');
    }

    const systemPrompt =
      options?.systemPrompt ||
      'You are a UI analysis assistant. You MUST respond with ONLY valid JSON. No markdown code fences (no ```). No explanation. No text before or after. Your entire response must be a single JSON object starting with { and ending with }.';

    const analysisPrompt = options?.imageDimensions
      ? buildAnalysisPrompt(options.imageDimensions.width, options.imageDimensions.height)
      : SHADCN_ANALYSIS_PROMPT;

    const response = await this.makeRequest(
      systemPrompt,
      analysisPrompt,
      image,
      options?.maxTokens || 16384,
      options?.signal
    );

    console.log('[OpenAIProvider] Response length:', response.length);

    return parseAnalysisResponse(response);
  }

  async describeImage(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please provide an API key.');
    }

    return this.makeRequest(
      'You are a helpful assistant.',
      prompt,
      image,
      options?.maxTokens || 4096,
      options?.signal
    );
  }

  /**
   * Make a request to OpenAI API
   */
  private async makeRequest(
    systemPrompt: string,
    userPrompt: string,
    image: ImageInput,
    maxTokens: number,
    signal?: AbortSignal
  ): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.mimeType};base64,${image.base64}`,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    };

    console.log('[OpenAIProvider] Request details:', {
      model: this.model,
      mimeType: image.mimeType,
      base64Length: image.base64.length,
      base64Preview: image.base64.substring(0, 50) + '...',
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as OpenAIErrorResponse;
        console.error('[OpenAIProvider] Error response:', {
          status: response.status,
          errorData,
        });
        throw new OpenAIError(
          errorData.error?.message || `OpenAI request failed with status ${response.status}`,
          response.status,
          errorData.error?.code || undefined
        );
      }

      const data = (await response.json()) as OpenAIResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new OpenAIError('Empty response from OpenAI', 500);
      }

      const choice = data.choices[0];

      if (choice.finish_reason === 'length') {
        throw new AnalysisParseError(
          'Analysis response was truncated. The UI may be too complex. Try capturing a smaller section.',
          choice.message.content
        );
      }

      return choice.message.content;
    } catch (error) {
      if (error instanceof OpenAIError || error instanceof AnalysisParseError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error;
        }

        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError')
        ) {
          throw new OpenAIError('Network error. Please check your internet connection.', 0);
        }

        throw new OpenAIError(error.message, 500);
      }

      throw new OpenAIError('Unknown error occurred', 500);
    }
  }
}

/**
 * Translates OpenAI API errors to user-friendly messages
 */
export function getOpenAIErrorMessage(error: unknown): string {
  if (error instanceof OpenAIError) {
    console.error('[OpenAI API Error]', error.status, error.message);

    switch (error.status) {
      case 400:
        return `Invalid request: ${error.message || 'Please try a different image.'}`;
      case 401:
        return 'Invalid API key. Please check your settings.';
      case 403:
        return 'API key does not have permission for this operation.';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return 'OpenAI is experiencing issues. Please try again later.';
      case 503:
        return 'OpenAI is temporarily unavailable. Please try again in a few minutes.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  return '';
}
