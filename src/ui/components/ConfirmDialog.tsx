/**
 * Reusable confirmation dialog component
 *
 * Provides a modal dialog for confirming user actions with
 * customizable title, message, and action buttons.
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog component props
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog message/description */
  message: string;
  /** Optional warning text shown with an icon */
  warning?: string;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Variant for the confirm button styling */
  confirmVariant?: 'default' | 'destructive';
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Callback when user cancels or closes */
  onCancel: () => void;
}

/**
 * A reusable confirmation dialog with backdrop and keyboard support
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  warning,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the confirm button when dialog opens
    confirmButtonRef.current?.focus();

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  const confirmButtonClasses =
    confirmVariant === 'destructive'
      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      : 'bg-primary text-primary-foreground hover:bg-primary/90';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        ref={dialogRef}
        className="bg-background border rounded-lg shadow-lg w-full max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-secondary rounded transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p id="confirm-dialog-description" className="text-sm text-muted-foreground">
            {message}
          </p>

          {warning && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{warning}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${confirmButtonClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
