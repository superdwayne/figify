/**
 * Tests for useAI hook
 *
 * Tests AI provider integration with React state management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAI, type UseAIOptions } from '../../ui/hooks/useAI';

// Track mock instances for testing
let mockAnalyzeScreenshot: ReturnType<typeof vi.fn>;
let mockProviderInstances: Map<string, {
  type: string;
  name: string;
  isConfigured: () => boolean;
  analyzeScreenshot: ReturnType<typeof vi.fn>;
  describeImage: ReturnType<typeof vi.fn>;
}>;

// Helper to create a controllable mock provider
function createMockProvider(config: { type: string; apiKey?: string; baseUrl?: string }) {
  const isConfigured = config.type === 'anthropic' ? !!config.apiKey : true;
  const provider = {
    type: config.type,
    name: config.type === 'anthropic' ? 'Claude' : 'Ollama',
    isConfigured: () => isConfigured,
    analyzeScreenshot: mockAnalyzeScreenshot,
    describeImage: vi.fn().mockResolvedValue('Mock description'),
  };
  const key = `${config.type}-${config.apiKey || ''}-${config.baseUrl || ''}`;
  mockProviderInstances.set(key, provider);
  return provider;
}

// Mock the AI service module
vi.mock('../../ui/services/ai', () => ({
  createAIProvider: vi.fn((config) => createMockProvider(config)),
  getAIErrorMessage: vi.fn(() => 'An error occurred'),
  getAIErrorWithSteps: vi.fn((error) => {
    if (error instanceof Error && error.message) {
      return {
        message: error.message,
        steps: ['Try again'],
        category: 'unknown',
        recoverable: true,
      };
    }
    return null;
  }),
}));

// Mock the base64 utility
vi.mock('../../ui/utils/base64', () => ({
  uint8ArrayToBase64: vi.fn(() => 'base64encodeddata'),
}));

// Mock the error messages utility
vi.mock('../../ui/utils/errorMessages', () => ({
  getConfigurationError: vi.fn((type) => ({
    message: `${type} is not configured. Please add your API key.`,
    steps: ['Go to Settings', 'Enter your API key'],
    category: 'api_key',
    recoverable: false,
  })),
}));

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProviderInstances = new Map();
    // Default mock that resolves successfully
    mockAnalyzeScreenshot = vi.fn().mockResolvedValue({
      elements: [{ type: 'button', label: 'Test Button' }],
      viewport: { width: 1920, height: 1080 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should not be loading initially', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.error).toBeNull();
    });

    it('should have no result initially', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.result).toBeNull();
    });

    it('should have no errorWithSteps initially', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.errorWithSteps).toBeNull();
    });

    it('should have no progress initially', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.progress).toBeNull();
    });
  });

  describe('isConfigured', () => {
    it('should return false when API key is not provided for Anthropic', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: null })
      );

      expect(result.current.isConfigured).toBe(false);
    });

    it('should return true when API key is provided for Anthropic', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-api-key' })
      );

      expect(result.current.isConfigured).toBe(true);
    });

    it('should return true for Ollama without API key', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'ollama', baseUrl: 'http://localhost:11434' })
      );

      expect(result.current.isConfigured).toBe(true);
    });
  });

  describe('provider info', () => {
    it('should return correct provider type', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.providerType).toBe('anthropic');
    });

    it('should return provider name', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.providerName).toBeDefined();
      expect(typeof result.current.providerName).toBe('string');
    });
  });

  describe('cancel', () => {
    it('should be safe to call when no request is pending', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Should not throw
      expect(() => {
        act(() => {
          result.current.cancel();
        });
      }).not.toThrow();
    });

    it('should abort any in-flight request when analyze is running', async () => {
      let resolveAnalysis: (value: unknown) => void;
      const analysisPromise = new Promise((resolve) => {
        resolveAnalysis = resolve;
      });
      mockAnalyzeScreenshot.mockReturnValue(analysisPromise);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Start analysis
      act(() => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
      });

      expect(result.current.isLoading).toBe(true);

      // Cancel the request
      act(() => {
        result.current.cancel();
      });

      // The abort should be triggered - resolve the promise to complete the flow
      await act(async () => {
        resolveAnalysis!({ elements: [], viewport: { width: 100, height: 100 } });
        await vi.runAllTimersAsync();
      });

      // After abort, state should be cleaned up
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear result state', async () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Simulate having a result (would normally come from analyze)
      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
    });

    it('should clear error state', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear errorWithSteps state', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.errorWithSteps).toBeNull();
    });

    it('should set isLoading to false', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should clear progress state', () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.progress).toBeNull();
    });

    it('should abort any pending request when analyze is running', async () => {
      let resolveAnalysis: (value: unknown) => void;
      const analysisPromise = new Promise((resolve) => {
        resolveAnalysis = resolve;
      });
      mockAnalyzeScreenshot.mockReturnValue(analysisPromise);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Start analysis
      act(() => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
      });

      expect(result.current.isLoading).toBe(true);

      // Reset while request is pending
      act(() => {
        result.current.reset();
      });

      // Should immediately clear loading state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBeNull();

      // Resolve to clean up
      await act(async () => {
        resolveAnalysis!({ elements: [], viewport: { width: 100, height: 100 } });
        await vi.runAllTimersAsync();
      });
    });
  });

  describe('analyze', () => {
    it('should set isLoading to true during analysis', async () => {
      // Create a deferred promise to control resolution timing
      let resolveAnalysis: (value: unknown) => void;
      const analysisPromise = new Promise((resolve) => {
        resolveAnalysis = resolve;
      });
      mockAnalyzeScreenshot.mockReturnValue(analysisPromise);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.isLoading).toBe(false);

      // Start analysis
      act(() => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
      });

      // isLoading should be true while waiting
      expect(result.current.isLoading).toBe(true);

      // Resolve and cleanup
      await act(async () => {
        resolveAnalysis!({ elements: [], viewport: { width: 100, height: 100 } });
        await vi.runAllTimersAsync();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should update progress through analysis steps', async () => {
      let resolveAnalysis: (value: unknown) => void;
      const analysisPromise = new Promise((resolve) => {
        resolveAnalysis = resolve;
      });
      mockAnalyzeScreenshot.mockReturnValue(analysisPromise);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.progress).toBeNull();

      // Start analysis - this synchronously sets progress to 'preparing' then
      // immediately converts base64 and moves to 'sending'
      await act(async () => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
        // Allow microtasks to process
        await Promise.resolve();
      });

      // After the synchronous part, progress should be at 'sending'
      // (preparing->sending happens synchronously in the hook)
      expect(result.current.progress).not.toBeNull();
      expect(result.current.progress?.step).toBe('sending');

      // After 500ms it should move to 'analyzing' via setTimeout
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(result.current.progress?.step).toBe('analyzing');

      // Resolve the analysis
      await act(async () => {
        resolveAnalysis!({ elements: [], viewport: { width: 100, height: 100 } });
        await Promise.resolve();
      });

      // Should be 'parsing' briefly
      expect(result.current.progress?.step).toBe('parsing');

      // After 300ms delay it completes
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(result.current.progress?.step).toBe('complete');
    });

    it('should set result on successful analysis', async () => {
      const mockResult = {
        elements: [{ type: 'button', label: 'Test Button' }],
        viewport: { width: 1920, height: 1080 },
      };
      mockAnalyzeScreenshot.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      expect(result.current.result).toBeNull();

      await act(async () => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
        await vi.runAllTimersAsync();
      });

      expect(result.current.result).toEqual(mockResult);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on failed analysis', async () => {
      // Use real timers for this test to avoid race conditions with setTimeout
      vi.useRealTimers();

      const testError = new Error('API request failed');
      mockAnalyzeScreenshot.mockRejectedValue(testError);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Start analysis and wait for it to complete
      await act(async () => {
        await result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
      });

      expect(result.current.error).toBe('API request failed');
      expect(result.current.errorWithSteps).not.toBeNull();
      expect(result.current.errorWithSteps?.message).toBe('API request failed');
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress?.step).toBe('error');

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should handle abort errors gracefully', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockAnalyzeScreenshot.mockRejectedValue(abortError);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      await act(async () => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
        await vi.runAllTimersAsync();
      });

      // Abort errors should not set error state
      expect(result.current.error).toBeNull();
      expect(result.current.errorWithSteps).toBeNull();
      expect(result.current.progress).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should cancel previous request when starting new one', async () => {
      let resolveFirst: (value: unknown) => void;
      let resolveSecond: (value: unknown) => void;

      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      mockAnalyzeScreenshot
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Start first analysis
      act(() => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
      });

      expect(result.current.isLoading).toBe(true);

      // Start second analysis (should cancel first)
      act(() => {
        result.current.analyze(new Uint8Array([4, 5, 6]), 'image/png');
      });

      // analyzeScreenshot should have been called twice
      expect(mockAnalyzeScreenshot).toHaveBeenCalledTimes(2);

      // Resolve second analysis
      await act(async () => {
        resolveSecond!({ elements: [{ type: 'text', label: 'Second' }], viewport: { width: 100, height: 100 } });
        await vi.runAllTimersAsync();
      });

      expect(result.current.result?.elements).toEqual([{ type: 'text', label: 'Second' }]);
    });

    it('should not analyze when provider is not configured', async () => {
      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: null })
      );

      expect(result.current.isConfigured).toBe(false);

      await act(async () => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
        await vi.runAllTimersAsync();
      });

      // Should set configuration error
      expect(result.current.error).toContain('not configured');
      expect(result.current.errorWithSteps).not.toBeNull();
      expect(mockAnalyzeScreenshot).not.toHaveBeenCalled();
    });
  });

  describe('provider switching', () => {
    it('should update providerName when provider type changes', () => {
      const { result, rerender } = renderHook(
        (props: UseAIOptions) => useAI(props),
        { initialProps: { type: 'anthropic' as const, apiKey: 'test-key' } }
      );

      expect(result.current.providerName).toBe('Claude');
      expect(result.current.providerType).toBe('anthropic');

      rerender({ type: 'ollama' as const, baseUrl: 'http://localhost:11434' });

      expect(result.current.providerName).toBe('Ollama');
      expect(result.current.providerType).toBe('ollama');
    });

    it('should handle changing from anthropic to ollama correctly', () => {
      const { result, rerender } = renderHook(
        (props: UseAIOptions) => useAI(props),
        { initialProps: { type: 'anthropic' as const, apiKey: 'test-key' } }
      );

      // Initially anthropic with API key is configured
      expect(result.current.isConfigured).toBe(true);
      expect(result.current.providerType).toBe('anthropic');

      // Switch to ollama
      rerender({ type: 'ollama' as const, baseUrl: 'http://localhost:11434' });

      // Ollama doesn't need an API key, should be configured
      expect(result.current.isConfigured).toBe(true);
      expect(result.current.providerType).toBe('ollama');
      expect(result.current.providerName).toBe('Ollama');
    });

    it('should update isConfigured when switching to unconfigured provider', () => {
      const { result, rerender } = renderHook(
        (props: UseAIOptions) => useAI(props),
        { initialProps: { type: 'anthropic' as const, apiKey: 'test-key' } }
      );

      expect(result.current.isConfigured).toBe(true);

      // Switch to anthropic without API key
      rerender({ type: 'anthropic' as const, apiKey: null });

      expect(result.current.isConfigured).toBe(false);
    });

    it('should handle provider creation failure gracefully', async () => {
      // Import and override mock temporarily
      const { createAIProvider } = vi.mocked(await import('../../ui/services/ai'));
      createAIProvider.mockImplementationOnce(() => {
        throw new Error('Provider creation failed');
      });

      const { result } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Should handle gracefully with isConfigured false
      expect(result.current.isConfigured).toBe(false);
      expect(result.current.providerName).toBe('Unknown');
    });
  });

  describe('cleanup', () => {
    it('should abort request on unmount', async () => {
      let resolveAnalysis: (value: unknown) => void;
      const analysisPromise = new Promise((resolve) => {
        resolveAnalysis = resolve;
      });
      mockAnalyzeScreenshot.mockReturnValue(analysisPromise);

      const { result, unmount } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Start analysis
      act(() => {
        result.current.analyze(new Uint8Array([1, 2, 3]), 'image/png');
      });

      expect(result.current.isLoading).toBe(true);

      // Unmount the hook - this should trigger cleanup and abort
      unmount();

      // Resolve the promise - this should not cause errors because request was aborted
      await act(async () => {
        resolveAnalysis!({ elements: [], viewport: { width: 100, height: 100 } });
        await vi.runAllTimersAsync();
      });

      // No errors should occur - the test passes if no React warnings about
      // updating unmounted components are thrown
    });

    it('should handle multiple rapid analyze calls without memory leaks', async () => {
      const promises: Array<{ resolve: (value: unknown) => void }> = [];

      mockAnalyzeScreenshot.mockImplementation(() => {
        return new Promise((resolve) => {
          promises.push({ resolve });
        });
      });

      const { result, unmount } = renderHook(() =>
        useAI({ type: 'anthropic', apiKey: 'test-key' })
      );

      // Fire multiple rapid analyze calls
      act(() => {
        result.current.analyze(new Uint8Array([1]), 'image/png');
        result.current.analyze(new Uint8Array([2]), 'image/png');
        result.current.analyze(new Uint8Array([3]), 'image/png');
      });

      // Only the last one should be active
      expect(result.current.isLoading).toBe(true);

      // Unmount
      unmount();

      // Resolve all promises
      await act(async () => {
        promises.forEach((p) => p.resolve({ elements: [], viewport: { width: 100, height: 100 } }));
        await vi.runAllTimersAsync();
      });

      // Test passes if no errors occur
    });
  });
});
