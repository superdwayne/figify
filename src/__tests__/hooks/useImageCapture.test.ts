/**
 * Tests for useImageCapture hook
 *
 * Tests image capture functionality via clipboard paste and drag-drop.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageCapture, type CapturedImage } from '../../ui/hooks/useImageCapture';
import {
  isValidImageType,
  getImageValidationError,
  validateImageSize,
} from '../../ui/utils/imageUtils';

// Mock the imageUtils module
vi.mock('../../ui/utils/imageUtils', () => ({
  isValidImageType: vi.fn(() => true),
  getImageValidationError: vi.fn(() => 'Invalid image type'),
  validateImageSize: vi.fn(() => Promise.resolve({ status: 'valid' })),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

// Helper to create mock DragEvent
function createMockDragEvent(type: string, files: File[] = []): React.DragEvent {
  const dataTransfer = {
    files,
    dropEffect: 'none' as DataTransferDropEffect,
    effectAllowed: 'all' as DataTransferEffectAllowed,
    items: [],
    types: [],
    clearData: vi.fn(),
    getData: vi.fn(),
    setData: vi.fn(),
    setDragImage: vi.fn(),
  };

  return {
    type,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    dataTransfer,
    nativeEvent: new Event(type),
  } as unknown as React.DragEvent;
}

// Helper to create a mock image file with arrayBuffer method
function createMockImageFile(type: string = 'image/png', name: string = 'test.png', size: number = 1024): File {
  const content = new Uint8Array(size).fill(97); // 'a' = 97
  const file = new File([content], name, { type });

  // Mock arrayBuffer since jsdom/happy-dom may not fully support it
  file.arrayBuffer = vi.fn().mockResolvedValue(content.buffer);

  return file;
}

describe('useImageCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup URL mocks
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
    // Reset mocks to default behavior
    vi.mocked(isValidImageType).mockReturnValue(true);
    vi.mocked(getImageValidationError).mockReturnValue('Invalid image type');
    vi.mocked(validateImageSize).mockResolvedValue({ status: 'valid', warnings: [], error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('should have no captured image initially', () => {
      const { result } = renderHook(() => useImageCapture());

      expect(result.current.capturedImage).toBeNull();
    });

    it('should not be dragging initially', () => {
      const { result } = renderHook(() => useImageCapture());

      expect(result.current.isDragging).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useImageCapture());

      expect(result.current.error).toBeNull();
    });

    it('should have no warning initially', () => {
      const { result } = renderHook(() => useImageCapture());

      expect(result.current.warning).toBeNull();
    });

    it('should provide dropZoneProps', () => {
      const { result } = renderHook(() => useImageCapture());

      expect(result.current.dropZoneProps).toBeDefined();
      expect(typeof result.current.dropZoneProps.onDragOver).toBe('function');
      expect(typeof result.current.dropZoneProps.onDragLeave).toBe('function');
      expect(typeof result.current.dropZoneProps.onDrop).toBe('function');
    });
  });

  describe('clearImage', () => {
    it('should reset capturedImage to null', () => {
      const { result } = renderHook(() => useImageCapture());

      // Set up an image first
      const mockImage: CapturedImage = {
        blob: new Blob(['test'], { type: 'image/png' }),
        uint8Array: new Uint8Array([1, 2, 3]),
        previewUrl: 'blob:mock-url',
        mimeType: 'image/png',
      };

      act(() => {
        result.current.setImage(mockImage);
      });

      expect(result.current.capturedImage).not.toBeNull();

      // Clear the image
      act(() => {
        result.current.clearImage();
      });

      expect(result.current.capturedImage).toBeNull();
    });

    it('should clear error state', () => {
      const { result } = renderHook(() => useImageCapture());

      // Manually verify the clear behavior
      act(() => {
        result.current.clearImage();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear warning state', () => {
      const { result } = renderHook(() => useImageCapture());

      act(() => {
        result.current.clearImage();
      });

      expect(result.current.warning).toBeNull();
    });

    it('should revoke the preview URL to prevent memory leaks', () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { result } = renderHook(() => useImageCapture());

      const mockImage: CapturedImage = {
        blob: new Blob(['test'], { type: 'image/png' }),
        uint8Array: new Uint8Array([1, 2, 3]),
        previewUrl: 'blob:test-url',
        mimeType: 'image/png',
      };

      act(() => {
        result.current.setImage(mockImage);
      });

      act(() => {
        result.current.clearImage();
      });

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');
    });
  });

  describe('setImage', () => {
    it('should update capturedImage with the provided image', () => {
      const { result } = renderHook(() => useImageCapture());

      const mockImage: CapturedImage = {
        blob: new Blob(['test'], { type: 'image/png' }),
        uint8Array: new Uint8Array([1, 2, 3]),
        previewUrl: 'blob:mock-url',
        mimeType: 'image/png',
      };

      act(() => {
        result.current.setImage(mockImage);
      });

      expect(result.current.capturedImage).toEqual(mockImage);
    });

    it('should clear any existing error when setting an image', () => {
      const { result } = renderHook(() => useImageCapture());

      const mockImage: CapturedImage = {
        blob: new Blob(['test'], { type: 'image/png' }),
        uint8Array: new Uint8Array([1, 2, 3]),
        previewUrl: 'blob:mock-url',
        mimeType: 'image/png',
      };

      act(() => {
        result.current.setImage(mockImage);
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear any existing warning when setting an image', () => {
      const { result } = renderHook(() => useImageCapture());

      const mockImage: CapturedImage = {
        blob: new Blob(['test'], { type: 'image/png' }),
        uint8Array: new Uint8Array([1, 2, 3]),
        previewUrl: 'blob:mock-url',
        mimeType: 'image/png',
      };

      act(() => {
        result.current.setImage(mockImage);
      });

      expect(result.current.warning).toBeNull();
    });

    it('should revoke previous preview URL when setting a new image', () => {
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
      const { result } = renderHook(() => useImageCapture());

      const firstImage: CapturedImage = {
        blob: new Blob(['test1'], { type: 'image/png' }),
        uint8Array: new Uint8Array([1, 2, 3]),
        previewUrl: 'blob:first-url',
        mimeType: 'image/png',
      };

      const secondImage: CapturedImage = {
        blob: new Blob(['test2'], { type: 'image/png' }),
        uint8Array: new Uint8Array([4, 5, 6]),
        previewUrl: 'blob:second-url',
        mimeType: 'image/png',
      };

      act(() => {
        result.current.setImage(firstImage);
      });

      act(() => {
        result.current.setImage(secondImage);
      });

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:first-url');
    });
  });

  describe('drag and drop handlers', () => {
    describe('onDragOver', () => {
      it('should set isDragging to true on dragOver', () => {
        const { result } = renderHook(() => useImageCapture());
        const event = createMockDragEvent('dragover');

        expect(result.current.isDragging).toBe(false);

        act(() => {
          result.current.dropZoneProps.onDragOver(event);
        });

        expect(result.current.isDragging).toBe(true);
      });

      it('should prevent default behavior on dragOver', () => {
        const { result } = renderHook(() => useImageCapture());
        const event = createMockDragEvent('dragover');

        act(() => {
          result.current.dropZoneProps.onDragOver(event);
        });

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
      });

      it('should set dropEffect to copy on dragOver', () => {
        const { result } = renderHook(() => useImageCapture());
        const event = createMockDragEvent('dragover');

        act(() => {
          result.current.dropZoneProps.onDragOver(event);
        });

        expect(event.dataTransfer.dropEffect).toBe('copy');
      });
    });

    describe('onDragLeave', () => {
      it('should set isDragging to false on dragLeave', () => {
        const { result } = renderHook(() => useImageCapture());
        const dragOverEvent = createMockDragEvent('dragover');
        const dragLeaveEvent = createMockDragEvent('dragleave');

        // First set isDragging to true
        act(() => {
          result.current.dropZoneProps.onDragOver(dragOverEvent);
        });

        expect(result.current.isDragging).toBe(true);

        // Then trigger dragLeave
        act(() => {
          result.current.dropZoneProps.onDragLeave(dragLeaveEvent);
        });

        expect(result.current.isDragging).toBe(false);
      });

      it('should prevent default behavior on dragLeave', () => {
        const { result } = renderHook(() => useImageCapture());
        const event = createMockDragEvent('dragleave');

        act(() => {
          result.current.dropZoneProps.onDragLeave(event);
        });

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
      });
    });

    describe('onDrop', () => {
      it('should process dropped image files', async () => {
        const { result } = renderHook(() => useImageCapture());
        const imageFile = createMockImageFile('image/png', 'test.png');
        const event = createMockDragEvent('drop', [imageFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(isValidImageType).toHaveBeenCalledWith(imageFile);
        expect(validateImageSize).toHaveBeenCalledWith(imageFile);
      });

      it('should set isDragging to false on drop', async () => {
        const { result } = renderHook(() => useImageCapture());
        const dragOverEvent = createMockDragEvent('dragover');
        const imageFile = createMockImageFile('image/png', 'test.png');
        const dropEvent = createMockDragEvent('drop', [imageFile]);

        // First set isDragging to true
        act(() => {
          result.current.dropZoneProps.onDragOver(dragOverEvent);
        });

        expect(result.current.isDragging).toBe(true);

        // Then trigger drop
        await act(async () => {
          await result.current.dropZoneProps.onDrop(dropEvent);
        });

        expect(result.current.isDragging).toBe(false);
      });

      it('should set capturedImage after processing valid dropped file', async () => {
        const { result } = renderHook(() => useImageCapture());
        const imageFile = createMockImageFile('image/png', 'test.png');
        const event = createMockDragEvent('drop', [imageFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.capturedImage).not.toBeNull();
        expect(result.current.capturedImage?.mimeType).toBe('image/png');
        expect(result.current.capturedImage?.previewUrl).toBe('blob:mock-url');
      });

      it('should ignore non-image files on drop', async () => {
        const { result } = renderHook(() => useImageCapture());
        const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
        const event = createMockDragEvent('drop', [textFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        // Should not process non-image files
        expect(isValidImageType).not.toHaveBeenCalled();
        expect(result.current.capturedImage).toBeNull();
      });

      it('should process only the first image file when multiple files are dropped', async () => {
        const { result } = renderHook(() => useImageCapture());
        const imageFile1 = createMockImageFile('image/png', 'test1.png');
        const imageFile2 = createMockImageFile('image/jpeg', 'test2.jpg');
        const event = createMockDragEvent('drop', [imageFile1, imageFile2]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        // Should process first image only
        expect(isValidImageType).toHaveBeenCalledTimes(1);
        expect(isValidImageType).toHaveBeenCalledWith(imageFile1);
      });

      it('should find and process image file even when mixed with non-image files', async () => {
        const { result } = renderHook(() => useImageCapture());
        const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
        const imageFile = createMockImageFile('image/png', 'test.png');
        const event = createMockDragEvent('drop', [textFile, imageFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(isValidImageType).toHaveBeenCalledWith(imageFile);
        expect(result.current.capturedImage).not.toBeNull();
      });
    });
  });

  describe('file validation', () => {
    describe('invalid file types', () => {
      it('should set error for invalid file types', async () => {
        vi.mocked(isValidImageType).mockReturnValue(false);
        vi.mocked(getImageValidationError).mockReturnValue('Invalid format: application/pdf. Supported: PNG, JPG, WebP');

        const { result } = renderHook(() => useImageCapture());
        const pdfFile = new File(['fake pdf'], 'document.pdf', { type: 'application/pdf' });
        const event = createMockDragEvent('drop', [pdfFile]);

        // The onDrop handler checks if file.type.startsWith('image/') before processing
        // So we need an image-like type that fails validation
        const fakeImageFile = new File(['fake'], 'test.svg', { type: 'image/svg+xml' });
        const svgEvent = createMockDragEvent('drop', [fakeImageFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(svgEvent);
        });

        expect(isValidImageType).toHaveBeenCalledWith(fakeImageFile);
        expect(result.current.error).toBe('Invalid format: application/pdf. Supported: PNG, JPG, WebP');
        expect(result.current.capturedImage).toBeNull();
      });

      it('should not set capturedImage when file type is invalid', async () => {
        vi.mocked(isValidImageType).mockReturnValue(false);
        vi.mocked(getImageValidationError).mockReturnValue('Invalid image type');

        const { result } = renderHook(() => useImageCapture());
        const invalidFile = new File(['fake'], 'test.bmp', { type: 'image/bmp' });
        const event = createMockDragEvent('drop', [invalidFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.capturedImage).toBeNull();
        expect(result.current.error).not.toBeNull();
      });
    });

    describe('valid image types', () => {
      it('should accept PNG images', async () => {
        vi.mocked(isValidImageType).mockReturnValue(true);

        const { result } = renderHook(() => useImageCapture());
        const pngFile = createMockImageFile('image/png', 'test.png');
        const event = createMockDragEvent('drop', [pngFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.capturedImage).not.toBeNull();
        expect(result.current.capturedImage?.mimeType).toBe('image/png');
      });

      it('should accept JPEG images', async () => {
        vi.mocked(isValidImageType).mockReturnValue(true);

        const { result } = renderHook(() => useImageCapture());
        const jpegFile = createMockImageFile('image/jpeg', 'test.jpg');
        const event = createMockDragEvent('drop', [jpegFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.capturedImage).not.toBeNull();
        expect(result.current.capturedImage?.mimeType).toBe('image/jpeg');
      });

      it('should accept WebP images', async () => {
        vi.mocked(isValidImageType).mockReturnValue(true);

        const { result } = renderHook(() => useImageCapture());
        const webpFile = createMockImageFile('image/webp', 'test.webp');
        const event = createMockDragEvent('drop', [webpFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.capturedImage).not.toBeNull();
        expect(result.current.capturedImage?.mimeType).toBe('image/webp');
      });

      it('should accept GIF images (via mime type check)', async () => {
        // Note: GIF is technically not in VALID_MIME_TYPES in imageUtils,
        // but this test verifies the hook's behavior when isValidImageType returns true
        vi.mocked(isValidImageType).mockReturnValue(true);

        const { result } = renderHook(() => useImageCapture());
        const gifFile = createMockImageFile('image/gif', 'test.gif');
        const event = createMockDragEvent('drop', [gifFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.error).toBeNull();
        expect(result.current.capturedImage).not.toBeNull();
        expect(result.current.capturedImage?.mimeType).toBe('image/gif');
      });
    });

    describe('size validation', () => {
      it('should set error when image is blocked due to size', async () => {
        vi.mocked(isValidImageType).mockReturnValue(true);
        vi.mocked(validateImageSize).mockResolvedValue({
          status: 'blocked',
          warnings: [],
          error: 'Image is too large (25.0 MB). Maximum allowed size is 20.0 MB.',
        });

        const { result } = renderHook(() => useImageCapture());
        const largeFile = createMockImageFile('image/png', 'large.png', 25 * 1024 * 1024);
        const event = createMockDragEvent('drop', [largeFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.error).toBe('Image is too large (25.0 MB). Maximum allowed size is 20.0 MB.');
        expect(result.current.capturedImage).toBeNull();
      });

      it('should set warning for large images that are not blocked', async () => {
        vi.mocked(isValidImageType).mockReturnValue(true);
        vi.mocked(validateImageSize).mockResolvedValue({
          status: 'warning',
          warnings: ['Large file size (6.0 MB). This may slow down analysis.'],
          error: null,
        });

        const { result } = renderHook(() => useImageCapture());
        const mediumLargeFile = createMockImageFile('image/png', 'medium.png', 6 * 1024 * 1024);
        const event = createMockDragEvent('drop', [mediumLargeFile]);

        await act(async () => {
          await result.current.dropZoneProps.onDrop(event);
        });

        expect(result.current.warning).not.toBeNull();
        expect(result.current.warning?.messages).toContain('Large file size (6.0 MB). This may slow down analysis.');
        expect(result.current.capturedImage).toBeNull(); // Not yet processed, waiting for confirmation
      });
    });
  });

  describe('paste handling', () => {
    it.todo('should process pasted images from clipboard');

    it.todo('should ignore paste events without images');
  });

  describe('warning handling', () => {
    it.todo('should show warning for large images');

    it.todo('should process image when warning is confirmed');

    it.todo('should clear warning when cancelled');
  });

  describe('cleanup', () => {
    it.todo('should revoke preview URL on unmount');

    it.todo('should remove paste event listener on unmount');
  });
});
