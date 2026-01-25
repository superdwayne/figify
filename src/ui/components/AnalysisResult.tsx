/**
 * AnalysisResult component for displaying structured UI analysis results
 *
 * Shows detected Shadcn components with their properties including:
 * - Component type and variant
 * - Dimensions and position
 * - Color swatches for visual properties
 * - Text content (truncated)
 */

import type { UIAnalysisResponse, UIElement } from '../types/analysis';

interface AnalysisResultProps {
  /** The structured analysis response from Claude */
  result: UIAnalysisResponse;
  /** Callback to clear results and start new analysis */
  onClear: () => void;
}

/**
 * Displays structured UI analysis results
 * Shows detected Shadcn components with their properties
 */
export function AnalysisResult({ result, onClear }: AnalysisResultProps) {
  const { elements, viewport } = result;

  return (
    <div className="space-y-4 w-full">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Found{' '}
          <span className="font-semibold text-foreground">
            {elements.length}
          </span>{' '}
          elements
          <span className="text-muted-foreground/60 ml-2">
            ({viewport.width}x{viewport.height})
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Elements list */}
      {elements.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No Shadcn components detected. Try a different screenshot.
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {elements.map((element) => (
            <ElementCard key={element.id} element={element} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Individual element display card
 */
function ElementCard({ element }: { element: UIElement }) {
  const variantLabel = element.variant ? ` (${element.variant})` : '';
  const sizeLabel = element.size ? ` [${element.size}]` : '';

  return (
    <div className="p-3 bg-secondary rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {element.component}
          <span className="text-muted-foreground font-normal">
            {variantLabel}
            {sizeLabel}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {element.bounds.width}x{element.bounds.height}
        </span>
      </div>

      {element.content && (
        <div className="mt-1 text-sm text-muted-foreground truncate">
          "{element.content}"
        </div>
      )}

      {/* Color swatches if present */}
      {(element.styles.backgroundColor ||
        element.styles.textColor ||
        element.styles.borderColor) && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {element.styles.backgroundColor && (
            <ColorSwatch color={element.styles.backgroundColor} label="bg" />
          )}
          {element.styles.textColor && (
            <ColorSwatch color={element.styles.textColor} label="text" />
          )}
          {element.styles.borderColor && (
            <ColorSwatch color={element.styles.borderColor} label="border" />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Color swatch with hex value
 */
function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <div
        className="w-4 h-4 rounded border border-border"
        style={{ backgroundColor: color }}
      />
      <span>
        {label}: {color}
      </span>
    </div>
  );
}
