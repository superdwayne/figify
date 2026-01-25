/**
 * Custom hook for image capture via clipboard paste and drag-drop
 *
 * Provides unified image capture from both:
 * - Clipboard paste (Cmd/Ctrl+V anywhere in document)
 * - Drag-drop onto a designated drop zone
 *
 * Returns both a Blob (for preview) and Uint8Array (for message passing).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isValidImageType, getImageValidationError } from '../utils/imageUtils';

/**
 * Represents a captured image with all necessary formats for display and transfer
 */
export interface CapturedImage {
  /** Original blob for reference */
  blob: Blob;
  /** Binary data for Figma postMessage (Uint8Array is transferable) */
  uint8Array: Uint8Array;
  /** Object URL for preview display - must be revoked on cleanup */
  previewUrl: string;
  /** MIME type of the captured image */
  mimeType: string;
}

/**
 * Return type for useImageCapture hook
 */
export interface UseImageCaptureReturn {
  /** The captured image data, or null if no image captured */
  capturedImage: CapturedImage | null;
  /** True when user is dragging over the drop zone */
  isDragging: boolean;
  /** Validation error message, or null if no error */
  error: string | null;
  /** Clear the captured image and reset state */
  clearImage: () => void;
  /** Props to spread onto the drop zone element */
  dropZoneProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

/**
 * Hook for capturing images via paste and drag-drop
 *
 * @example
 * ```tsx
 * function ImageCapture() {
 *   const { capturedImage, isDragging, error, clearImage, dropZoneProps } = useImageCapture();
 *
 *   return (
 *     <div {...dropZoneProps} className={isDragging ? 'dragging' : ''}>
 *       {capturedImage ? (
 *         <img src={capturedImage.previewUrl} alt="Captured" />
 *       ) : (
 *         <p>Paste or drop an image</p>
 *       )}
 *       {error && <p className="error">{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useImageCapture(): UseImageCaptureReturn {
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current preview URL for cleanup in processImage
  // Using ref to avoid stale closure issues in callbacks
  const previewUrlRef = useRef<string | null>(null);

  /**
   * Process a blob into a CapturedImage
   * Validates the image, converts to Uint8Array, and creates preview URL
   */
  const processImage = useCallback(async (blob: Blob) => {
    // Validate image type
    if (!isValidImageType(blob)) {
      setError(getImageValidationError(blob));
      return;
    }

    // Clean up previous preview URL to prevent memory leak
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    // Clear any previous error
    setError(null);

    // Convert blob to Uint8Array for message passing
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Create preview URL for display
    const previewUrl = URL.createObjectURL(blob);
    previewUrlRef.current = previewUrl;

    setCapturedImage({
      blob,
      uint8Array,
      previewUrl,
      mimeType: blob.type,
    });
  }, []);

  /**
   * Paste event handler - listens on document for global capture
   */
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            await processImage(blob);
          }
          return; // Only process first image
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processImage]);

  /**
   * Window-level drag prevention
   * CRITICAL: Prevents browser from opening dropped files
   */
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  /**
   * Cleanup preview URL on unmount
   */
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  /**
   * Clear the captured image and reset state
   */
  const clearImage = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCapturedImage(null);
    setError(null);
  }, []);

  /**
   * Props to spread onto the drop zone element
   * Handles dragover, dragleave, and drop events
   */
  const dropZoneProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((f) => f.type.startsWith('image/'));
      if (imageFile) {
        await processImage(imageFile);
      }
    },
  };

  return {
    capturedImage,
    isDragging,
    error,
    clearImage,
    dropZoneProps,
  };
}
