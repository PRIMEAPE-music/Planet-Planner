import type { Bounds } from './canvas.types';

/**
 * Layer blend modes matching Pixi.js blend modes
 */
export type BlendMode =
  | 'normal'
  | 'add'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

/**
 * Layer types for different content categories
 */
export type LayerType =
  | 'terrain'      // Base terrain/landmass
  | 'biome'        // Biome overlays
  | 'elevation'    // Height map data
  | 'water'        // Oceans, lakes, rivers
  | 'feature'      // Mountains, forests
  | 'icon'         // Cities, POIs
  | 'path'         // Roads, borders
  | 'label'        // Text annotations
  | 'effect'       // Visual effects (fog, etc.)
  | 'reference';   // Reference images

/**
 * Base layer interface
 */
export interface Layer {
  /** Unique layer identifier */
  id: string;
  /** Display name */
  name: string;
  /** Layer type */
  type: LayerType;
  /** Is layer visible */
  visible: boolean;
  /** Is layer locked (non-editable) */
  locked: boolean;
  /** Layer opacity (0-1) */
  opacity: number;
  /** Blend mode */
  blendMode: BlendMode;
  /** Layer order (higher = on top) */
  order: number;
  /** Parent layer ID for grouping (null = root) */
  parentId: string | null;
  /** Is this a group layer */
  isGroup: boolean;
  /** Is group expanded in layer panel */
  isExpanded: boolean;
  /** Layer bounds in world coordinates */
  bounds: Bounds | null;
  /** Layer-specific metadata */
  metadata: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/**
 * Layer group (contains other layers)
 */
export interface LayerGroup extends Layer {
  isGroup: true;
  /** Child layer IDs */
  childIds: string[];
}

/**
 * Layer manager state
 */
export interface LayerState {
  /** All layers indexed by ID */
  layers: Record<string, Layer>;
  /** Root layer order (top-level layer IDs in order) */
  rootOrder: string[];
  /** Currently selected layer IDs */
  selectedIds: string[];
  /** Currently active layer ID (for drawing) */
  activeId: string | null;
}

/**
 * Layer creation options
 */
export interface CreateLayerOptions {
  name?: string;
  type: LayerType;
  parentId?: string | null;
  visible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
  metadata?: Record<string, unknown>;
}
