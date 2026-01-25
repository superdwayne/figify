/**
 * Claude API client wrapper and utilities
 *
 * Provides factory function for creating Anthropic client instances,
 * error message translation for user-friendly display, and image analysis.
 */

import Anthropic from '@anthropic-ai/sdk';

import { SHADCN_ANALYSIS_PROMPT } from '../prompts/shadcn-analysis';
import type { UIAnalysisResponse } from '../types/analysis';
import { parseAnalysisResponse, AnalysisParseError } from '../utils/parseAnalysis';

// Re-export AnalysisParseError for consumers
export { AnalysisParseError } from '../utils/parseAnalysis';

/**
 * Creates a new Anthropic client configured for browser usage
 *
 * Uses dangerouslyAllowBrowser: true which is required for BYOK (bring your own key)
 * applications where users provide their own API credentials.
 *
 * @param apiKey - User's Anthropic API key
 * @returns Configured Anthropic client instance
 */
export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Translates API errors to user-friendly messages
 *
 * Maps HTTP status codes and error types to messages that users can understand
 * and act upon. Returns empty string for cancelled requests (AbortError).
 *
 * @param error - The error thrown by the API call
 * @returns User-friendly error message, or empty string for cancelled requests
 */
export function getErrorMessage(error: unknown): string {
  // Check for Anthropic API errors first (has status code)
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please try a different image.';
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

  // Check for AnalysisParseError (response parsing failed)
  if (error instanceof AnalysisParseError) {
    return 'Unable to parse analysis results. Please try again with a clearer screenshot.';
  }

  // Check for AbortError (request cancelled) - return empty string, no message needed
  if (error instanceof Error && error.name === 'AbortError') {
    return '';
  }

  // Check for network errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
  }

  // Fallback for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Supported image media types for Claude Vision API
 */
type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

/**
 * Analyzes an image using Claude's vision capabilities
 *
 * Sends a base64-encoded image to Claude for analysis. Supports cancellation
 * via AbortSignal for cleanup on component unmount.
 *
 * Note: The prompt is intentionally simple for Phase 4. Phase 5 will implement
 * proper structured prompts for element detection.
 *
 * @param client - Anthropic client instance (allows reuse)
 * @param imageBase64 - Base64-encoded image data (without data: prefix)
 * @param mimeType - Image MIME type ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
 * @param signal - Optional AbortSignal for request cancellation
 * @returns The analysis text response from Claude
 */
export async function analyzeImage(
  client: Anthropic,
  imageBase64: string,
  mimeType: ImageMediaType,
  signal?: AbortSignal
): Promise<string> {
  const message = await client.messages.create(
    {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analyze this UI screenshot and describe what you see.',
            },
          ],
        },
      ],
    },
    {
      signal,
    }
  );

  // Extract text response from message content
  const firstBlock = message.content[0];
  if (firstBlock.type === 'text') {
    return firstBlock.text;
  }

  return '';
}

/**
 * Analyzes a screenshot and returns structured Shadcn component data
 *
 * Uses a specialized prompt to extract UI elements mapped to Shadcn components
 * with positions, colors, spacing, and typography information.
 *
 * @param client - Anthropic client instance
 * @param imageBase64 - Base64-encoded image data
 * @param mimeType - Image MIME type
 * @param signal - Optional AbortSignal for cancellation
 * @returns Parsed UIAnalysisResponse or throws on parse error
 */
export async function analyzeScreenshot(
  client: Anthropic,
  imageBase64: string,
  mimeType: ImageMediaType,
  signal?: AbortSignal
): Promise<UIAnalysisResponse> {
  const message = await client.messages.create(
    {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192, // Increased for complex UIs
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: SHADCN_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    },
    { signal }
  );

  const firstBlock = message.content[0];
  if (firstBlock.type !== 'text') {
    throw new AnalysisParseError(
      'Unexpected response format from Claude - no text content',
      JSON.stringify(message.content)
    );
  }

  // Use robust parsing with validation
  return parseAnalysisResponse(firstBlock.text);
}
