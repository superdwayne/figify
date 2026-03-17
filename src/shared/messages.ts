/**
 * Typed message protocol for Figma plugin communication
 *
 * Uses correlation IDs for async request/response patterns between
 * the main thread (sandbox) and UI thread (iframe).
 */

import type { UIAnalysisResponse } from '../ui/types/analysis';

// Response payload types
export type ApiKeyResponse = { apiKey: string | null };
export type SuccessResponse = { success: boolean };

// Generation progress payload
export interface GenerationProgress {
  step: string;
  current: number;
  total: number;
}

// Generation complete payload
export interface GenerationComplete {
  nodeId: string;
  elementCount: number;
  success: boolean;
  error?: string;
}

// Extracted image from screenshot cropping
export interface ExtractedImage {
  /** Element ID this image corresponds to */
  id: string;
  /** Cropped image bytes */
  data: Uint8Array;
  /** MIME type (typically 'image/png') */
  mimeType: string;
}

// Extended generation payload with extracted images
export interface GenerateDesignPayload extends UIAnalysisResponse {
  /** Extracted images cropped from the screenshot */
  extractedImages?: ExtractedImage[];
}

// Message from main thread to UI
export type PluginMessage =
  | { type: 'INIT'; correlationId: string }
  | { type: 'SELECTION_CHANGED'; correlationId: string; nodeCount: number }
  | { type: 'RESPONSE'; correlationId: string; payload: unknown }
  | { type: 'PROGRESS'; correlationId: string; payload: GenerationProgress }
  | { type: 'GENERATION_COMPLETE'; correlationId: string; payload: GenerationComplete };

// Storage action request types
export type StorageRequest =
  | { type: 'REQUEST'; correlationId: string; action: 'GET_API_KEY' }
  | { type: 'REQUEST'; correlationId: string; action: 'SET_API_KEY'; payload: { key: string } }
  | { type: 'REQUEST'; correlationId: string; action: 'CLEAR_API_KEY' };

// Generation request type
export interface GenerateDesignRequest {
  type: 'REQUEST';
  correlationId: string;
  action: 'GENERATE_DESIGN';
  payload: GenerateDesignPayload;
}

// Message from UI to main thread
export type UIMessage =
  | { type: 'UI_READY'; correlationId: string }
  | { type: 'IMAGE_CAPTURED'; correlationId: string; imageData: Uint8Array; mimeType: string }
  | StorageRequest
  | GenerateDesignRequest
  | { type: 'REQUEST'; correlationId: string; action: string; payload?: unknown }
  | { type: 'CLOSE_PLUGIN' };

/**
 * Generate a unique correlation ID for request/response tracking
 * Format: timestamp-random9chars
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard to check if a message is a valid PluginMessage
 */
export function isPluginMessage(msg: unknown): msg is PluginMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}

/**
 * Type guard to check if a message is a valid UIMessage
 */
export function isUIMessage(msg: unknown): msg is UIMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}
