import type { Vector2 } from '@/types';

/**
 * Mountain peak definition
 */
export interface MountainPeak {
  /** Peak position */
  position: Vector2;
  /** Peak elevation (0-1) */
  elevation: number;
  /** Peak radius of influence */
  radius: number;
  /** Peak sharpness (0 = rounded, 1 = sharp) */
  sharpness: number;
  /** Is part of a range */
  rangeId?: string;
}

/**
 * Mountain range definition (spine-based)
 */
export interface MountainRange {
  /** Unique identifier */
  id: string;
  /** Spine control points */
  spine: Vector2[];
  /** Range width at each point */
  widths: number[];
  /** Peak elevations along spine */
  elevations: number[];
  /** Roughness/jaggedness */
  roughness: number;
  /** Number of peaks to generate */
  peakCount: number;
  /** Generated peaks */
  peaks: MountainPeak[];
}

/**
 * Mountain generation configuration
 */
export interface MountainGenerationConfig {
  /** Enable mountain generation */
  enabled: boolean;
  /** Number of major ranges */
  rangeCount: number;
  /** Range length range (in map units) */
  rangeLengthRange: { min: number; max: number };
  /** Range width range */
  rangeWidthRange: { min: number; max: number };
  /** Peak elevation range */
  peakElevationRange: { min: number; max: number };
  /** Peaks per range */
  peaksPerRange: { min: number; max: number };
  /** Roughness (jaggedness) */
  roughness: number;
  /** Follow tectonic boundaries */
  followTectonics: boolean;
  /** Isolated peak count */
  isolatedPeakCount: number;
}

/**
 * River node in flow network
 */
export interface RiverNode {
  /** Position */
  position: Vector2;
  /** Grid index */
  index: number;
  /** Flow direction (index of downstream node) */
  downstream: number | null;
  /** Upstream nodes */
  upstream: number[];
  /** Accumulated flow (drainage area) */
  flow: number;
  /** Elevation at this point */
  elevation: number;
  /** River width at this point */
  width: number;
  /** Is river source */
  isSource: boolean;
  /** Is river mouth (ocean/lake) */
  isMouth: boolean;
}

/**
 * Complete river definition
 */
export interface River {
  /** Unique identifier */
  id: string;
  /** River name (generated) */
  name: string;
  /** Path from source to mouth */
  path: Vector2[];
  /** Width at each point */
  widths: number[];
  /** Source position */
  source: Vector2;
  /** Mouth position */
  mouth: Vector2;
  /** Total length */
  length: number;
  /** Maximum flow value */
  maxFlow: number;
  /** Tributaries (river IDs) */
  tributaries: string[];
  /** Parent river (if tributary) */
  parentId?: string;
}

/**
 * River generation configuration
 */
export interface RiverGenerationConfig {
  /** Enable river generation */
  enabled: boolean;
  /** Minimum flow threshold for river */
  flowThreshold: number;
  /** Minimum river length (pixels) */
  minLength: number;
  /** Maximum number of major rivers */
  maxRivers: number;
  /** River width multiplier */
  widthMultiplier: number;
  /** Erosion strength (how much rivers carve terrain) */
  erosionStrength: number;
  /** Meander factor (0 = straight, 1 = very curvy) */
  meanderFactor: number;
  /** Generate tributaries */
  generateTributaries: boolean;
  /** Tributary threshold (fraction of main river flow) */
  tributaryThreshold: number;
}

/**
 * Lake definition
 */
export interface Lake {
  /** Unique identifier */
  id: string;
  /** Lake name (generated) */
  name: string;
  /** Center position */
  center: Vector2;
  /** Lake boundary points */
  boundary: Vector2[];
  /** Surface elevation */
  elevation: number;
  /** Surface area (pixels) */
  area: number;
  /** Maximum depth */
  depth: number;
  /** Inflow rivers */
  inflows: string[];
  /** Outflow river */
  outflow?: string;
  /** Lake type */
  type: 'freshwater' | 'volcanic' | 'glacial' | 'salt';
}

/**
 * Lake generation configuration
 */
export interface LakeGenerationConfig {
  /** Enable lake generation */
  enabled: boolean;
  /** Maximum number of lakes */
  maxLakes: number;
  /** Minimum lake size (pixels) */
  minSize: number;
  /** Maximum lake size (pixels) */
  maxSize: number;
  /** Prefer valleys/depressions */
  preferDepressions: boolean;
  /** Allow mountain lakes */
  mountainLakes: boolean;
  /** Mountain lake probability */
  mountainLakeProbability: number;
}

/**
 * Forest region definition
 */
export interface ForestRegion {
  /** Unique identifier */
  id: string;
  /** Forest type/biome */
  type: 'deciduous' | 'coniferous' | 'tropical' | 'boreal' | 'mixed';
  /** Region boundary */
  boundary: Vector2[];
  /** Density map (0-1 values) */
  densityMap: Float32Array;
  /** Average density */
  averageDensity: number;
  /** Area in pixels */
  area: number;
}

/**
 * Forest generation configuration
 */
export interface ForestGenerationConfig {
  /** Enable forest generation */
  enabled: boolean;
  /** Global forest coverage target (0-1) */
  coverageTarget: number;
  /** Moisture threshold for forests */
  moistureThreshold: number;
  /** Avoid steep slopes */
  avoidSteepSlopes: boolean;
  /** Slope threshold */
  maxSlope: number;
  /** Cluster forests together */
  clustering: number;
  /** Edge noise for organic boundaries */
  edgeNoise: number;
}

/**
 * Climate cell data
 */
export interface ClimateCell {
  /** Temperature (0 = cold, 1 = hot) */
  temperature: number;
  /** Moisture/precipitation (0 = dry, 1 = wet) */
  moisture: number;
  /** Wind direction (radians) */
  windDirection: number;
  /** Wind strength */
  windStrength: number;
  /** Is in rain shadow */
  inRainShadow: boolean;
}

/**
 * Climate generation configuration
 */
export interface ClimateGenerationConfig {
  /** Enable climate simulation */
  enabled: boolean;
  /** Equator position (0-1, 0.5 = middle) */
  equatorPosition: number;
  /** Temperature variation */
  temperatureVariation: number;
  /** Prevailing wind direction (radians) */
  windDirection: number;
  /** Rain shadow strength */
  rainShadowStrength: number;
  /** Ocean moisture contribution */
  oceanMoistureStrength: number;
  /** Elevation cooling factor */
  elevationCooling: number;
}

/**
 * Complete feature generation configuration
 */
export interface FeatureGenerationConfig {
  /** Generation seed */
  seed: number;
  /** Mountain settings */
  mountains: MountainGenerationConfig;
  /** River settings */
  rivers: RiverGenerationConfig;
  /** Lake settings */
  lakes: LakeGenerationConfig;
  /** Forest settings */
  forests: ForestGenerationConfig;
  /** Climate settings */
  climate: ClimateGenerationConfig;
}

/**
 * Feature generation result
 */
export interface FeatureGenerationResult {
  /** Generated mountain ranges */
  mountainRanges: MountainRange[];
  /** All mountain peaks */
  peaks: MountainPeak[];
  /** Generated rivers */
  rivers: River[];
  /** Generated lakes */
  lakes: Lake[];
  /** Forest regions */
  forests: ForestRegion[];
  /** Climate data grid */
  climateData: ClimateCell[];
  /** Updated elevation data */
  elevationData: Float32Array;
  /** Updated biome assignments */
  biomeData: Uint8Array;
  /** Generation metadata */
  metadata: {
    mountainCount: number;
    riverCount: number;
    lakeCount: number;
    forestCoverage: number;
    generationTime: number;
  };
}

/**
 * Feature generation progress
 */
export interface FeatureGenerationProgress {
  stage: 'climate' | 'mountains' | 'rivers' | 'lakes' | 'forests' | 'biomes' | 'finalizing';
  progress: number;
  message: string;
}
