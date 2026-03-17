/**
 * TypeScript types for structured UI analysis response
 *
 * These types define the schema for Claude's JSON output when analyzing
 * UI screenshots to identify Shadcn components with their positions,
 * colors, spacing, and typography.
 */

/**
 * All supported Shadcn component types that Claude can identify
 */
export type ShadcnComponentType =
  | 'Accordion'
  | 'Alert'
  | 'AlertDialog'
  | 'Avatar'
  | 'Badge'
  | 'Breadcrumb'
  | 'Button'
  | 'Calendar'
  | 'Card'
  | 'Carousel'
  | 'Checkbox'
  | 'Collapsible'
  | 'Command'
  | 'ContextMenu'
  | 'Dialog'
  | 'Drawer'
  | 'DropdownMenu'
  | 'HoverCard'
  | 'Input'
  | 'Label'
  | 'Menubar'
  | 'NavigationMenu'
  | 'Pagination'
  | 'Popover'
  | 'Progress'
  | 'RadioGroup'
  | 'ScrollArea'
  | 'Select'
  | 'Separator'
  | 'Sheet'
  | 'Sidebar'
  | 'Skeleton'
  | 'Slider'
  | 'Switch'
  | 'Table'
  | 'Tabs'
  | 'Textarea'
  | 'Toast'
  | 'Toggle'
  | 'ToggleGroup'
  | 'Tooltip'
  | 'Typography'
  // Visual element types (non-Shadcn)
  | 'Image'      // Photos, illustrations, graphics
  | 'Icon'       // Icon graphics (small, typically monochrome)
  | 'Shape'      // Geometric shapes, decorative elements
  | 'Container'; // Generic containers/wrappers

/**
 * Padding values for an element in pixels
 */
export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Bounding box defining an element's position and size
 */
export interface Bounds {
  /** X position from top-left corner in pixels */
  x: number;
  /** Y position from top-left corner in pixels */
  y: number;
  /** Element width in pixels */
  width: number;
  /** Element height in pixels */
  height: number;
}

/**
 * Gradient stop definition
 */
export interface GradientStop {
  /** Color as hex (#RRGGBB or #RRGGBBAA) */
  color: string;
  /** Position along gradient (0-1) */
  position: number;
}

/**
 * Gradient definition for backgrounds
 */
export interface GradientDef {
  /** Gradient type */
  type: 'linear' | 'radial';
  /** Angle in degrees for linear gradients (0 = top to bottom) */
  angle?: number;
  /** Color stops */
  stops: GradientStop[];
}

/**
 * Box shadow definition
 */
export interface BoxShadowDef {
  /** Horizontal offset in pixels */
  offsetX: number;
  /** Vertical offset in pixels */
  offsetY: number;
  /** Blur radius in pixels */
  blur: number;
  /** Spread radius in pixels */
  spread: number;
  /** Shadow color as hex (#RRGGBB or #RRGGBBAA) */
  color: string;
  /** Whether this is an inset shadow */
  inset?: boolean;
}

/**
 * Visual styling properties for a UI element
 */
export interface ElementStyles {
  /** Background color as hex (#RRGGBB) */
  backgroundColor?: string;
  /** Text color as hex (#RRGGBB) */
  textColor?: string;
  /** Border color as hex (#RRGGBB) */
  borderColor?: string;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Border width in pixels (default 1 if borderColor present) */
  borderWidth?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Font weight (100-900) */
  fontWeight?: number;
  /** Font family name (e.g., "Inter", "Roboto", "SF Pro") */
  fontFamily?: string;
  /** Line height in pixels */
  lineHeight?: number;
  /** Letter spacing in pixels */
  letterSpacing?: number;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Text decoration */
  textDecoration?: 'none' | 'underline' | 'line-through';
  /** Padding values in pixels */
  padding?: Padding;
  /** Opacity (0-1, where 1 is fully opaque) */
  opacity?: number;
  /** Background gradient (takes precedence over backgroundColor if present) */
  gradient?: GradientDef;
  /** Box shadow(s) */
  boxShadow?: BoxShadowDef[];
  /** Backdrop blur radius in pixels (frosted glass effect) */
  backdropBlur?: number;
}

/**
 * A UI element identified in the screenshot with its Shadcn component mapping
 */
export interface UIElement {
  /** Unique identifier (e.g., "element-1") */
  id: string;
  /** Shadcn component type this element maps to */
  component: ShadcnComponentType;
  /** Component variant if applicable (e.g., "outline", "secondary") */
  variant?: string;
  /** Size variant if applicable (e.g., "sm", "lg") */
  size?: string;
  /** Position and dimensions of the element */
  bounds: Bounds;
  /** Visual styling properties */
  styles: ElementStyles;
  /** Text content if applicable */
  content?: string;
  /** IDs of child elements for hierarchy */
  children?: string[];
  /** For Image elements: description of what the image shows */
  imageDescription?: string;
  /** For Image elements: aspect ratio (e.g., "16:9", "1:1") */
  aspectRatio?: string;
  /** For Icon elements: icon name if identifiable */
  iconName?: string;
  /** Visual stacking order (higher = in front) */
  zIndex?: number;
  /** Whether this container has a background image (photo/illustration behind content) */
  hasBackgroundImage?: boolean;
  /** Parent element ID (set by spatial inference or Claude) */
  parentId?: string;
}

/**
 * Complete response from Claude's UI analysis
 */
export interface UIAnalysisResponse {
  /** All UI elements identified in the screenshot */
  elements: UIElement[];
  /** Viewport dimensions of the analyzed screenshot */
  viewport: {
    width: number;
    height: number;
  };
}
