/**
 * Ollama AI Provider implementation
 *
 * Connects to a local Ollama instance for vision model inference.
 * Supports models like LLaVA, Moondream, and other vision-capable models.
 */

import { buildAnalysisPrompt, SHADCN_ANALYSIS_PROMPT } from '../../prompts/shadcn-analysis';
import type { UIAnalysisResponse } from '../../types/analysis';
import { parseAnalysisResponse } from '../../utils/parseAnalysis';
import type {
  AIProvider,
  AIProviderConfig,
  ImageInput,
  AnalysisOptions,
} from './types';

/**
 * Default Ollama configuration
 */
const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llava:latest';

/**
 * Ollama API response structure
 */
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama API error response
 */
interface OllamaErrorResponse {
  error: string;
}

/**
 * Ollama AI Provider
 *
 * Uses Ollama's local API for vision model inference.
 * Requires Ollama to be running locally with a vision-capable model installed.
 *
 * Recommended models:
 * - llava:latest (LLaVA 1.5/1.6)
 * - llava:13b (larger, more accurate)
 * - moondream (smaller, faster)
 * - bakllava (BakLLaVA)
 */
export class OllamaProvider implements AIProvider {
  readonly type = 'ollama' as const;
  readonly name = 'Ollama (Local)';

  private baseUrl: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.model = config.model || DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    // Ollama is considered configured if we have a base URL
    // Actual connectivity is checked at request time
    return Boolean(this.baseUrl);
  }

  async analyzeScreenshot(
    image: ImageInput,
    options?: AnalysisOptions
  ): Promise<UIAnalysisResponse> {
    const systemPrompt =
      options?.systemPrompt ||
      'You are a UI analysis assistant. You MUST respond with ONLY valid JSON. No markdown code fences (no ```). No explanation. No text before or after. Your entire response must be a single JSON object starting with { and ending with }.';

    const analysisPrompt = options?.imageDimensions
      ? buildAnalysisPrompt(options.imageDimensions.width, options.imageDimensions.height)
      : SHADCN_ANALYSIS_PROMPT;

    const prompt = `${systemPrompt}\n\n${analysisPrompt}`;

    const response = await this.generate(prompt, image.base64, options?.signal);

    console.log('[OllamaProvider] Response length:', response.length);

    return parseAnalysisResponse(response);
  }

  async describeImage(
    image: ImageInput,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<string> {
    return this.generate(prompt, image.base64, options?.signal);
  }

  /**
   * Make a generate request to Ollama API
   */
  private async generate(
    prompt: string,
    imageBase64: string,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;

    const body = {
      model: this.model,
      prompt,
      images: [imageBase64],
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for more consistent JSON output
        num_predict: 8192, // Max tokens
      },
    };

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
        const errorData = (await response.json().catch(() => ({}))) as OllamaErrorResponse;
        throw new OllamaError(
          errorData.error || `Ollama request failed with status ${response.status}`,
          response.status
        );
      }

      const data = (await response.json()) as OllamaGenerateResponse;

      if (!data.response) {
        throw new OllamaError('Empty response from Ollama', 500);
      }

      return data.response;
    } catch (error) {
      if (error instanceof OllamaError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error;
        }

        // Check for connection errors
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('ECONNREFUSED')
        ) {
          throw new OllamaError(
            `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running?`,
            0
          );
        }

        throw new OllamaError(error.message, 500);
      }

      throw new OllamaError('Unknown error occurred', 500);
    }
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkHealth(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        return { ok: false, error: `Ollama returned status ${response.status}` };
      }

      const data = (await response.json()) as { models: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) || [];

      return { ok: true, models };
    } catch (error) {
      return {
        ok: false,
        error: `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running?`,
      };
    }
  }

  /**
   * List available vision models
   */
  async listVisionModels(): Promise<string[]> {
    const { ok, models } = await this.checkHealth();

    if (!ok || !models) {
      return [];
    }

    // Filter for known vision-capable models
    const visionModelPatterns = [
      'llava',
      'moondream',
      'bakllava',
      'llava-llama3',
      'llava-phi3',
    ];

    return models.filter((model) =>
      visionModelPatterns.some((pattern) => model.toLowerCase().includes(pattern))
    );
  }
}

/**
 * Custom error class for Ollama-specific errors
 */
export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'OllamaError';
  }
}

/**
 * Translates Ollama errors to user-friendly messages
 */
export function getOllamaErrorMessage(error: unknown): string {
  if (error instanceof OllamaError) {
    console.error('[Ollama Error]', error.status, error.message);

    if (error.status === 0) {
      return error.message; // Connection error, already user-friendly
    }

    if (error.message.includes('model')) {
      return `Model not found. Please ensure ${error.message}`;
    }

    return error.message;
  }

  return '';
}
