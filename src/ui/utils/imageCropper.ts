/**
 * Image cropping utility for extracting regions from screenshots
 *
 * Uses Canvas API to crop specific regions from images based on
 * bounding box coordinates from Claude's analysis.
 * Includes text removal to extract clean images without overlays.
 */

import type { Bounds } from '../types/analysis';

/**
 * Configuration for text removal
 */
interface TextRemovalConfig {
  /** Contrast threshold to detect text (0-1, higher = more strict) */
  contrastThreshold: number;
  /** Minimum size of text-like regions to remove */
  minTextSize: number;
  /** Radius for inpainting/smoothing */
  inpaintRadius: number;
  /** Whether to detect dark text on light backgrounds */
  detectDarkText: boolean;
  /** Whether to detect light text on dark backgrounds */
  detectLightText: boolean;
}

/**
 * Default text removal configuration
 */
const DEFAULT_TEXT_REMOVAL_CONFIG: TextRemovalConfig = {
  contrastThreshold: 0.3,
  minTextSize: 2,
  inpaintRadius: 2,
  detectDarkText: true,
  detectLightText: true,
};

/**
 * Crop a region from an image based on bounds
 *
 * @param imageData - Original image as Uint8Array
 * @param mimeType - MIME type of the original image (e.g., 'image/png')
 * @param bounds - Bounding box to crop (x, y, width, height)
 * @returns Cropped image as Uint8Array (PNG format)
 */
export async function cropImage(
  imageData: Uint8Array,
  mimeType: string,
  bounds: Bounds
): Promise<Uint8Array> {
  // Create a blob from the image data
  const blob = new Blob([imageData], { type: mimeType });
  const imageUrl = URL.createObjectURL(blob);

  try {
    // Load image into an HTMLImageElement
    const img = await loadImage(imageUrl);

    // Create canvas with cropped dimensions
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bounds.width));
    canvas.height = Math.max(1, Math.round(bounds.height));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2d context');
    }

    // Draw the cropped region
    // Source: original image at bounds position
    // Destination: full canvas (which has the cropped size)
    ctx.drawImage(
      img,
      Math.round(bounds.x),
      Math.round(bounds.y),
      Math.round(bounds.width),
      Math.round(bounds.height),
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Export as PNG for quality (lossless)
    const croppedBlob = await canvasToBlob(canvas, 'image/png');
    const arrayBuffer = await croppedBlob.arrayBuffer();

    return new Uint8Array(arrayBuffer);
  } finally {
    // Clean up the object URL
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Load an image from a URL into an HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Convert canvas to Blob
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      1.0 // Maximum quality
    );
  });
}

/**
 * Calculate luminance of a pixel (0-255)
 */
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Detect if a pixel is likely text based on local contrast
 */
function isTextPixel(
  imageData: ImageData,
  x: number,
  y: number,
  config: TextRemovalConfig
): boolean {
  const { width, height, data } = imageData;
  const idx = (y * width + x) * 4;
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  const luminance = getLuminance(r, g, b);

  // Sample neighboring pixels to calculate local contrast
  const neighbors: number[] = [];
  const radius = 2;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = (ny * width + nx) * 4;
        neighbors.push(getLuminance(data[nIdx], data[nIdx + 1], data[nIdx + 2]));
      }
    }
  }

  if (neighbors.length === 0) return false;

  const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
  const contrast = Math.abs(luminance - avgNeighbor) / 255;

  // Check if this is high-contrast (likely text)
  if (contrast < config.contrastThreshold) return false;

  // Detect dark text on light background
  if (config.detectDarkText && luminance < avgNeighbor - 30) {
    return true;
  }

  // Detect light text on dark background
  if (config.detectLightText && luminance > avgNeighbor + 30) {
    return true;
  }

  return false;
}

/**
 * Create a text mask identifying text pixels
 */
function createTextMask(
  imageData: ImageData,
  config: TextRemovalConfig
): Uint8Array {
  const { width, height } = imageData;
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isTextPixel(imageData, x, y, config)) {
        mask[y * width + x] = 1;
      }
    }
  }

  // Expand mask slightly to catch edges of text
  const expandedMask = new Uint8Array(width * height);
  const expandRadius = config.minTextSize;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        for (let dy = -expandRadius; dy <= expandRadius; dy++) {
          for (let dx = -expandRadius; dx <= expandRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              expandedMask[ny * width + nx] = 1;
            }
          }
        }
      }
    }
  }

  return expandedMask;
}

/**
 * Inpaint masked regions using average of non-masked neighbors
 */
function inpaintRegions(
  imageData: ImageData,
  mask: Uint8Array,
  config: TextRemovalConfig
): void {
  const { width, height, data } = imageData;
  const radius = config.inpaintRadius;

  // Multiple passes for better results
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x] !== 1) continue;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        // Collect non-masked neighbor colors
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (mask[ny * width + nx] !== 1 || pass > 0) {
                const nIdx = (ny * width + nx) * 4;
                sumR += data[nIdx];
                sumG += data[nIdx + 1];
                sumB += data[nIdx + 2];
                count++;
              }
            }
          }
        }

        if (count > 0) {
          const idx = (y * width + x) * 4;
          data[idx] = Math.round(sumR / count);
          data[idx + 1] = Math.round(sumG / count);
          data[idx + 2] = Math.round(sumB / count);
        }
      }
    }
  }
}

/**
 * Remove text from an image using local contrast detection and inpainting
 *
 * @param imageData - Original image as Uint8Array
 * @param mimeType - MIME type of the original image
 * @param config - Optional text removal configuration
 * @returns Image with text removed as Uint8Array (PNG format)
 */
export async function removeTextFromImage(
  imageData: Uint8Array,
  mimeType: string,
  config: Partial<TextRemovalConfig> = {}
): Promise<Uint8Array> {
  const fullConfig: TextRemovalConfig = {
    ...DEFAULT_TEXT_REMOVAL_CONFIG,
    ...config,
  };

  const blob = new Blob([imageData], { type: mimeType });
  const imageUrl = URL.createObjectURL(blob);

  try {
    const img = await loadImage(imageUrl);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2d context');
    }

    ctx.drawImage(img, 0, 0);
    const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Create text mask
    const textMask = createTextMask(canvasImageData, fullConfig);

    // Inpaint the masked regions
    inpaintRegions(canvasImageData, textMask, fullConfig);

    // Put the processed data back
    ctx.putImageData(canvasImageData, 0, 0);

    const resultBlob = await canvasToBlob(canvas, 'image/png');
    const arrayBuffer = await resultBlob.arrayBuffer();

    return new Uint8Array(arrayBuffer);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Crop a region from an image and optionally remove text
 *
 * @param imageData - Original image as Uint8Array
 * @param mimeType - MIME type of the original image
 * @param bounds - Bounding box to crop
 * @param removeText - Whether to remove text from the cropped region
 * @param textRemovalConfig - Optional text removal configuration
 * @returns Cropped image as Uint8Array (PNG format)
 */
export async function cropImageWithTextRemoval(
  imageData: Uint8Array,
  mimeType: string,
  bounds: Bounds,
  removeText: boolean = false,
  textRemovalConfig: Partial<TextRemovalConfig> = {}
): Promise<Uint8Array> {
  // First crop the image
  const croppedData = await cropImage(imageData, mimeType, bounds);

  // Then remove text if requested
  if (removeText) {
    return removeTextFromImage(croppedData, 'image/png', textRemovalConfig);
  }

  return croppedData;
}

/**
 * Extract multiple image regions from a screenshot
 *
 * @param imageData - Original screenshot as Uint8Array
 * @param mimeType - MIME type of the original image
 * @param regions - Array of { id, bounds } for each region to extract
 * @param removeText - Whether to remove text from extracted regions
 * @param textRemovalConfig - Optional text removal configuration
 * @returns Array of { id, data, mimeType } for each extracted image
 */
export async function extractImageRegions(
  imageData: Uint8Array,
  mimeType: string,
  regions: Array<{ id: string; bounds: Bounds }>,
  removeText: boolean = false,
  textRemovalConfig: Partial<TextRemovalConfig> = {}
): Promise<Array<{ id: string; data: Uint8Array; mimeType: string }>> {
  const results: Array<{ id: string; data: Uint8Array; mimeType: string }> = [];

  for (const region of regions) {
    try {
      const croppedData = await cropImageWithTextRemoval(
        imageData,
        mimeType,
        region.bounds,
        removeText,
        textRemovalConfig
      );
      results.push({
        id: region.id,
        data: croppedData,
        mimeType: 'image/png', // Always export as PNG
      });
    } catch (error) {
      console.warn(`Failed to crop image region ${region.id}:`, error);
      // Skip failed regions, don't block other extractions
    }
  }

  return results;
}

// Export the config type for external use
export type { TextRemovalConfig };
