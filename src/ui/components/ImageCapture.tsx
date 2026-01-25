/**
 * ImageCapture component for screenshot and image input
 *
 * Provides a drop zone for:
 * - Clipboard paste (Cmd/Ctrl+V)
 * - Drag-and-drop image files
 *
 * Displays preview of captured images with clear functionality.
 */

import { useImageCapture } from '../hooks/useImageCapture';

/**
 * Drop zone component for image capture with paste and drag-drop support
 */
export function ImageCapture() {
  const { capturedImage, isDragging, error, clearImage, dropZoneProps } =
    useImageCapture();

  // Determine border color based on state
  const getBorderClass = () => {
    if (error) return 'border-red-500';
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
            <button
              onClick={clearImage}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-3 py-1"
            >
              Clear image
            </button>
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
      {error && (
        <p className="text-red-600 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
