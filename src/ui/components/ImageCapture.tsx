/**
 * ImageCapture component for screenshot and image input
 *
 * Provides a drop zone for:
 * - Clipboard paste (Cmd/Ctrl+V)
 * - Drag-and-drop image files
 *
 * Displays preview of captured images with clear functionality.
 * Integrates with Claude API for image analysis.
 */

import { useImageCapture } from '../hooks/useImageCapture';
import { useClaude } from '../hooks/useClaude';
import { useApiKey } from '../hooks/useApiKey';
import { AnalysisResult } from './AnalysisResult';

/**
 * Drop zone component for image capture with paste and drag-drop support
 */
export function ImageCapture() {
  const { capturedImage, isDragging, error, clearImage, dropZoneProps } =
    useImageCapture();
  const { apiKey } = useApiKey();
  const { analyze, isLoading, error: claudeError, result, reset } = useClaude(apiKey);

  // Combine errors from image validation and API
  const displayError = error || claudeError;

  // Handler for analyze button
  const handleAnalyze = () => {
    if (capturedImage) {
      analyze(capturedImage.uint8Array, capturedImage.mimeType);
    }
  };

  // Handler for clearing image - also clears result and error via reset()
  const handleClearImage = () => {
    clearImage();
    reset();
  };

  // Determine border color based on state
  const getBorderClass = () => {
    if (error || claudeError) return 'border-red-500';
    if (isDragging) return 'border-blue-500 bg-blue-50/50';
    return 'border-muted';
  };

  return (
    <div className="flex flex-col flex-1">
      <div
        {...dropZoneProps}
        className={`
          flex-1 flex flex-col items-center justify-center
          border-2 border-dashed rounded-lg p-8
          text-center transition-colors
          ${getBorderClass()}
        `}
      >
        {capturedImage ? (
          // Preview state - show captured image
          <div className="space-y-4 w-full">
            <img
              src={capturedImage.previewUrl}
              alt="Captured screenshot"
              className="max-w-full max-h-64 mx-auto rounded object-contain"
            />
            <div className="text-xs text-muted-foreground">
              {capturedImage.mimeType.split('/')[1].toUpperCase()} image
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleClearImage}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-3 py-1"
              >
                Clear image
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !apiKey}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${isLoading || !apiKey
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'}
                `}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Screenshot'}
              </button>
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                  <span>Analyzing with Claude...</span>
                </div>
              )}
              {!apiKey && (
                <p className="text-xs text-muted-foreground">
                  Configure API key in Settings to analyze
                </p>
              )}
            </div>
            {/* Analysis results */}
            {result && (
              <div className="mt-4 p-4 bg-secondary rounded-lg text-left">
                <h3 className="text-sm font-medium mb-3">Analysis Result</h3>
                <AnalysisResult result={result} onClear={handleClearImage} />
              </div>
            )}
          </div>
        ) : (
          // Empty state - show drop instructions
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-lg bg-secondary flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {isDragging
                  ? 'Drop image here'
                  : 'Paste screenshot (Cmd/Ctrl+V) or drag image here'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: PNG, JPG, WebP
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message - shown below drop zone */}
      {displayError && (
        <p className="text-red-600 text-sm mt-2 text-center">{displayError}</p>
      )}
    </div>
  );
}
