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
  | 'Typography';

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
  /** Font size in pixels */
  fontSize?: number;
  /** Font weight (400, 500, 600, 700) */
  fontWeight?: number;
  /** Padding values in pixels */
  padding?: Padding;
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
