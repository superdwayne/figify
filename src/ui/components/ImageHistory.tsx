/**
 * ImageHistory component for displaying recent image thumbnails
 *
 * Shows thumbnails of recently captured images with metadata.
 * Allows clicking to load an image for re-analysis.
 * Provides a "Clear History" button to remove all history.
 */

import type { ImageHistoryEntry } from '../hooks/useImageHistory';

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format timestamp as relative time (e.g., "2 min ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Props for the ImageHistory component
 */
export interface ImageHistoryProps {
  /** Array of history entries to display */
  history: ImageHistoryEntry[];
  /** Callback when an image is selected for re-analysis */
  onSelectImage: (id: string) => void;
  /** Callback to clear all history */
  onClearHistory: () => void;
}

/**
 * Displays recent image history as thumbnails
 *
 * @example
 * ```tsx
 * <ImageHistory
 *   history={history}
 *   onSelectImage={(id) => handleSelect(id)}
 *   onClearHistory={() => clearHistory()}
 * />
 * ```
 */
export function ImageHistory({
  history,
  onSelectImage,
  onClearHistory,
}: ImageHistoryProps) {
  // Don't render anything if no history
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">Recent Images</h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
          aria-label="Clear image history"
        >
          Clear History
        </button>
      </div>

      {/* Thumbnail grid */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {history.map((entry) => (
          <button
            key={entry.metadata.id}
            onClick={() => onSelectImage(entry.metadata.id)}
            className="flex-shrink-0 group relative rounded-md overflow-hidden border border-muted hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Load image from ${formatRelativeTime(entry.metadata.timestamp)}`}
            title={`${entry.metadata.dimensions.width}x${entry.metadata.dimensions.height} - ${formatFileSize(entry.metadata.size)}`}
          >
            {/* Thumbnail image */}
            <img
              src={entry.thumbnailUrl}
              alt={`History image from ${formatRelativeTime(entry.metadata.timestamp)}`}
              className="w-16 h-16 object-cover"
            />

            {/* Hover overlay with metadata */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
              <span className="text-[10px] text-white font-medium">
                {entry.metadata.dimensions.width}x{entry.metadata.dimensions.height}
              </span>
              <span className="text-[9px] text-white/80">
                {formatRelativeTime(entry.metadata.timestamp)}
              </span>
            </div>

            {/* Selection indicator */}
            <div className="absolute inset-0 border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity rounded-md pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
}
