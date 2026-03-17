/**
 * AnalysisControls component for analyze button and related UI
 *
 * Displays the analyze button and configuration status.
 * Note: Loading state with AnalysisProgress is handled separately in parent.
 */

import type { AIProviderType } from '../../services/ai';

/**
 * Props for the AnalysisControls component
 */
export interface AnalysisControlsProps {
  /** Handler for analyze button click */
  onAnalyze: () => void;
  /** Whether analysis is in progress */
  isLoading: boolean;
  /** Whether the AI provider is configured */
  isConfigured: boolean;
  /** Current AI provider type */
  providerType: AIProviderType;
}

/**
 * Displays the analyze button with configuration warnings
 * Note: When isLoading is true, the button is hidden (parent shows AnalysisProgress instead)
 */
export function AnalysisControls({
  onAnalyze,
  isLoading,
  isConfigured,
  providerType,
}: AnalysisControlsProps) {
  // Don't render analyze button while loading (parent shows AnalysisProgress)
  if (isLoading) {
    return null;
  }

  return (
    <>
      <button
        onClick={onAnalyze}
        disabled={!isConfigured}
        aria-describedby={!isConfigured ? 'config-hint' : undefined}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors focus-ring
          ${!isConfigured
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'}
        `}
      >
        Analyze Screenshot
      </button>

      {!isConfigured && (
        <ConfigurationWarning providerType={providerType} />
      )}
    </>
  );
}

/**
 * Props for the ConfigurationWarning component
 */
interface ConfigurationWarningProps {
  /** Current AI provider type */
  providerType: AIProviderType;
}

/**
 * Warning message when AI provider is not configured
 */
function ConfigurationWarning({ providerType }: ConfigurationWarningProps) {
  const message = providerType === 'ollama'
    ? 'Configure Ollama in Settings to analyze'
    : 'Configure API key in Settings to analyze';

  return (
    <p id="config-hint" className="text-xs text-muted-foreground">
      {message}
    </p>
  );
}
