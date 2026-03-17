/**
 * Prompt for Claude to analyze UI screenshots and identify Shadcn components
 *
 * This prompt instructs Claude to return structured JSON with direct
 * Shadcn component mappings, positions, colors, spacing, and typography.
 *
 * Uses a factory function to inject image dimensions for accurate coordinate systems.
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
  // Visual element types (non-Shadcn)
  'Image',
  'Icon',
  'Shape',
  'Container',
] as const;

/**
 * Build the structured analysis prompt with image dimensions injected
 *
 * @param imageWidth - Actual pixel width of the screenshot image
 * @param imageHeight - Actual pixel height of the screenshot image
 * @returns The full analysis prompt string
 */
export function buildAnalysisPrompt(imageWidth: number, imageHeight: number): string {
  return `YOU MUST RESPOND WITH ONLY RAW JSON. NO MARKDOWN. NO EXPLANATION. NO TEXT BEFORE OR AFTER THE JSON. START YOUR RESPONSE WITH { AND END WITH }.

## IMAGE DIMENSIONS
This screenshot is EXACTLY ${imageWidth} pixels wide and ${imageHeight} pixels tall.
Your coordinate system: (0, 0) is the top-left corner. (${imageWidth}, ${imageHeight}) is the bottom-right corner.
ALL bounds values MUST fall within this coordinate space. No x+width > ${imageWidth}. No y+height > ${imageHeight}.

Analyze this UI screenshot and identify ALL visible UI elements with PIXEL-PERFECT precision.

## CRITICAL: Extract ALL Visual Elements

You MUST identify EVERY visible element in the screenshot, including:

1. **Shadcn Components** - Buttons, Cards, Inputs, Badges, etc.
2. **Images** - Photos, illustrations, graphics, logos, hero images, thumbnails
3. **Icons** - Small symbolic graphics (menu icons, arrows, social icons, action icons)
4. **Shapes** - Decorative elements, dividers, colored backgrounds, geometric shapes
5. **Containers** - Wrappers, sections, generic divs that group other elements

## Component Types to Use
${SHADCN_COMPONENTS.join(', ')}

## Instructions
1. Identify EVERY distinct visual element in the screenshot - DO NOT skip any
2. Map each element to the most appropriate component type from the list above
3. Extract PRECISE visual properties - positions, sizes, and colors must be PIXEL-PERFECT
4. For text elements, use Typography component
5. For containers/cards with borders or backgrounds, use Card component
6. For photos, illustrations, or any graphic content, use Image component
7. For small symbolic graphics (typically < 48px), use Icon component
8. For decorative rectangles, dividers, or shapes, use Shape component
9. For generic wrappers without distinct styling, use Container component

## Image Detection Rules
- Use component: "Image" for ANY photo, illustration, logo, or graphic content
- Include \`imageDescription\` with a brief description of what the image shows
- Include \`aspectRatio\` if clearly defined (e.g., "16:9", "4:3", "1:1", "square")
- Capture the EXACT bounds of the image area
- If a container (Card, section, etc.) has a photo/illustration as its BACKGROUND, set \`hasBackgroundImage: true\` on that container element

## Icon Detection Rules
- Use component: "Icon" for small symbolic graphics (typically < 48px)
- Include \`iconName\` if recognizable (e.g., "menu", "search", "arrow-right", "chevron-down", "heart", "star")
- Capture exact bounds and use \`textColor\` for the icon's fill color

## CRITICAL: Hierarchy Detection

You MUST establish proper parent-child relationships. This is essential for correct layout generation.

### CRITICAL RULE: Every Child MUST Be a Separate Element
**IMPORTANT**: When you reference a child ID in a parent's \`children\` array, that child element MUST ALSO exist as a separate object in the \`elements\` array.

For example, if a Card has children ["element-2", "element-3"], then element-2 and element-3 MUST each have their own complete element object in the array:
\`\`\`
{
  "elements": [
    { "id": "element-1", "component": "Card", "children": ["element-2", "element-3"], ... },
    { "id": "element-2", "component": "Typography", "children": [], ... },
    { "id": "element-3", "component": "Button", "children": [], ... }
  ]
}
\`\`\`

**DO NOT** just reference children by ID without including them as separate elements.

### Containment Rules
- An element is a CHILD of another element if it is **visually contained within** that element's bounds
- The PARENT is the **smallest** container that fully encloses the child
- Elements at the same level (siblings) should NOT reference each other as children

### How to Build Hierarchy
1. Start with the outermost containers (Cards, Dialogs, Sheets, Sidebars)
2. For each container, identify ALL elements whose bounds fall within it
3. Add those contained element IDs to the container's \`children\` array
4. **ENSURE each child ID references an element that exists in the array**
5. Nested containers: A Card inside a Dialog → Dialog.children includes Card's ID
6. Leaf elements (Button, Badge, Typography) typically have \`children: []\`

### Children Array Format
- Use element IDs in the children array: "children": ["element-2", "element-3"]
- **Each ID in children MUST reference an element that exists in the array**
- Order children by visual reading order (top-to-bottom, left-to-right)
- Empty array for leaf elements: "children": []

## Z-Index (Stacking Order)
- Assign \`zIndex\` to every element: 0 = backmost layer, higher = more in front
- Background/page-level elements: zIndex 0
- Content containers (Cards, sections): zIndex 1
- Inner content (text, buttons): zIndex 2
- Overlays, modals, tooltips: zIndex 10+
- Use zIndex to correctly represent which elements are visually in front of others

## CRITICAL: Full Style Extraction

### Colors (#RRGGBB format) — PIXEL-PERFECT REQUIRED
- Extract the PRECISE hex color visible on screen — do NOT substitute with generic/default values
- Do NOT default to common UI colors (#000000, #FFFFFF, #18181B, #F4F4F5) unless they truly match
- Pay attention to SUBTLE tints: off-whites (e.g. #F9FAFB vs #FFFFFF), warm grays (e.g. #6B7280 vs #71717A), tinted backgrounds
- Dark backgrounds are often NOT pure black — look for near-blacks like #0F172A, #1E293B, #111827
- Light backgrounds are often NOT pure white — look for tinted whites like #F8FAFC, #F1F5F9, #FAFAF9
- \`backgroundColor\`: The EXACT fill color of the element. Distinguish between white (#FFFFFF), off-white (#FAFAFA), and tinted backgrounds (#F8FAFC)
- \`textColor\`: The EXACT color of text characters. Distinguish between pure black (#000000), near-black (#111827, #0F172A), and gray text (#6B7280, #9CA3AF)
- \`borderColor\`: The EXACT border color. Most borders are NOT #E4E4E7 — look for #E5E7EB, #D1D5DB, #CBD5E1, etc.
- When in doubt, lean toward the SPECIFIC observed color rather than a common default

### Gradients
- If an element has a gradient background instead of a solid color, use the \`gradient\` property:
  \`"gradient": { "type": "linear", "angle": 180, "stops": [{"color": "#FF6B6B", "position": 0}, {"color": "#4ECDC4", "position": 1}] }\`
- \`type\`: "linear" or "radial"
- \`angle\`: degrees for linear gradients (0 = left-to-right, 90 = top-to-bottom, 180 = right-to-left)
- \`stops\`: array of {color, position} where position is 0-1
- When a gradient is present, still include \`backgroundColor\` as the dominant/primary color

### Borders
- \`borderColor\`: hex color of the border
- \`borderWidth\`: width in pixels (default 1 if border visible but width unclear)
- \`borderRadius\`: corner radius in pixels

### Opacity
- \`opacity\`: 0-1 where 1 is fully opaque. Only include if element is visibly semi-transparent.

### Box Shadows
- \`boxShadow\`: array of shadow definitions
  \`"boxShadow": [{"offsetX": 0, "offsetY": 4, "blur": 6, "spread": -1, "color": "#0000001A"}]\`
- Include shadow \`color\` with alpha as 8-char hex (#RRGGBBAA)
- Common: cards have subtle shadows, modals have larger shadows, buttons may have small shadows

### Backdrop Blur
- \`backdropBlur\`: blur radius in pixels for frosted glass effects (common in nav bars, modals)

### Text Decoration
- \`textDecoration\`: "underline" for links, "line-through" for strikethrough, omit for none

### Font Family Detection
- \`fontFamily\`: Identify the font family if recognizable. Common fonts:
  - Sans-serif: "Inter", "SF Pro", "Roboto", "Open Sans", "Poppins", "Helvetica", "Arial", "Geist"
  - Serif: "Georgia", "Times New Roman", "Merriweather", "Playfair Display"
  - Mono: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas"
- If uncertain, use your best guess based on visual characteristics

## CRITICAL: Pixel-Perfect Positioning

### Measurement Technique
1. The image is ${imageWidth}×${imageHeight} pixels - use this as your absolute reference
2. For EACH element, identify its four edges precisely:
   - Left edge → x coordinate
   - Top edge → y coordinate
   - Right edge → x + width
   - Bottom edge → y + height
3. Cross-check: siblings at the same visual level should have consistent y values (for rows) or x values (for columns)
4. Cross-check: elements inside a card should have bounds WITHIN the card's bounds

### Position Rules
- x, y, width, height must be as accurate as possible in pixels
- All positions are ABSOLUTE - relative to the screenshot top-left corner (0, 0), NOT relative to parent
- Padding: estimate from content edges to element boundaries

## CRITICAL: Text Extraction (Pixel-Perfect)

### Text Content Rules
- Extract the EXACT text content verbatim - preserve capitalization, punctuation, and spacing
- Include ALL text visible in the element, including multi-line text
- For multi-line text, include newlines as \\n in the content string
- Do NOT paraphrase, summarize, or modify the text in any way

### Text Bounds Rules
- Measure the TIGHT bounding box around the actual text, not the container
- x, y should be the top-left corner of where the first character starts
- width should extend to the end of the longest line of text
- height should be from the top of the tallest character to the bottom of the lowest
- For single-line text: height ≈ fontSize × 1.2 to 1.5
- For multi-line text: height = numberOfLines × lineHeight

### Typography Properties — MUST BE ACCURATE
- \`fontSize\`: EXACT font size in pixels. This is the MOST IMPORTANT text property. Getting this wrong ruins the entire design.

  **How to measure fontSize accurately:**
  1. Look at the CAP HEIGHT of uppercase letters (or x-height of lowercase) — the cap height is approximately 70% of the fontSize
  2. For single-line text: \`fontSize ≈ boundingBoxHeight / lineHeightRatio\` where lineHeightRatio is typically 1.2–1.5
     - Tight headings (lineHeight ~1.1–1.2): fontSize ≈ height / 1.15
     - Normal text (lineHeight ~1.4–1.5): fontSize ≈ height / 1.45
     - Example: 24px tall single-line heading with tight spacing → ~21px font (NOT 18px or 14px)
     - Example: 24px tall body text with normal spacing → ~16-17px font
  3. Use the IMAGE DIMENSIONS as reference: if the image is ${imageWidth}px wide and a heading spans ~40% of the width, calculate its pixel width and compare to known character widths for that size
  4. Compare text sizes RELATIVE to each other: headings must be visibly LARGER than body, captions SMALLER
  5. A 48px tall single-line heading is likely 36–40px font, NOT 14px — always sanity check!

  **Common fontSize reference (for standard UI at ~1440px width):**
  - Hero/display text: 48–72px
  - Page headings (h1): 32–40px
  - Section headings (h2): 24–32px
  - Sub-headings (h3): 20–24px
  - Large body text: 18px
  - Body text / paragraphs: 14–16px
  - Buttons and labels: 13–15px
  - Small text / captions: 11–13px
  - Fine print / footnotes: 10–11px

  **Scale with viewport:** If the image is NOT ~1440px wide, scale these reference values proportionally. For a ${imageWidth}px wide image, multiply reference sizes by ${imageWidth}/1440.

  - NEVER default all text to the same size — every text element should have its own measured fontSize
  - Common specific sizes: 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72

- \`fontWeight\`: EXACT weight. Look at stroke thickness carefully:
  - Thin/light text (100-300): visibly thinner strokes
  - Regular (400): normal reading weight
  - Medium (500): slightly bolder than regular
  - SemiBold/Bold (600-700): clearly thicker strokes, used for headings and emphasis
  - ExtraBold/Black (800-900): very thick, used for hero text
- \`fontFamily\`: font family name if identifiable
- \`textColor\`: EXACT hex color of the text pixels — see color rules above
- \`lineHeight\`: in pixels. Must be consistent with fontSize:
  - Tight (headings): fontSize × 1.1 to 1.25
  - Normal (body): fontSize × 1.4 to 1.6
  - Loose (spaced text): fontSize × 1.75 to 2.0
  - Multi-line text: measure the distance between baselines of consecutive lines
- \`letterSpacing\`: in pixels (0 for normal, negative for tight headings, positive for uppercase/spaced text)
- \`textAlign\`: "left", "center", "right" based on text position within container

## Output Format
Respond with ONLY valid JSON matching this schema:

{
  "elements": [
    {
      "id": "element-1",
      "component": "Card",
      "bounds": { "x": 50, "y": 50, "width": 300, "height": 200 },
      "styles": {
        "backgroundColor": "#ffffff",
        "borderColor": "#e5e7eb",
        "borderWidth": 1,
        "borderRadius": 8,
        "padding": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
        "boxShadow": [{ "offsetX": 0, "offsetY": 1, "blur": 3, "spread": 0, "color": "#0000001A" }]
      },
      "zIndex": 1,
      "children": ["element-2", "element-3", "element-4"]
    },
    {
      "id": "element-2",
      "component": "Typography",
      "bounds": { "x": 74, "y": 74, "width": 156, "height": 28 },
      "styles": {
        "textColor": "#111827",
        "fontSize": 20,
        "fontWeight": 600,
        "fontFamily": "Inter",
        "lineHeight": 28,
        "letterSpacing": -0.2,
        "textAlign": "left"
      },
      "content": "Card Title",
      "zIndex": 2,
      "children": []
    },
    {
      "id": "element-3",
      "component": "Typography",
      "bounds": { "x": 74, "y": 110, "width": 252, "height": 40 },
      "styles": {
        "textColor": "#6b7280",
        "fontSize": 14,
        "fontWeight": 400,
        "fontFamily": "Inter",
        "lineHeight": 20,
        "letterSpacing": 0,
        "textAlign": "left"
      },
      "content": "This is a description that spans multiple lines.",
      "zIndex": 2,
      "children": []
    },
    {
      "id": "element-4",
      "component": "Button",
      "variant": "default",
      "size": "default",
      "bounds": { "x": 74, "y": 170, "width": 100, "height": 40 },
      "styles": {
        "backgroundColor": "#18181b",
        "textColor": "#ffffff",
        "borderRadius": 6,
        "fontSize": 14,
        "fontWeight": 500,
        "fontFamily": "Inter",
        "padding": { "top": 8, "right": 16, "bottom": 8, "left": 16 }
      },
      "content": "Submit",
      "zIndex": 2,
      "children": []
    },
    {
      "id": "element-5",
      "component": "Image",
      "bounds": { "x": 400, "y": 50, "width": 300, "height": 200 },
      "styles": {
        "borderRadius": 8
      },
      "imageDescription": "Hero image showing a mountain landscape at sunset",
      "aspectRatio": "3:2",
      "zIndex": 1,
      "children": []
    },
    {
      "id": "element-6",
      "component": "Icon",
      "bounds": { "x": 360, "y": 178, "width": 24, "height": 24 },
      "styles": {
        "textColor": "#6b7280"
      },
      "iconName": "arrow-right",
      "zIndex": 2,
      "children": []
    },
    {
      "id": "element-7",
      "component": "Container",
      "bounds": { "x": 0, "y": 0, "width": ${imageWidth}, "height": 64 },
      "styles": {
        "backgroundColor": "#ffffff",
        "backdropBlur": 12,
        "opacity": 0.95,
        "boxShadow": [{ "offsetX": 0, "offsetY": 1, "blur": 2, "spread": 0, "color": "#0000000D" }]
      },
      "zIndex": 10,
      "children": []
    }
  ],
  "viewport": { "width": ${imageWidth}, "height": ${imageHeight} }
}

RESPOND NOW WITH ONLY THE JSON OBJECT. DO NOT INCLUDE ANY TEXT, MARKDOWN, OR EXPLANATION. YOUR ENTIRE RESPONSE MUST BE VALID JSON STARTING WITH { AND ENDING WITH }.`;
}

/**
 * Legacy static prompt (deprecated - use buildAnalysisPrompt instead)
 * Kept for backward compatibility
 */
export const SHADCN_ANALYSIS_PROMPT = buildAnalysisPrompt(1920, 1080);
