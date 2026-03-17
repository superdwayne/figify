/**
 * Centralized error message catalog with actionable troubleshooting steps
 *
 * Provides user-friendly error messages with specific guidance for
 * resolving common issues across all AI providers.
 */

import type { AIProviderType } from '../services/ai';

/**
 * Error category for classification
 */
export type ErrorCategory =
  | 'api_key'
  | 'rate_limit'
  | 'network'
  | 'timeout'
  | 'server'
  | 'connection'
  | 'model'
  | 'image'
  | 'parse'
  | 'unknown';

/**
 * Structured error with message and troubleshooting steps
 */
export interface ErrorWithSteps {
  /** User-friendly error message */
  message: string;
  /** Actionable troubleshooting steps */
  steps: string[];
  /** Error category for styling/icons */
  category: ErrorCategory;
  /** Whether this is recoverable (can retry) */
  recoverable: boolean;
}

/**
 * Ollama setup instructions with numbered steps
 */
export const OLLAMA_SETUP_STEPS = [
  'Download and install Ollama from https://ollama.ai',
  'Open a terminal and run: ollama pull llava',
  'Wait for the model to download (this may take a few minutes)',
  'Ensure Ollama is running (check for the Ollama icon in your menu bar)',
  'Click "Test Connection" in Settings to verify',
];

/**
 * Error catalog organized by provider and error type
 */
export const ERROR_CATALOG = {
  // API Key Errors
  apiKey: {
    invalid: {
      anthropic: {
        message: 'Invalid Anthropic API key',
        steps: [
          'Go to Settings and check your API key',
          'Ensure the key starts with "sk-ant-"',
          'Get a new key from console.anthropic.com if needed',
        ],
        category: 'api_key' as ErrorCategory,
        recoverable: false,
      },
      openai: {
        message: 'Invalid OpenAI API key',
        steps: [
          'Go to Settings and check your API key',
          'Ensure the key starts with "sk-"',
          'Get a new key from platform.openai.com if needed',
        ],
        category: 'api_key' as ErrorCategory,
        recoverable: false,
      },
      gemini: {
        message: 'Invalid Gemini API key',
        steps: [
          'Go to Settings and check your API key',
          'Verify the key at aistudio.google.com',
          'Generate a new key if the current one is expired',
        ],
        category: 'api_key' as ErrorCategory,
        recoverable: false,
      },
    },
    missing: {
      anthropic: {
        message: 'Anthropic API key not configured',
        steps: [
          'Open Settings (gear icon)',
          'Enter your Anthropic API key',
          'Click Save to store the key',
        ],
        category: 'api_key' as ErrorCategory,
        recoverable: false,
      },
      openai: {
        message: 'OpenAI API key not configured',
        steps: [
          'Open Settings (gear icon)',
          'Select "GPT-4 (OpenAI)" as your provider',
          'Enter your OpenAI API key',
          'Click Save to store the key',
        ],
        category: 'api_key' as ErrorCategory,
        recoverable: false,
      },
      gemini: {
        message: 'Gemini API key not configured',
        steps: [
          'Open Settings (gear icon)',
          'Select "Gemini (Google)" as your provider',
          'Enter your Gemini API key',
          'Click Save to store the key',
        ],
        category: 'api_key' as ErrorCategory,
        recoverable: false,
      },
    },
    permission: {
      message: 'API key does not have required permissions',
      steps: [
        'Check that your API key has vision/image access enabled',
        'Verify your account has sufficient credits or quota',
        'Contact the provider support if the issue persists',
      ],
      category: 'api_key' as ErrorCategory,
      recoverable: false,
    },
  },

  // Rate Limit Errors
  rateLimit: {
    default: {
      message: 'Rate limit exceeded',
      steps: [
        'Wait 30-60 seconds before trying again',
        'Consider upgrading your API plan for higher limits',
        'Reduce the frequency of analysis requests',
      ],
      category: 'rate_limit' as ErrorCategory,
      recoverable: true,
    },
    anthropic: {
      message: 'Claude rate limit exceeded',
      steps: [
        'Wait a moment and try again',
        'Check your usage at console.anthropic.com',
        'Consider upgrading to a higher tier for more requests',
      ],
      category: 'rate_limit' as ErrorCategory,
      recoverable: true,
    },
  },

  // Network Errors
  network: {
    noConnection: {
      message: 'Network connection failed',
      steps: [
        'Check your internet connection',
        'Try refreshing the page',
        'Check if you are behind a firewall or VPN',
        'Try again in a few moments',
      ],
      category: 'network' as ErrorCategory,
      recoverable: true,
    },
    timeout: {
      message: 'Request timed out',
      steps: [
        'Try a smaller or less complex image',
        'Check your internet connection speed',
        'Try again - the server may be temporarily slow',
      ],
      category: 'timeout' as ErrorCategory,
      recoverable: true,
    },
    fetch: {
      message: 'Failed to connect to the AI service',
      steps: [
        'Check your internet connection',
        'The service may be temporarily unavailable',
        'Try again in a few minutes',
      ],
      category: 'network' as ErrorCategory,
      recoverable: true,
    },
  },

  // Server Errors
  server: {
    overloaded: {
      message: 'The AI service is temporarily overloaded',
      steps: [
        'Wait a few minutes and try again',
        'The service is experiencing high demand',
        'Consider trying during off-peak hours',
      ],
      category: 'server' as ErrorCategory,
      recoverable: true,
    },
    unavailable: {
      message: 'The AI service is temporarily unavailable',
      steps: [
        'The service may be undergoing maintenance',
        'Try again in a few minutes',
        'Check the provider status page for updates',
      ],
      category: 'server' as ErrorCategory,
      recoverable: true,
    },
    internal: {
      message: 'The AI service encountered an internal error',
      steps: [
        'Try your request again',
        'If the problem persists, try a different image',
        'The issue is on the server side - it should resolve automatically',
      ],
      category: 'server' as ErrorCategory,
      recoverable: true,
    },
  },

  // Ollama-specific Errors
  ollama: {
    notRunning: {
      message: 'Cannot connect to Ollama',
      steps: OLLAMA_SETUP_STEPS,
      category: 'connection' as ErrorCategory,
      recoverable: true,
    },
    modelNotFound: {
      message: 'Vision model not found in Ollama',
      steps: [
        'Open a terminal',
        'Run: ollama pull llava',
        'Wait for the download to complete',
        'Click "Test Connection" in Settings',
      ],
      category: 'model' as ErrorCategory,
      recoverable: true,
    },
    noVisionModels: {
      message: 'No vision-capable models found',
      steps: [
        'Ollama is running but has no vision models',
        'Open a terminal and run: ollama pull llava',
        'Alternative models: moondream, bakllava, llava:13b',
        'Refresh and test connection again',
      ],
      category: 'model' as ErrorCategory,
      recoverable: true,
    },
  },

  // Image Errors
  image: {
    tooLarge: {
      message: 'Image is too large',
      steps: [
        'Resize the image to under 5MB',
        'Capture a smaller portion of the screen',
        'Use PNG or JPEG format for better compression',
      ],
      category: 'image' as ErrorCategory,
      recoverable: false,
    },
    truncated: {
      message: 'Analysis was truncated due to complexity',
      steps: [
        'Try capturing a smaller section of the UI',
        'The image contains too many elements',
        'Focus on a specific component or section',
      ],
      category: 'image' as ErrorCategory,
      recoverable: true,
    },
    invalid: {
      message: 'Invalid image format',
      steps: [
        'Use PNG, JPEG, or WebP format',
        'Ensure the file is not corrupted',
        'Try capturing a new screenshot',
      ],
      category: 'image' as ErrorCategory,
      recoverable: false,
    },
  },

  // Parse Errors
  parse: {
    invalidJson: {
      message: 'Failed to parse AI response',
      steps: [
        'Try analyzing the image again',
        'The AI may have returned an unexpected format',
        'If the issue persists, try a different image',
      ],
      category: 'parse' as ErrorCategory,
      recoverable: true,
    },
    unexpected: {
      message: 'Unexpected response format',
      steps: [
        'The AI response was not in the expected format',
        'Try the analysis again',
        'Consider using a different AI provider',
      ],
      category: 'parse' as ErrorCategory,
      recoverable: true,
    },
  },

  // Unknown/Generic Errors
  unknown: {
    default: {
      message: 'An unexpected error occurred',
      steps: [
        'Try your request again',
        'Refresh the plugin and retry',
        'If the issue persists, check the console for details',
      ],
      category: 'unknown' as ErrorCategory,
      recoverable: true,
    },
  },
};

/**
 * Get error with steps for a specific provider and HTTP status code
 */
export function getErrorForStatus(
  status: number,
  provider: AIProviderType
): ErrorWithSteps {
  switch (status) {
    case 400:
      return {
        message: 'Invalid request',
        steps: [
          'The request was malformed',
          'Try a different image',
          'Check that the image format is supported',
        ],
        category: 'unknown',
        recoverable: true,
      };

    case 401:
      if (provider in ERROR_CATALOG.apiKey.invalid) {
        return ERROR_CATALOG.apiKey.invalid[provider as keyof typeof ERROR_CATALOG.apiKey.invalid];
      }
      return {
        message: 'Invalid API key',
        steps: ['Check your API key in Settings', 'Ensure the key is correct'],
        category: 'api_key',
        recoverable: false,
      };

    case 403:
      return ERROR_CATALOG.apiKey.permission;

    case 413:
      return ERROR_CATALOG.image.tooLarge;

    case 429:
      if (provider in ERROR_CATALOG.rateLimit) {
        return ERROR_CATALOG.rateLimit[provider as keyof typeof ERROR_CATALOG.rateLimit];
      }
      return ERROR_CATALOG.rateLimit.default;

    case 500:
      return ERROR_CATALOG.server.internal;

    case 503:
      return ERROR_CATALOG.server.unavailable;

    case 529:
      return ERROR_CATALOG.server.overloaded;

    default:
      return ERROR_CATALOG.unknown.default;
  }
}

/**
 * Get error for network/connection failures
 */
export function getNetworkError(errorMessage: string): ErrorWithSteps {
  const message = errorMessage.toLowerCase();

  if (message.includes('timeout') || message.includes('timed out')) {
    return ERROR_CATALOG.network.timeout;
  }

  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return ERROR_CATALOG.network.fetch;
  }

  return ERROR_CATALOG.network.noConnection;
}

/**
 * Get Ollama-specific error with setup instructions
 */
export function getOllamaError(errorMessage: string): ErrorWithSteps {
  const message = errorMessage.toLowerCase();

  if (
    message.includes('cannot connect') ||
    message.includes('econnrefused') ||
    message.includes('failed to fetch') ||
    message.includes('is ollama running')
  ) {
    return ERROR_CATALOG.ollama.notRunning;
  }

  if (message.includes('model') && message.includes('not found')) {
    return ERROR_CATALOG.ollama.modelNotFound;
  }

  if (message.includes('no vision')) {
    return ERROR_CATALOG.ollama.noVisionModels;
  }

  return {
    message: errorMessage,
    steps: [
      'Check that Ollama is running',
      'Verify your model is installed',
      'Try "Test Connection" in Settings',
    ],
    category: 'unknown',
    recoverable: true,
  };
}

/**
 * Get error for parse/response failures
 */
export function getParseError(errorMessage: string): ErrorWithSteps {
  const message = errorMessage.toLowerCase();

  if (message.includes('truncated')) {
    return ERROR_CATALOG.image.truncated;
  }

  if (message.includes('json') || message.includes('parse')) {
    return ERROR_CATALOG.parse.invalidJson;
  }

  return ERROR_CATALOG.parse.unexpected;
}

/**
 * Get error for missing provider configuration
 */
export function getConfigurationError(provider: AIProviderType): ErrorWithSteps {
  if (provider === 'ollama') {
    return ERROR_CATALOG.ollama.notRunning;
  }

  return ERROR_CATALOG.apiKey.missing[provider] || {
    message: 'AI provider not configured',
    steps: [
      'Open Settings to configure your AI provider',
      'Add your API key or connection details',
      'Click Save and try again',
    ],
    category: 'api_key',
    recoverable: false,
  };
}

/**
 * Format error message with troubleshooting steps for display
 */
export function formatErrorWithSteps(error: ErrorWithSteps): string {
  const stepsText = error.steps
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n');

  return `${error.message}\n\nTroubleshooting:\n${stepsText}`;
}

/**
 * Get a simple error message (without steps) for inline display
 */
export function getSimpleErrorMessage(error: ErrorWithSteps): string {
  return error.message;
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: ErrorWithSteps): boolean {
  return error.recoverable;
}

/**
 * Get icon name for error category
 */
export function getErrorIcon(category: ErrorCategory): string {
  switch (category) {
    case 'api_key':
      return 'key';
    case 'rate_limit':
      return 'clock';
    case 'network':
    case 'connection':
      return 'wifi-off';
    case 'timeout':
      return 'timer';
    case 'server':
      return 'server';
    case 'model':
      return 'cpu';
    case 'image':
      return 'image';
    case 'parse':
      return 'file-warning';
    default:
      return 'alert-circle';
  }
}

/**
 * Get suggested action text for error category
 */
export function getSuggestedAction(error: ErrorWithSteps): string {
  switch (error.category) {
    case 'api_key':
      return 'Check your API key in Settings';
    case 'rate_limit':
      return 'Wait a moment and try again';
    case 'network':
    case 'connection':
      return 'Check your internet connection';
    case 'timeout':
      return 'Try a smaller image';
    case 'server':
      return 'Try again in a few minutes';
    case 'model':
      return 'Install a vision model';
    case 'image':
      return error.steps[0] || 'Try a different image';
    case 'parse':
      return 'Try analyzing again';
    default:
      return 'Try again';
  }
}
