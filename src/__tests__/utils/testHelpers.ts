import { vi } from 'vitest';
import type { UIElement, UIAnalysisResponse } from '../../ui/types/analysis';

/**
 * Creates a mock UIElement for testing
 */
export function createMockElement(overrides: Partial<UIElement> = {}): UIElement {
  return {
    type: 'button',
    name: 'Test Button',
    bounds: { x: 0, y: 0, width: 100, height: 40 },
    styles: {
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      fontSize: 14,
      fontWeight: 500,
      borderRadius: 6,
    },
    content: 'Click me',
    ...overrides,
  };
}

/**
 * Creates a mock analysis response
 */
export function createMockAnalysisResponse(
  elements: UIElement[] = [createMockElement()],
  overrides: Partial<UIAnalysisResponse> = {}
): UIAnalysisResponse {
  return {
    elements,
    viewport: { width: 1920, height: 1080 },
    ...overrides,
  };
}

/**
 * Creates a mock JSON string from analysis response
 */
export function createMockAnalysisJSON(
  elements: UIElement[] = [createMockElement()],
  overrides: Partial<UIAnalysisResponse> = {}
): string {
  return JSON.stringify(createMockAnalysisResponse(elements, overrides));
}

/**
 * Creates mock analysis wrapped in markdown code blocks
 */
export function createMockMarkdownResponse(json: string): string {
  return `Here's the analysis:\n\n\`\`\`json\n${json}\n\`\`\`\n\nThat's the UI structure.`;
}

/**
 * Waits for all promises to resolve
 */
export async function flushPromises(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Creates a mock abort controller
 */
export function createMockAbortController() {
  const controller = new AbortController();
  return {
    controller,
    signal: controller.signal,
    abort: () => controller.abort(),
  };
}

/**
 * Creates mock image data
 */
export function createMockImageData(width = 100, height = 100): Uint8Array {
  // Create a simple mock PNG header
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;     // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    data[i + 3] = 255; // A
  }
  return data;
}

/**
 * Creates a mock blob
 */
export function createMockBlob(content = 'test', type = 'image/png'): Blob {
  return new Blob([content], { type });
}

/**
 * Mock timer utilities
 */
export const mockTimers = {
  useFakeTimers: () => vi.useFakeTimers(),
  useRealTimers: () => vi.useRealTimers(),
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  runAllTimers: () => vi.runAllTimers(),
};
