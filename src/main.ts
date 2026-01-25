import { PluginMessage, UIMessage, isUIMessage, generateCorrelationId } from './shared/messages';

// Show UI when plugin launches
figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: 'Screenshot to Shadcn'
});

// Reserved for future use: Track pending requests for correlation
// const pendingRequests = new Map<string, (response: unknown) => void>();

// Send message to UI with optional response handling
function postToUI(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

// Reserved for future use: Send request from main thread to UI and await response
// Currently commented out because it's not needed yet
// function requestFromUI(action: string, payload?: Record<string, unknown>): Promise<unknown> {
//   return new Promise((resolve) => {
//     const correlationId = generateCorrelationId();
//     pendingRequests.set(correlationId, resolve);
//
//     const requestPayload: Record<string, unknown> = { action };
//     if (payload) {
//       Object.assign(requestPayload, payload);
//     }
//
//     const message: PluginMessage = {
//       type: 'RESPONSE',
//       correlationId,
//       payload: requestPayload
//     };
//     postToUI(message);
//   });
// }

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
async function handleUIRequest(msg: UIMessage & { type: 'REQUEST' }): Promise<void> {
  const { correlationId, action } = msg;
  const payload = 'payload' in msg ? msg.payload : undefined;

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

    case 'GET_API_KEY': {
      const apiKey = await figma.clientStorage.getAsync('anthropic_api_key');
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { apiKey: apiKey ?? null }
      });
      break;
    }

    case 'SET_API_KEY': {
      const { key } = payload as { key: string };
      await figma.clientStorage.setAsync('anthropic_api_key', key);
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { success: true }
      });
      break;
    }

    case 'CLEAR_API_KEY': {
      await figma.clientStorage.deleteAsync('anthropic_api_key');
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { success: true }
      });
      break;
    }

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
