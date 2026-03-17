/**
 * Custom hook for image capture via clipboard paste and drag-drop
 *
 * Provides unified image capture from both:
 * - Clipboard paste (Cmd/Ctrl+V anywhere in document)
 * - Drag-drop onto a designated drop zone
 *
 * Returns both a Blob (for preview) and Uint8Array (for message passing).
 * Includes size validation with warnings and blocking for very large files.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isValidImageType,
  getImageValidationError,
  validateImageSize,
  type ImageValidationResult,
} from '../utils/imageUtils';

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
 * Warning state for size validation
 */
export interface ImageWarning {
  /** The pending blob to process if user confirms */
  blob: Blob;
  /** List of warning messages to display */
  messages: string[];
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
  /** Warning state for size validation, or null if no warning */
  warning: ImageWarning | null;
  /** Confirm proceeding despite warnings */
  confirmWarning: () => void;
  /** Cancel and dismiss warnings */
  cancelWarning: () => void;
  /** Clear the captured image and reset state */
  clearImage: () => void;
  /** Set a captured image directly (e.g., from history) */
  setImage: (image: CapturedImage) => void;
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
  const [warning, setWarning] = useState<ImageWarning | null>(null);

  // Track current preview URL for cleanup in processImage
  // Using ref to avoid stale closure issues in callbacks
  const previewUrlRef = useRef<string | null>(null);

  /**
   * Finalize processing a blob into a CapturedImage (after validation passed or warning confirmed)
   */
  const finalizeImage = useCallback(async (blob: Blob) => {
    // Clean up previous preview URL to prevent memory leak
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    // Clear any previous error/warning
    setError(null);
    setWarning(null);

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
   * Process a blob into a CapturedImage
   * Validates the image type and size, shows warnings or blocks if needed
   */
  const processImage = useCallback(async (blob: Blob) => {
    // Clear previous state
    setError(null);
    setWarning(null);

    // Validate image type first
    if (!isValidImageType(blob)) {
      setError(getImageValidationError(blob));
      return;
    }

    // Validate image size
    const sizeValidation: ImageValidationResult = await validateImageSize(blob);

    if (sizeValidation.status === 'blocked') {
      setError(sizeValidation.error);
      return;
    }

    if (sizeValidation.status === 'warning') {
      // Show warning dialog - don't process until confirmed
      setWarning({
        blob,
        messages: sizeValidation.warnings,
      });
      return;
    }

    // Valid - process immediately
    await finalizeImage(blob);
  }, [finalizeImage]);

  /**
   * Confirm proceeding despite warnings
   */
  const confirmWarning = useCallback(async () => {
    if (warning) {
      await finalizeImage(warning.blob);
    }
  }, [warning, finalizeImage]);

  /**
   * Cancel and dismiss warnings
   */
  const cancelWarning = useCallback(() => {
    setWarning(null);
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
    setWarning(null);
  }, []);

  /**
   * Set a captured image directly (e.g., from history selection)
   * The caller is responsible for providing a valid CapturedImage with a fresh previewUrl
   */
  const setImage = useCallback((image: CapturedImage) => {
    // Clean up previous preview URL to prevent memory leak
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    // Clear any previous error/warning
    setError(null);
    setWarning(null);

    // Update the ref to track the new preview URL
    previewUrlRef.current = image.previewUrl;

    setCapturedImage(image);
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
    warning,
    confirmWarning,
    cancelWarning,
    clearImage,
    setImage,
    dropZoneProps,
  };
}
