/**
 * Ollama settings component
 *
 * Handles URL and model configuration for local Ollama provider.
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { OllamaProvider } from '../../services/ai/ollamaProvider';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../../utils/storage';
import { OllamaSetupGuide } from '../ErrorDisplay';
import type { OllamaStatus } from './types';

/**
 * Ollama provider settings form
 */
export function OllamaSettings() {
  const [url, setUrl] = useState(() => {
    return getStorageItem(STORAGE_KEYS.OLLAMA_URL) || 'http://localhost:11434';
  });
  const [model, setModel] = useState(() => {
    return getStorageItem(STORAGE_KEYS.OLLAMA_MODEL) || 'llava:latest';
  });
  const [status, setStatus] = useState<OllamaStatus>('idle');
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Save settings to storage when they change
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.OLLAMA_URL, url);
    setStorageItem(STORAGE_KEYS.OLLAMA_MODEL, model);
  }, [url, model]);

  /**
   * Test Ollama connection
   */
  const handleTestConnection = async () => {
    setStatus('checking');
    setError(null);
    setModels([]);

    try {
      const ollamaProvider = new OllamaProvider({
        type: 'ollama',
        baseUrl: url,
        model: model,
      });

      const health = await ollamaProvider.checkHealth();

      if (health.ok) {
        setStatus('connected');
        const visionModels = await ollamaProvider.listVisionModels();
        setModels(visionModels);

        if (visionModels.length === 0) {
          setError('No vision models found. Install one with: ollama pull llava');
        }
      } else {
        setStatus('error');
        setError(health.error || 'Failed to connect to Ollama');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Ollama URL */}
      <div className="space-y-2">
        <label htmlFor="ollama-url" className="block text-sm font-medium">
          Ollama URL
        </label>
        <input
          id="ollama-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
        />
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label htmlFor="ollama-model" className="block text-sm font-medium">
          Vision Model
        </label>
        {models.length > 0 ? (
          <select
            id="ollama-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="ollama-model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="llava:latest"
            className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-foreground"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Recommended: llava, llava:13b, moondream
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {status === 'connected' && (
          <>
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-600 dark:text-green-400">Connected to Ollama</span>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </>
        )}
      </div>

      {/* Available models list */}
      {models.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Available vision models: {models.join(', ')}
        </div>
      )}

      {/* Test Connection Button */}
      <button
        onClick={handleTestConnection}
        disabled={status === 'checking'}
        className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {status === 'checking' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing Connection...
          </>
        ) : (
          'Test Connection'
        )}
      </button>

      {/* Setup Guide - shown when not connected */}
      {status !== 'connected' && (
        <OllamaSetupGuide />
      )}
    </div>
  );
}
