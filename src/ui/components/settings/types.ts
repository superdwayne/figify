/**
 * Shared types for Settings components
 */

import type { AIProviderType } from '../../services/ai';

/**
 * Common props for provider settings components
 */
export interface ProviderSettingsProps {
  /** Callback when validation error occurs */
  onValidationError: (message: string | null) => void;
  /** Callback when success message should be shown */
  onSuccess: (message: string) => void;
}

/**
 * Props for ProviderSelector component
 */
export interface ProviderSelectorProps {
  /** Currently selected provider */
  provider: AIProviderType;
  /** Callback when provider selection changes */
  onProviderChange: (provider: AIProviderType) => void;
}

/**
 * Ollama connection status type
 */
export type OllamaStatus = 'idle' | 'checking' | 'connected' | 'error';
