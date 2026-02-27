import type { Vector2 } from '@/types';

/**
 * Feature tool types
 */
export type FeatureToolType =
  | 'mountain-stamp'
  | 'mountain-path'
  | 'forest-brush'
  | 'river-spline'
  | 'lake-shape'
  | 'feature-eraser'
  | 'feature-select';

/**
 * Mountain stamp tool settings
 */
export interface MountainStampSettings {
  /** Peak elevation (0-1) */
  elevation: number;
  /** Peak radius */
  radius: number;
  /** Peak sharpness (0 = rounded, 1 = sharp) */
  sharpness: number;
  /** Add snow cap */
  snowCap: boolean;
  /** Randomize slightly on each stamp */
  randomize: boolean;
  /** Randomization amount */
  randomAmount: number;
}

/**
 * Mountain path tool settings
 */
export interface MountainPathSettings {
  /** Range width */
  width: number;
  /** Peak elevation range */
  elevationRange: { min: number; max: number };
  /** Peaks per 100 units of path */
  peakDensity: number;
  /** Roughness/jaggedness */
  roughness: number;
  /** Smooth path */
  smoothPath: boolean;
}

/**
 * Forest brush tool settings
 */
export interface ForestBrushSettings {
  /** Brush radius */
  radius: number;
  /** Tree density (0-1) */
  density: number;
  /** Forest type */
  forestType: 'deciduous' | 'coniferous' | 'tropical' | 'mixed' | 'auto';
  /** Variation in tree placement */
  variation: number;
  /** Soft brush edges */
  softEdge: boolean;
  /** Edge falloff */
  edgeFalloff: number;
}

/**
 * River spline tool settings
 */
export interface RiverSplineSettings {
  /** Starting width */
  startWidth: number;
  /** Ending width */
  endWidth: number;
  /** Smooth spline */
  smooth: boolean;
  /** Smoothing tension */
  tension: number;
  /** Add tributaries automatically */
  autoTributaries: boolean;
  /** Erode terrain under river */
  erode: boolean;
  /** Erosion depth */
  erosionDepth: number;
}

/**
 * Lake shape tool settings
 */
export interface LakeShapeSettings {
  /** Lake type */
  type: 'freeform' | 'ellipse' | 'rectangle';
  /** Smooth edges */
  smoothEdges: boolean;
  /** Edge noise */
  edgeNoise: number;
  /** Lake depth */
  depth: number;
  /** Add waves pattern (parchment style) */
  wavePattern: boolean;
}

/**
 * Feature eraser tool settings
 */
export interface FeatureEraserSettings {
  /** Eraser radius */
  radius: number;
  /** What to erase */
  targets: {
    mountains: boolean;
    rivers: boolean;
    lakes: boolean;
    forests: boolean;
  };
  /** Soft erase (gradual removal) */
  soft: boolean;
}

/**
 * Feature selection state
 */
export interface FeatureSelection {
  /** Selected feature type */
  type: 'mountain' | 'river' | 'lake' | 'forest' | null;
  /** Selected feature ID */
  id: string | null;
  /** Selection bounds */
  bounds: { x: number; y: number; width: number; height: number } | null;
  /** Transform handles */
  handles: Vector2[];
}

/**
 * Spline point for river/path tools
 */
export interface SplinePoint {
  /** Position */
  position: Vector2;
  /** Control point 1 (for bezier) */
  control1?: Vector2;
  /** Control point 2 (for bezier) */
  control2?: Vector2;
  /** Width at this point */
  width?: number;
  /** Is this a corner (sharp) or smooth point */
  isCorner?: boolean;
}

/**
 * Active spline being edited
 */
export interface ActiveSpline {
  /** Spline points */
  points: SplinePoint[];
  /** Is closed (loop) */
  closed: boolean;
  /** Currently selected point index */
  selectedPoint: number | null;
  /** Currently dragging control handle */
  draggingHandle: 'control1' | 'control2' | null;
}

/**
 * Feature edit operation for undo/redo
 */
export interface FeatureEditOperation {
  /** Operation type */
  type: 'add' | 'remove' | 'modify' | 'transform';
  /** Feature type */
  featureType: 'mountain' | 'river' | 'lake' | 'forest';
  /** Feature ID */
  featureId: string;
  /** Previous state (for undo) */
  previousState: any;
  /** New state (for redo) */
  newState: any;
  /** Timestamp */
  timestamp: number;
}

/**
 * Feature tool context
 */
export interface FeatureToolContext {
  /** Current tool settings */
  settings: any;
  /** Active spline (for spline tools) */
  activeSpline: ActiveSpline | null;
  /** Current selection */
  selection: FeatureSelection;
  /** Preview graphics */
  previewVisible: boolean;
}
