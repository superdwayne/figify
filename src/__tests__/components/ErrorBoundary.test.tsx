/**
 * Tests for ErrorBoundary component
 *
 * Tests error catching, error UI rendering, reset functionality,
 * custom fallback support, and accessibility features.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../ui/components/ErrorBoundary';

// A component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe('when no error occurs', () => {
    it('renders children normally', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('does not show error UI', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('catches the error and displays error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows the error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('shows a Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls onError callback with error and errorInfo', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
      // Verify the error message
      expect(onError.mock.calls[0][0].message).toBe('Test error');
    });
  });

  describe('reset functionality', () => {
    it('clears error state when Try Again is clicked', () => {
      // Use a stateful wrapper to control when error is thrown
      let shouldThrow = true;
      const ControlledThrow = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Recovered successfully</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ControlledThrow />
        </ErrorBoundary>
      );

      // Error UI should be showing
      expect(screen.getByRole('alert')).toBeInTheDocument();

      // Stop throwing the error
      shouldThrow = false;

      // Click Try Again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Error UI should be gone, children should render
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('re-renders children after reset', () => {
      let shouldThrow = true;
      const ControlledThrow = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>Recovered successfully</div>;
      };

      render(
        <ErrorBoundary>
          <ControlledThrow />
        </ErrorBoundary>
      );

      // Error UI should be showing
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Recovered successfully')).not.toBeInTheDocument();

      // Stop throwing the error
      shouldThrow = false;

      // Click Try Again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Children should render
      expect(screen.getByText('Recovered successfully')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('does not render default error UI when custom fallback is provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has role="alert" on error container', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
    });

    it('has aria-live="assertive" for screen readers', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
