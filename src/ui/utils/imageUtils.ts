/**
 * Image validation utilities for screenshot capture
 *
 * Validates image files/blobs against supported MIME types.
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
