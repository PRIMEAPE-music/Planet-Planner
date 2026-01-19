import type { Vector2 } from '@/types';

/**
 * Biome type identifiers
 */
export type BiomeType =
  | 'ocean'
  | 'shallowWater'
  | 'beach'
  | 'grassland'
  | 'forest'
  | 'denseForest'
  | 'desert'
  | 'savanna'
  | 'tundra'
  | 'snow'
  | 'mountain'
  | 'highMountain'
  | 'swamp'
  | 'volcanic'
  | 'coral'
  | 'jungle';

/**
 * Biome definition with visual properties
 */
export interface BiomeDefinition {
  /** Unique identifier */
  id: BiomeType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Realistic color palette */
  realisticColors: BiomeColorPalette;
  /** Parchment/map color palette */
  parchmentColors: BiomeColorPalette;
  /** Elevation range (0-1) where this biome occurs */
  elevationRange: { min: number; max: number };
  /** Moisture range (0-1) where this biome occurs */
  moistureRange: { min: number; max: number };
  /** Temperature range (0-1) where this biome occurs */
  temperatureRange: { min: number; max: number };
  /** Texture settings */
  texture: BiomeTextureSettings;
  /** Is this a water biome */
  isWater: boolean;
  /** Transition priority (higher = this biome shows on top in transitions) */
  transitionPriority: number;
}

/**
 * Color palette for a biome
 */
export interface BiomeColorPalette {
  /** Base/primary color */
  base: string;
  /** Darker variation */
  dark: string;
  /** Lighter variation */
  light: string;
  /** Accent color for details */
  accent: string;
  /** Shadow color */
  shadow: string;
  /** Highlight color */
  highlight: string;
}

/**
 * Texture generation settings for a biome
 */
export interface BiomeTextureSettings {
  /** Noise scale for base texture */
  noiseScale: number;
  /** Number of noise octaves */
  octaves: number;
  /** Texture detail level (0-1) */
  detail: number;
  /** Pattern type */
  pattern: 'noise' | 'stipple' | 'crosshatch' | 'waves' | 'none';
  /** Pattern density */
  patternDensity: number;
  /** Enable terrain features (grass tufts, rocks, etc.) */
  features: boolean;
}

/**
 * Terrain cell data
 */
export interface TerrainCell {
  /** Position in grid */
  position: Vector2;
  /** Elevation (0-1, 0 = deepest ocean, 1 = highest peak) */
  elevation: number;
  /** Moisture level (0-1) */
  moisture: number;
  /** Temperature (0-1, 0 = coldest, 1 = hottest) */
  temperature: number;
  /** Assigned biome */
  biome: BiomeType;
  /** Is this cell land (above water level) */
  isLand: boolean;
  /** Distance to nearest coastline (negative = water, positive = land) */
  coastDistance: number;
  /** Normal vector for hillshading */
  normal: Vector2;
}

/**
 * Terrain map configuration
 */
export interface TerrainMapConfig {
  /** Map width in cells */
  width: number;
  /** Map height in cells */
  height: number;
  /** Cell size in pixels */
  cellSize: number;
  /** Sea level (0-1 elevation threshold) */
  seaLevel: number;
  /** Global seed for generation */
  seed: number;
}

/**
 * Elevation layer data
 */
export interface ElevationData {
  /** Raw elevation values (0-1) */
  values: Float32Array;
  /** Width of the elevation grid */
  width: number;
  /** Height of the elevation grid */
  height: number;
  /** Minimum elevation value */
  min: number;
  /** Maximum elevation value */
  max: number;
}

/**
 * Style blend settings
 */
export interface TerrainStyleSettings {
  /** Blend between realistic (0) and parchment (1) */
  styleBlend: number;
  /** Coastline ink intensity */
  coastlineIntensity: number;
  /** Hillshade intensity */
  hillshadeIntensity: number;
  /** Color saturation adjustment */
  saturation: number;
  /** Brightness adjustment */
  brightness: number;
  /** Show biome patterns */
  showPatterns: boolean;
}
