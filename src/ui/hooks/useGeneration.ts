/**
 * useGeneration hook for triggering Figma design generation
 *
 * Communicates with the main thread to:
 * - Send GENERATE_DESIGN requests with extracted images
 * - Receive PROGRESS updates
 * - Handle GENERATION_COMPLETE responses
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UIAnalysisResponse } from '../types/analysis';
import type { GenerationProgress, GenerationComplete, ExtractedImage } from '../../shared/messages';
import { generateCorrelationId } from '../../shared/messages';
import { extractImageRegions } from '../utils/imageCropper';

export interface GenerationState {
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Current progress step and counts */
  progress: GenerationProgress | null;
  /** Generation result (success or error) */
  result: GenerationComplete | null;
  /** Error message if generation failed */
  error: string | null;
}

/** Screenshot data for image extraction */
export interface ScreenshotData {
  /** Screenshot image bytes */
  uint8Array: Uint8Array;
  /** MIME type of the screenshot */
  mimeType: string;
}

export interface UseGenerationReturn extends GenerationState {
  /** Start generation from analysis result with optional screenshot for image extraction */
  generate: (analysis: UIAnalysisResponse, screenshot?: ScreenshotData) => Promise<void>;
  /** Reset generation state */
  reset: () => void;
}

/**
 * Hook for managing Figma design generation from UI analysis
 */
export function useGeneration(): UseGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [result, setResult] = useState<GenerationComplete | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track active correlation ID for matching responses
  const activeCorrelationId = useRef<string | null>(null);

  /**
   * Handle incoming messages from the main thread
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    const msg = event.data.pluginMessage;
    if (!msg || typeof msg !== 'object') return;

    // Only process messages for our active request
    if (msg.correlationId !== activeCorrelationId.current) return;

    switch (msg.type) {
      case 'PROGRESS':
        setProgress(msg.payload as GenerationProgress);
        break;

      case 'GENERATION_COMPLETE':
        const completePayload = msg.payload as GenerationComplete;
        setResult(completePayload);
        setIsGenerating(false);
        activeCorrelationId.current = null;

        if (!completePayload.success && completePayload.error) {
          setError(completePayload.error);
        }
        break;
    }
  }, []);

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  /**
   * Start Figma design generation from analysis result
   * If screenshot is provided, extracts actual images for Image elements
   */
  const generate = useCallback(async (analysis: UIAnalysisResponse, screenshot?: ScreenshotData) => {
    // Reset state
    setIsGenerating(true);
    setProgress(null);
    setResult(null);
    setError(null);

    // Generate correlation ID for tracking this request
    const correlationId = generateCorrelationId();
    activeCorrelationId.current = correlationId;

    // Extract images from screenshot if provided
    let extractedImages: ExtractedImage[] | undefined;

    if (screenshot) {
      // Find all Image elements AND containers with background images
      const imageElements = analysis.elements.filter(
        el => el.component === 'Image' || el.hasBackgroundImage
      );

      if (imageElements.length > 0) {
        try {
          // Extract image regions from the screenshot
          const regions = imageElements.map(el => ({
            id: el.id,
            bounds: el.bounds,
          }));

          extractedImages = await extractImageRegions(
            screenshot.uint8Array,
            screenshot.mimeType,
            regions
          );

          console.log(`[useGeneration] Extracted ${extractedImages.length} images (including ${imageElements.filter(e => e.hasBackgroundImage).length} background images)`);
        } catch (err) {
          console.warn('[useGeneration] Failed to extract images:', err);
          // Continue without extracted images - will use placeholders
        }
      }
    }

    // Send generation request to main thread
    parent.postMessage({
      pluginMessage: {
        type: 'REQUEST',
        correlationId,
        action: 'GENERATE_DESIGN',
        payload: {
          ...analysis,
          extractedImages,
        },
      }
    }, '*');
  }, []);

  /**
   * Reset all generation state
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setResult(null);
    setError(null);
    activeCorrelationId.current = null;
  }, []);

  return {
    isGenerating,
    progress,
    result,
    error,
    generate,
    reset,
  };
}
