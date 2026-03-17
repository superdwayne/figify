/**
 * AnalysisProgress component for displaying step-by-step analysis progress
 *
 * Shows progressive steps during image analysis:
 * - Preparing image...
 * - Sending to [Provider]...
 * - Analyzing UI elements...
 * - Parsing response...
 *
 * Features:
 * - Visual step indicators (completed, active, pending)
 * - Elapsed time display
 * - Cancellation support
 */

import { useEffect, useState } from 'react';

/**
 * Analysis step identifiers
 */
export type AnalysisStep =
  | 'preparing'
  | 'sending'
  | 'analyzing'
  | 'parsing'
  | 'complete'
  | 'error';

/**
 * Props for the AnalysisProgress component
 */
interface AnalysisProgressProps {
  /** Current active step */
  currentStep: AnalysisStep;
  /** AI provider name for display */
  providerName: string;
  /** Timestamp when analysis started */
  startTime: number;
  /** Callback to cancel the analysis */
  onCancel: () => void;
  /** Whether cancellation is in progress */
  isCancelling?: boolean;
  /** Error message if step is 'error' */
  errorMessage?: string | null;
}

/**
 * Step configuration for display
 */
interface StepConfig {
  id: AnalysisStep;
  label: string;
  getLabel?: (providerName: string) => string;
}

const STEPS: StepConfig[] = [
  { id: 'preparing', label: 'Preparing image...' },
  { id: 'sending', label: 'Sending to provider...', getLabel: (provider) => `Sending to ${provider}...` },
  { id: 'analyzing', label: 'Analyzing UI elements...' },
  { id: 'parsing', label: 'Parsing response...' },
];

/**
 * Get the index of a step in the progress sequence
 */
function getStepIndex(step: AnalysisStep): number {
  const index = STEPS.findIndex((s) => s.id === step);
  return index >= 0 ? index : STEPS.length;
}

/**
 * Format elapsed time in human-readable format
 */
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Displays step-by-step progress during image analysis
 */
export function AnalysisProgress({
  currentStep,
  providerName,
  startTime,
  onCancel,
  isCancelling = false,
  errorMessage = null,
}: AnalysisProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (currentStep === 'complete' || currentStep === 'error') {
      return;
    }

    const updateElapsed = () => {
      setElapsedTime(Date.now() - startTime);
    };

    // Initial update
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, currentStep]);

  const currentStepIndex = getStepIndex(currentStep);
  const isError = currentStep === 'error';

  return (
    <div className="w-full space-y-4 p-4 bg-secondary/50 rounded-lg border border-border">
      {/* Header with elapsed time */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {isError ? 'Analysis Failed' : 'Analyzing Screenshot'}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatElapsedTime(elapsedTime)}
        </span>
      </div>

      {/* Step indicators */}
      <div className="space-y-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex && !isError;
          const isPending = index > currentStepIndex;
          const isErrorStep = isError && index === currentStepIndex;

          const label = step.getLabel ? step.getLabel(providerName) : step.label;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 transition-opacity duration-200 ${
                isPending ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Step indicator icon */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  // Completed checkmark
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : isActive ? (
                  // Active spinner
                  <div className="w-5 h-5">
                    <svg
                      className="animate-spin w-5 h-5 text-primary"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
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
                  </div>
                ) : isErrorStep ? (
                  // Error icon
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                ) : (
                  // Pending circle
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Step label */}
              <span
                className={`text-sm ${
                  isActive
                    ? 'text-foreground font-medium'
                    : isCompleted
                    ? 'text-muted-foreground'
                    : isErrorStep
                    ? 'text-red-600 font-medium'
                    : 'text-muted-foreground/60'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {isError && errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {errorMessage}
        </div>
      )}

      {/* Cancel button */}
      {!isError && currentStep !== 'complete' && (
        <button
          onClick={onCancel}
          disabled={isCancelling}
          className={`
            w-full mt-2 px-3 py-1.5 text-sm rounded-md transition-colors
            border border-border
            ${isCancelling
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'}
          `}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

/**
 * Export step type for use in hooks
 */
export type { AnalysisStep as AnalysisProgressStep };
