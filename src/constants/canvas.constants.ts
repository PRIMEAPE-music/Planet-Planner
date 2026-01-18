import type { CameraConfig, GridConfig, Viewport } from '@/types';

/**
 * Default camera configuration
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minZoom: 0.1,
  maxZoom: 10,
  zoomSpeed: 0.001,
  smoothZoom: true,
  smoothPan: true,
  damping: 0.1,
};

/**
 * Default grid configuration
 */
export const DEFAULT_GRID_CONFIG: GridConfig = {
  visible: true,
  cellSize: 64,
  type: 'square',
  snapToGrid: false,
  color: '#4a4a4a',
  opacity: 0.3,
  showSubdivisions: true,
  subdivisions: 4,
};

/**
 * Default viewport
 */
export const DEFAULT_VIEWPORT: Viewport = {
  center: { x: 0, y: 0 },
  zoom: 1,
  bounds: { x: 0, y: 0, width: 0, height: 0 },
};

/**
 * Default canvas dimensions
 */
export const DEFAULT_CANVAS_DIMENSIONS = {
  width: 4096,
  height: 4096,
};

/**
 * Zoom level presets
 */
export const ZOOM_PRESETS = {
  fit: 'fit',
  '25%': 0.25,
  '50%': 0.5,
  '100%': 1,
  '200%': 2,
  '400%': 4,
} as const;

/**
 * Canvas rendering constants
 */
export const CANVAS_CONSTANTS = {
  /** Maximum canvas size in pixels */
  MAX_CANVAS_SIZE: 16384,
  /** Minimum canvas size in pixels */
  MIN_CANVAS_SIZE: 256,
  /** Default background color */
  DEFAULT_BACKGROUND_COLOR: '#1a1a2e',
  /** Checkerboard pattern size for transparency */
  CHECKERBOARD_SIZE: 16,
};
