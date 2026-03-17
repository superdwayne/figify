/**
 * Custom hook for managing image history
 *
 * Provides functionality to:
 * - Store last 5 captured images in memory
 * - Track metadata (timestamp, dimensions, size) for each image
 * - Select previous images for re-analysis
 * - Clear history
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CapturedImage } from './useImageCapture';

/** Maximum number of images to keep in history */
const MAX_HISTORY_SIZE = 5;

/**
 * Metadata for a history image entry
 */
export interface ImageMetadata {
  /** Unique identifier for the history entry */
  id: string;
  /** Timestamp when the image was captured */
  timestamp: number;
  /** Image dimensions */
  dimensions: { width: number; height: number };
  /** File size in bytes */
  size: number;
  /** MIME type of the image */
  mimeType: string;
}

/**
 * A history entry containing the captured image and its metadata
 */
export interface ImageHistoryEntry {
  /** The captured image data */
  image: CapturedImage;
  /** Metadata about the image */
  metadata: ImageMetadata;
  /** Thumbnail URL for display (separate from main preview URL) */
  thumbnailUrl: string;
}

/**
 * Return type for useImageHistory hook
 */
export interface UseImageHistoryReturn {
  /** Array of history entries, most recent first */
  history: ImageHistoryEntry[];
  /** Add a new image to history */
  addImage: (image: CapturedImage, dimensions: { width: number; height: number }) => void;
  /** Select an image from history for re-analysis */
  selectImage: (id: string) => CapturedImage | null;
  /** Clear all history */
  clearHistory: () => void;
}

/**
 * Generate a unique ID for history entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing image capture history
 *
 * Keeps the last 5 captured images in memory with metadata,
 * allowing users to re-analyze previous images without re-capturing.
 *
 * @example
 * ```tsx
 * function ImageCapture() {
 *   const { history, addImage, selectImage, clearHistory } = useImageHistory();
 *
 *   const handleCapture = (image: CapturedImage, dims: { width: number; height: number }) => {
 *     addImage(image, dims);
 *   };
 *
 *   const handleSelectHistory = (id: string) => {
 *     const image = selectImage(id);
 *     if (image) {
 *       // Use image for re-analysis
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {history.map(entry => (
 *         <img
 *           key={entry.metadata.id}
 *           src={entry.thumbnailUrl}
 *           onClick={() => handleSelectHistory(entry.metadata.id)}
 *         />
 *       ))}
 *       <button onClick={clearHistory}>Clear History</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useImageHistory(): UseImageHistoryReturn {
  const [history, setHistory] = useState<ImageHistoryEntry[]>([]);

  // Track thumbnail URLs for cleanup
  const thumbnailUrlsRef = useRef<Set<string>>(new Set());

  /**
   * Cleanup thumbnail URLs on unmount
   */
  useEffect(() => {
    return () => {
      thumbnailUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      thumbnailUrlsRef.current.clear();
    };
  }, []);

  /**
   * Add a new image to history
   * Creates a separate thumbnail URL to avoid conflicts with the main preview
   */
  const addImage = useCallback(
    (image: CapturedImage, dimensions: { width: number; height: number }) => {
      // Create a new thumbnail URL for the history entry
      const thumbnailUrl = URL.createObjectURL(image.blob);
      thumbnailUrlsRef.current.add(thumbnailUrl);

      const entry: ImageHistoryEntry = {
        image,
        metadata: {
          id: generateId(),
          timestamp: Date.now(),
          dimensions,
          size: image.blob.size,
          mimeType: image.mimeType,
        },
        thumbnailUrl,
      };

      setHistory((prevHistory) => {
        // If adding would exceed max size, remove oldest and revoke its URL
        if (prevHistory.length >= MAX_HISTORY_SIZE) {
          const oldest = prevHistory[prevHistory.length - 1];
          URL.revokeObjectURL(oldest.thumbnailUrl);
          thumbnailUrlsRef.current.delete(oldest.thumbnailUrl);
        }

        // Add new entry at the beginning, limit to max size
        const newHistory = [entry, ...prevHistory].slice(0, MAX_HISTORY_SIZE);
        return newHistory;
      });
    },
    []
  );

  /**
   * Select an image from history for re-analysis
   * Returns the CapturedImage or null if not found
   */
  const selectImage = useCallback(
    (id: string): CapturedImage | null => {
      const entry = history.find((e) => e.metadata.id === id);
      if (!entry) return null;

      // Create a new preview URL for the selected image
      // The caller is responsible for managing this URL
      const newPreviewUrl = URL.createObjectURL(entry.image.blob);

      // Return a new CapturedImage with a fresh preview URL
      return {
        ...entry.image,
        previewUrl: newPreviewUrl,
      };
    },
    [history]
  );

  /**
   * Clear all history and revoke all thumbnail URLs
   */
  const clearHistory = useCallback(() => {
    // Revoke all thumbnail URLs
    history.forEach((entry) => {
      URL.revokeObjectURL(entry.thumbnailUrl);
    });
    thumbnailUrlsRef.current.clear();

    setHistory([]);
  }, [history]);

  return {
    history,
    addImage,
    selectImage,
    clearHistory,
  };
}
