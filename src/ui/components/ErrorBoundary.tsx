import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error callback for external logging
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className="flex flex-col items-center justify-center p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle
              className="w-5 h-5 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Something went wrong
            </h2>
          </div>

          <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>

          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-md transition-colors focus-ring"
            aria-label="Try again - reset the error state and reload the component"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
