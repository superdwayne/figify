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
 * @param index - Optional index for logging
 * @returns The validated UIElement or null if invalid
 */
export function validateElement(element: unknown, index?: number): UIElement | null {
  const logPrefix = index !== undefined ? `[validateElement ${index}]` : '[validateElement]';

  if (!element || typeof element !== 'object') {
    console.warn(logPrefix, 'Element is null or not an object');
    return null;
  }

  const e = element as Record<string, unknown>;

  // Required fields
  if (typeof e.id !== 'string' || !e.id) {
    console.warn(logPrefix, 'Missing or invalid id:', e.id);
    return null;
  }

  if (typeof e.component !== 'string') {
    console.warn(logPrefix, 'Missing or invalid component type:', e.component);
    return null;
  }

  if (!SHADCN_COMPONENTS.includes(e.component as ShadcnComponentType)) {
    console.warn(logPrefix, 'Unknown component type:', e.component, '- Valid types:', SHADCN_COMPONENTS.join(', '));
    return null;
  }

  // Required bounds object
  if (!e.bounds || typeof e.bounds !== 'object') {
    console.warn(logPrefix, 'Missing or invalid bounds object:', e.bounds);
    return null;
  }

  const bounds = e.bounds as Record<string, unknown>;
  if (
    typeof bounds.x !== 'number' ||
    typeof bounds.y !== 'number' ||
    typeof bounds.width !== 'number' ||
    typeof bounds.height !== 'number'
  ) {
    console.warn(logPrefix, 'Invalid bounds values:', bounds);
    return null;
  }

  // styles is optional but must be object if present
  if (e.styles !== undefined && (typeof e.styles !== 'object' || e.styles === null)) {
    console.warn(logPrefix, 'Invalid styles object:', e.styles);
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
    // Include image-specific fields
    imageDescription: typeof e.imageDescription === 'string' ? e.imageDescription : undefined,
    aspectRatio: typeof e.aspectRatio === 'string' ? e.aspectRatio : undefined,
    iconName: typeof e.iconName === 'string' ? e.iconName : undefined,
  };
}

/**
 * Finds the complete JSON object starting at the given position
 *
 * @param str - The string containing JSON
 * @returns The complete JSON object string or null if incomplete/invalid
 */
function findCompleteJSON(str: string): string | null {
  const trimmed = str.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) {
          return trimmed.substring(0, i + 1);
        }
      }
    }
  }

  console.log('[findCompleteJSON] JSON appears truncated, final depth:', depth);
  return null;
}

/**
 * Strips markdown code fences from a response
 *
 * Handles: ```json ... ```, ``` ... ```, and responses without closing fence
 *
 * @param str - The raw response string
 * @returns The content without markdown fences
 */
function stripMarkdownFences(str: string): string {
  let result = str.trim();
  console.log('[stripMarkdownFences] Input starts with:', result.substring(0, 20));

  // Check for opening fence - handle various formats
  // Match: ```json, ```JSON, ```, with optional whitespace/newlines after
  const openingFenceMatch = result.match(/^`{3,}(?:json|JSON)?\s*/);
  if (openingFenceMatch) {
    console.log('[stripMarkdownFences] Found opening fence:', JSON.stringify(openingFenceMatch[0]));
    result = result.substring(openingFenceMatch[0].length);

    // Check for closing fence (may not exist if truncated)
    // Use regex to find closing fence that's on its own line or at end
    const closingFenceMatch = result.match(/\n?`{3,}\s*$/);
    if (closingFenceMatch) {
      console.log('[stripMarkdownFences] Found closing fence');
      result = result.substring(0, result.length - closingFenceMatch[0].length);
    } else {
      // Try to find closing fence anywhere (might have trailing text)
      const closingFenceIndex = result.lastIndexOf('```');
      if (closingFenceIndex !== -1 && closingFenceIndex > result.length / 2) {
        console.log('[stripMarkdownFences] Found closing fence at index:', closingFenceIndex);
        result = result.substring(0, closingFenceIndex);
      } else {
        console.log('[stripMarkdownFences] No closing fence found - response may be truncated');
      }
    }
  } else {
    console.log('[stripMarkdownFences] No opening fence found');
  }

  console.log('[stripMarkdownFences] Result starts with:', result.substring(0, 50));
  return result.trim();
}

/**
 * Attempts to extract JSON from various response formats
 *
 * Claude sometimes wraps JSON in markdown, adds explanatory text,
 * or includes trailing content after the JSON.
 *
 * @param rawResponse - The raw text response
 * @returns Extracted JSON string or null if not found
 */
function extractJSON(rawResponse: string): string | null {
  const trimmed = rawResponse.trim();
  console.log('[extractJSON] Trimmed length:', trimmed.length);
  console.log('[extractJSON] First 100 chars:', trimmed.substring(0, 100));

  // Step 1: Strip markdown fences if present
  const stripped = stripMarkdownFences(trimmed);
  console.log('[extractJSON] After stripping fences, first 100 chars:', stripped.substring(0, 100));

  // Step 2: Try to find complete JSON object
  if (stripped.startsWith('{')) {
    const json = findCompleteJSON(stripped);
    if (json) {
      console.log('[extractJSON] Found complete JSON, length:', json.length);
      return json;
    }
  }

  // Step 3: Try to find JSON object anywhere in the response (for cases with preamble text)
  console.log('[extractJSON] Looking for JSON object in response...');
  const jsonStartIndex = stripped.indexOf('{');
  if (jsonStartIndex !== -1) {
    const potentialJson = stripped.substring(jsonStartIndex);
    const json = findCompleteJSON(potentialJson);
    if (json) {
      console.log('[extractJSON] Found JSON starting at index:', jsonStartIndex);
      return json;
    }
  }

  // Step 4: Last resort - try original regex for complete fenced content
  const jsonFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonFenceMatch) {
    const fencedContent = jsonFenceMatch[1].trim();
    const json = findCompleteJSON(fencedContent);
    if (json) {
      console.log('[extractJSON] Found JSON via regex fence extraction');
      return json;
    }
  }

  console.log('[extractJSON] Failed to extract valid JSON');
  return null;
}

/**
 * Parses and validates Claude's JSON response
 *
 * Handles:
 * - Raw JSON strings
 * - Markdown-fenced JSON (```json ... ```)
 * - JSON with trailing text or explanations
 * - Missing viewport (uses defaults 1920x1080)
 * - Invalid elements (filters them out, preserves valid ones)
 *
 * @param rawResponse - The raw text response from Claude
 * @returns Validated UIAnalysisResponse
 * @throws AnalysisParseError for complete parse failures
 */
export function parseAnalysisResponse(rawResponse: string): UIAnalysisResponse {
  // Log raw response for debugging (first 500 chars)
  console.log('[parseAnalysisResponse] Raw response preview:', rawResponse.substring(0, 500));
  console.log('[parseAnalysisResponse] Response length:', rawResponse.length);
  console.log('[parseAnalysisResponse] FULL RAW RESPONSE:', rawResponse);

  // Extract JSON from response
  const jsonStr = extractJSON(rawResponse);

  if (!jsonStr) {
    // Provide more helpful error message based on what we received
    const preview = rawResponse.substring(0, 200);
    console.error('[parseAnalysisResponse] FAILED TO EXTRACT JSON');
    console.error('[parseAnalysisResponse] First 200 chars:', preview);
    console.error('[parseAnalysisResponse] Response starts with:', rawResponse.charAt(0), '(charCode:', rawResponse.charCodeAt(0), ')');

    // Check if response looks like it contains JSON (even if truncated)
    const looksLikeJSON = rawResponse.includes('"elements"') || rawResponse.includes('"id"');

    if (looksLikeJSON) {
      // Response has JSON structure but couldn't be fully extracted - likely truncated
      throw new AnalysisParseError(
        'Claude\'s response appears to be truncated. The JSON is incomplete. Try analyzing a simpler image.',
        rawResponse
      );
    }

    // Check if Claude returned conversational text instead of JSON
    // Only check the first 100 chars to avoid false positives from JSON content
    const responseStart = rawResponse.substring(0, 100).toLowerCase();
    if (responseStart.includes('i ') || responseStart.includes('sorry') || responseStart.includes('cannot') || responseStart.includes('unfortunately')) {
      throw new AnalysisParseError(
        'Claude returned text instead of JSON. The image may be unclear or Claude declined to analyze it.',
        rawResponse
      );
    }

    throw new AnalysisParseError(
      `Could not find valid JSON. Response starts with: "${preview.substring(0, 50)}..."`,
      rawResponse
    );
  }

  console.log('[parseAnalysisResponse] Extracted JSON preview:', jsonStr.substring(0, 300));

  // Attempt JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    const jsonErr = err as SyntaxError;
    console.error('[parseAnalysisResponse] JSON parse error:', jsonErr.message);
    console.error('[parseAnalysisResponse] JSON string that failed:', jsonStr.substring(0, 500));
    throw new AnalysisParseError(
      `JSON syntax error: ${jsonErr.message}. Claude may have returned malformed JSON.`,
      rawResponse,
      err
    );
  }

  // Validate top-level structure
  if (!parsed || typeof parsed !== 'object') {
    console.error('[parseAnalysisResponse] Parsed value is not an object:', typeof parsed);
    throw new AnalysisParseError('Response is not a valid object', rawResponse);
  }

  const response = parsed as Record<string, unknown>;

  // Elements array is required
  if (!Array.isArray(response.elements)) {
    console.error('[parseAnalysisResponse] Missing elements array. Keys found:', Object.keys(response));
    throw new AnalysisParseError(
      `Response missing required "elements" array. Found keys: ${Object.keys(response).join(', ')}`,
      rawResponse
    );
  }

  console.log('[parseAnalysisResponse] Found', response.elements.length, 'elements to validate');

  // Validate and filter elements (keep only valid ones)
  const invalidElements: { index: number; reason: string; element: unknown }[] = [];
  const validElements = response.elements
    .map((el, index) => {
      const validated = validateElement(el, index);
      if (!validated) {
        // Capture reason for invalid element
        const e = el as Record<string, unknown>;
        let reason = 'unknown';
        if (!e || typeof e !== 'object') reason = 'not an object';
        else if (!e.id) reason = 'missing id';
        else if (!e.component) reason = 'missing component';
        else if (!SHADCN_COMPONENTS.includes(e.component as ShadcnComponentType)) reason = `unknown component: ${e.component}`;
        else if (!e.bounds) reason = 'missing bounds';
        invalidElements.push({ index, reason, element: el });
      }
      return validated;
    })
    .filter((el): el is UIElement => el !== null);

  if (invalidElements.length > 0) {
    console.warn('[parseAnalysisResponse] Filtered out', invalidElements.length, 'invalid elements:');
    invalidElements.forEach(({ index, reason, element }) => {
      console.warn(`  [${index}] ${reason}:`, JSON.stringify(element).substring(0, 100));
    });
  }
  console.log('[parseAnalysisResponse] Valid elements:', validElements.length);

  // Check if all elements were filtered out
  if (validElements.length === 0 && response.elements.length > 0) {
    console.error('[parseAnalysisResponse] All elements failed validation. Sample element:', JSON.stringify(response.elements[0], null, 2));
    throw new AnalysisParseError(
      `All ${response.elements.length} elements failed validation. Claude may have used an unexpected format.`,
      rawResponse
    );
  }

  // Extract viewport (use defaults if missing)
  const viewport = response.viewport as Record<string, unknown> | undefined;
  const viewportWidth = typeof viewport?.width === 'number' ? viewport.width : 1920;
  const viewportHeight = typeof viewport?.height === 'number' ? viewport.height : 1080;

  console.log('[parseAnalysisResponse] Success! Elements:', validElements.length, 'Viewport:', viewportWidth, 'x', viewportHeight);

  return {
    elements: validElements,
    viewport: {
      width: viewportWidth,
      height: viewportHeight,
    },
  };
}
