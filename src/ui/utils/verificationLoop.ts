/**
 * Verification Loop Utility
 *
 * After generating a Figma frame from a screenshot, this utility:
 * 1. Exports the generated frame as an image
 * 2. Compares it with the original screenshot using pixel-level analysis
 * 3. Identifies regions with significant visual differences
 * 4. Produces correction suggestions for elements in those regions
 *
 * This enables an iterative refinement process where AI corrections
 * can be applied to improve fidelity.
 */

import type { UIAnalysisResponse, UIElement, Bounds } from '../types/analysis';

/**
 * Region of significant visual difference between original and generated
 */
export interface DifferenceRegion {
  bounds: Bounds;
  /** Mean pixel difference (0-255) in this region */
  meanDifference: number;
  /** Elements overlapping with this difference region */
  affectedElementIds: string[];
}

/**
 * Result of comparing original screenshot with generated frame export
 */
export interface VerificationResult {
  /** Overall similarity score (0-1, where 1 = identical) */
  similarityScore: number;
  /** Total number of pixels compared */
  totalPixels: number;
  /** Number of pixels with significant difference */
  differentPixels: number;
  /** Regions with the largest visual differences */
  differenceRegions: DifferenceRegion[];
  /** Whether the result is considered acceptable */
  acceptable: boolean;
}

/**
 * Threshold for pixel difference to be considered "significant"
 * Per-channel difference (0-255)
 */
const PIXEL_DIFF_THRESHOLD = 30;

/**
 * Overall similarity threshold to consider the output acceptable
 */
const ACCEPTABLE_SIMILARITY = 0.85;

/**
 * Grid cell size for region-based comparison (in pixels)
 */
const COMPARISON_GRID_SIZE = 64;

/**
 * Compare two images pixel-by-pixel and identify difference regions
 *
 * @param originalData - ImageData from the original screenshot
 * @param generatedData - ImageData from the exported Figma frame
 * @param elements - The UI elements for mapping differences to elements
 * @returns VerificationResult with similarity metrics and difference regions
 */
export function compareImages(
  originalData: ImageData,
  generatedData: ImageData,
  elements: UIElement[]
): VerificationResult {
  const width = Math.min(originalData.width, generatedData.width);
  const height = Math.min(originalData.height, generatedData.height);
  const totalPixels = width * height;

  // Grid-based difference accumulation
  const gridCols = Math.ceil(width / COMPARISON_GRID_SIZE);
  const gridRows = Math.ceil(height / COMPARISON_GRID_SIZE);
  const gridDiffs: number[][] = Array.from({ length: gridRows }, () =>
    Array(gridCols).fill(0)
  );
  const gridCounts: number[][] = Array.from({ length: gridRows }, () =>
    Array(gridCols).fill(0)
  );

  let differentPixels = 0;

  // Per-pixel comparison
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * originalData.width + x) * 4;
      const idx2 = (y * generatedData.width + x) * 4;

      const dr = Math.abs(originalData.data[idx] - generatedData.data[idx2]);
      const dg = Math.abs(originalData.data[idx + 1] - generatedData.data[idx2 + 1]);
      const db = Math.abs(originalData.data[idx + 2] - generatedData.data[idx2 + 2]);

      const pixelDiff = (dr + dg + db) / 3;

      // Accumulate into grid cell
      const gx = Math.floor(x / COMPARISON_GRID_SIZE);
      const gy = Math.floor(y / COMPARISON_GRID_SIZE);
      gridDiffs[gy][gx] += pixelDiff;
      gridCounts[gy][gx]++;

      if (pixelDiff > PIXEL_DIFF_THRESHOLD) {
        differentPixels++;
      }
    }
  }

  // Find grid cells with highest mean difference
  const cellResults: { row: number; col: number; meanDiff: number }[] = [];
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      if (gridCounts[gy][gx] > 0) {
        const meanDiff = gridDiffs[gy][gx] / gridCounts[gy][gx];
        if (meanDiff > PIXEL_DIFF_THRESHOLD / 2) {
          cellResults.push({ row: gy, col: gx, meanDiff });
        }
      }
    }
  }

  // Sort by difference severity and take top regions
  cellResults.sort((a, b) => b.meanDiff - a.meanDiff);
  const topCells = cellResults.slice(0, 20);

  // Convert grid cells to difference regions and find affected elements
  const differenceRegions: DifferenceRegion[] = topCells.map(cell => {
    const bounds: Bounds = {
      x: cell.col * COMPARISON_GRID_SIZE,
      y: cell.row * COMPARISON_GRID_SIZE,
      width: Math.min(COMPARISON_GRID_SIZE, width - cell.col * COMPARISON_GRID_SIZE),
      height: Math.min(COMPARISON_GRID_SIZE, height - cell.row * COMPARISON_GRID_SIZE),
    };

    // Find elements that overlap with this region
    const affectedElementIds = elements
      .filter(el => boundsOverlap(el.bounds, bounds))
      .map(el => el.id);

    return {
      bounds,
      meanDifference: cell.meanDiff,
      affectedElementIds,
    };
  });

  const similarityScore = 1 - differentPixels / totalPixels;

  return {
    similarityScore,
    totalPixels,
    differentPixels,
    differenceRegions,
    acceptable: similarityScore >= ACCEPTABLE_SIMILARITY,
  };
}

/**
 * Check if two bounding boxes overlap
 */
function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * Load an image from bytes into ImageData via Canvas
 */
export function loadImageData(
  imageBytes: Uint8Array,
  mimeType: string
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([imageBytes.buffer as ArrayBuffer], { type: mimeType });
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
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for verification'));
    };

    img.src = url;
  });
}

/**
 * Build a correction prompt from verification results
 *
 * This generates a textual summary of what needs fixing,
 * suitable for feeding back to the AI for a correction pass.
 *
 * @param result - The verification comparison result
 * @param elements - Original analysis elements
 * @returns A correction prompt string, or null if no corrections needed
 */
export function buildCorrectionPrompt(
  result: VerificationResult,
  elements: UIElement[]
): string | null {
  if (result.acceptable) {
    return null;
  }

  const elementMap = new Map(elements.map(el => [el.id, el]));

  // Group affected elements and their issues
  const affectedElements = new Set<string>();
  for (const region of result.differenceRegions) {
    for (const id of region.affectedElementIds) {
      affectedElements.add(id);
    }
  }

  if (affectedElements.size === 0) {
    return null;
  }

  const lines: string[] = [
    `The generated design has a similarity score of ${(result.similarityScore * 100).toFixed(1)}% compared to the original screenshot.`,
    `${result.differentPixels} out of ${result.totalPixels} pixels differ significantly.`,
    '',
    'The following elements need correction:',
  ];

  for (const id of affectedElements) {
    const el = elementMap.get(id);
    if (!el) continue;

    // Find the worst difference region affecting this element
    const worstRegion = result.differenceRegions
      .filter(r => r.affectedElementIds.includes(id))
      .sort((a, b) => b.meanDifference - a.meanDifference)[0];

    if (worstRegion) {
      lines.push(
        `- Element "${id}" (${el.component}) at (${el.bounds.x}, ${el.bounds.y}, ${el.bounds.width}x${el.bounds.height}): ` +
        `region difference score ${worstRegion.meanDifference.toFixed(1)}/255. ` +
        `Check position, size, colors, and styling.`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Run the full verification pipeline
 *
 * @param originalBytes - Original screenshot bytes
 * @param generatedBytes - Exported Figma frame bytes
 * @param mimeType - Image MIME type
 * @param analysis - The UI analysis that was used for generation
 * @returns VerificationResult with correction info
 */
export async function runVerification(
  originalBytes: Uint8Array,
  generatedBytes: Uint8Array,
  mimeType: string,
  analysis: UIAnalysisResponse
): Promise<{ result: VerificationResult; correctionPrompt: string | null }> {
  const [originalData, generatedData] = await Promise.all([
    loadImageData(originalBytes, mimeType),
    loadImageData(generatedBytes, mimeType),
  ]);

  const result = compareImages(originalData, generatedData, analysis.elements);
  const correctionPrompt = buildCorrectionPrompt(result, analysis.elements);

  console.log(
    `[Verification] Similarity: ${(result.similarityScore * 100).toFixed(1)}%, ` +
    `Diff pixels: ${result.differentPixels}/${result.totalPixels}, ` +
    `Regions: ${result.differenceRegions.length}, ` +
    `Acceptable: ${result.acceptable}`
  );

  return { result, correctionPrompt };
}
