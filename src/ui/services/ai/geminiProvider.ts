/**
 * Google Gemini AI Provider implementation
 *
 * Uses Gemini's vision capabilities for UI analysis.
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
 * Default model for Gemini
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Gemini API response structure
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini API error response
 */
interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Custom error class for Gemini errors
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Gemini AI Provider
 *
 * Uses Google Gemini's vision capabilities for UI analysis.
 */
export class GeminiProvider implements AIProvider {
  readonly type = 'gemini' as const;
  readonly name = 'Gemini (Google)';

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
      throw new Error('Gemini API key not configured. Please provide an API key.');
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

    console.log('[GeminiProvider] Response length:', response.length);

    return parseAnalysisResponse(response);
  }

  async describeImage(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please provide an API key.');
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
   * Make a request to Gemini API
   */
  private async makeRequest(
    systemPrompt: string,
    userPrompt: string,
    image: ImageInput,
    maxTokens: number,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: image.mimeType,
                data: image.base64,
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.1,
      },
    };

    console.log('[GeminiProvider] Request details:', {
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
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as GeminiErrorResponse;
        console.error('[GeminiProvider] Error response:', {
          status: response.status,
          errorData,
        });
        throw new GeminiError(
          errorData.error?.message || `Gemini request failed with status ${response.status}`,
          response.status,
          errorData.error?.status
        );
      }

      const data = (await response.json()) as GeminiResponse;

      if (!data.candidates || data.candidates.length === 0) {
        throw new GeminiError('Empty response from Gemini', 500);
      }

      const candidate = data.candidates[0];

      if (candidate.finishReason === 'MAX_TOKENS') {
        throw new AnalysisParseError(
          'Analysis response was truncated. The UI may be too complex. Try capturing a smaller section.',
          candidate.content.parts[0]?.text || ''
        );
      }

      if (!candidate.content.parts || candidate.content.parts.length === 0) {
        throw new GeminiError('No content in Gemini response', 500);
      }

      return candidate.content.parts[0].text;
    } catch (error) {
      if (error instanceof GeminiError || error instanceof AnalysisParseError) {
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
          throw new GeminiError('Network error. Please check your internet connection.', 0);
        }

        throw new GeminiError(error.message, 500);
      }

      throw new GeminiError('Unknown error occurred', 500);
    }
  }
}

/**
 * Translates Gemini API errors to user-friendly messages
 */
export function getGeminiErrorMessage(error: unknown): string {
  if (error instanceof GeminiError) {
    console.error('[Gemini API Error]', error.status, error.message);

    switch (error.status) {
      case 400:
        return `Invalid request: ${error.message || 'Please try a different image.'}`;
      case 401:
      case 403:
        return 'Invalid API key. Please check your settings.';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return 'Gemini is experiencing issues. Please try again later.';
      case 503:
        return 'Gemini is temporarily unavailable. Please try again in a few minutes.';
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  return '';
}
