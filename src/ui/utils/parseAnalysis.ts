/**
 * Parsing and validation utilities for Claude's UI analysis responses
 *
 * Provides robust JSON parsing, element validation, and error handling
 * to gracefully handle malformed or incomplete responses from Claude.
 */

import type { UIElement, UIAnalysisResponse, ShadcnComponentType } from '../types/analysis';
import { SHADCN_COMPONENTS } from '../prompts/shadcn-analysis';

/**
 * Custom error class for analysis parsing failures
 *
 * Captures the raw response for debugging while providing
 * a user-friendly message for display.
 */
export class AnalysisParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AnalysisParseError';
  }
}

/**
 * Validates a single UI element has all required fields
 *
 * Checks for:
 * - Required id (non-empty string)
 * - Valid Shadcn component type
 * - Required bounds object with numeric x, y, width, height
 * - Optional fields are validated if present
 *
 * @param element - Unknown element to validate
 * @returns The validated UIElement or null if invalid
 */
export function validateElement(element: unknown): UIElement | null {
  if (!element || typeof element !== 'object') return null;

  const e = element as Record<string, unknown>;

  // Required fields
  if (typeof e.id !== 'string' || !e.id) return null;
  if (typeof e.component !== 'string') return null;
  if (!SHADCN_COMPONENTS.includes(e.component as ShadcnComponentType)) return null;

  // Required bounds object
  if (!e.bounds || typeof e.bounds !== 'object') return null;
  const bounds = e.bounds as Record<string, unknown>;
  if (
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) return null;

  // styles is optional but must be object if present
  if (e.styles !== undefined && (typeof e.styles !== 'object' || e.styles === null)) {
    return null;
  }

  // Construct validated element
  return {
    id: e.id,
    component: e.component as ShadcnComponentType,
    variant: typeof e.variant === 'string' ? e.variant : undefined,
    size: typeof e.size === 'string' ? e.size : undefined,
    bounds: {
      x: bounds.x as number,
      y: bounds.y as number,
      width: bounds.width as number,
      height: bounds.height as number,
    },
    styles: (e.styles as UIElement['styles']) || {},
    content: typeof e.content === 'string' ? e.content : undefined,
    children: Array.isArray(e.children)
      ? e.children.filter((c): c is string => typeof c === 'string')
      : undefined,
  };
}

/**
 * Parses and validates Claude's JSON response
 *
 * Handles:
 * - Raw JSON strings
 * - Markdown-fenced JSON (```json ... ```)
 * - Missing viewport (uses defaults 1920x1080)
 * - Invalid elements (filters them out, preserves valid ones)
 *
 * @param rawResponse - The raw text response from Claude
 * @returns Validated UIAnalysisResponse
 * @throws AnalysisParseError for complete parse failures
 */
export function parseAnalysisResponse(rawResponse: string): UIAnalysisResponse {
  // Trim whitespace
  let jsonStr = rawResponse.trim();

  // Handle markdown code fencing if Claude ignores the prompt instruction
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Attempt JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new AnalysisParseError(
      'Failed to parse response as JSON. Claude may have returned an invalid format.',
      rawResponse,
      err
    );
  }

  // Validate top-level structure
  if (!parsed || typeof parsed !== 'object') {
    throw new AnalysisParseError('Response is not a valid object', rawResponse);
  }

  const response = parsed as Record<string, unknown>;

  // Elements array is required
  if (!Array.isArray(response.elements)) {
    throw new AnalysisParseError(
      'Response missing required "elements" array',
      rawResponse
    );
  }

  // Validate and filter elements (keep only valid ones)
  const validElements = response.elements
    .map(validateElement)
    .filter((el): el is UIElement => el !== null);

  // Extract viewport (use defaults if missing)
  const viewport = response.viewport as Record<string, unknown> | undefined;
  const viewportWidth = typeof viewport?.width === 'number' ? viewport.width : 1920;
  const viewportHeight = typeof viewport?.height === 'number' ? viewport.height : 1080;

  return {
    elements: validElements,
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
  };
}
