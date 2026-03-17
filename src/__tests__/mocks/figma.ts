import { vi } from 'vitest';

// Mock Figma Plugin API
const mockFigma = {
  // UI messaging
  ui: {
    postMessage: vi.fn(),
    onmessage: null as ((message: unknown) => void) | null,
    show: vi.fn(),
    hide: vi.fn(),
    resize: vi.fn(),
    close: vi.fn(),
  },

  // Client storage
  clientStorage: {
    getAsync: vi.fn().mockResolvedValue(undefined),
    setAsync: vi.fn().mockResolvedValue(undefined),
    deleteAsync: vi.fn().mockResolvedValue(undefined),
    keysAsync: vi.fn().mockResolvedValue([]),
  },

  // Document and page
  currentPage: {
    selection: [] as unknown[],
    children: [] as unknown[],
    appendChild: vi.fn(),
    findAll: vi.fn().mockReturnValue([]),
    findOne: vi.fn().mockReturnValue(null),
  },

  // Node creation
  createFrame: vi.fn(() => createMockNode('FRAME')),
  createRectangle: vi.fn(() => createMockNode('RECTANGLE')),
  createEllipse: vi.fn(() => createMockNode('ELLIPSE')),
  createText: vi.fn(() => createMockNode('TEXT')),
  createComponent: vi.fn(() => createMockNode('COMPONENT')),
  createComponentSet: vi.fn(() => createMockNode('COMPONENT_SET')),
  createLine: vi.fn(() => createMockNode('LINE')),
  createVector: vi.fn(() => createMockNode('VECTOR')),
  createBooleanOperation: vi.fn(() => createMockNode('BOOLEAN_OPERATION')),
  createImage: vi.fn((data: Uint8Array) => ({ hash: 'mock-hash-' + data.length })),

  // Utilities
  loadFontAsync: vi.fn().mockResolvedValue(undefined),
  getLocalPaintStyles: vi.fn().mockReturnValue([]),
  getLocalTextStyles: vi.fn().mockReturnValue([]),
  getLocalEffectStyles: vi.fn().mockReturnValue([]),
  getLocalGridStyles: vi.fn().mockReturnValue([]),

  // Viewport
  viewport: {
    center: { x: 0, y: 0 },
    zoom: 1,
    scrollAndZoomIntoView: vi.fn(),
  },

  // Notifications
  notify: vi.fn(),
  closePlugin: vi.fn(),

  // Mixed value
  mixed: Symbol('MIXED'),

  // Root
  root: {
    children: [] as unknown[],
  },
};

// Helper to create mock nodes
function createMockNode(type: string) {
  const node: Record<string, unknown> = {
    id: `mock-${type}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    name: '',
    visible: true,
    locked: false,
    parent: null,
    removed: false,

    // Geometry
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,

    // Layout
    layoutMode: 'NONE',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'MIN',
    layoutGrow: 0,
    layoutAlign: 'INHERIT',
    itemSpacing: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,

    // Style
    fills: [],
    strokes: [],
    strokeWeight: 1,
    strokeAlign: 'INSIDE',
    cornerRadius: 0,
    opacity: 1,
    blendMode: 'NORMAL',
    effects: [],

    // Constraints
    constraints: { horizontal: 'MIN', vertical: 'MIN' },

    // Children (for frames)
    children: [] as unknown[],

    // Methods
    appendChild: vi.fn(function(this: { children: unknown[] }, child: unknown) {
      this.children.push(child);
      return child;
    }),
    insertChild: vi.fn(function(this: { children: unknown[] }, index: number, child: unknown) {
      this.children.splice(index, 0, child);
      return child;
    }),
    remove: vi.fn(function(this: { removed: boolean }) {
      this.removed = true;
    }),
    resize: vi.fn(function(this: { width: number; height: number }, w: number, h: number) {
      this.width = w;
      this.height = h;
    }),
    clone: vi.fn(function(this: Record<string, unknown>) {
      return { ...this, id: `clone-${this.id}` };
    }),
    setRelaunchData: vi.fn(),
    getRelaunchData: vi.fn().mockReturnValue({}),
  };

  // Text-specific properties
  if (type === 'TEXT') {
    Object.assign(node, {
      characters: '',
      fontSize: 14,
      fontName: { family: 'Inter', style: 'Regular' },
      textAlignHorizontal: 'LEFT',
      textAlignVertical: 'TOP',
      textAutoResize: 'WIDTH_AND_HEIGHT',
      lineHeight: { unit: 'AUTO' },
      letterSpacing: { unit: 'PERCENT', value: 0 },
      textCase: 'ORIGINAL',
      textDecoration: 'NONE',
      deleteCharacters: vi.fn(),
      insertCharacters: vi.fn(),
    });
  }

  return node;
}

// Expose globally
(globalThis as unknown as { figma: typeof mockFigma }).figma = mockFigma;

// Export for direct imports in tests
export { mockFigma, createMockNode };

// Reset helper for use between tests
export function resetFigmaMock() {
  vi.clearAllMocks();
  mockFigma.currentPage.selection = [];
  mockFigma.currentPage.children = [];
}
