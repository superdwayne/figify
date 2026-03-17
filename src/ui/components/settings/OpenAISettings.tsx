/**
 * OpenAI settings component
 *
 * Handles API key input and storage for the OpenAI provider.
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../../utils/storage';
import type { ProviderSettingsProps } from './types';

/**
 * OpenAI provider settings form
 */
export function OpenAISettings({ onValidationError, onSuccess }: ProviderSettingsProps) {
  const [apiKey, setApiKey] = useState(() => {
    return getStorageItem(STORAGE_KEYS.OPENAI_API_KEY) || '';
  });
  const [showKey, setShowKey] = useState(false);

  // Save key to storage when it changes
  useEffect(() => {
    if (apiKey) {
      setStorageItem(STORAGE_KEYS.OPENAI_API_KEY, apiKey);
    }
  }, [apiKey]);

  // Clear messages when input changes
  useEffect(() => {
    onValidationError(null);
  }, [apiKey, onValidationError]);

  // Validation
  const isKeyValid = apiKey.length > 20;

  /**
   * Handle save button click
   */
  const handleSave = () => {
    if (!isKeyValid) {
      onValidationError('Please enter a valid OpenAI API key');
      return;
    }

    onValidationError(null);
    setStorageItem(STORAGE_KEYS.OPENAI_API_KEY, apiKey);
    onSuccess('OpenAI API key saved successfully');
  };

  /**
   * Handle clear button click
   */
  const handleClear = () => {
    onValidationError(null);
    removeStorageItem(STORAGE_KEYS.OPENAI_API_KEY);
    setApiKey('');
    onSuccess('OpenAI API key cleared');
  };

  return (
    <div className="space-y-3">
      <label htmlFor="openai-key-input" className="block text-sm font-medium">
        OpenAI API Key
      </label>

      {/* Input with show/hide toggle */}
      <div className="relative">
        <input
          id="openai-key-input"
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
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
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          platform.openai.com
        </a>
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!isKeyValid}
          className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>

        {apiKey && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
