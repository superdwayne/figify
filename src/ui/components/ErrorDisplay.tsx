/**
 * ErrorDisplay component for showing errors with actionable troubleshooting steps
 *
 * Provides a consistent error display across the app with:
 * - Clear error message
 * - Numbered troubleshooting steps
 * - Visual category indicators
 * - Retry button for recoverable errors
 */

import type { ErrorWithSteps, ErrorCategory } from '../utils/errorMessages';
import { isRecoverableError, getSuggestedAction } from '../utils/errorMessages';

/**
 * Icon components for error categories
 */
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

/**
 * Get the appropriate icon for an error category
 */
function ErrorIcon({ category, className }: { category: ErrorCategory; className?: string }) {
  switch (category) {
    case 'api_key':
      return <KeyIcon className={className} />;
    case 'rate_limit':
    case 'timeout':
      return <ClockIcon className={className} />;
    case 'network':
    case 'connection':
      return <WifiOffIcon className={className} />;
    case 'server':
      return <ServerIcon className={className} />;
    case 'model':
      return <CpuIcon className={className} />;
    case 'image':
      return <ImageIcon className={className} />;
    default:
      return <AlertCircleIcon className={className} />;
  }
}

/**
 * Props for ErrorDisplay component
 */
interface ErrorDisplayProps {
  /** The structured error with message and steps */
  error: ErrorWithSteps;
  /** Optional callback for retry button */
  onRetry?: () => void;
  /** Optional callback for dismiss button */
  onDismiss?: () => void;
  /** Whether to show troubleshooting steps expanded */
  showSteps?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * Full error display with troubleshooting steps
 */
export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showSteps = true,
  compact = false,
}: ErrorDisplayProps) {
  const canRetry = isRecoverableError(error);
  const suggestedAction = getSuggestedAction(error);

  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <ErrorIcon category={error.category} className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-700 font-medium">{error.message}</p>
          <p className="text-xs text-red-600 mt-1">{suggestedAction}</p>
        </div>
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      {/* Header with icon and message */}
      <div className="flex items-start gap-3">
        <ErrorIcon category={error.category} className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-red-700 font-semibold">{error.message}</h4>

          {/* Troubleshooting steps */}
          {showSteps && error.steps.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                Troubleshooting
              </p>
              <ol className="space-y-1.5">
                {error.steps.map((step, index) => (
                  <li key={index} className="flex gap-2 text-sm text-red-700">
                    <span className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs font-medium text-red-600">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 rounded-md transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple inline error message (one line)
 */
export function InlineError({ message, suggestion }: { message: string; suggestion?: string }) {
  return (
    <div className="flex items-center gap-2 text-red-600">
      <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">
        {message}
        {suggestion && <span className="text-red-500"> - {suggestion}</span>}
      </span>
    </div>
  );
}

/**
 * Ollama setup guide component
 */
export function OllamaSetupGuide() {
  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-start gap-3">
        <CpuIcon className="w-6 h-6 text-purple-600 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-purple-700 font-semibold">Set up Ollama for Local AI</h4>
          <p className="text-sm text-purple-600 mt-1">
            Run AI models locally on your machine - free and private.
          </p>

          <div className="mt-4">
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-2">
              Setup Steps
            </p>
            <ol className="space-y-2">
              <li className="flex gap-2 text-sm text-purple-700">
                <span className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-600">
                  1
                </span>
                <span>
                  Download Ollama from{' '}
                  <a
                    href="https://ollama.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 underline hover:text-purple-800"
                  >
                    ollama.ai
                  </a>
                </span>
              </li>
              <li className="flex gap-2 text-sm text-purple-700">
                <span className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-600">
                  2
                </span>
                <span>Install and launch the Ollama application</span>
              </li>
              <li className="flex gap-2 text-sm text-purple-700">
                <span className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-600">
                  3
                </span>
                <span>
                  Open Terminal and run:{' '}
                  <code className="bg-purple-100 px-1.5 py-0.5 rounded text-xs font-mono">
                    ollama pull llava
                  </code>
                </span>
              </li>
              <li className="flex gap-2 text-sm text-purple-700">
                <span className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-600">
                  4
                </span>
                <span>Wait for the vision model to download (1-4 GB)</span>
              </li>
              <li className="flex gap-2 text-sm text-purple-700">
                <span className="flex-shrink-0 w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center text-xs font-medium text-purple-600">
                  5
                </span>
                <span>Return here and click "Test Connection"</span>
              </li>
            </ol>
          </div>

          <div className="mt-4 p-2 bg-purple-100 rounded text-xs text-purple-700">
            <strong>Tip:</strong> Ollama runs in the background. Look for the Ollama icon in your
            menu bar (macOS) or system tray (Windows/Linux) to confirm it's running.
          </div>
        </div>
      </div>
    </div>
  );
}
