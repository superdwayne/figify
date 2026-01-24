import { useEffect, useState, useCallback } from 'react';
import {
  UIMessage,
  isPluginMessage,
  generateCorrelationId
} from '../shared/messages';

// Pending response handlers for correlation
const pendingResponses = new Map<string, (payload: unknown) => void>();

// Send message to plugin main thread
function postToPlugin(message: UIMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

// Send request and await response
function requestFromPlugin(action: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    const correlationId = generateCorrelationId();
    pendingResponses.set(correlationId, resolve);

    postToPlugin({
      type: 'REQUEST',
      correlationId,
      action,
      payload
    });
  });
}

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectionCount, setSelectionCount] = useState(0);
  const [lastPing, setLastPing] = useState<number | null>(null);

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
        const handler = pendingResponses.get(msg.correlationId);
        if (handler) {
          handler(msg.payload);
          pendingResponses.delete(msg.correlationId);
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
  }, [handleMessage]);

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
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b">
        <h1 className="text-lg font-semibold">Screenshot to Shadcn</h1>
        <span className={`text-xs px-2 py-1 rounded ${
          status === 'ready'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {status === 'ready' ? 'Connected' : 'Connecting...'}
        </span>
      </header>

      {/* Main content area - placeholder for future phases */}
      <main className="flex-1 flex flex-col items-center justify-center py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-lg bg-secondary flex items-center justify-center">
            <svg
              className="w-8 h-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Paste a screenshot or drag an image here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (Coming in Phase 3)
            </p>
          </div>
        </div>
      </main>

      {/* Footer with debug info */}
      <footer className="pt-4 border-t space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Selection: {selectionCount} node{selectionCount !== 1 ? 's' : ''}</span>
          {lastPing && <span>Last ping: {new Date(lastPing).toLocaleTimeString()}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePing}
            className="flex-1 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          >
            Test Connection
          </button>
          <button
            onClick={handleClose}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </footer>
    </div>
  );
}
