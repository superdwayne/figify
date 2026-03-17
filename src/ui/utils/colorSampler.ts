/**
 * Canvas-based color sampling utility
 *
 * Samples actual pixel colors from a screenshot image to replace
 * AI-estimated colors with ground-truth values. Uses Canvas API
 * to read pixel data at element bounds.
 */

import type { UIAnalysisResponse, Bounds } from '../types/analysis';

/**
 * Sample the dominant color from a rectangular region of an image
 *
 * Uses a grid sampling approach to find the most common color,
 * ignoring outliers (text pixels, borders, etc.)
 *
 * @param ctx - Canvas 2D rendering context with the image drawn
 * @param bounds - Region to sample from
 * @param sampleCount - Number of samples per axis (default 5 = 25 total samples)
 * @returns Hex color string (#RRGGBB)
 */
function sampleDominantColor(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds,
  sampleCount: number = 5
): string | null {
  const { x, y, width, height } = bounds;

  if (width < 1 || height < 1) return null;

  // Sample a grid of points within the bounds (inset slightly to avoid borders)
  const insetX = Math.max(1, Math.floor(width * 0.1));
  const insetY = Math.max(1, Math.floor(height * 0.1));
  const innerWidth = width - insetX * 2;
  const innerHeight = height - insetY * 2;

  if (innerWidth < 1 || innerHeight < 1) return null;

  const stepX = Math.max(1, Math.floor(innerWidth / sampleCount));
  const stepY = Math.max(1, Math.floor(innerHeight / sampleCount));

  // Collect color samples
  const colorCounts = new Map<string, number>();

  for (let sy = 0; sy < sampleCount; sy++) {
    for (let sx = 0; sx < sampleCount; sx++) {
      const px = Math.round(x + insetX + sx * stepX);
      const py = Math.round(y + insetY + sy * stepY);

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(px, ctx.canvas.width - 1));
      const clampedY = Math.max(0, Math.min(py, ctx.canvas.height - 1));

      const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
      // Quantize to reduce noise (round to nearest 4)
      const r = Math.round(pixel[0] / 4) * 4;
      const g = Math.round(pixel[1] / 4) * 4;
      const b = Math.round(pixel[2] / 4) * 4;
      const hex = rgbToHex(r, g, b);

      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
  }

  // Find the most common color (mode)
  let maxCount = 0;
  let dominantColor: string | null = null;

  for (const [color, count] of colorCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }

  return dominantColor;
}

/**
 * Sample the color at the center of a region
 *
 * @param ctx - Canvas 2D rendering context
 * @param bounds - Region to sample from
 * @returns Hex color string (#RRGGBB)
 */
function sampleCenterColor(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds
): string | null {
  const cx = Math.round(bounds.x + bounds.width / 2);
  const cy = Math.round(bounds.y + bounds.height / 2);

  const clampedX = Math.max(0, Math.min(cx, ctx.canvas.width - 1));
  const clampedY = Math.max(0, Math.min(cy, ctx.canvas.height - 1));

  const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
  return rgbToHex(pixel[0], pixel[1], pixel[2]);
}

/**
 * Sample text color by finding the highest-contrast pixels in a region
 *
 * Text is typically the highest-contrast content, so we look for
 * pixels that differ most from the background.
 *
 * @param ctx - Canvas 2D rendering context
 * @param bounds - Region containing text
 * @returns Hex color string (#RRGGBB) or null
 */
function sampleTextColor(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds
): string | null {
  const { x, y, width, height } = bounds;
  if (width < 2 || height < 2) return null;

  // Get all pixels in the region
  const clampedX = Math.max(0, Math.round(x));
  const clampedY = Math.max(0, Math.round(y));
  const clampedW = Math.min(Math.round(width), ctx.canvas.width - clampedX);
  const clampedH = Math.min(Math.round(height), ctx.canvas.height - clampedY);

  if (clampedW < 1 || clampedH < 1) return null;

  const imageData = ctx.getImageData(clampedX, clampedY, clampedW, clampedH);
  const data = imageData.data;

  // First, find the background color (most common)
  const bgColor = sampleDominantColor(ctx, bounds, 7);
  if (!bgColor) return null;

  const bgRgb = hexToRgb(bgColor);
  if (!bgRgb) return null;

  // Find the color most different from background (likely text)
  let maxDiff = 0;
  let textR = 0, textG = 0, textB = 0;
  let textPixelCount = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  // Sample every 2nd pixel for performance
  for (let i = 0; i < data.length; i += 8) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const diff = Math.abs(r - bgRgb.r) + Math.abs(g - bgRgb.g) + Math.abs(b - bgRgb.b);

    // If this pixel is significantly different from background, it's likely text
    if (diff > 60) {
      sumR += r;
      sumG += g;
      sumB += b;
      textPixelCount++;

      if (diff > maxDiff) {
        maxDiff = diff;
        textR = r;
        textG = g;
        textB = b;
      }
    }
  }

  // Use average of text pixels if we found enough, otherwise use max-diff pixel
  if (textPixelCount > 5) {
    return rgbToHex(
      Math.round(sumR / textPixelCount),
      Math.round(sumG / textPixelCount),
      Math.round(sumB / textPixelCount)
    );
  }

  if (maxDiff > 30) {
    return rgbToHex(textR, textG, textB);
  }

  return null;
}

/**
 * Sample border color from the edges of a region
 *
 * @param ctx - Canvas 2D rendering context
 * @param bounds - Element bounds
 * @returns Hex color string or null if no distinct border detected
 */
function sampleBorderColor(
  ctx: CanvasRenderingContext2D,
  bounds: Bounds
): string | null {
  const { x, y, width, height } = bounds;
  if (width < 4 || height < 4) return null;

  // Sample along the edges (1px from the boundary)
  const edgePixels: number[][] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 10));

  // Top edge
  for (let px = Math.round(x); px < Math.round(x + width); px += step) {
    const clampedX = Math.max(0, Math.min(px, ctx.canvas.width - 1));
    const clampedY = Math.max(0, Math.min(Math.round(y), ctx.canvas.height - 1));
    const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
    edgePixels.push([pixel[0], pixel[1], pixel[2]]);
  }

  // Bottom edge
  for (let px = Math.round(x); px < Math.round(x + width); px += step) {
    const clampedX = Math.max(0, Math.min(px, ctx.canvas.width - 1));
    const clampedY = Math.max(0, Math.min(Math.round(y + height - 1), ctx.canvas.height - 1));
    const pixel = ctx.getImageData(clampedX, clampedY, 1, 1).data;
    edgePixels.push([pixel[0], pixel[1], pixel[2]]);
  }

  if (edgePixels.length === 0) return null;

  // Check if edge pixels form a consistent color (border)
  const bgColor = sampleDominantColor(ctx, {
    x: x + 2, y: y + 2,
    width: Math.max(1, width - 4), height: Math.max(1, height - 4)
  }, 3);

  if (!bgColor) return null;
  const bgRgb = hexToRgb(bgColor);
  if (!bgRgb) return null;

  // Average edge color
  let sumR = 0, sumG = 0, sumB = 0;
  for (const [r, g, b] of edgePixels) {
    sumR += r;
    sumG += g;
    sumB += b;
  }
  const avgR = Math.round(sumR / edgePixels.length);
  const avgG = Math.round(sumG / edgePixels.length);
  const avgB = Math.round(sumB / edgePixels.length);

  // Only return if edge color is noticeably different from interior
  const diff = Math.abs(avgR - bgRgb.r) + Math.abs(avgG - bgRgb.g) + Math.abs(avgB - bgRgb.b);
  if (diff > 20) {
    return rgbToHex(avgR, avgG, avgB);
  }

  return null;
}

/**
 * Convert RGB values (0-255) to hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex string to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

/**
 * Check if two hex colors are similar (within threshold)
 */
function colorsSimilar(hex1: string, hex2: string, threshold: number = 30): boolean {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return false;
  const diff = Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
  return diff < threshold;
}

/**
 * Load an image from a Uint8Array into a Canvas context
 */
function loadImageToCanvas(
  imageData: Uint8Array,
  mimeType: string
): Promise<CanvasRenderingContext2D> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageData.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for color sampling'));
    };

    img.src = url;
  });
}

/**
 * Refine AI-estimated colors with actual pixel-sampled colors from the screenshot
 *
 * For each element, samples the actual pixel colors at the element's bounds
 * and replaces AI-estimated colors when they differ significantly.
 *
 * @param analysis - The AI analysis response with estimated colors
 * @param imageData - Original screenshot as Uint8Array
 * @param mimeType - MIME type of the image
 * @returns Updated analysis with pixel-accurate colors
 */
export async function refineColorsFromScreenshot(
  analysis: UIAnalysisResponse,
  imageData: Uint8Array,
  mimeType: string
): Promise<UIAnalysisResponse> {
  let ctx: CanvasRenderingContext2D;

  try {
    ctx = await loadImageToCanvas(imageData, mimeType);
  } catch (err) {
    console.warn('[colorSampler] Failed to load image, skipping color refinement:', err);
    return analysis;
  }

  let refinedCount = 0;
  const refinedElements = analysis.elements.map(element => {
    const refined = { ...element, styles: { ...element.styles } };

    // Sample background color for non-text, non-icon elements
    if (element.component !== 'Typography' && element.component !== 'Icon') {
      const sampledBg = sampleDominantColor(ctx, element.bounds, 7);
      if (sampledBg && element.styles.backgroundColor) {
        if (!colorsSimilar(sampledBg, element.styles.backgroundColor, 40)) {
          console.log(`[colorSampler] ${element.id} bg: ${element.styles.backgroundColor} → ${sampledBg}`);
          refined.styles.backgroundColor = sampledBg;
          refinedCount++;
        }
      } else if (sampledBg && !element.styles.backgroundColor) {
        // AI didn't detect a bg color but there is one
        refined.styles.backgroundColor = sampledBg;
      }
    }

    // Sample text color for text elements
    if (element.content && element.styles.textColor) {
      const sampledText = sampleTextColor(ctx, element.bounds);
      if (sampledText && !colorsSimilar(sampledText, element.styles.textColor, 40)) {
        console.log(`[colorSampler] ${element.id} text: ${element.styles.textColor} → ${sampledText}`);
        refined.styles.textColor = sampledText;
        refinedCount++;
      }
    }

    // Sample border color
    if (element.styles.borderColor) {
      const sampledBorder = sampleBorderColor(ctx, element.bounds);
      if (sampledBorder && !colorsSimilar(sampledBorder, element.styles.borderColor, 40)) {
        console.log(`[colorSampler] ${element.id} border: ${element.styles.borderColor} → ${sampledBorder}`);
        refined.styles.borderColor = sampledBorder;
        refinedCount++;
      }
    }

    return refined;
  });

  console.log(`[colorSampler] Refined ${refinedCount} colors across ${analysis.elements.length} elements`);

  return {
    ...analysis,
    elements: refinedElements,
  };
}
