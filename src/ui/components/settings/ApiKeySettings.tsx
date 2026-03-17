/**
 * Reusable API key settings component
 *
 * A unified component for API key input with show/hide toggle,
 * validation, and save/clear actions. Reduces duplication across
 * provider-specific settings (Anthropic, OpenAI, Gemini).
 */

import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * Props for the ApiKeySettings component
 */
export interface ApiKeySettingsProps {
  /** The provider this settings component is for */
  provider: 'anthropic' | 'openai' | 'gemini';
  /** Current API key value */
  value: string;
  /** Callback when the API key value changes */
  onChange: (value: string) => void;
  /** Callback when save button is clicked */
  onSave: () => void;
  /** Callback when clear button is clicked */
  onClear: () => void;
  /** Whether the current key value is valid for saving */
  isValid: boolean;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
  /** Whether there is a saved API key (determines if Clear button shows) */
  hasSavedKey: boolean;
  /** Optional validation hint message to display */
  validationHint?: string;
  /** Placeholder text for the input field */
  placeholder: string;
  /** URL for the help link */
  helpUrl: string;
  /** Display text for the help link */
  helpText: string;
}

/**
 * Provider display names for labels
 */
const PROVIDER_LABELS: Record<ApiKeySettingsProps['provider'], string> = {
  anthropic: 'Anthropic API Key',
  openai: 'OpenAI API Key',
  gemini: 'Google Gemini API Key',
};

/**
 * Reusable API key settings component
 *
 * Provides a consistent UI for API key configuration across providers:
 * - Password input with show/hide toggle
 * - Help text with external link
 * - Optional validation hint
 * - Save and Clear action buttons
 * - Loading state during save operations
 * - Full accessibility support
 */
export function ApiKeySettings({
  provider,
  value,
  onChange,
  onSave,
  onClear,
  isValid,
  isSaving = false,
  hasSavedKey,
  validationHint,
  placeholder,
  helpUrl,
  helpText,
}: ApiKeySettingsProps) {
  const [showKey, setShowKey] = useState(false);

  const inputId = `${provider}-key-input`;
  const label = PROVIDER_LABELS[provider];

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>

      {/* Input with show/hide toggle */}
      <div className="relative">
        <input
          id={inputId}
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border rounded-md px-3 py-2 w-full pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
          autoComplete="off"
          aria-describedby={validationHint ? `${inputId}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors focus-ring"
          aria-label={showKey ? 'Hide API key' : 'Show API key'}
          aria-pressed={showKey}
        >
          {showKey ? (
            <EyeOff className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Get your API key from{' '}
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {helpText}
        </a>
      </p>

      {/* Validation hint */}
      {validationHint && (
        <p
          id={`${inputId}-hint`}
          className="text-sm text-amber-600 dark:text-amber-400"
          role="status"
        >
          {validationHint}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2" role="group" aria-label="API key actions">
        <button
          onClick={onSave}
          disabled={isSaving || !isValid}
          aria-busy={isSaving}
          className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus-ring"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>

        {hasSavedKey && (
          <button
            onClick={onClear}
            disabled={isSaving}
            aria-label={`Clear ${label}`}
            className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
