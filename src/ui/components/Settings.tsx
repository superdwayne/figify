/**
 * Settings component for API key management
 *
 * Provides a form for users to:
 * - Enter their Anthropic API key
 * - Toggle visibility (show/hide)
 * - Save or clear the stored key
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApiKey, isValidApiKeyFormat } from '../hooks/useApiKey';

/**
 * Settings component props
 */
interface SettingsProps {
  /** Callback when user wants to close settings (back button) */
  onClose: () => void;
}

/**
 * Settings panel component for API key configuration
 *
 * @example
 * ```tsx
 * function App() {
 *   const [showSettings, setShowSettings] = useState(false);
 *
 *   return showSettings ? (
 *     <Settings onClose={() => setShowSettings(false)} />
 *   ) : (
 *     <MainContent />
 *   );
 * }
 * ```
 */
export function Settings({ onClose }: SettingsProps) {
  const { apiKey, isLoading, isSaving, error, saveApiKey, clearApiKey } = useApiKey();

  // Local input state
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Populate input with existing API key on load
  useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey);
    }
  }, [apiKey]);

  // Clear messages when input changes
  useEffect(() => {
    setValidationError(null);
    setSuccessMessage(null);
  }, [inputValue]);

  // Check if current input is valid for saving
  const isInputValid = inputValue.length > 0 && isValidApiKeyFormat(inputValue);
  const showValidationHint = inputValue.length > 0 && !inputValue.startsWith('sk-ant-');

  /**
   * Handle save button click
   */
  const handleSave = async () => {
    if (!isInputValid) {
      setValidationError('API key must start with "sk-ant-" and be at least 50 characters');
      return;
    }

    setValidationError(null);
    setSuccessMessage(null);

    const success = await saveApiKey(inputValue);
    if (success) {
      setSuccessMessage('API key saved successfully');
    }
  };

  /**
   * Handle clear button click
   */
  const handleClear = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    const success = await clearApiKey();
    if (success) {
      setInputValue('');
      setSuccessMessage('API key cleared');
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header with back button */}
      <div className="flex items-center gap-2 pb-4 border-b mb-4">
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary rounded transition-colors"
          aria-label="Back to main view"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 space-y-6">
          {/* API Key Section */}
          <div className="space-y-3">
            <label htmlFor="api-key-input" className="block text-sm font-medium">
              Anthropic API Key
            </label>

            {/* Input with show/hide toggle */}
            <div className="relative">
              <input
                id="api-key-input"
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="sk-ant-..."
                className="border rounded-md px-3 py-2 w-full pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              <p className="text-sm text-amber-600">
                API key should start with &quot;sk-ant-&quot;
              </p>
            )}

            {/* Validation error */}
            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}

            {/* Hook error (storage failure) */}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Success message */}
            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}
          </div>

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

            {/* Show Clear button only when there's a stored key */}
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
      )}
    </div>
  );
}
