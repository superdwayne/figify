import { describe, it, expect } from 'vitest';
import { mockFigma } from './mocks/figma';
import { createMockElement, createMockAnalysisResponse } from './utils/testHelpers';

describe('Test Infrastructure', () => {
  it('should have Vitest working', () => {
    expect(true).toBe(true);
  });

  it('should have Figma mock available', () => {
    expect(mockFigma).toBeDefined();
    expect(mockFigma.createFrame).toBeDefined();
    expect(mockFigma.ui.postMessage).toBeDefined();
  });

  it('should create mock frames', () => {
    const frame = mockFigma.createFrame();
    expect(frame.type).toBe('FRAME');
    expect(frame.id).toContain('mock-FRAME');
  });

  it('should create mock elements with test helpers', () => {
    const element = createMockElement({ type: 'input', name: 'Email Input' });
    expect(element.type).toBe('input');
    expect(element.name).toBe('Email Input');
  });

  it('should create mock analysis response', () => {
    const response = createMockAnalysisResponse();
    expect(response.elements).toHaveLength(1);
    expect(response.viewport).toEqual({ width: 1920, height: 1080 });
  });
});
