/**
 * SizeWarningDialog component for displaying large image warnings
 *
 * Shows a warning dialog when an image exceeds size or dimension thresholds.
 * Allows users to proceed anyway or cancel the operation.
 */

import type { ImageWarning } from '../../hooks/useImageCapture';

/**
 * Props for the SizeWarningDialog component
 */
export interface SizeWarningDialogProps {
  /** Warning state containing messages and pending blob */
  warning: ImageWarning;
  /** Callback to confirm proceeding despite warnings */
  onConfirm: () => void;
  /** Callback to cancel and dismiss the warning */
  onCancel: () => void;
}

/**
 * Warning dialog for large images
 * Displays warning messages and confirm/cancel actions
 */
export function SizeWarningDialog({
  warning,
  onConfirm,
  onCancel,
}: SizeWarningDialogProps) {
  return (
    <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            Large Image Warning
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 mb-3">
            {warning.messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors focus-ring"
            >
              Proceed Anyway
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-amber-900 text-amber-700 dark:text-amber-200 border border-amber-300 dark:border-amber-600 rounded-md hover:bg-amber-50 dark:hover:bg-amber-800 transition-colors focus-ring"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
