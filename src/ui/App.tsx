import { useEffect, useState, useCallback } from 'react';
import {
  UIMessage,
  isPluginMessage,
  generateCorrelationId
} from '../shared/messages';
import { ImageCapture } from './components/ImageCapture';

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

      {/* Main content area - Image capture */}
      <main className="flex-1 flex flex-col py-4">
        <ImageCapture />
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
