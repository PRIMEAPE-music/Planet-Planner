import type { Vector2 } from '@/types';

/**
 * Seed for reproducible random generation
 */
export interface GenerationSeed {
  /** Main seed value */
  value: number;
  /** String representation for display */
  display: string;
}

/**
 * Noise layer configuration for terrain generation
 */
export interface NoiseLayerConfig {
  /** Noise frequency (scale) - lower = larger features */
  frequency: number;
  /** Amplitude multiplier for this layer */
  amplitude: number;
  /** Offset for variation */
  offsetX: number;
  offsetY: number;
}

/**
 * Multi-octave noise configuration
 */
export interface NoiseConfig {
  /** Base frequency */
  frequency: number;
  /** Number of noise octaves */
  octaves: number;
  /** Amplitude decay per octave (persistence) */
  persistence: number;
  /** Frequency multiplier per octave (lacunarity) */
  lacunarity: number;
  /** Noise type */
  type: 'simplex' | 'perlin' | 'worley' | 'ridged';
}

/**
 * Continent shape modifiers
 */
export interface ContinentShapeConfig {
  /** Overall land coverage (0-1) */
  landRatio: number;
  /** Sea level threshold (0-1) */
  seaLevel: number;
  /** Edge falloff type */
  edgeFalloff: 'none' | 'circular' | 'square' | 'gradient';
  /** Edge falloff strength (0-1) */
  edgeFalloffStrength: number;
  /** Continent fragmentation (0 = one landmass, 1 = many islands) */
  fragmentation: number;
  /** Horizontal stretch factor */
  stretchX: number;
  /** Vertical stretch factor */
  stretchY: number;
}

/**
 * Coastline detail configuration
 */
export interface CoastlineConfig {
  /** Coastline roughness (0-1) */
  roughness: number;
  /** Detail noise frequency */
  detailFrequency: number;
  /** Detail noise amplitude */
  detailAmplitude: number;
  /** Enable fjords */
  fjords: boolean;
  /** Fjord frequency */
  fjordFrequency: number;
  /** Fjord depth */
  fjordDepth: number;
  /** Enable bays */
  bays: boolean;
  /** Bay frequency */
  bayFrequency: number;
  /** Bay size */
  baySize: number;
  /** Enable peninsulas */
  peninsulas: boolean;
  /** Peninsula frequency */
  peninsulaFrequency: number;
  /** Smoothing iterations */
  smoothingIterations: number;
}

/**
 * Island generation configuration
 */
export interface IslandConfig {
  /** Enable island generation */
  enabled: boolean;
  /** Number of island clusters */
  clusterCount: number;
  /** Islands per cluster range */
  islandsPerCluster: { min: number; max: number };
  /** Island size range */
  sizeRange: { min: number; max: number };
  /** Cluster spread radius */
  clusterSpread: number;
  /** Distance from mainland */
  mainlandDistance: { min: number; max: number };
  /** Island shape variation */
  shapeVariation: number;
}

/**
 * Tectonic plate simulation config
 */
export interface TectonicConfig {
  /** Enable tectonic simulation */
  enabled: boolean;
  /** Number of plates */
  plateCount: number;
  /** Plate boundary noise */
  boundaryNoise: number;
  /** Mountain formation at convergent boundaries */
  convergentMountains: boolean;
  /** Rift valleys at divergent boundaries */
  divergentRifts: boolean;
}

/**
 * Complete landmass generation configuration
 */
export interface LandmassGenerationConfig {
  /** Generation seed */
  seed: GenerationSeed;
  /** Map dimensions */
  width: number;
  height: number;
  /** Base terrain noise */
  terrainNoise: NoiseConfig;
  /** Continent shape settings */
  continentShape: ContinentShapeConfig;
  /** Coastline detail settings */
  coastline: CoastlineConfig;
  /** Island settings */
  islands: IslandConfig;
  /** Tectonic simulation */
  tectonics: TectonicConfig;
  /** Generation quality (affects resolution) */
  quality: 'draft' | 'normal' | 'high';
}

/**
 * Generation preset names
 */
export type GenerationPreset =
  | 'pangaea'
  | 'continental'
  | 'archipelago'
  | 'islands'
  | 'fractured'
  | 'ringworld'
  | 'custom';

/**
 * Preset definition
 */
export interface PresetDefinition {
  id: GenerationPreset;
  name: string;
  description: string;
  config: Partial<LandmassGenerationConfig>;
  thumbnail?: string;
}

/**
 * Generation progress callback
 */
export interface GenerationProgress {
  stage: 'noise' | 'continents' | 'coastlines' | 'islands' | 'tectonics' | 'finalizing';
  progress: number; // 0-1
  message: string;
}

/**
 * Generation result
 */
export interface GenerationResult {
  /** Raw heightmap data (0-1 values) */
  heightmap: Float32Array;
  /** Land mask (true = land, false = water) */
  landMask: Uint8Array;
  /** Tectonic plate assignments (if enabled) */
  plateMap?: Uint8Array;
  /** Coastline points for rendering */
  coastlinePoints: Vector2[][];
  /** Island center points */
  islandCenters: Vector2[];
  /** Generation metadata */
  metadata: {
    seed: number;
    landCoverage: number;
    continentCount: number;
    islandCount: number;
    generationTime: number;
  };
}
