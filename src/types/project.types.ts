import type { LayerState } from './layer.types';
import type { GridConfig, Viewport } from './canvas.types';

/**
 * Project metadata
 */
export interface ProjectMetadata {
  /** Project unique identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description: string;
  /** Author name */
  author: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
  /** Project version (for migrations) */
  version: string;
  /** Project thumbnail (base64 or URL) */
  thumbnail: string | null;
  /** Project tags for organization */
  tags: string[];
}

/**
 * Canvas settings saved with project
 */
export interface ProjectCanvasSettings {
  /** Canvas width in world units */
  width: number;
  /** Canvas height in world units */
  height: number;
  /** Background color */
  backgroundColor: string;
  /** Grid configuration */
  grid: GridConfig;
  /** Default viewport */
  defaultViewport: Viewport;
}

/**
 * Style settings for the map
 */
export interface ProjectStyleSettings {
  /** Parchment effect intensity (0-1) */
  parchmentIntensity: number;
  /** Ink effect intensity (0-1) */
  inkIntensity: number;
  /** Overall saturation adjustment (-1 to 1) */
  saturation: number;
  /** Overall brightness adjustment (-1 to 1) */
  brightness: number;
  /** Vignette intensity (0-1) */
  vignetteIntensity: number;
  /** Paper aging effect (0-1) */
  agingEffect: number;
}

/**
 * Complete project state (for save/load)
 */
export interface Project {
  /** Project metadata */
  metadata: ProjectMetadata;
  /** Canvas settings */
  canvas: ProjectCanvasSettings;
  /** Style settings */
  style: ProjectStyleSettings;
  /** Layer state */
  layers: LayerState;
  /** Additional project data (tool presets, etc.) */
  data: Record<string, unknown>;
}

/**
 * Project state for the store
 */
export interface ProjectState {
  /** Current project */
  project: Project | null;
  /** Is project modified since last save */
  isDirty: boolean;
  /** Is project currently saving */
  isSaving: boolean;
  /** Is project currently loading */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
}
