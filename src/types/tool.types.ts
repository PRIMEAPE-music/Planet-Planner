import type { Vector2, InputState } from './canvas.types';

/**
 * Available tool types
 */
export type ToolType =
  | 'select'       // Selection tool
  | 'pan'          // Hand/pan tool
  | 'brush'        // Freehand brush
  | 'eraser'       // Eraser
  | 'shape'        // Shape drawing (rect, ellipse, polygon)
  | 'path'         // Path/spline tool
  | 'fill'         // Flood fill
  | 'stamp'        // Icon/stamp placement
  | 'text'         // Text tool
  | 'eyedropper';  // Color picker

/**
 * Shape subtypes for shape tool
 */
export type ShapeType = 'rectangle' | 'ellipse' | 'polygon' | 'freeform';

/**
 * Base tool options
 */
export interface BaseToolOptions {
  /** Tool size/radius in pixels */
  size: number;
  /** Tool opacity (0-1) */
  opacity: number;
  /** Primary color (hex) */
  primaryColor: string;
  /** Secondary color (hex) */
  secondaryColor: string;
}

/**
 * Brush tool specific options
 */
export interface BrushToolOptions extends BaseToolOptions {
  /** Brush hardness (0-1, 0 = soft, 1 = hard) */
  hardness: number;
  /** Brush spacing as percentage of size */
  spacing: number;
  /** Enable pressure sensitivity */
  pressureSensitivity: boolean;
  /** Pressure affects size */
  pressureAffectsSize: boolean;
  /** Pressure affects opacity */
  pressureAffectsOpacity: boolean;
}

/**
 * Shape tool specific options
 */
export interface ShapeToolOptions extends BaseToolOptions {
  /** Shape type */
  shapeType: ShapeType;
  /** Fill the shape */
  fill: boolean;
  /** Stroke the shape */
  stroke: boolean;
  /** Stroke width */
  strokeWidth: number;
  /** Corner radius for rectangles */
  cornerRadius: number;
  /** Number of sides for polygon */
  polygonSides: number;
}

/**
 * Path tool specific options
 */
export interface PathToolOptions extends BaseToolOptions {
  /** Path stroke width */
  strokeWidth: number;
  /** Smooth path curves */
  smoothing: number;
  /** Close path automatically */
  closePath: boolean;
}

/**
 * Text tool specific options
 */
export interface TextToolOptions extends BaseToolOptions {
  /** Font family */
  fontFamily: string;
  /** Font size in pixels */
  fontSize: number;
  /** Font weight */
  fontWeight: number;
  /** Font style */
  fontStyle: 'normal' | 'italic';
  /** Text alignment */
  textAlign: 'left' | 'center' | 'right';
}

/**
 * Stamp tool specific options
 */
export interface StampToolOptions extends BaseToolOptions {
  /** Rotation in degrees */
  rotation: number;
  /** Scale factor */
  scale: number;
}

/**
 * Union of all tool options
 */
export type ToolOptions =
  | BrushToolOptions
  | ShapeToolOptions
  | PathToolOptions
  | TextToolOptions
  | StampToolOptions
  | BaseToolOptions;

/**
 * Tool state
 */
export interface ToolState {
  /** Currently active tool */
  activeTool: ToolType;
  /** Previous tool (for quick swap) */
  previousTool: ToolType;
  /** Tool-specific options */
  options: Record<ToolType, ToolOptions>;
  /** Is tool currently in use (drawing) */
  isActive: boolean;
}

/**
 * Tool event context passed to tool handlers
 */
export interface ToolEventContext {
  /** Input state */
  input: InputState;
  /** Start position of current stroke/action */
  startPosition: Vector2 | null;
  /** All positions in current stroke */
  strokePath: Vector2[];
  /** Active layer ID */
  activeLayerId: string | null;
}
