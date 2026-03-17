/**
 * Image validation utilities for screenshot capture
 *
 * Validates image files/blobs against supported MIME types and size limits.
 * Used by useImageCapture hook to ensure only valid image formats are processed.
 */

/**
 * Supported image MIME types for screenshot input
 */
export const VALID_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type ValidMimeType = (typeof VALID_MIME_TYPES)[number];

/**
 * Size validation constants
 */
export const IMAGE_SIZE_LIMITS = {
  /** File size warning threshold (5MB) */
  WARN_FILE_SIZE: 5 * 1024 * 1024,
  /** File size block threshold (20MB) */
  MAX_FILE_SIZE: 20 * 1024 * 1024,
  /** Dimension warning threshold (4096px) */
  WARN_DIMENSION: 4096,
} as const;

/** Alias for backward compatibility - threshold for large image warning (5MB) */
export const LARGE_IMAGE_THRESHOLD = IMAGE_SIZE_LIMITS.WARN_FILE_SIZE;

/**
 * Image validation result types
 */
export type ImageValidationStatus = 'valid' | 'warning' | 'blocked';

export interface ImageValidationResult {
  /** Overall validation status */
  status: ImageValidationStatus;
  /** List of warning messages (for warning status) */
  warnings: string[];
  /** Error message (for blocked status) */
  error: string | null;
  /** Image dimensions if available */
  dimensions?: { width: number; height: number };
}

/**
 * Check if a file or blob has a valid image MIME type
 */
export function isValidImageType(file: File | Blob): boolean {
  return VALID_MIME_TYPES.includes(
    file.type.toLowerCase() as ValidMimeType
  );
}

/**
 * Get a user-friendly error message for invalid image types
 * Returns null if the image type is valid
 */
export function getImageValidationError(file: File | Blob): string | null {
  if (isValidImageType(file)) {
    return null;
  }
  return `Invalid format: ${file.type || 'unknown'}. Supported: PNG, JPG, WebP`;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get image dimensions from a blob
 * Returns a promise that resolves to { width, height } or null if dimensions can't be determined
 */
export function getImageDimensions(blob: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Validate image file size and dimensions
 * Returns detailed validation result with status, warnings, and errors
 */
export async function validateImageSize(blob: Blob): Promise<ImageValidationResult> {
  const warnings: string[] = [];
  let status: ImageValidationStatus = 'valid';
  let error: string | null = null;

  const fileSize = blob.size;

  // Check for blocking condition (> 20MB)
  if (fileSize > IMAGE_SIZE_LIMITS.MAX_FILE_SIZE) {
    return {
      status: 'blocked',
      warnings: [],
      error: `Image is too large (${formatFileSize(fileSize)}). Maximum allowed size is ${formatFileSize(IMAGE_SIZE_LIMITS.MAX_FILE_SIZE)}.`,
    };
  }

  // Check file size warning (> 5MB)
  if (fileSize > IMAGE_SIZE_LIMITS.WARN_FILE_SIZE) {
    warnings.push(`Large file size (${formatFileSize(fileSize)}). This may slow down analysis.`);
    status = 'warning';
  }

  // Get and check dimensions
  const dimensions = await getImageDimensions(blob);

  if (dimensions) {
    const maxDimension = Math.max(dimensions.width, dimensions.height);

    if (maxDimension > IMAGE_SIZE_LIMITS.WARN_DIMENSION) {
      warnings.push(
        `Large dimensions (${dimensions.width}x${dimensions.height}px). Images over ${IMAGE_SIZE_LIMITS.WARN_DIMENSION}px may slow down analysis.`
      );
      status = 'warning';
    }
  }

  return {
    status,
    warnings,
    error,
    dimensions: dimensions || undefined,
  };
}
