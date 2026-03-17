/**
 * Zod schemas for runtime validation of message payloads
 *
 * Provides type-safe validation for all messages passed between
 * the main thread (sandbox) and UI thread (iframe).
 */

import { z } from 'zod';

// =============================================================================
// Primitive Schemas
// =============================================================================

/**
 * Normalize any CSS color string to hex format (#RRGGBB or #RRGGBBAA).
 * Handles: hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(), rgba(), named colors, "transparent".
 */
function normalizeColorToHex(value: string): string {
  const trimmed = value.trim().toLowerCase();

  // Already valid hex
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    // Expand shorthand #RGB → #RRGGBB
    if (trimmed.length === 4) {
      const [, r, g, b] = trimmed;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed;
  }

  // Hex without #
  if (/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    const expanded = trimmed.length === 3
      ? `#${trimmed[0]}${trimmed[0]}${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}`
      : `#${trimmed}`;
    return expanded;
  }

  // rgb(r, g, b) or rgba(r, g, b, a) — comma-separated
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/
  );
  if (rgbaMatch) {
    const r = Math.min(255, parseInt(rgbaMatch[1], 10));
    const g = Math.min(255, parseInt(rgbaMatch[2], 10));
    const b = Math.min(255, parseInt(rgbaMatch[3], 10));
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (rgbaMatch[4] !== undefined) {
      const a = Math.round(Math.min(1, parseFloat(rgbaMatch[4])) * 255);
      return `${hex}${a.toString(16).padStart(2, '0')}`;
    }
    return hex;
  }

  // rgb(r g b) or rgb(r g b / a) — modern space-separated CSS syntax
  const rgbSpaceMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*(?:\/\s*([\d.]+%?)\s*)?\)$/
  );
  if (rgbSpaceMatch) {
    const r = Math.min(255, parseInt(rgbSpaceMatch[1], 10));
    const g = Math.min(255, parseInt(rgbSpaceMatch[2], 10));
    const b = Math.min(255, parseInt(rgbSpaceMatch[3], 10));
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (rgbSpaceMatch[4] !== undefined) {
      let aVal = rgbSpaceMatch[4].endsWith('%')
        ? parseFloat(rgbSpaceMatch[4]) / 100
        : parseFloat(rgbSpaceMatch[4]);
      aVal = Math.min(1, Math.max(0, aVal));
      const a = Math.round(aVal * 255);
      return `${hex}${a.toString(16).padStart(2, '0')}`;
    }
    return hex;
  }

  // rgb(r%, g%, b%) — percentage-based RGB
  const rgbPctMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/
  );
  if (rgbPctMatch) {
    const r = Math.min(255, Math.round(parseFloat(rgbPctMatch[1]) * 2.55));
    const g = Math.min(255, Math.round(parseFloat(rgbPctMatch[2]) * 2.55));
    const b = Math.min(255, Math.round(parseFloat(rgbPctMatch[3]) * 2.55));
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (rgbPctMatch[4] !== undefined) {
      let aVal = rgbPctMatch[4].endsWith('%')
        ? parseFloat(rgbPctMatch[4]) / 100
        : parseFloat(rgbPctMatch[4]);
      aVal = Math.min(1, Math.max(0, aVal));
      const a = Math.round(aVal * 255);
      return `${hex}${a.toString(16).padStart(2, '0')}`;
    }
    return hex;
  }

  // hsl(h, s%, l%) / hsla(h, s%, l%, a) — comma-separated
  // Also hsl(h s% l%) / hsl(h s% l% / a) — modern space-separated
  const hslMatch = trimmed.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) % 360;
    const s = Math.min(100, parseFloat(hslMatch[2])) / 100;
    const l = Math.min(100, parseFloat(hslMatch[3])) / 100;
    // HSL to RGB conversion
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rr = 0, gg = 0, bb = 0;
    if (h < 60) { rr = c; gg = x; }
    else if (h < 120) { rr = x; gg = c; }
    else if (h < 180) { gg = c; bb = x; }
    else if (h < 240) { gg = x; bb = c; }
    else if (h < 300) { rr = x; bb = c; }
    else { rr = c; bb = x; }
    const r = Math.round((rr + m) * 255);
    const g = Math.round((gg + m) * 255);
    const b = Math.round((bb + m) * 255);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    if (hslMatch[4] !== undefined) {
      let aVal = hslMatch[4].endsWith('%')
        ? parseFloat(hslMatch[4]) / 100
        : parseFloat(hslMatch[4]);
      aVal = Math.min(1, Math.max(0, aVal));
      const a = Math.round(aVal * 255);
      return `${hex}${a.toString(16).padStart(2, '0')}`;
    }
    return hex;
  }

  // Named color map (common ones the AI tends to produce)
  const NAMED_COLORS: Record<string, string> = {
    transparent: '#00000000',
    white: '#ffffff',
    black: '#000000',
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    gray: '#808080',
    grey: '#808080',
    orange: '#ffa500',
    yellow: '#ffff00',
    purple: '#800080',
    pink: '#ffc0cb',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    navy: '#000080',
    teal: '#008080',
    maroon: '#800000',
    lime: '#00ff00',
    aqua: '#00ffff',
    silver: '#c0c0c0',
    olive: '#808000',
    indigo: '#4b0082',
    coral: '#ff7f50',
    salmon: '#fa8072',
    tomato: '#ff6347',
    gold: '#ffd700',
    khaki: '#f0e68c',
    ivory: '#fffff0',
    beige: '#f5f5dc',
    lavender: '#e6e6fa',
    plum: '#dda0dd',
    orchid: '#da70d6',
    tan: '#d2b48c',
    chocolate: '#d2691e',
    firebrick: '#b22222',
    crimson: '#dc143c',
    darkgray: '#a9a9a9',
    darkgrey: '#a9a9a9',
    lightgray: '#d3d3d3',
    lightgrey: '#d3d3d3',
    whitesmoke: '#f5f5f5',
    ghostwhite: '#f8f8ff',
    aliceblue: '#f0f8ff',
    snow: '#fffafa',
    linen: '#faf0e6',
    floralwhite: '#fffaf0',
    seashell: '#fff5ee',
    mintcream: '#f5fffa',
    honeydew: '#f0fff0',
    cornsilk: '#fff8dc',
  };

  if (NAMED_COLORS[trimmed]) {
    return NAMED_COLORS[trimmed];
  }

  // Last resort: strip everything non-hex and try to salvage 6 hex chars
  const hexChars = trimmed.replace(/[^0-9a-f]/gi, '');
  if (hexChars.length >= 6) {
    return `#${hexChars.substring(0, 6)}`;
  }

  // Truly unparseable — fall back to transparent so validation doesn't reject the whole payload
  return '#00000000';
}

/**
 * Hex color string — accepts any common CSS color format and normalizes to hex
 */
export const HexColorSchema = z.string().transform(normalizeColorToHex).pipe(
  z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/)
);

/**
 * Text alignment options
 */
export const TextAlignSchema = z.enum(['left', 'center', 'right']);

/**
 * Text decoration options
 */
export const TextDecorationSchema = z.enum(['none', 'underline', 'line-through']);

/**
 * Gradient stop
 */
export const GradientStopSchema = z.object({
  color: z.string(),
  position: z.number().min(0).max(1),
});

/**
 * Gradient definition
 */
export const GradientDefSchema = z.object({
  type: z.enum(['linear', 'radial']),
  angle: z.number().optional(),
  stops: z.array(GradientStopSchema).min(2),
});

/**
 * Box shadow definition
 */
export const BoxShadowDefSchema = z.object({
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().min(0),
  spread: z.number(),
  color: z.string(),
  inset: z.boolean().optional(),
});

// =============================================================================
// Storage Request Schemas
// =============================================================================

/**
 * Payload for SET_API_KEY action
 */
export const SetApiKeyPayloadSchema = z.object({
  key: z.string().min(1, 'API key cannot be empty'),
});

export type SetApiKeyPayload = z.infer<typeof SetApiKeyPayloadSchema>;

// =============================================================================
// UI Analysis Schemas (for GENERATE_DESIGN)
// =============================================================================

/**
 * All supported Shadcn component types
 */
export const ShadcnComponentTypeSchema = z.enum([
  'Accordion',
  'Alert',
  'AlertDialog',
  'Avatar',
  'Badge',
  'Breadcrumb',
  'Button',
  'Calendar',
  'Card',
  'Carousel',
  'Checkbox',
  'Collapsible',
  'Command',
  'ContextMenu',
  'Dialog',
  'Drawer',
  'DropdownMenu',
  'HoverCard',
  'Input',
  'Label',
  'Menubar',
  'NavigationMenu',
  'Pagination',
  'Popover',
  'Progress',
  'RadioGroup',
  'ScrollArea',
  'Select',
  'Separator',
  'Sheet',
  'Sidebar',
  'Skeleton',
  'Slider',
  'Switch',
  'Table',
  'Tabs',
  'Textarea',
  'Toast',
  'Toggle',
  'ToggleGroup',
  'Tooltip',
  'Typography',
  'Image',
  'Icon',
  'Shape',
  'Container',
]);

/**
 * Padding values for an element
 */
export const PaddingSchema = z.object({
  top: z.number().min(0),
  right: z.number().min(0),
  bottom: z.number().min(0),
  left: z.number().min(0),
});

/**
 * Bounding box defining element position and size
 */
export const BoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(0),
  height: z.number().min(0),
});

/**
 * Visual styling properties
 */
export const ElementStylesSchema = z.object({
  backgroundColor: HexColorSchema.optional(),
  textColor: HexColorSchema.optional(),
  borderColor: HexColorSchema.optional(),
  borderRadius: z.number().min(0).optional(),
  borderWidth: z.number().min(0).optional(),
  fontSize: z.number().min(0).optional(),
  fontWeight: z.number().optional(),
  fontFamily: z.string().optional(),
  lineHeight: z.number().min(0).optional(),
  letterSpacing: z.number().optional(),
  textAlign: TextAlignSchema.optional(),
  textDecoration: TextDecorationSchema.optional(),
  padding: PaddingSchema.optional(),
  opacity: z.number().min(0).max(1).optional(),
  gradient: GradientDefSchema.optional(),
  boxShadow: z.array(BoxShadowDefSchema).optional(),
  backdropBlur: z.number().min(0).optional(),
});

/**
 * A UI element identified in the screenshot
 */
export const UIElementSchema = z.object({
  id: z.string().min(1),
  component: ShadcnComponentTypeSchema,
  variant: z.string().optional(),
  size: z.string().optional(),
  bounds: BoundsSchema,
  styles: ElementStylesSchema,
  content: z.string().optional(),
  children: z.array(z.string()).optional(),
  imageDescription: z.string().optional(),
  aspectRatio: z.string().optional(),
  iconName: z.string().optional(),
  zIndex: z.number().optional(),
  hasBackgroundImage: z.boolean().optional(),
  parentId: z.string().optional(),
});

/**
 * Viewport dimensions
 */
export const ViewportSchema = z.object({
  width: z.number().min(1),
  height: z.number().min(1),
});

/**
 * Complete UI analysis response
 */
export const UIAnalysisResponseSchema = z.object({
  elements: z.array(UIElementSchema),
  viewport: ViewportSchema,
});

/**
 * Extracted image from screenshot cropping
 */
export const ExtractedImageSchema = z.object({
  id: z.string().min(1),
  data: z.instanceof(Uint8Array),
  mimeType: z.string(),
});

/**
 * Full generate design payload
 */
export const GenerateDesignPayloadSchema = UIAnalysisResponseSchema.extend({
  extractedImages: z.array(ExtractedImageSchema).optional(),
});

export type ValidatedGenerateDesignPayload = z.infer<typeof GenerateDesignPayloadSchema>;

// =============================================================================
// Message Schemas
// =============================================================================

/**
 * Base request message schema
 */
const BaseRequestSchema = z.object({
  type: z.literal('REQUEST'),
  correlationId: z.string().min(1),
});

/**
 * GET_API_KEY request
 */
export const GetApiKeyRequestSchema = BaseRequestSchema.extend({
  action: z.literal('GET_API_KEY'),
});

/**
 * SET_API_KEY request
 */
export const SetApiKeyRequestSchema = BaseRequestSchema.extend({
  action: z.literal('SET_API_KEY'),
  payload: SetApiKeyPayloadSchema,
});

/**
 * CLEAR_API_KEY request
 */
export const ClearApiKeyRequestSchema = BaseRequestSchema.extend({
  action: z.literal('CLEAR_API_KEY'),
});

/**
 * GENERATE_DESIGN request
 */
export const GenerateDesignRequestSchema = BaseRequestSchema.extend({
  action: z.literal('GENERATE_DESIGN'),
  payload: GenerateDesignPayloadSchema,
});

/**
 * Generic request with unknown action
 */
export const GenericRequestSchema = BaseRequestSchema.extend({
  action: z.string(),
  payload: z.unknown().optional(),
});

/**
 * UI_READY message
 */
export const UIReadyMessageSchema = z.object({
  type: z.literal('UI_READY'),
  correlationId: z.string().min(1),
});

/**
 * CLOSE_PLUGIN message
 */
export const ClosePluginMessageSchema = z.object({
  type: z.literal('CLOSE_PLUGIN'),
});

/**
 * IMAGE_CAPTURED message
 */
export const ImageCapturedMessageSchema = z.object({
  type: z.literal('IMAGE_CAPTURED'),
  correlationId: z.string().min(1),
  imageData: z.instanceof(Uint8Array),
  mimeType: z.string(),
});

/**
 * Union of all valid UI messages
 */
export const UIMessageSchema = z.discriminatedUnion('type', [
  UIReadyMessageSchema,
  ClosePluginMessageSchema,
  ImageCapturedMessageSchema,
  // REQUEST messages need special handling due to action discrimination
  z.object({
    type: z.literal('REQUEST'),
    correlationId: z.string().min(1),
    action: z.string(),
    payload: z.unknown().optional(),
  }),
]);

export type ValidatedUIMessage = z.infer<typeof UIMessageSchema>;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for SET_API_KEY payload
 */
export function isSetApiKeyPayload(payload: unknown): payload is SetApiKeyPayload {
  return SetApiKeyPayloadSchema.safeParse(payload).success;
}

/**
 * Type guard for GENERATE_DESIGN payload
 */
export function isGenerateDesignPayload(payload: unknown): payload is ValidatedGenerateDesignPayload {
  return GenerateDesignPayloadSchema.safeParse(payload).success;
}

/**
 * Type guard for valid UI message
 */
export function isValidUIMessage(msg: unknown): msg is ValidatedUIMessage {
  return UIMessageSchema.safeParse(msg).success;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Result type for validation operations
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * Validate SET_API_KEY payload with detailed error
 */
export function validateSetApiKeyPayload(payload: unknown): ValidationResult<SetApiKeyPayload> {
  const result = SetApiKeyPayloadSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate GENERATE_DESIGN payload with detailed error
 */
export function validateGenerateDesignPayload(payload: unknown): ValidationResult<ValidatedGenerateDesignPayload> {
  const result = GenerateDesignPayloadSchema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate UI message with detailed error
 */
export function validateUIMessage(msg: unknown): ValidationResult<ValidatedUIMessage> {
  const result = UIMessageSchema.safeParse(msg);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors into a human-readable string
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
}
