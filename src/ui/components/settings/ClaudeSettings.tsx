/**
 * Claude/Anthropic settings component
 *
 * Handles API key input and storage for the Anthropic provider.
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApiKey, isValidApiKeyFormat } from '../../hooks/useApiKey';
import type { ProviderSettingsProps } from './types';

/**
 * Anthropic/Claude provider settings form
 */
export function ClaudeSettings({ onValidationError, onSuccess }: ProviderSettingsProps) {
  const { apiKey, isSaving, saveApiKey, clearApiKey } = useApiKey();

  const [anthropicKey, setAnthropicKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Populate input with existing API key on load
  useEffect(() => {
    if (apiKey) {
      setAnthropicKey(apiKey);
    }
  }, [apiKey]);

  // Clear messages when input changes
  useEffect(() => {
    onValidationError(null);
  }, [anthropicKey, onValidationError]);

  // Validation
  const isInputValid = anthropicKey.length > 0 && isValidApiKeyFormat(anthropicKey);
  const showValidationHint = anthropicKey.length > 0 && !anthropicKey.startsWith('sk-ant-');

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    if (!isInputValid) {
      onValidationError('API key must start with "sk-ant-" and be at least 50 characters');
      return;
    }

    onValidationError(null);
    const success = await saveApiKey(anthropicKey);
    if (success) {
      onSuccess('Anthropic API key saved successfully');
    }
  };

  /**
   * Handle clear button click
   */
  const handleClear = async () => {
    onValidationError(null);
    const success = await clearApiKey();
    if (success) {
      setAnthropicKey('');
      onSuccess('Anthropic API key cleared');
    }
  };

  return (
    <div className="space-y-3">
      <label htmlFor="anthropic-key-input" className="block text-sm font-medium">
        Anthropic API Key
      </label>

      {/* Input with show/hide toggle */}
      <div className="relative">
        <input
          id="anthropic-key-input"
          type={showKey ? 'text' : 'password'}
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          placeholder="sk-ant-..."
          className="border rounded-md px-3 py-2 w-full pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded transition-colors"
          aria-label={showKey ? 'Hide API key' : 'Show API key'}
        >
          {showKey ? (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Eye className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Get your API key from{' '}
        <a
          href="https://console.anthropic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          console.anthropic.com
        </a>
      </p>

      {/* Validation hint */}
      {showValidationHint && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          API key should start with &quot;sk-ant-&quot;
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !isInputValid}
          className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>

        {apiKey && (
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
