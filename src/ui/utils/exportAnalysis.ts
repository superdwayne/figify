/**
 * Export utilities for UI analysis results
 *
 * Provides functions to format and export analysis results as JSON,
 * including metadata like timestamp, provider, and image dimensions.
 */

import type { UIAnalysisResponse } from '../types/analysis';

/**
 * Metadata included in exported analysis results
 */
export interface ExportMetadata {
  /** ISO timestamp of when the export was created */
  timestamp: string;
  /** AI provider used for analysis (e.g., "Claude", "OpenAI", "Gemini", "Ollama") */
  provider: string;
  /** Dimensions of the analyzed image */
  imageDimensions: {
    width: number;
    height: number;
  };
  /** Version of the export format */
  exportVersion: string;
}

/**
 * Complete export format including metadata and analysis elements
 */
export interface AnalysisExport {
  /** Export metadata */
  meta: ExportMetadata;
  /** UI elements detected in the analysis */
  elements: UIAnalysisResponse['elements'];
}

/**
 * Creates an export object from analysis results with metadata
 *
 * @param result - The UI analysis response to export
 * @param provider - The AI provider name used for analysis
 * @returns Formatted export object
 */
export function createAnalysisExport(
  result: UIAnalysisResponse,
  provider: string
): AnalysisExport {
  return {
    meta: {
      timestamp: new Date().toISOString(),
      provider,
      imageDimensions: {
        width: result.viewport.width,
        height: result.viewport.height,
      },
      exportVersion: '1.0.0',
    },
    elements: result.elements,
  };
}

/**
 * Formats analysis results as a JSON string with proper indentation
 *
 * @param result - The UI analysis response to format
 * @param provider - The AI provider name used for analysis
 * @returns Formatted JSON string
 */
export function formatAnalysisAsJSON(
  result: UIAnalysisResponse,
  provider: string
): string {
  const exportData = createAnalysisExport(result, provider);
  return JSON.stringify(exportData, null, 2);
}

/**
 * Copies analysis results to clipboard as formatted JSON
 *
 * @param result - The UI analysis response to copy
 * @param provider - The AI provider name used for analysis
 * @returns Promise that resolves when copy is complete
 * @throws Error if clipboard API is not available or copy fails
 */
export async function copyAnalysisToClipboard(
  result: UIAnalysisResponse,
  provider: string
): Promise<void> {
  const jsonString = formatAnalysisAsJSON(result, provider);

  if (!navigator.clipboard) {
    throw new Error('Clipboard API not available');
  }

  await navigator.clipboard.writeText(jsonString);
}

/**
 * Downloads analysis results as a JSON file
 *
 * @param result - The UI analysis response to download
 * @param provider - The AI provider name used for analysis
 * @param filename - Optional custom filename (without extension)
 */
export function downloadAnalysisAsJSON(
  result: UIAnalysisResponse,
  provider: string,
  filename?: string
): void {
  const jsonString = formatAnalysisAsJSON(result, provider);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Generate filename with timestamp if not provided
  const defaultFilename = `figify-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const finalFilename = filename || defaultFilename;

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `${finalFilename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up blob URL
  URL.revokeObjectURL(url);
}
