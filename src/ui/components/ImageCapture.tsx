/**
 * ImageCapture component for screenshot and image input
 *
 * Provides a drop zone for:
 * - Clipboard paste (Cmd/Ctrl+V)
 * - Drag-and-drop image files
 *
 * Displays preview of captured images with clear functionality.
 * Integrates with AI providers (Claude or Ollama) for image analysis.
 * Triggers Figma design generation from analysis results.
 * Includes size validation with warnings for large files.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useImageCapture } from '../hooks/useImageCapture';
import { useImageHistory } from '../hooks/useImageHistory';
import { useAI } from '../hooks/useAI';
import { useApiKey } from '../hooks/useApiKey';
import { useGeneration } from '../hooks/useGeneration';
import { useProviderSettings } from '../hooks/useProviderSettings';
import { AnalysisResult } from './AnalysisResult';
import { AnalysisProgress } from './AnalysisProgress';
import { ErrorDisplay } from './ErrorDisplay';
import { ImageHistory } from './ImageHistory';
import {
  DropZone,
  DropZoneEmptyState,
  ImagePreview,
  AnalysisControls,
  SizeWarningDialog,
} from './capture';

/**
 * Drop zone component for image capture with paste and drag-drop support
 */
export function ImageCapture() {
  const {
    capturedImage,
    isDragging,
    error,
    warning,
    confirmWarning,
    cancelWarning,
    clearImage,
    setImage,
    dropZoneProps,
  } = useImageCapture();
  const { apiKey } = useApiKey();

  // Image history hook
  const {
    history,
    addImage,
    selectImage,
    clearHistory,
  } = useImageHistory();

  // Image dimensions state
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Track whether the current image came from history (to avoid re-adding it)
  const isFromHistoryRef = useRef(false);

  // Track the last added image URL to prevent duplicate additions
  const lastAddedUrlRef = useRef<string | null>(null);

  // Load image dimensions when capturedImage changes
  useEffect(() => {
    if (!capturedImage) {
      setImageDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = capturedImage.previewUrl;
  }, [capturedImage]);

  // Add new images to history when dimensions are available
  useEffect(() => {
    if (
      capturedImage &&
      imageDimensions &&
      !isFromHistoryRef.current &&
      lastAddedUrlRef.current !== capturedImage.previewUrl
    ) {
      addImage(capturedImage, imageDimensions);
      lastAddedUrlRef.current = capturedImage.previewUrl;
    }
    // Reset the history flag after processing
    if (capturedImage && isFromHistoryRef.current) {
      isFromHistoryRef.current = false;
    }
  }, [capturedImage, imageDimensions, addImage]);

  // Get provider settings from consolidated hook
  const { settings } = useProviderSettings();
  const { providerType, ollamaUrl, ollamaModel, openaiKey, geminiKey } = settings;

  // Build provider options based on selected provider type (memoized to prevent unnecessary re-initialization)
  const providerOptions = useMemo(() => {
    switch (providerType) {
      case 'anthropic':
        return { type: 'anthropic' as const, apiKey };
      case 'openai':
        return { type: 'openai' as const, apiKey: openaiKey };
      case 'gemini':
        return { type: 'gemini' as const, apiKey: geminiKey };
      case 'ollama':
        return { type: 'ollama' as const, baseUrl: ollamaUrl, model: ollamaModel };
      default:
        return { type: 'anthropic' as const, apiKey };
    }
  }, [providerType, apiKey, openaiKey, geminiKey, ollamaUrl, ollamaModel]);

  // Use the unified AI hook with selected provider
  const {
    analyze,
    isLoading,
    error: aiError,
    errorWithSteps: aiErrorWithSteps,
    result,
    reset,
    cancel,
    isConfigured,
    providerName,
    progress: analysisProgress,
  } = useAI(providerOptions);

  const {
    isGenerating,
    progress,
    result: generationResult,
    error: generationError,
    generate,
    reset: resetGeneration,
  } = useGeneration();

  // Combine errors from image validation and API (not generation - shown separately)
  const displayError = error || aiError;

  // Handler for analyze button
  const handleAnalyze = useCallback(() => {
    if (capturedImage) {
      analyze(capturedImage.uint8Array, capturedImage.mimeType);
    }
  }, [capturedImage, analyze]);

  // Handler for generate button
  const handleGenerate = useCallback(() => {
    if (result) {
      // Don't pass screenshot - use placeholders instead of extracted images
      generate(result);
    }
  }, [result, generate]);

  // Handler for clearing image - also clears result and error via reset()
  const handleClearImage = useCallback(() => {
    clearImage();
    reset();
    resetGeneration();
  }, [clearImage, reset, resetGeneration]);

  // Handler for selecting an image from history
  const handleSelectFromHistory = useCallback((id: string) => {
    const selectedImage = selectImage(id);
    if (selectedImage) {
      // Mark that this image came from history so we don't re-add it
      isFromHistoryRef.current = true;

      // Clear any existing results before loading new image
      reset();
      resetGeneration();

      // Set the selected image as the current captured image
      setImage(selectedImage);
    }
  }, [selectImage, setImage, reset, resetGeneration]);

  // Handler for clearing history
  const handleClearHistory = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const pasteShortcut = isMac ? 'Cmd+V' : 'Ctrl+V';

  return (
    <div className="flex flex-col flex-1" role="region" aria-label="Image capture area">
      {/* Status announcements for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isLoading && `Analyzing image with ${providerName}`}
        {result && `Analysis complete. Found ${result.elements.length} elements.`}
        {displayError && `Error: ${displayError}`}
      </div>

      <DropZone
        dropZoneProps={dropZoneProps}
        isDragging={isDragging}
        hasError={!!(error || aiError)}
        hasWarning={!!warning}
        hasCapturedImage={!!capturedImage}
        pasteShortcut={pasteShortcut}
      >
        {capturedImage ? (
          // Preview state - show captured image
          <div className="space-y-4 w-full">
            <ImagePreview
              capturedImage={capturedImage}
              imageDimensions={imageDimensions}
              onClear={handleClearImage}
              clearDisabled={isLoading || isGenerating}
            />

            <div className="flex flex-col items-center gap-2" role="group" aria-label="Image actions">
              {/* Analysis controls (button and config warning) */}
              <AnalysisControls
                onAnalyze={handleAnalyze}
                isLoading={isLoading}
                isConfigured={isConfigured}
                providerType={providerType}
              />

              {/* Step-by-step analysis progress */}
              {isLoading && analysisProgress && (
                <AnalysisProgress
                  currentStep={analysisProgress.step}
                  providerName={providerName}
                  startTime={analysisProgress.startTime}
                  onCancel={cancel}
                  errorMessage={aiError}
                />
              )}
            </div>

            {/* Analysis results */}
            {result && (
              <div
                className="mt-4 p-4 bg-secondary rounded-lg text-left"
                role="region"
                aria-label="Analysis results"
              >
                <h3 className="text-sm font-medium mb-3">Analysis Result</h3>
                <AnalysisResult
                  result={result}
                  onClear={handleClearImage}
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  progress={progress}
                  generationResult={generationResult}
                  generationError={generationError}
                  providerName={providerName}
                />
              </div>
            )}
          </div>
        ) : (
          // Empty state - show drop instructions
          <DropZoneEmptyState isDragging={isDragging} pasteShortcut={pasteShortcut} />
        )}
      </DropZone>

      {/* Size warning dialog - shown below drop zone */}
      {warning && (
        <SizeWarningDialog
          warning={warning}
          onConfirm={confirmWarning}
          onCancel={cancelWarning}
        />
      )}

      {/* Error message with troubleshooting steps - shown below drop zone */}
      {displayError && (
        <div
          className="mt-3 live-region-update"
          role="alert"
          aria-live="assertive"
        >
          {aiErrorWithSteps ? (
            <ErrorDisplay
              error={aiErrorWithSteps}
              onRetry={capturedImage && !isLoading ? handleAnalyze : undefined}
              onDismiss={() => reset()}
              showSteps={true}
              compact={false}
            />
          ) : (
            <div className="flex items-center justify-center gap-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{displayError}</p>
              {capturedImage && !isLoading && (
                <button
                  onClick={handleAnalyze}
                  className="text-sm px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors focus-ring"
                  aria-label="Retry analysis"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image history - shown below drop zone when no image is captured */}
      {!capturedImage && history.length > 0 && (
        <div className="mt-4">
          <ImageHistory
            history={history}
            onSelectImage={handleSelectFromHistory}
            onClearHistory={handleClearHistory}
          />
        </div>
      )}
    </div>
  );
}
