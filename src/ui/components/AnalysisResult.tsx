/**
 * AnalysisResult component for displaying structured UI analysis results
 *
 * Shows detected Shadcn components with their properties including:
 * - Component type and variant
 * - Dimensions and position
 * - Color swatches for visual properties
 * - Text content (truncated)
 *
 * Also provides "Generate in Figma" button for creating the design,
 * and export options for copying/downloading analysis as JSON.
 */

import { useState, useEffect } from 'react';
import type { UIAnalysisResponse, UIElement } from '../types/analysis';
import type { GenerationProgress, GenerationComplete } from '../../shared/messages';
import { copyAnalysisToClipboard, downloadAnalysisAsJSON } from '../utils/exportAnalysis';

interface AnalysisResultProps {
  /** The structured analysis response from Claude */
  result: UIAnalysisResponse;
  /** Callback to clear results and start new analysis */
  onClear: () => void;
  /** Callback to generate Figma design */
  onGenerate?: () => void;
  /** Whether generation is in progress */
  isGenerating?: boolean;
  /** Current generation progress */
  progress?: GenerationProgress | null;
  /** Generation result */
  generationResult?: GenerationComplete | null;
  /** Generation error */
  generationError?: string | null;
  /** AI provider name used for analysis (for export metadata) */
  providerName?: string;
}

/**
 * Displays structured UI analysis results
 * Shows detected Shadcn components with their properties
 */
export function AnalysisResult({
  result,
  onClear,
  onGenerate,
  isGenerating = false,
  progress = null,
  generationResult = null,
  generationError = null,
  providerName = 'Unknown',
}: AnalysisResultProps) {
  const { elements, viewport } = result;

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  // Handle copy to clipboard
  const handleCopyJSON = async () => {
    try {
      await copyAnalysisToClipboard(result, providerName);
      showToast('Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Handle download JSON
  const handleDownloadJSON = () => {
    try {
      downloadAnalysisAsJSON(result, providerName);
      showToast('Download started', 'success');
    } catch (err) {
      console.error('Failed to download:', err);
      showToast('Failed to download file', 'error');
    }
  };

  // Determine retina scale hint for user
  const isRetina = viewport.width > 2000 || viewport.height > 2000;
  const is3x = viewport.width > 2500 || viewport.height > 2500;

  return (
    <div className="space-y-4 w-full relative" role="region" aria-label="Analysis results">
      {/* Status announcements for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isGenerating && progress
          ? `Generating: ${progress.step}, ${progress.current} of ${progress.total}`
          : isGenerating
            ? 'Preparing generation...'
            : null}
        {generationResult?.success && `Design generated! Created ${generationResult.elementCount} elements.`}
        {(generationError || (generationResult && !generationResult.success)) &&
          `Generation failed: ${generationError || generationResult?.error || 'Unknown error'}`}
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className={`
            absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full
            px-3 py-2 rounded-md shadow-lg text-sm font-medium z-50
            animate-in fade-in slide-in-from-top-2 duration-200
            ${toastType === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'}
          `}
        >
          {toastMessage}
        </div>
      )}

      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div
          className="text-sm text-muted-foreground"
          aria-label={`Found ${elements.length} elements, viewport ${viewport.width} by ${viewport.height} pixels${isRetina ? `, ${is3x ? '3x' : '2x'} retina` : ''}`}
        >
          Found{' '}
          <span className="font-semibold text-foreground">
            {elements.length}
          </span>{' '}
          elements
          <span className="text-muted-foreground/60 ml-2" aria-hidden="true">
            ({viewport.width}x{viewport.height})
          </span>
          {isRetina && (
            <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded" aria-hidden="true">
              {is3x ? '3x retina' : '2x retina'}
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          disabled={isGenerating}
          aria-label="Clear analysis results"
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors disabled:opacity-50 focus-ring"
        >
          Clear
        </button>
      </div>

      {/* Export buttons */}
      {elements.length > 0 && (
        <div className="flex gap-2" role="group" aria-label="Export options">
          <button
            onClick={handleCopyJSON}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 rounded-md transition-colors disabled:opacity-50 focus-ring"
            aria-label="Copy analysis as JSON to clipboard"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy JSON
          </button>
          <button
            onClick={handleDownloadJSON}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 rounded-md transition-colors disabled:opacity-50 focus-ring"
            aria-label="Download analysis as JSON file"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download JSON
          </button>
        </div>
      )}

      {/* Elements list */}
      {elements.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center" role="status">
          No Shadcn components detected. Try a different screenshot.
        </div>
      ) : (
        <div
          className="space-y-2 max-h-48 overflow-y-auto"
          role="list"
          aria-label={`${elements.length} detected UI elements`}
        >
          {elements.map((element) => (
            <ElementCard key={element.id} element={element} />
          ))}
        </div>
      )}

      {/* Generation section */}
      {elements.length > 0 && onGenerate && (
        <div className="pt-2 border-t border-border space-y-3">
          {/* Generate button */}
          {!generationResult && (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              aria-busy={isGenerating}
              className={`
                w-full px-4 py-2 text-sm font-medium rounded-md transition-colors focus-ring
                ${isGenerating
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'}
              `}
            >
              {isGenerating ? 'Generating...' : 'Generate in Figma'}
            </button>
          )}

          {/* Progress indicator */}
          {isGenerating && progress && (
            <div className="space-y-2" role="progressbar" aria-valuenow={progress.current} aria-valuemin={0} aria-valuemax={progress.total} aria-label={`Generation progress: ${progress.step}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress.step}</span>
                <span aria-hidden="true">{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.round((progress.current / progress.total) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Generation spinner (no progress yet) */}
          {isGenerating && !progress && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground" role="status" aria-label="Preparing generation">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">Preparing generation...</span>
            </div>
          )}

          {/* Success message */}
          {generationResult?.success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Design generated!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Created {generationResult.elementCount} elements. The design is now selected in Figma.
              </p>
            </div>
          )}

          {/* Error message with retry button */}
          {(generationError || (generationResult && !generationResult.success)) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium">Generation failed</span>
                </div>
                <button
                  onClick={onGenerate}
                  disabled={isGenerating}
                  aria-label="Retry generation"
                  className="text-sm px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                >
                  {isGenerating ? 'Retrying...' : 'Retry'}
                </button>
              </div>
              <p className="text-sm text-red-600 mt-1">
                {generationError || generationResult?.error || 'Unknown error occurred'}
              </p>
            </div>
          )}
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
    <div
      className="p-3 bg-secondary rounded-lg border border-border"
      role="listitem"
      aria-label={`${element.component}${variantLabel}${sizeLabel}, ${element.bounds.width} by ${element.bounds.height} pixels${element.content ? `, content: ${element.content}` : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">
          {element.component}
          <span className="text-muted-foreground font-normal">
            {variantLabel}
            {sizeLabel}
          </span>
        </span>
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          {element.bounds.width}x{element.bounds.height}
        </span>
      </div>

      {element.content && (
        <div className="mt-1 text-sm text-muted-foreground truncate" aria-hidden="true">
          "{element.content}"
        </div>
      )}

      {/* Color swatches if present */}
      {(element.styles.backgroundColor ||
        element.styles.textColor ||
        element.styles.borderColor) && (
        <div className="mt-2 flex gap-2 flex-wrap" aria-label="Color styles">
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
    <div
      className="flex items-center gap-1 text-xs text-muted-foreground"
      aria-label={`${label} color: ${color}`}
    >
      <div
        className="w-4 h-4 rounded border border-border"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span aria-hidden="true">
        {label}: {color}
      </span>
    </div>
  );
}
