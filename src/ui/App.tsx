import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import {
  UIMessage,
  isPluginMessage,
  generateCorrelationId
} from '../shared/messages';
import { ImageCapture } from './components/ImageCapture';
import { Settings } from './components/Settings';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getStorageItem, STORAGE_KEYS } from './utils/storage';
import type { AIProviderType } from './services/ai';
import { useApiKey } from './hooks/useApiKey';

/**
 * Provider badge configuration - colors and display names (with dark mode support)
 */
const PROVIDER_BADGE_CONFIG: Record<AIProviderType, { label: string; bgColor: string; textColor: string }> = {
  anthropic: { label: 'Claude', bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-800 dark:text-orange-300' },
  openai: { label: 'OpenAI', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-800 dark:text-green-300' },
  gemini: { label: 'Gemini', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-800 dark:text-blue-300' },
  ollama: { label: 'Ollama', bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-800 dark:text-purple-300' },
};

/**
 * Check if the given provider is configured with an API key
 */
function isProviderConfigured(provider: AIProviderType): boolean {
  switch (provider) {
    case 'anthropic':
      // Anthropic key is managed via the plugin storage, not localStorage
      // We'll check this separately in the component
      return false;
    case 'openai':
      return !!getStorageItem(STORAGE_KEYS.OPENAI_API_KEY);
    case 'gemini':
      return !!getStorageItem(STORAGE_KEYS.GEMINI_API_KEY);
    case 'ollama':
      // Ollama doesn't need an API key, just a URL
      return !!getStorageItem(STORAGE_KEYS.OLLAMA_URL);
    default:
      return false;
  }
}

export default function App() {
  // Pending response handlers for correlation
  const pendingResponses = useRef(new Map<string, (payload: unknown) => void>());

  // Send message to plugin main thread
  const postToPlugin = useCallback((message: UIMessage): void => {
    parent.postMessage({ pluginMessage: message }, '*');
  }, []);

  // Send request and await response
  const requestFromPlugin = useCallback((action: string, payload?: unknown): Promise<unknown> => {
    return new Promise((resolve) => {
      const correlationId = generateCorrelationId();
      pendingResponses.current.set(correlationId, resolve);

      postToPlugin({
        type: 'REQUEST',
        correlationId,
        action,
        payload
      });
    });
  }, [postToPlugin]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [selectionCount, setSelectionCount] = useState(0);
  const [lastPing, setLastPing] = useState<number | null>(null);

  // Provider state
  const [currentProvider, setCurrentProvider] = useState<AIProviderType>(() => {
    return (getStorageItem(STORAGE_KEYS.AI_PROVIDER) as AIProviderType) || 'anthropic';
  });

  // Get Anthropic API key status (managed via plugin storage)
  const { apiKey: anthropicKey, isLoading: isLoadingAnthropicKey } = useApiKey();

  // Check if current provider is configured
  const isCurrentProviderConfigured = useMemo(() => {
    if (currentProvider === 'anthropic') {
      return !!anthropicKey;
    }
    return isProviderConfigured(currentProvider);
  }, [currentProvider, anthropicKey]);

  // Refresh provider state when returning from settings
  useEffect(() => {
    if (view === 'main') {
      const storedProvider = getStorageItem(STORAGE_KEYS.AI_PROVIDER) as AIProviderType;
      if (storedProvider && storedProvider !== currentProvider) {
        setCurrentProvider(storedProvider);
      }
    }
  }, [view, currentProvider]);

  // Handle messages from plugin
  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = event.data.pluginMessage;
    if (!isPluginMessage(msg)) return;

    switch (msg.type) {
      case 'INIT':
        setStatus('ready');
        break;

      case 'SELECTION_CHANGED':
        setSelectionCount(msg.nodeCount);
        break;

      case 'RESPONSE':
        // Resolve pending request
        const handler = pendingResponses.current.get(msg.correlationId);
        if (handler) {
          handler(msg.payload);
          pendingResponses.current.delete(msg.correlationId);
        }
        break;
    }
  }, []);

  // Set up message listener and notify ready
  useEffect(() => {
    window.addEventListener('message', handleMessage);

    // Tell main thread we're ready
    postToPlugin({
      type: 'UI_READY',
      correlationId: generateCorrelationId()
    });

    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage, postToPlugin]);

  // Test ping functionality
  const handlePing = async () => {
    const response = await requestFromPlugin('PING') as { pong: boolean; timestamp: number };
    setLastPing(response.timestamp);
  };

  // Close plugin
  const handleClose = () => {
    postToPlugin({ type: 'CLOSE_PLUGIN' });
  };

  return (
    <div className="flex flex-col h-screen p-4">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b" role="banner">
        <h1 className="text-lg font-semibold">Figify</h1>
        <div className="flex items-center gap-2">
          {/* Provider Badge - clickable to open settings */}
          {!isLoadingAnthropicKey && (
            <button
              onClick={() => setView('settings')}
              className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors hover:opacity-80 focus-ring ${
                isCurrentProviderConfigured
                  ? `${PROVIDER_BADGE_CONFIG[currentProvider].bgColor} ${PROVIDER_BADGE_CONFIG[currentProvider].textColor}`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
              title={isCurrentProviderConfigured
                ? `Using ${PROVIDER_BADGE_CONFIG[currentProvider].label} - Click to change`
                : 'Not configured - Click to set up'}
              aria-label={isCurrentProviderConfigured
                ? `Current AI provider: ${PROVIDER_BADGE_CONFIG[currentProvider].label}. Click to change provider settings.`
                : 'AI provider not configured. Click to set up.'}
            >
              {isCurrentProviderConfigured
                ? PROVIDER_BADGE_CONFIG[currentProvider].label
                : 'Not configured'}
            </button>
          )}
          {/* Connection status */}
          <span
            className={`text-xs px-2 py-1 rounded ${
              status === 'ready'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {status === 'ready' ? 'Connected' : 'Connecting...'}
          </span>
          <button
            onClick={() => setView('settings')}
            className="p-1 hover:bg-secondary rounded transition-colors focus-ring"
            aria-label="Open settings"
            aria-expanded={view === 'settings'}
          >
            <SettingsIcon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main content area - conditional rendering */}
      <main
        id="main-content"
        className="flex-1 flex flex-col py-4"
        role="main"
        aria-label={view === 'settings' ? 'Settings' : 'Image capture and analysis'}
      >
        {view === 'settings' ? (
          <ErrorBoundary>
            <Settings
              onClose={() => setView('main')}
              onProviderChange={setCurrentProvider}
            />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary>
            <ImageCapture />
          </ErrorBoundary>
        )}
      </main>

      {/* Footer with debug info */}
      <footer className="pt-4 border-t space-y-2" role="contentinfo">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span aria-label={`${selectionCount} node${selectionCount !== 1 ? 's' : ''} selected in Figma`}>
            Selection: {selectionCount} node{selectionCount !== 1 ? 's' : ''}
          </span>
          {lastPing && (
            <span aria-label={`Last connection test: ${new Date(lastPing).toLocaleTimeString()}`}>
              Last ping: {new Date(lastPing).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex gap-2" role="group" aria-label="Plugin actions">
          <button
            onClick={handlePing}
            className="flex-1 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors focus-ring"
            aria-label="Test connection to Figma"
          >
            Test Connection
          </button>
          <button
            onClick={handleClose}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors focus-ring"
            aria-label="Close plugin"
          >
            Close
          </button>
        </div>
      </footer>
    </div>
  );
}
