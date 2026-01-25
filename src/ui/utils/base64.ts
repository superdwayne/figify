/**
 * Base64 conversion utilities
 *
 * Converts binary data to base64 format for Claude API image requests.
 */

/**
 * Converts a Uint8Array to a base64-encoded string
 *
 * This is needed because Phase 3's useImageCapture provides `capturedImage.uint8Array`
 * but the Claude API expects base64-encoded image data (not data URL, not raw binary).
 *
 * @param uint8Array - Binary image data from useImageCapture
 * @returns Base64-encoded string suitable for Claude Vision API
 *
 * @example
 * ```ts
 * const base64 = uint8ArrayToBase64(capturedImage.uint8Array);
 * await analyzeImage(client, base64, capturedImage.mimeType);
 * ```
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
