/**
 * Prompt for Claude to analyze UI screenshots and identify Shadcn components
 *
 * This prompt instructs Claude to return structured JSON with direct
 * Shadcn component mappings, positions, colors, spacing, and typography.
 */

/**
 * All Shadcn component names as runtime values
 * This array matches the ShadcnComponentType union in types/analysis.ts
 */
export const SHADCN_COMPONENTS = [
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
] as const;

/**
 * Structured prompt for Shadcn component detection
 *
 * Instructs Claude to:
 * - Identify UI elements and map them to Shadcn components
 * - Extract positions, colors, spacing, and typography
 * - Return JSON-only output (no markdown, no explanation)
 * - Skip uncertain elements (confidence-only responses)
 */
export const SHADCN_ANALYSIS_PROMPT = `Analyze this UI screenshot and identify all UI elements that map to Shadcn components.

## Shadcn Components to Detect
${SHADCN_COMPONENTS.join(', ')}

## Instructions
1. Identify each distinct UI element in the screenshot
2. Map each element to the most appropriate Shadcn component type
3. Only include elements you are confident about - skip uncertain elements
4. Extract visual properties: position, size, colors (as hex), spacing, typography
5. For text elements, use Typography component
6. For containers/cards, use Card component
7. Establish parent-child relationships via the children array

## Output Format
Respond with ONLY valid JSON matching this schema (no markdown, no explanation):

{
  "elements": [
    {
      "id": "element-1",
      "component": "Button",
      "variant": "default",
      "size": "default",
      "bounds": { "x": 100, "y": 50, "width": 120, "height": 40 },
      "styles": {
        "backgroundColor": "#000000",
        "textColor": "#ffffff",
        "borderRadius": 6,
        "fontSize": 14,
        "fontWeight": 500,
        "padding": { "top": 8, "right": 16, "bottom": 8, "left": 16 }
      },
      "content": "Click me",
      "children": []
    }
  ],
  "viewport": { "width": 800, "height": 600 }
}

## Color Extraction
- Extract exact colors as hex values (#RRGGBB format)
- Use the dominant color for each property
- For gradients, use the primary/starting color

## Spacing and Sizing
- Measure positions relative to top-left corner of screenshot
- Estimate padding from content edges to element boundaries
- Use pixel values for all measurements

## Typography
- Estimate font sizes in pixels (common: 12, 14, 16, 18, 20, 24, 32)
- Font weights: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- For typography: extract font size (pixels), font weight (400-700), and text color (hex)

Analyze the screenshot now and return the JSON response:`;
