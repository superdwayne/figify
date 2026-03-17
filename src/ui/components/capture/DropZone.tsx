/**
 * DropZone component for drag-and-drop and paste image handling
 *
 * Displays the empty state with instructions for image capture.
 * Handles visual feedback during drag operations.
 */

import type { UseImageCaptureReturn } from '../../hooks/useImageCapture';

/**
 * Props for the DropZone component
 */
export interface DropZoneProps {
  /** Props to spread onto the drop zone element from useImageCapture */
  dropZoneProps: UseImageCaptureReturn['dropZoneProps'];
  /** Whether a file is being dragged over the zone */
  isDragging: boolean;
  /** Whether there's an error state */
  hasError: boolean;
  /** Whether there's a warning state */
  hasWarning?: boolean;
  /** Whether an image is captured (for aria-label) */
  hasCapturedImage: boolean;
  /** Keyboard shortcut for paste (varies by platform) */
  pasteShortcut: string;
  /** Child content to render inside the drop zone */
  children?: React.ReactNode;
}

/**
 * Drop zone wrapper for image capture with paste and drag-drop support
 *
 * Renders children when image is captured, or empty state when waiting.
 * Includes full accessibility support with proper ARIA labels and keyboard navigation.
 */
export function DropZone({
  dropZoneProps,
  isDragging,
  hasError,
  hasWarning = false,
  hasCapturedImage,
  pasteShortcut,
  children,
}: DropZoneProps) {
  // Determine border color based on state
  const getBorderClass = () => {
    if (hasError) return 'border-red-500 dark:border-red-400';
    if (hasWarning) return 'border-amber-500 dark:border-amber-400 bg-amber-50/50 dark:bg-amber-900/20';
    if (isDragging) return 'border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/20';
    return 'border-muted';
  };

  return (
    <div
      {...dropZoneProps}
      role="button"
      tabIndex={0}
      aria-label={hasCapturedImage
        ? 'Image captured. Press Enter to analyze or drag a new image to replace.'
        : `Drop zone for images. ${isDragging ? 'Release to drop image.' : `Press ${pasteShortcut} to paste or drag an image here.`}`
      }
      aria-describedby="drop-zone-instructions"
      className={`
        flex-1 flex flex-col items-center justify-center
        border-2 border-dashed rounded-lg p-8
        text-center transition-colors focus-ring
        ${getBorderClass()}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Empty state content for the drop zone
 */
export interface DropZoneEmptyStateProps {
  /** Whether a file is being dragged over the zone */
  isDragging: boolean;
  /** Keyboard shortcut for paste */
  pasteShortcut: string;
}

/**
 * Empty state display for the drop zone with instructions
 */
export function DropZoneEmptyState({ isDragging, pasteShortcut }: DropZoneEmptyStateProps) {
  return (
    <div className="space-y-4">
      <div
        className="w-16 h-16 mx-auto rounded-lg bg-secondary flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div id="drop-zone-instructions">
        <p className="text-sm text-muted-foreground">
          {isDragging ? (
            'Drop image here'
          ) : (
            <>
              Paste screenshot <kbd className="kbd">{pasteShortcut}</kbd> or drag image here
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supported formats: PNG, JPG, WebP
        </p>
      </div>
    </div>
  );
}
