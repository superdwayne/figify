import { PluginMessage, UIMessage, isUIMessage, generateCorrelationId } from './shared/messages';

// Show UI when plugin launches
figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: 'Screenshot to Shadcn'
});

// Track pending requests for correlation
const pendingRequests = new Map<string, (response: unknown) => void>();

// Send message to UI with optional response handling
function postToUI(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

// Send request and await response (exported for future use)
export function requestFromUI(action: string, payload?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    const correlationId = generateCorrelationId();
    pendingRequests.set(correlationId, resolve);

    const message: PluginMessage = {
      type: 'RESPONSE',
      correlationId,
      payload: { action, ...(payload ?? {}) }
    };
    postToUI(message);
  });
}

// Handle messages from UI
figma.ui.onmessage = (msg: unknown) => {
  if (!isUIMessage(msg)) {
    console.warn('Invalid message from UI:', msg);
    return;
  }

  switch (msg.type) {
    case 'UI_READY':
      console.log('UI ready, sending init');
      postToUI({
        type: 'INIT',
        correlationId: generateCorrelationId()
      });
      break;

    case 'REQUEST':
      handleUIRequest(msg);
      break;

    case 'CLOSE_PLUGIN':
      figma.closePlugin();
      break;

    default:
      console.warn('Unknown message type:', msg);
  }
};

// Handle specific UI requests
function handleUIRequest(msg: UIMessage & { type: 'REQUEST' }): void {
  const { correlationId, action, payload: _payload } = msg;

  switch (action) {
    case 'GET_SELECTION':
      const selection = figma.currentPage.selection;
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { nodeCount: selection.length }
      });
      break;

    case 'PING':
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { pong: true, timestamp: Date.now() }
      });
      break;

    default:
      console.warn('Unknown action:', action);
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { error: `Unknown action: ${action}` }
      });
  }
}

// Listen for selection changes
figma.on('selectionchange', () => {
  postToUI({
    type: 'SELECTION_CHANGED',
    correlationId: generateCorrelationId(),
    nodeCount: figma.currentPage.selection.length
  });
});
