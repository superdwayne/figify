/**
 * ImagePreview component for displaying captured images
 *
 * Shows the captured image with file info (dimensions and file size),
 * large image warnings, and a clear button.
 */

import type { CapturedImage } from '../../hooks/useImageCapture';
import { formatFileSize, LARGE_IMAGE_THRESHOLD } from '../../utils/imageUtils';

/**
 * Image dimensions type
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Props for the ImagePreview component
 */
export interface ImagePreviewProps {
  /** The captured image data */
  capturedImage: CapturedImage;
  /** Image dimensions (calculated externally for accessibility) */
  imageDimensions: ImageDimensions | null;
  /** Callback to clear the image */
  onClear: () => void;
  /** Whether clearing is disabled (e.g., during analysis) */
  clearDisabled?: boolean;
}

/**
 * Displays a preview of the captured image with file information
 */
export function ImagePreview({
  capturedImage,
  imageDimensions,
  onClear,
  clearDisabled = false,
}: ImagePreviewProps) {
  const isLargeImage = capturedImage.blob.size > LARGE_IMAGE_THRESHOLD;

  return (
    <>
      <img
        src={capturedImage.previewUrl}
        alt={`Captured screenshot${imageDimensions ? `, ${imageDimensions.width} by ${imageDimensions.height} pixels` : ''}`}
        className="max-w-full max-h-64 mx-auto rounded object-contain"
      />
      {/* Image info: dimensions and file size */}
      <div
        className="text-xs text-muted-foreground flex items-center justify-center gap-2"
        aria-label={`Image dimensions: ${imageDimensions ? `${imageDimensions.width} by ${imageDimensions.height} pixels` : 'loading'}, size: ${formatFileSize(capturedImage.blob.size)}`}
      >
        {imageDimensions && (
          <span>{imageDimensions.width} x {imageDimensions.height}</span>
        )}
        {imageDimensions && <span aria-hidden="true">&#8226;</span>}
        <span>{formatFileSize(capturedImage.blob.size)}</span>
      </div>
      {/* Large image warning */}
      {isLargeImage && (
        <div
          className="flex items-center justify-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded px-2 py-1"
          role="alert"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>Large image - analysis may be slower</span>
        </div>
      )}
      <button
        onClick={onClear}
        disabled={clearDisabled}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-3 py-1 focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Clear captured image and start over"
      >
        Clear image
      </button>
    </>
  );
}
