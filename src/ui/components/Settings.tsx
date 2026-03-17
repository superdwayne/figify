/**
 * Settings component for AI provider configuration
 *
 * Provides a form for users to:
 * - Select AI provider (Anthropic or Ollama)
 * - Configure provider-specific settings
 * - Test connection to Ollama
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Sun, Moon, Monitor } from 'lucide-react';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect';
import { useApiKey, isValidApiKeyFormat } from '../hooks/useApiKey';
import { ApiKeySettings } from './settings/index';
import { useTheme } from '../hooks/useTheme';
import type { AIProviderType } from '../services/ai';
import { PROVIDER_INFO } from '../services/ai';
import { OllamaProvider } from '../services/ai/ollamaProvider';
import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';
import { OllamaSetupGuide } from './ErrorDisplay';

/**
 * Settings component props
 */
interface SettingsProps {
  /** Callback when user wants to close settings (back button) */
  onClose: () => void;
  /** Callback when provider changes */
  onProviderChange?: (provider: AIProviderType) => void;
}

/**
 * Settings panel component for AI provider configuration
 */
export function Settings({ onClose, onProviderChange }: SettingsProps) {
  const { apiKey, isLoading, isSaving, error, saveApiKey, clearApiKey } = useApiKey();
  const { theme, setTheme } = useTheme();

  // Provider selection
  const [provider, setProvider] = useState<AIProviderType>(() => {
    // Load from storage (with fallback for Figma sandbox)
    return (getStorageItem(STORAGE_KEYS.AI_PROVIDER) as AIProviderType) || 'anthropic';
  });

  // Provider switch confirmation dialog state
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<AIProviderType | null>(null);

  // Anthropic settings
  const [anthropicKey, setAnthropicKey] = useState('');

  // OpenAI settings
  const [openaiKey, setOpenaiKey] = useState(() => {
    return getStorageItem(STORAGE_KEYS.OPENAI_API_KEY) || '';
  });

  // Gemini settings
  const [geminiKey, setGeminiKey] = useState(() => {
    return getStorageItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
  });

  // Ollama settings
  const [ollamaUrl, setOllamaUrl] = useState(() => {
    return getStorageItem(STORAGE_KEYS.OLLAMA_URL) || 'http://localhost:11434';
  });
  const [ollamaModel, setOllamaModel] = useState(() => {
    return getStorageItem(STORAGE_KEYS.OLLAMA_MODEL) || 'llava:latest';
  });
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  // Messages
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Populate Anthropic input with existing API key on load
  useEffect(() => {
    if (apiKey) {
      setAnthropicKey(apiKey);
    }
  }, [apiKey]);

  // Save provider selection and notify parent
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.AI_PROVIDER, provider);
    onProviderChange?.(provider);
  }, [provider, onProviderChange]);

  // Save Ollama settings
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.OLLAMA_URL, ollamaUrl);
    setStorageItem(STORAGE_KEYS.OLLAMA_MODEL, ollamaModel);
  }, [ollamaUrl, ollamaModel]);

  // Clear messages when any input changes
  useEffect(() => {
    setValidationError(null);
    setSuccessMessage(null);
  }, [anthropicKey, openaiKey, geminiKey]);

  // Save OpenAI key to storage (debounced to prevent writes on every keystroke)
  useDebouncedEffect(() => {
    if (openaiKey) {
      setStorageItem(STORAGE_KEYS.OPENAI_API_KEY, openaiKey);
    }
  }, [openaiKey], 500);

  // Save Gemini key to storage (debounced to prevent writes on every keystroke)
  useDebouncedEffect(() => {
    if (geminiKey) {
      setStorageItem(STORAGE_KEYS.GEMINI_API_KEY, geminiKey);
    }
  }, [geminiKey], 500);

  // Check if current Anthropic input is valid for saving
  const isAnthropicInputValid = anthropicKey.length > 0 && isValidApiKeyFormat(anthropicKey);
  const showAnthropicValidationHint = anthropicKey.length > 0 && !anthropicKey.startsWith('sk-ant-');

  // Check if OpenAI key is valid (starts with sk-)
  const isOpenaiKeyValid = openaiKey.length > 20;

  // Check if Gemini key is valid
  const isGeminiKeyValid = geminiKey.length > 20;

  /**
   * Handle save button click (Anthropic)
   */
  const handleSaveAnthropic = async () => {
    if (!isAnthropicInputValid) {
      setValidationError('API key must start with "sk-ant-" and be at least 50 characters');
      return;
    }

    setValidationError(null);
    setSuccessMessage(null);

    const success = await saveApiKey(anthropicKey);
    if (success) {
      setSuccessMessage('Anthropic API key saved successfully');
    }
  };

  /**
   * Handle save button click (OpenAI)
   */
  const handleSaveOpenai = () => {
    if (!isOpenaiKeyValid) {
      setValidationError('Please enter a valid OpenAI API key');
      return;
    }

    setValidationError(null);
    setStorageItem(STORAGE_KEYS.OPENAI_API_KEY, openaiKey);
    setSuccessMessage('OpenAI API key saved successfully');
  };

  /**
   * Handle save button click (Gemini)
   */
  const handleSaveGemini = () => {
    if (!isGeminiKeyValid) {
      setValidationError('Please enter a valid Gemini API key');
      return;
    }

    setValidationError(null);
    setStorageItem(STORAGE_KEYS.GEMINI_API_KEY, geminiKey);
    setSuccessMessage('Gemini API key saved successfully');
  };

  /**
   * Handle clear button click (Anthropic)
   */
  const handleClearAnthropic = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    const success = await clearApiKey();
    if (success) {
      setAnthropicKey('');
      setSuccessMessage('Anthropic API key cleared');
    }
  };

  /**
   * Handle clear button click (OpenAI)
   */
  const handleClearOpenai = () => {
    setValidationError(null);
    removeStorageItem(STORAGE_KEYS.OPENAI_API_KEY);
    setOpenaiKey('');
    setSuccessMessage('OpenAI API key cleared');
  };

  /**
   * Handle clear button click (Gemini)
   */
  const handleClearGemini = () => {
    setValidationError(null);
    removeStorageItem(STORAGE_KEYS.GEMINI_API_KEY);
    setGeminiKey('');
    setSuccessMessage('Gemini API key cleared');
  };

  /**
   * Check if the current provider has a configured API key
   */
  const hasCurrentProviderKey = useCallback((): boolean => {
    switch (provider) {
      case 'anthropic':
        return !!apiKey || !!anthropicKey;
      case 'openai':
        return !!openaiKey;
      case 'gemini':
        return !!geminiKey;
      case 'ollama':
        return ollamaStatus === 'connected';
      default:
        return false;
    }
  }, [provider, apiKey, anthropicKey, openaiKey, geminiKey, ollamaStatus]);

  /**
   * Handle provider switch request
   * Shows confirmation dialog if current provider has a configured key
   */
  const handleProviderSwitch = useCallback((newProvider: AIProviderType) => {
    if (newProvider === provider) return;

    // Check if current provider has configuration
    if (hasCurrentProviderKey()) {
      setPendingProvider(newProvider);
      setShowSwitchConfirm(true);
    } else {
      // No existing configuration, switch directly
      setProvider(newProvider);
    }
  }, [provider, hasCurrentProviderKey]);

  /**
   * Confirm provider switch - keeps all API keys
   */
  const handleConfirmSwitch = useCallback(() => {
    if (pendingProvider) {
      setProvider(pendingProvider);
      setSuccessMessage(`Switched to ${PROVIDER_INFO[pendingProvider].name}. Your API keys are preserved.`);
    }
    setShowSwitchConfirm(false);
    setPendingProvider(null);
  }, [pendingProvider]);

  /**
   * Cancel provider switch
   */
  const handleCancelSwitch = useCallback(() => {
    setShowSwitchConfirm(false);
    setPendingProvider(null);
  }, []);

  /**
   * Test Ollama connection
   */
  const handleTestOllama = async () => {
    setOllamaStatus('checking');
    setOllamaError(null);
    setOllamaModels([]);

    try {
      const ollamaProvider = new OllamaProvider({
        type: 'ollama',
        baseUrl: ollamaUrl,
        model: ollamaModel,
      });

      const health = await ollamaProvider.checkHealth();

      if (health.ok) {
        setOllamaStatus('connected');
        const visionModels = await ollamaProvider.listVisionModels();
        setOllamaModels(visionModels);

        if (visionModels.length === 0) {
          setOllamaError('No vision models found. Install one with: ollama pull llava');
        }
      } else {
        setOllamaStatus('error');
        setOllamaError(health.error || 'Failed to connect to Ollama');
      }
    } catch (err) {
      setOllamaStatus('error');
      setOllamaError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto" role="region" aria-label="Settings panel">
      {/* Status announcements for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {successMessage}
        {validationError && `Error: ${validationError}`}
        {error && `Error: ${error}`}
      </div>

      {/* Header with back button */}
      <div className="flex items-center gap-2 pb-4 border-b mb-4">
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary rounded transition-colors focus-ring"
          aria-label="Back to main view"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h2 className="text-lg font-semibold" id="settings-title">Settings</h2>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 space-y-6">
          {/* Provider Selection */}
          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium">AI Provider</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Select AI provider">
              <button
                onClick={() => handleProviderSwitch('anthropic')}
                role="radio"
                aria-checked={provider === 'anthropic'}
                className={`px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                  provider === 'anthropic'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-secondary border-border'
                }`}
              >
                Claude (Anthropic)
              </button>
              <button
                onClick={() => handleProviderSwitch('openai')}
                role="radio"
                aria-checked={provider === 'openai'}
                className={`px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                  provider === 'openai'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-secondary border-border'
                }`}
              >
                GPT-4 (OpenAI)
              </button>
              <button
                onClick={() => handleProviderSwitch('gemini')}
                role="radio"
                aria-checked={provider === 'gemini'}
                className={`px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                  provider === 'gemini'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-secondary border-border'
                }`}
              >
                Gemini (Google)
              </button>
              <button
                onClick={() => handleProviderSwitch('ollama')}
                role="radio"
                aria-checked={provider === 'ollama'}
                className={`px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                  provider === 'ollama'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-secondary border-border'
                }`}
              >
                Ollama (Local)
              </button>
            </div>
          </fieldset>

          {/* Validation error */}
          {validationError && (
            <p className="text-sm text-red-600 dark:text-red-400 live-region-update" role="alert">
              {validationError}
            </p>
          )}

          {/* Hook error (storage failure) */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 live-region-update" role="alert">
              {error}
            </p>
          )}

          {/* Success message */}
          {successMessage && (
            <p className="text-sm text-green-600 dark:text-green-400 live-region-update" role="status">
              {successMessage}
            </p>
          )}

          {/* Provider-specific settings */}
          {provider === 'anthropic' && (
            <ApiKeySettings
              provider="anthropic"
              value={anthropicKey}
              onChange={setAnthropicKey}
              onSave={handleSaveAnthropic}
              onClear={handleClearAnthropic}
              isValid={isAnthropicInputValid}
              isSaving={isSaving}
              hasSavedKey={!!apiKey}
              validationHint={showAnthropicValidationHint ? 'API key should start with "sk-ant-"' : undefined}
              placeholder="sk-ant-..."
              helpUrl="https://console.anthropic.com"
              helpText="console.anthropic.com"
            />
          )}

          {provider === 'openai' && (
            <ApiKeySettings
              provider="openai"
              value={openaiKey}
              onChange={setOpenaiKey}
              onSave={handleSaveOpenai}
              onClear={handleClearOpenai}
              isValid={isOpenaiKeyValid}
              hasSavedKey={!!openaiKey}
              placeholder="sk-..."
              helpUrl="https://platform.openai.com/api-keys"
              helpText="platform.openai.com"
            />
          )}

          {provider === 'gemini' && (
            <ApiKeySettings
              provider="gemini"
              value={geminiKey}
              onChange={setGeminiKey}
              onSave={handleSaveGemini}
              onClear={handleClearGemini}
              isValid={isGeminiKeyValid}
              hasSavedKey={!!geminiKey}
              placeholder="AIza..."
              helpUrl="https://aistudio.google.com/apikey"
              helpText="aistudio.google.com"
            />
          )}

          {provider === 'ollama' && (
            /* Ollama Settings */
            <div className="space-y-4">
              {/* Ollama URL */}
              <div className="space-y-2">
                <label htmlFor="ollama-url" className="block text-sm font-medium">
                  Ollama URL
                </label>
                <input
                  id="ollama-url"
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label htmlFor="ollama-model" className="block text-sm font-medium">
                  Vision Model
                </label>
                {ollamaModels.length > 0 ? (
                  <select
                    id="ollama-model"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                  >
                    {ollamaModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="ollama-model"
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="llava:latest"
                    className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended: llava, llava:13b, moondream
                </p>
              </div>

              {/* Connection Status */}
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                {ollamaStatus === 'connected' && (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden="true" />
                    <span className="text-sm text-green-600 dark:text-green-400">Connected to Ollama</span>
                  </>
                )}
                {ollamaStatus === 'error' && (
                  <>
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
                    <span className="text-sm text-red-600 dark:text-red-400">{ollamaError}</span>
                  </>
                )}
              </div>

              {/* Available models list */}
              {ollamaModels.length > 0 && (
                <div className="text-xs text-muted-foreground" aria-label={`Available vision models: ${ollamaModels.join(', ')}`}>
                  Available vision models: {ollamaModels.join(', ')}
                </div>
              )}

              {/* Test Connection Button */}
              <button
                onClick={handleTestOllama}
                disabled={ollamaStatus === 'checking'}
                aria-busy={ollamaStatus === 'checking'}
                className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 focus-ring"
              >
                {ollamaStatus === 'checking' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </button>

              {/* Setup Guide - shown when not connected */}
              {ollamaStatus !== 'connected' && (
                <OllamaSetupGuide />
              )}
            </div>
          )}

          {/* Appearance Section - Divider */}
          <fieldset className="border-t pt-6">
            <div className="space-y-3">
              <legend className="block text-sm font-medium">Appearance</legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Select theme">
                <button
                  onClick={() => setTheme('system')}
                  role="radio"
                  aria-checked={theme === 'system'}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                    theme === 'system'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-secondary border-border'
                  }`}
                  aria-label="Use system theme"
                >
                  <Monitor className="w-4 h-4" aria-hidden="true" />
                  <span>System</span>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  role="radio"
                  aria-checked={theme === 'light'}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                    theme === 'light'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-secondary border-border'
                  }`}
                  aria-label="Use light theme"
                >
                  <Sun className="w-4 h-4" aria-hidden="true" />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  role="radio"
                  aria-checked={theme === 'dark'}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors focus-ring ${
                    theme === 'dark'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-secondary border-border'
                  }`}
                  aria-label="Use dark theme"
                >
                  <Moon className="w-4 h-4" aria-hidden="true" />
                  <span>Dark</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                System follows your device&apos;s color scheme preference.
              </p>
            </div>
          </fieldset>
        </div>
      )}

      {/* Provider switch confirmation dialog */}
      <ConfirmDialog
        isOpen={showSwitchConfirm}
        title="Switch AI Provider"
        message={pendingProvider
          ? `Switch from ${PROVIDER_INFO[provider].name} to ${PROVIDER_INFO[pendingProvider].name}?`
          : 'Switch to a different AI provider?'
        }
        warning="Your existing API keys will be preserved. You can switch back anytime without re-entering them."
        confirmText="Switch and keep keys"
        cancelText="Cancel"
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
      />
    </div>
  );
}
