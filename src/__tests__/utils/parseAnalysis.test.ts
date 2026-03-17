/**
 * Tests for parseAnalysis utilities
 *
 * Tests JSON parsing and validation of Claude's UI analysis responses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseAnalysisResponse,
  validateElement,
  AnalysisParseError,
} from '../../ui/utils/parseAnalysis';
import type { UIAnalysisResponse } from '../../ui/types/analysis';

// Suppress console.log/warn/error during tests
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('parseAnalysisResponse', () => {
  describe('valid JSON parsing', () => {
    it('should parse valid JSON and return UIAnalysisResponse', () => {
      const validResponse = JSON.stringify({
        elements: [
          {
            id: 'element-1',
            component: 'Button',
            bounds: { x: 0, y: 0, width: 100, height: 40 },
            styles: { backgroundColor: '#3b82f6' },
          },
        ],
        viewport: { width: 1920, height: 1080 },
      });

      const result = parseAnalysisResponse(validResponse);

      expect(result).toBeDefined();
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].id).toBe('element-1');
      expect(result.elements[0].component).toBe('Button');
      expect(result.viewport.width).toBe(1920);
      expect(result.viewport.height).toBe(1080);
    });

    it('should parse JSON wrapped in markdown code fences', () => {
      const wrappedResponse = '```json\n' + JSON.stringify({
        elements: [
          {
            id: 'element-1',
            component: 'Card',
            bounds: { x: 10, y: 20, width: 200, height: 150 },
            styles: {},
          },
        ],
        viewport: { width: 800, height: 600 },
      }) + '\n```';

      const result = parseAnalysisResponse(wrappedResponse);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0].component).toBe('Card');
    });

    it('should use default viewport when not provided', () => {
      const responseWithoutViewport = JSON.stringify({
        elements: [
          {
            id: 'element-1',
            component: 'Input',
            bounds: { x: 0, y: 0, width: 200, height: 40 },
            styles: {},
          },
        ],
      });

      const result = parseAnalysisResponse(responseWithoutViewport);

      expect(result.viewport.width).toBe(1920);
      expect(result.viewport.height).toBe(1080);
    });

    it('should filter out invalid elements and keep valid ones', () => {
      const mixedResponse = JSON.stringify({
        elements: [
          {
            id: 'valid-element',
            component: 'Button',
            bounds: { x: 0, y: 0, width: 100, height: 40 },
            styles: {},
          },
          {
            // Missing id - invalid
            component: 'Card',
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
          {
            id: 'another-valid',
            component: 'Badge',
            bounds: { x: 10, y: 10, width: 50, height: 20 },
            styles: {},
          },
        ],
        viewport: { width: 1920, height: 1080 },
      });

      const result = parseAnalysisResponse(mixedResponse);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0].id).toBe('valid-element');
      expect(result.elements[1].id).toBe('another-valid');
    });

    it('should handle multiple element types', () => {
      const multiElementResponse = JSON.stringify({
        elements: [
          {
            id: 'btn-1',
            component: 'Button',
            variant: 'default',
            bounds: { x: 0, y: 0, width: 100, height: 40 },
            styles: { backgroundColor: '#3b82f6' },
            content: 'Click me',
          },
          {
            id: 'card-1',
            component: 'Card',
            bounds: { x: 0, y: 50, width: 300, height: 200 },
            styles: { borderRadius: 8 },
            children: ['btn-1'],
          },
        ],
        viewport: { width: 1920, height: 1080 },
      });

      const result = parseAnalysisResponse(multiElementResponse);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0].content).toBe('Click me');
      expect(result.elements[1].children).toEqual(['btn-1']);
    });
  });

  describe('invalid JSON handling', () => {
    it('should throw AnalysisParseError for invalid JSON syntax', () => {
      const invalidJson = '{ "elements": [ incomplete';

      expect(() => parseAnalysisResponse(invalidJson)).toThrow(AnalysisParseError);
    });

    it('should throw AnalysisParseError when response is not an object', () => {
      const arrayResponse = '["not", "an", "object"]';

      expect(() => parseAnalysisResponse(arrayResponse)).toThrow(AnalysisParseError);
    });

    it('should throw AnalysisParseError when elements array is missing', () => {
      const noElements = JSON.stringify({
        viewport: { width: 1920, height: 1080 },
      });

      expect(() => parseAnalysisResponse(noElements)).toThrow(AnalysisParseError);
    });

    it('should throw AnalysisParseError when all elements are invalid', () => {
      const allInvalid = JSON.stringify({
        elements: [
          { component: 'Button' }, // Missing id and bounds
          { id: 'test' }, // Missing component and bounds
        ],
        viewport: { width: 1920, height: 1080 },
      });

      expect(() => parseAnalysisResponse(allInvalid)).toThrow(AnalysisParseError);
    });

    it('should include raw response in error for debugging', () => {
      const invalidResponse = 'not json at all';

      try {
        parseAnalysisResponse(invalidResponse);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AnalysisParseError);
        expect((error as AnalysisParseError).rawResponse).toBe(invalidResponse);
      }
    });
  });

  describe('empty string handling', () => {
    it('should throw AnalysisParseError for empty string', () => {
      expect(() => parseAnalysisResponse('')).toThrow(AnalysisParseError);
    });

    it('should throw AnalysisParseError for whitespace-only string', () => {
      expect(() => parseAnalysisResponse('   \n\t  ')).toThrow(AnalysisParseError);
    });
  });

  describe('edge cases', () => {
    it.todo('should handle truncated JSON responses gracefully');

    it.todo('should handle responses with preamble text before JSON');

    it.todo('should handle conversational responses from Claude');
  });
});

describe('validateElement', () => {
  it('should return valid UIElement for complete element', () => {
    const element = {
      id: 'test-1',
      component: 'Button',
      bounds: { x: 0, y: 0, width: 100, height: 40 },
      styles: { backgroundColor: '#000' },
    };

    const result = validateElement(element);

    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-1');
    expect(result?.component).toBe('Button');
  });

  it('should return null for element without id', () => {
    const element = {
      component: 'Button',
      bounds: { x: 0, y: 0, width: 100, height: 40 },
    };

    const result = validateElement(element);

    expect(result).toBeNull();
  });

  it('should return null for element with unknown component type', () => {
    const element = {
      id: 'test-1',
      component: 'UnknownComponent',
      bounds: { x: 0, y: 0, width: 100, height: 40 },
    };

    const result = validateElement(element);

    expect(result).toBeNull();
  });

  it('should return null for element without bounds', () => {
    const element = {
      id: 'test-1',
      component: 'Button',
    };

    const result = validateElement(element);

    expect(result).toBeNull();
  });

  it('should return null for element with invalid bounds values', () => {
    const element = {
      id: 'test-1',
      component: 'Button',
      bounds: { x: 'not a number', y: 0, width: 100, height: 40 },
    };

    const result = validateElement(element);

    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    const result = validateElement(null);

    expect(result).toBeNull();
  });

  it('should return null for non-object input', () => {
    const result = validateElement('not an object');

    expect(result).toBeNull();
  });

  it('should include optional fields when present', () => {
    const element = {
      id: 'test-1',
      component: 'Button',
      variant: 'outline',
      size: 'lg',
      bounds: { x: 0, y: 0, width: 100, height: 40 },
      styles: { backgroundColor: '#000' },
      content: 'Click me',
      children: ['child-1', 'child-2'],
    };

    const result = validateElement(element);

    expect(result).not.toBeNull();
    expect(result?.variant).toBe('outline');
    expect(result?.size).toBe('lg');
    expect(result?.content).toBe('Click me');
    expect(result?.children).toEqual(['child-1', 'child-2']);
  });

  it('should filter non-string children from children array', () => {
    const element = {
      id: 'test-1',
      component: 'Card',
      bounds: { x: 0, y: 0, width: 200, height: 150 },
      styles: {},
      children: ['valid-child', 123, 'another-valid', null],
    };

    const result = validateElement(element);

    expect(result).not.toBeNull();
    expect(result?.children).toEqual(['valid-child', 'another-valid']);
  });
});

describe('AnalysisParseError', () => {
  it('should have correct name', () => {
    const error = new AnalysisParseError('Test message', 'raw response');

    expect(error.name).toBe('AnalysisParseError');
  });

  it('should store raw response', () => {
    const rawResponse = '{"invalid": json}';
    const error = new AnalysisParseError('Parse failed', rawResponse);

    expect(error.rawResponse).toBe(rawResponse);
  });

  it('should store cause when provided', () => {
    const cause = new SyntaxError('Unexpected token');
    const error = new AnalysisParseError('Parse failed', 'raw', cause);

    expect(error.cause).toBe(cause);
  });

  it('should be an instance of Error', () => {
    const error = new AnalysisParseError('Test', 'raw');

    expect(error).toBeInstanceOf(Error);
  });
});
