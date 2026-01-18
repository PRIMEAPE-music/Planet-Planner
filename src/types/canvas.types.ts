/**
 * 2D Vector representation
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Rectangle bounds
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Viewport state representing the visible area of the canvas
 */
export interface Viewport {
  /** Center position in world coordinates */
  center: Vector2;
  /** Current zoom level (1 = 100%) */
  zoom: number;
  /** Viewport bounds in world coordinates */
  bounds: Bounds;
}

/**
 * Camera configuration
 */
export interface CameraConfig {
  /** Minimum zoom level */
  minZoom: number;
  /** Maximum zoom level */
  maxZoom: number;
  /** Zoom speed multiplier */
  zoomSpeed: number;
  /** Enable smooth zoom animation */
  smoothZoom: boolean;
  /** Enable smooth pan animation */
  smoothPan: boolean;
  /** Damping factor for smooth movement (0-1) */
  damping: number;
}

/**
 * Grid configuration
 */
export interface GridConfig {
  /** Grid visibility */
  visible: boolean;
  /** Grid cell size in pixels */
  cellSize: number;
  /** Grid type */
  type: 'square' | 'hex';
  /** Snap to grid when placing elements */
  snapToGrid: boolean;
  /** Grid line color */
  color: string;
  /** Grid line opacity (0-1) */
  opacity: number;
  /** Show subdivision lines */
  showSubdivisions: boolean;
  /** Subdivision count per cell */
  subdivisions: number;
}

/**
 * Canvas state
 */
export interface CanvasState {
  /** Viewport configuration */
  viewport: Viewport;
  /** Grid configuration */
  grid: GridConfig;
  /** Canvas dimensions in pixels */
  dimensions: { width: number; height: number };
  /** Is the canvas currently being interacted with */
  isInteracting: boolean;
  /** Current interaction mode */
  interactionMode: 'none' | 'pan' | 'zoom' | 'draw';
}

/**
 * Mouse/touch input state
 */
export interface InputState {
  /** Current pointer position in screen coordinates */
  screenPosition: Vector2;
  /** Current pointer position in world coordinates */
  worldPosition: Vector2;
  /** Is primary button pressed */
  isPrimaryDown: boolean;
  /** Is secondary button pressed */
  isSecondaryDown: boolean;
  /** Is middle button pressed */
  isMiddleDown: boolean;
  /** Currently pressed modifier keys */
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  /** Pressure for stylus input (0-1) */
  pressure: number;
}

/**
 * Canvas engine events
 */
export interface CanvasEngineEvents {
  'viewport:change': Viewport;
  'grid:change': GridConfig;
  'input:pointerdown': InputState;
  'input:pointermove': InputState;
  'input:pointerup': InputState;
  'input:wheel': { delta: Vector2; position: Vector2 };
  'render:frame': { deltaTime: number };
}
