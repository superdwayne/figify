/**
 * Claude API client wrapper and utilities
 *
 * Provides factory function for creating Anthropic client instances,
 * error message translation for user-friendly display, and image analysis.
 */

import Anthropic from '@anthropic-ai/sdk';

import { buildAnalysisPrompt } from '../prompts/shadcn-analysis';
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
    // Log full error for debugging
    console.error('[API Error]', error.status, error.message);

    switch (error.status) {
      case 400:
        // Include more detail for 400 errors
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

  // Check for AnalysisParseError (response parsing failed)
  if (error instanceof AnalysisParseError) {
    // Log the raw response for debugging in console
    console.error('[getErrorMessage] Analysis parse error:', error.message);
    console.error('[getErrorMessage] Raw response (first 500 chars):', error.rawResponse.substring(0, 500));
    
    // Return the specific error message from parsing
    return error.message;
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
    // Log the full error for debugging
    console.error('[getErrorMessage] Unhandled error type:', error.name, error.message);
    console.error('[getErrorMessage] Stack:', error.stack);
    return `Error: ${error.message}`;
  }

  // Fallback for unknown errors - log what we got
  console.error('[getErrorMessage] Unknown error type:', typeof error, error);
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
      model: 'claude-sonnet-4-20250514',
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
  signal?: AbortSignal,
  imageDimensions?: { width: number; height: number }
): Promise<UIAnalysisResponse> {
  // Build prompt with image dimensions for accurate coordinate system
  const imgWidth = imageDimensions?.width || 1920;
  const imgHeight = imageDimensions?.height || 1080;
  const analysisPrompt = buildAnalysisPrompt(imgWidth, imgHeight);
  // Use streaming to handle large responses without timeout issues
  const stream = await client.messages.stream(
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 64000, // Large buffer - streaming handles long responses
      system: 'You are a UI analysis assistant. You MUST respond with ONLY valid JSON. No markdown code fences (no ```). No explanation. No text before or after. Your entire response must be a single JSON object starting with { and ending with }.',
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
              text: analysisPrompt,
            },
          ],
        },
      ],
    },
    { signal }
  );

  // Wait for the complete response
  const message = await stream.finalMessage();

  // Log stop reason for debugging truncation issues
  console.log('[analyzeScreenshot] Stop reason:', message.stop_reason);
  console.log('[analyzeScreenshot] Usage:', message.usage);

  // Fail early if response was truncated - prevents parsing incomplete JSON
  if (message.stop_reason === 'max_tokens') {
    console.error('[analyzeScreenshot] Response was truncated due to max_tokens limit');
    throw new AnalysisParseError(
      'Analysis response was truncated. The UI may be too complex. Try capturing a smaller section.',
      JSON.stringify(message.content)
    );
  }

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
