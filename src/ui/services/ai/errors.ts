/**
 * Shared error types for AI providers
 *
 * Provides a base error class and specialized error types for consistent
 * error handling across all AI provider implementations.
 */

/**
 * Base error class for AI provider errors
 *
 * All provider-specific errors should extend this class to enable
 * unified error handling and user-friendly message translation.
 */
export class AIProviderError extends Error {
  /** HTTP status code (0 for network/connection errors) */
  readonly status: number;
  /** Optional error code from the provider */
  readonly code?: string;
  /** Provider name for error messages */
  readonly provider: string;

  constructor(
    message: string,
    status: number,
    provider: string,
    code?: string
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.status = status;
    this.provider = provider;
    this.code = code;
  }

  /**
   * Get a user-friendly error message based on HTTP status code
   *
   * Subclasses can override this to provide provider-specific messages.
   */
  getUserMessage(): string {
    switch (this.status) {
      case 0:
        // Connection/network error - message should already be user-friendly
        return this.message;
      case 400:
        return `Invalid request: ${this.message || 'Please try a different image.'}`;
      case 401:
        return 'Invalid API key. Please check your settings.';
      case 403:
        return 'API key does not have permission for this operation.';
      case 413:
        return 'Image is too large. Please use a smaller image (max 5MB).';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return `${this.provider} is experiencing issues. Please try again later.`;
      case 503:
      case 529:
        return `${this.provider} is temporarily unavailable. Please try again in a few minutes.`;
      default:
        return this.message || 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Error for response truncation (max_tokens reached)
 *
 * Thrown when the AI response is cut off before completion,
 * which typically results in invalid/incomplete JSON.
 */
export class ResponseTruncatedError extends AIProviderError {
  /** The partial response that was received */
  readonly partialResponse: string;

  constructor(provider: string, partialResponse: string) {
    super(
      'Analysis response was truncated. The UI may be too complex. Try capturing a smaller section.',
      499, // Custom status code for truncation
      provider
    );
    this.name = 'ResponseTruncatedError';
    this.partialResponse = partialResponse;
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Error for empty or missing response content
 *
 * Thrown when the AI returns a response with no usable content.
 */
export class EmptyResponseError extends AIProviderError {
  constructor(provider: string) {
    super(`Empty response from ${provider}`, 500, provider);
    this.name = 'EmptyResponseError';
  }

  getUserMessage(): string {
    return `${this.provider} returned an empty response. Please try again.`;
  }
}

/**
 * Error for network/connection failures
 *
 * Thrown when the request fails due to network issues before
 * reaching the provider's servers.
 */
export class NetworkError extends AIProviderError {
  constructor(provider: string, message?: string) {
    super(
      message || 'Network error. Please check your internet connection.',
      0,
      provider
    );
    this.name = 'NetworkError';
  }
}

/**
 * Error for provider not configured
 *
 * Thrown when attempting to use a provider that hasn't been
 * properly configured (e.g., missing API key).
 */
export class ProviderNotConfiguredError extends AIProviderError {
  constructor(provider: string, requirement: string = 'API key') {
    super(
      `${provider} not configured. Please provide ${requirement}.`,
      401,
      provider
    );
    this.name = 'ProviderNotConfiguredError';
  }

  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Type guard for AIProviderError
 */
export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError;
}

/**
 * Checks if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('econnrefused') ||
      message.includes('network')
    );
  }

  return false;
}

/**
 * Checks if an error is an abort/cancellation error
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Wraps unknown errors in an appropriate AIProviderError
 *
 * Use this to ensure all errors thrown by providers are properly typed.
 */
export function wrapError(error: unknown, provider: string): AIProviderError {
  // Already an AIProviderError - return as-is
  if (error instanceof AIProviderError) {
    return error;
  }

  // AbortError should be re-thrown, not wrapped
  if (isAbortError(error)) {
    throw error;
  }

  // Network errors
  if (error instanceof Error && isNetworkError(error)) {
    return new NetworkError(provider);
  }

  // Generic errors
  if (error instanceof Error) {
    return new AIProviderError(error.message, 500, provider);
  }

  // Unknown error type
  return new AIProviderError('Unknown error occurred', 500, provider);
}
