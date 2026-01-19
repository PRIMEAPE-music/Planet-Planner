# PHASE 6: Procedural Generation - Features

## Detailed Instructional Guide for Claude Code

---

## Overview

Phase 6 builds upon the landmass generation to add natural features:
- Mountain range generation using spine-based algorithms
- River system generation with realistic flow simulation
- Lake placement based on topology and drainage
- Forest distribution with climate-aware density
- Climate simulation for automatic biome assignment
- Feature generation UI and manual adjustment tools

---

## 6.1 Feature Generation Types

### 6.1.1 src/core/generation/features/types.ts

**Instruction for Claude Code:**
> Create a new file at `src/core/generation/features/types.ts`. This defines all types for feature generation including mountains, rivers, lakes, and forests.

```typescript
import type { Vector2 } from '@/types';
import type { BiomeType } from '@/core/terrain/types';

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
```

---

## 6.2 Mountain Range Generator

### 6.2.1 src/core/generation/features/MountainGenerator.ts

**Instruction for Claude Code:**
> Create the mountain generator at `src/core/generation/features/MountainGenerator.ts`. This uses spine-based algorithms to create realistic mountain ranges.

```typescript
import { SimplexNoise } from '../noise';
import type { Vector2 } from '@/types';
import type {
  MountainGenerationConfig,
  MountainRange,
  MountainPeak,
} from './types';

/**
 * Default mountain generation configuration
 */
export const DEFAULT_MOUNTAIN_CONFIG: MountainGenerationConfig = {
  enabled: true,
  rangeCount: 3,
  rangeLengthRange: { min: 100, max: 300 },
  rangeWidthRange: { min: 20, max: 60 },
  peakElevationRange: { min: 0.7, max: 0.95 },
  peaksPerRange: { min: 5, max: 15 },
  roughness: 0.5,
  followTectonics: true,
  isolatedPeakCount: 5,
};

/**
 * Mountain range generator using spine-based algorithms
 */
export class MountainGenerator {
  private config: MountainGenerationConfig;
  private noise: SimplexNoise;
  private width: number;
  private height: number;
  private rng: () => number;

  constructor(
    config: MountainGenerationConfig,
    width: number,
    height: number,
    seed: number
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.noise = new SimplexNoise(seed);
    this.rng = this.createRng(seed);
  }

  /**
   * Create seeded random number generator
   */
  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Generate all mountain ranges and peaks
   */
  generate(
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap?: Uint8Array
  ): { ranges: MountainRange[]; peaks: MountainPeak[] } {
    const ranges: MountainRange[] = [];
    const allPeaks: MountainPeak[] = [];

    // Generate mountain ranges
    for (let i = 0; i < this.config.rangeCount; i++) {
      const range = this.generateRange(landMask, elevationData, plateMap, i);
      if (range) {
        ranges.push(range);
        allPeaks.push(...range.peaks);
      }
    }

    // Generate isolated peaks
    const isolatedPeaks = this.generateIsolatedPeaks(
      landMask,
      elevationData,
      allPeaks
    );
    allPeaks.push(...isolatedPeaks);

    // Apply mountains to elevation data
    this.applyToElevation(elevationData, allPeaks);

    return { ranges, peaks: allPeaks };
  }

  /**
   * Generate a single mountain range
   */
  private generateRange(
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap: Uint8Array | undefined,
    rangeIndex: number
  ): MountainRange | null {
    // Find suitable starting point
    const startPoint = this.findRangeStartPoint(
      landMask,
      elevationData,
      plateMap
    );
    if (!startPoint) return null;

    // Generate spine using controlled random walk
    const length =
      this.config.rangeLengthRange.min +
      this.rng() *
        (this.config.rangeLengthRange.max - this.config.rangeLengthRange.min);
    
    const spine = this.generateSpine(startPoint, length, landMask, plateMap);
    if (spine.length < 3) return null;

    // Generate widths along spine
    const widths = this.generateSpineWidths(spine.length);

    // Generate elevations along spine
    const elevations = this.generateSpineElevations(spine.length);

    // Generate peaks along spine
    const peakCount = Math.floor(
      this.config.peaksPerRange.min +
        this.rng() *
          (this.config.peaksPerRange.max - this.config.peaksPerRange.min)
    );
    const peaks = this.generatePeaksAlongSpine(
      spine,
      widths,
      elevations,
      peakCount,
      `range-${rangeIndex}`
    );

    return {
      id: `range-${rangeIndex}`,
      spine,
      widths,
      elevations,
      roughness: this.config.roughness,
      peakCount,
      peaks,
    };
  }

  /**
   * Find a good starting point for a mountain range
   */
  private findRangeStartPoint(
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap?: Uint8Array
  ): Vector2 | null {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.floor(this.rng() * this.width);
      const y = Math.floor(this.rng() * this.height);
      const idx = y * this.width + x;

      // Must be on land
      if (landMask[idx] !== 1) continue;

      // Prefer higher elevations
      if (elevationData[idx] < 0.4) continue;

      // If following tectonics, prefer plate boundaries
      if (this.config.followTectonics && plateMap) {
        if (!this.isNearPlateBoundary(x, y, plateMap)) {
          // 70% chance to skip non-boundary points
          if (this.rng() < 0.7) continue;
        }
      }

      return { x, y };
    }

    // Fallback: just find any land point
    for (let i = 0; i < landMask.length; i++) {
      if (landMask[i] === 1) {
        return {
          x: i % this.width,
          y: Math.floor(i / this.width),
        };
      }
    }

    return null;
  }

  /**
   * Check if point is near a tectonic plate boundary
   */
  private isNearPlateBoundary(
    x: number,
    y: number,
    plateMap: Uint8Array
  ): boolean {
    const currentPlate = plateMap[y * this.width + x];
    const radius = 5;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        
        const neighborPlate = plateMap[ny * this.width + nx];
        if (neighborPlate !== currentPlate) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate spine path using noise-guided random walk
   */
  private generateSpine(
    start: Vector2,
    targetLength: number,
    landMask: Uint8Array,
    plateMap?: Uint8Array
  ): Vector2[] {
    const spine: Vector2[] = [start];
    let current = { ...start };
    let totalLength = 0;
    let direction = this.rng() * Math.PI * 2; // Initial random direction

    const stepSize = 5;
    const maxIterations = Math.ceil(targetLength / stepSize) * 2;

    for (let i = 0; i < maxIterations && totalLength < targetLength; i++) {
      // Add noise to direction
      const noiseVal = this.noise.noise2D(
        current.x * 0.02,
        current.y * 0.02
      );
      direction += noiseVal * 0.5;

      // Slight curvature bias
      direction += (this.rng() - 0.5) * 0.3;

      // Calculate next point
      const nx = current.x + Math.cos(direction) * stepSize;
      const ny = current.y + Math.sin(direction) * stepSize;

      // Bounds check
      if (nx < 10 || nx >= this.width - 10 || ny < 10 || ny >= this.height - 10) {
        // Try to turn away from edge
        direction += Math.PI * 0.5;
        continue;
      }

      const idx = Math.floor(ny) * this.width + Math.floor(nx);

      // Must stay on land
      if (landMask[idx] !== 1) {
        direction += Math.PI * 0.3;
        continue;
      }

      // If following tectonics, prefer staying near boundaries
      if (this.config.followTectonics && plateMap) {
        if (!this.isNearPlateBoundary(Math.floor(nx), Math.floor(ny), plateMap)) {
          // Slight preference to turn toward boundaries
          direction += (this.rng() - 0.5) * 0.5;
        }
      }

      current = { x: nx, y: ny };
      spine.push(current);
      totalLength += stepSize;
    }

    return spine;
  }

  /**
   * Generate width values along spine
   */
  private generateSpineWidths(count: number): number[] {
    const { rangeWidthRange } = this.config;
    const widths: number[] = [];

    // Width tapers at ends
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const taper = Math.sin(t * Math.PI); // 0 at ends, 1 in middle
      const baseWidth =
        rangeWidthRange.min +
        this.rng() * (rangeWidthRange.max - rangeWidthRange.min);
      widths.push(baseWidth * (0.3 + taper * 0.7));
    }

    return widths;
  }

  /**
   * Generate elevation values along spine
   */
  private generateSpineElevations(count: number): number[] {
    const { peakElevationRange } = this.config;
    const elevations: number[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      // Elevation varies along spine with noise
      const noiseVal = this.noise.noise2D(i * 0.1, 0) * 0.5 + 0.5;
      const taper = Math.sin(t * Math.PI);
      const elevation =
        peakElevationRange.min +
        noiseVal * taper * (peakElevationRange.max - peakElevationRange.min);
      elevations.push(elevation);
    }

    return elevations;
  }

  /**
   * Generate peaks along the spine
   */
  private generatePeaksAlongSpine(
    spine: Vector2[],
    widths: number[],
    elevations: number[],
    peakCount: number,
    rangeId: string
  ): MountainPeak[] {
    const peaks: MountainPeak[] = [];
    const spineLength = spine.length;

    for (let i = 0; i < peakCount; i++) {
      // Distribute peaks along spine with some randomness
      const baseT = (i + 0.5) / peakCount;
      const t = Math.max(0, Math.min(1, baseT + (this.rng() - 0.5) * 0.2));
      const spineIndex = Math.floor(t * (spineLength - 1));

      // Get spine position
      const spinePoint = spine[spineIndex];
      const width = widths[spineIndex];
      const baseElevation = elevations[spineIndex];

      // Offset from spine
      const offsetAngle = this.rng() * Math.PI * 2;
      const offsetDist = this.rng() * width * 0.4;
      const position = {
        x: spinePoint.x + Math.cos(offsetAngle) * offsetDist,
        y: spinePoint.y + Math.sin(offsetAngle) * offsetDist,
      };

      // Peak properties
      const elevation = baseElevation + (this.rng() - 0.5) * 0.1;
      const radius = width * (0.3 + this.rng() * 0.4);
      const sharpness = 0.3 + this.rng() * 0.5;

      peaks.push({
        position,
        elevation: Math.min(0.98, elevation),
        radius,
        sharpness,
        rangeId,
      });
    }

    return peaks;
  }

  /**
   * Generate isolated mountain peaks (not part of ranges)
   */
  private generateIsolatedPeaks(
    landMask: Uint8Array,
    elevationData: Float32Array,
    existingPeaks: MountainPeak[]
  ): MountainPeak[] {
    const peaks: MountainPeak[] = [];
    const { isolatedPeakCount, peakElevationRange, rangeWidthRange } = this.config;
    const minDistFromExisting = 50;

    for (let i = 0; i < isolatedPeakCount; i++) {
      let attempts = 0;
      let position: Vector2 | null = null;

      while (attempts < 50 && !position) {
        const x = Math.floor(this.rng() * this.width);
        const y = Math.floor(this.rng() * this.height);
        const idx = y * this.width + x;

        // Must be on land
        if (landMask[idx] !== 1) {
          attempts++;
          continue;
        }

        // Must be far from existing peaks
        let tooClose = false;
        for (const peak of existingPeaks) {
          const dist = Math.sqrt(
            (x - peak.position.x) ** 2 + (y - peak.position.y) ** 2
          );
          if (dist < minDistFromExisting) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          position = { x, y };
        }
        attempts++;
      }

      if (position) {
        peaks.push({
          position,
          elevation:
            peakElevationRange.min +
            this.rng() * (peakElevationRange.max - peakElevationRange.min) * 0.8,
          radius: rangeWidthRange.min * (0.5 + this.rng() * 0.5),
          sharpness: 0.4 + this.rng() * 0.4,
        });
      }
    }

    return peaks;
  }

  /**
   * Apply mountain peaks to elevation data
   */
  private applyToElevation(
    elevationData: Float32Array,
    peaks: MountainPeak[]
  ): void {
    for (const peak of peaks) {
      const { position, elevation, radius, sharpness } = peak;
      const radiusSq = radius * radius;

      // Affect pixels within radius
      const minX = Math.max(0, Math.floor(position.x - radius));
      const maxX = Math.min(this.width - 1, Math.ceil(position.x + radius));
      const minY = Math.max(0, Math.floor(position.y - radius));
      const maxY = Math.min(this.height - 1, Math.ceil(position.y + radius));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - position.x;
          const dy = y - position.y;
          const distSq = dx * dx + dy * dy;

          if (distSq >= radiusSq) continue;

          const dist = Math.sqrt(distSq);
          const t = dist / radius;

          // Falloff based on sharpness
          // sharpness=0: smooth gaussian, sharpness=1: cone
          const falloff = 1 - Math.pow(t, 1 + sharpness);

          // Add noise for roughness
          const noiseVal = this.noise.noise2D(x * 0.1, y * 0.1) * 0.1;

          const idx = y * this.width + x;
          const addedElevation = (elevation - elevationData[idx]) * falloff + noiseVal * (1 - t);
          elevationData[idx] = Math.max(
            elevationData[idx],
            elevationData[idx] + Math.max(0, addedElevation)
          );
        }
      }
    }
  }
}
```

---

## 6.3 River System Generator

### 6.3.1 src/core/generation/features/RiverGenerator.ts

**Instruction for Claude Code:**
> Create the river generator at `src/core/generation/features/RiverGenerator.ts`. This uses flow accumulation algorithms to create realistic river networks.

```typescript
import { SimplexNoise } from '../noise';
import type { Vector2 } from '@/types';
import type {
  RiverGenerationConfig,
  River,
  RiverNode,
} from './types';

/**
 * Default river generation configuration
 */
export const DEFAULT_RIVER_CONFIG: RiverGenerationConfig = {
  enabled: true,
  flowThreshold: 50,
  minLength: 30,
  maxRivers: 20,
  widthMultiplier: 1.0,
  erosionStrength: 0.1,
  meanderFactor: 0.3,
  generateTributaries: true,
  tributaryThreshold: 0.3,
};

/**
 * River names for generation
 */
const RIVER_PREFIXES = [
  'Silver', 'Golden', 'Crystal', 'Shadow', 'Thunder', 'Whisper',
  'Ancient', 'Misty', 'Frozen', 'Emerald', 'Sapphire', 'Ruby',
];

const RIVER_SUFFIXES = [
  'River', 'Stream', 'Creek', 'Brook', 'Waters', 'Flow',
  'Run', 'Rapids', 'Falls', 'Spring',
];

/**
 * River system generator using flow accumulation
 */
export class RiverGenerator {
  private config: RiverGenerationConfig;
  private noise: SimplexNoise;
  private width: number;
  private height: number;
  private rng: () => number;

  // Flow network data
  private flowDirection: Int32Array;
  private flowAccumulation: Float32Array;
  private riverNodes: Map<number, RiverNode>;

  constructor(
    config: RiverGenerationConfig,
    width: number,
    height: number,
    seed: number
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.noise = new SimplexNoise(seed + 5000);
    this.rng = this.createRng(seed + 5000);

    this.flowDirection = new Int32Array(width * height);
    this.flowAccumulation = new Float32Array(width * height);
    this.riverNodes = new Map();
  }

  /**
   * Create seeded random number generator
   */
  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Generate river system
   */
  generate(
    landMask: Uint8Array,
    elevationData: Float32Array
  ): { rivers: River[]; erosion: Float32Array } {
    // Step 1: Calculate flow directions
    this.calculateFlowDirections(elevationData, landMask);

    // Step 2: Calculate flow accumulation
    this.calculateFlowAccumulation(landMask);

    // Step 3: Extract river paths
    const rivers = this.extractRivers(landMask, elevationData);

    // Step 4: Apply erosion
    const erosion = this.calculateErosion(rivers, elevationData);

    // Step 5: Add meandering
    this.applyMeandering(rivers);

    return { rivers, erosion };
  }

  /**
   * Calculate flow direction for each cell (D8 algorithm)
   */
  private calculateFlowDirections(
    elevationData: Float32Array,
    landMask: Uint8Array
  ): void {
    const { width, height } = this;

    // D8 neighbor offsets (8 directions)
    const neighbors = [
      { dx: -1, dy: -1, dist: Math.SQRT2 },
      { dx: 0, dy: -1, dist: 1 },
      { dx: 1, dy: -1, dist: Math.SQRT2 },
      { dx: -1, dy: 0, dist: 1 },
      { dx: 1, dy: 0, dist: 1 },
      { dx: -1, dy: 1, dist: Math.SQRT2 },
      { dx: 0, dy: 1, dist: 1 },
      { dx: 1, dy: 1, dist: Math.SQRT2 },
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Skip water cells
        if (landMask[idx] !== 1) {
          this.flowDirection[idx] = -1; // No flow
          continue;
        }

        const currentElevation = elevationData[idx];
        let steepestSlope = 0;
        let flowTarget = -1;

        // Find steepest downhill neighbor
        for (const { dx, dy, dist } of neighbors) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const ni = ny * width + nx;
          const neighborElevation = elevationData[ni];
          const slope = (currentElevation - neighborElevation) / dist;

          if (slope > steepestSlope) {
            steepestSlope = slope;
            flowTarget = ni;
          }
        }

        // If no downhill, flow to water if adjacent
        if (flowTarget === -1) {
          for (const { dx, dy } of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            
            const ni = ny * width + nx;
            if (landMask[ni] === 0) {
              flowTarget = ni;
              break;
            }
          }
        }

        this.flowDirection[idx] = flowTarget;
      }
    }
  }

  /**
   * Calculate flow accumulation using recursive upstream traversal
   */
  private calculateFlowAccumulation(landMask: Uint8Array): void {
    const { width, height } = this;

    // Initialize all land cells with base flow of 1
    for (let i = 0; i < landMask.length; i++) {
      this.flowAccumulation[i] = landMask[i] === 1 ? 1 : 0;
    }

    // Build upstream connections
    const upstream: number[][] = Array(width * height)
      .fill(null)
      .map(() => []);

    for (let i = 0; i < this.flowDirection.length; i++) {
      const target = this.flowDirection[i];
      if (target >= 0 && target < upstream.length) {
        upstream[target].push(i);
      }
    }

    // Process cells in order (by elevation, highest first)
    const sortedCells = Array.from({ length: width * height }, (_, i) => i)
      .filter((i) => landMask[i] === 1)
      .sort((a, b) => this.flowAccumulation[b] - this.flowAccumulation[a]);

    // Accumulate flow downstream
    const visited = new Uint8Array(width * height);
    
    const accumulate = (idx: number): number => {
      if (visited[idx]) return this.flowAccumulation[idx];
      visited[idx] = 1;

      let total = 1; // Self
      for (const upIdx of upstream[idx]) {
        total += accumulate(upIdx);
      }

      this.flowAccumulation[idx] = total;
      return total;
    };

    for (const idx of sortedCells) {
      if (!visited[idx]) {
        accumulate(idx);
      }
    }
  }

  /**
   * Extract river paths from flow accumulation
   */
  private extractRivers(
    landMask: Uint8Array,
    elevationData: Float32Array
  ): River[] {
    const { width, height } = this;
    const { flowThreshold, minLength, maxRivers } = this.config;
    const rivers: River[] = [];

    // Find river mouths (high flow cells adjacent to water)
    const mouths: { idx: number; flow: number }[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (landMask[idx] !== 1) continue;
        if (this.flowAccumulation[idx] < flowThreshold) continue;

        // Check if adjacent to water
        let adjacentToWater = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = (y + dy) * width + (x + dx);
            if (landMask[ni] === 0) {
              adjacentToWater = true;
              break;
            }
          }
          if (adjacentToWater) break;
        }

        if (adjacentToWater) {
          mouths.push({ idx, flow: this.flowAccumulation[idx] });
        }
      }
    }

    // Sort by flow (largest first)
    mouths.sort((a, b) => b.flow - a.flow);

    // Extract rivers from largest mouths
    const usedCells = new Set<number>();
    let riverCount = 0;

    for (const mouth of mouths) {
      if (riverCount >= maxRivers) break;
      if (usedCells.has(mouth.idx)) continue;

      const river = this.traceRiverUpstream(
        mouth.idx,
        landMask,
        elevationData,
        usedCells
      );

      if (river && river.path.length >= minLength) {
        rivers.push(river);
        riverCount++;
      }
    }

    return rivers;
  }

  /**
   * Trace river path upstream from mouth
   */
  private traceRiverUpstream(
    mouthIdx: number,
    landMask: Uint8Array,
    elevationData: Float32Array,
    usedCells: Set<number>
  ): River | null {
    const { width } = this;
    const path: Vector2[] = [];
    const widths: number[] = [];
    const visited = new Set<number>();

    let currentIdx = mouthIdx;
    let maxFlow = 0;

    while (currentIdx >= 0) {
      if (visited.has(currentIdx)) break;
      visited.add(currentIdx);
      usedCells.add(currentIdx);

      const x = currentIdx % width;
      const y = Math.floor(currentIdx / width);
      const flow = this.flowAccumulation[currentIdx];

      path.push({ x, y });
      widths.push(this.calculateRiverWidth(flow));
      maxFlow = Math.max(maxFlow, flow);

      // Find upstream cell with highest flow
      let bestUpstream = -1;
      let bestFlow = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;

          const ni = ny * width + nx;
          if (visited.has(ni)) continue;
          if (landMask[ni] !== 1) continue;

          // Check if this cell flows to current
          if (this.flowDirection[ni] === currentIdx) {
            const upFlow = this.flowAccumulation[ni];
            if (upFlow > bestFlow) {
              bestFlow = upFlow;
              bestUpstream = ni;
            }
          }
        }
      }

      // Stop if flow is too low
      if (bestFlow < this.config.flowThreshold * 0.5) break;

      currentIdx = bestUpstream;
    }

    if (path.length < 2) return null;

    // Reverse path (source to mouth)
    path.reverse();
    widths.reverse();

    const source = path[0];
    const mouth = path[path.length - 1];

    return {
      id: `river-${this.rng().toString(36).slice(2, 8)}`,
      name: this.generateRiverName(),
      path,
      widths,
      source,
      mouth,
      length: path.length,
      maxFlow,
      tributaries: [],
    };
  }

  /**
   * Calculate river width based on flow
   */
  private calculateRiverWidth(flow: number): number {
    // Logarithmic width scaling
    const baseWidth = Math.log(flow + 1) * 0.5;
    return Math.max(1, baseWidth * this.config.widthMultiplier);
  }

  /**
   * Generate a random river name
   */
  private generateRiverName(): string {
    const prefix = RIVER_PREFIXES[Math.floor(this.rng() * RIVER_PREFIXES.length)];
    const suffix = RIVER_SUFFIXES[Math.floor(this.rng() * RIVER_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
  }

  /**
   * Calculate erosion effect from rivers
   */
  private calculateErosion(
    rivers: River[],
    elevationData: Float32Array
  ): Float32Array {
    const erosion = new Float32Array(this.width * this.height);
    const { erosionStrength } = this.config;

    for (const river of rivers) {
      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths[i];
        const erosionRadius = width * 2;

        // Erode terrain around river
        const minX = Math.max(0, Math.floor(point.x - erosionRadius));
        const maxX = Math.min(this.width - 1, Math.ceil(point.x + erosionRadius));
        const minY = Math.max(0, Math.floor(point.y - erosionRadius));
        const maxY = Math.min(this.height - 1, Math.ceil(point.y + erosionRadius));

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (dist > erosionRadius) continue;

            const idx = y * this.width + x;
            const falloff = 1 - dist / erosionRadius;
            const erodeAmount = erosionStrength * falloff * (width / 5);

            erosion[idx] = Math.max(erosion[idx], erodeAmount);
          }
        }
      }
    }

    // Apply erosion to elevation
    for (let i = 0; i < elevationData.length; i++) {
      elevationData[i] = Math.max(0, elevationData[i] - erosion[i]);
    }

    return erosion;
  }

  /**
   * Add meandering to river paths
   */
  private applyMeandering(rivers: River[]): void {
    const { meanderFactor } = this.config;
    if (meanderFactor <= 0) return;

    for (const river of rivers) {
      const smoothedPath: Vector2[] = [];
      const smoothedWidths: number[] = [];

      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths[i];

        // Add noise-based offset
        const noiseVal = this.noise.noise2D(
          point.x * 0.05 + i * 0.1,
          point.y * 0.05
        );

        // Perpendicular offset
        let perpX = 0;
        let perpY = 0;

        if (i > 0 && i < river.path.length - 1) {
          const prev = river.path[i - 1];
          const next = river.path[i + 1];
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            perpX = -dy / len;
            perpY = dx / len;
          }
        }

        const offset = noiseVal * meanderFactor * width * 2;
        smoothedPath.push({
          x: point.x + perpX * offset,
          y: point.y + perpY * offset,
        });
        smoothedWidths.push(width);
      }

      river.path = smoothedPath;
      river.widths = smoothedWidths;
    }
  }

  /**
   * Get flow accumulation data for visualization
   */
  getFlowAccumulation(): Float32Array {
    return this.flowAccumulation;
  }
}
```

---

## 6.4 Lake Generator

### 6.4.1 src/core/generation/features/LakeGenerator.ts

**Instruction for Claude Code:**
> Create the lake generator at `src/core/generation/features/LakeGenerator.ts`. This creates lakes in terrain depressions and along rivers.

```typescript
import { SimplexNoise } from '../noise';
import type { Vector2 } from '@/types';
import type {
  LakeGenerationConfig,
  Lake,
  River,
} from './types';

/**
 * Default lake generation configuration
 */
export const DEFAULT_LAKE_CONFIG: LakeGenerationConfig = {
  enabled: true,
  maxLakes: 15,
  minSize: 20,
  maxSize: 200,
  preferDepressions: true,
  mountainLakes: true,
  mountainLakeProbability: 0.3,
};

/**
 * Lake names for generation
 */
const LAKE_PREFIXES = [
  'Mirror', 'Crystal', 'Shadow', 'Moonlight', 'Starfall', 'Hidden',
  'Tranquil', 'Azure', 'Emerald', 'Frost', 'Mist', 'Echo',
];

const LAKE_SUFFIXES = [
  'Lake', 'Pond', 'Pool', 'Waters', 'Basin', 'Mere',
];

/**
 * Lake generator using depression finding and flood fill
 */
export class LakeGenerator {
  private config: LakeGenerationConfig;
  private noise: SimplexNoise;
  private width: number;
  private height: number;
  private rng: () => number;

  constructor(
    config: LakeGenerationConfig,
    width: number,
    height: number,
    seed: number
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.noise = new SimplexNoise(seed + 6000);
    this.rng = this.createRng(seed + 6000);
  }

  /**
   * Create seeded random number generator
   */
  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Generate lakes
   */
  generate(
    landMask: Uint8Array,
    elevationData: Float32Array,
    rivers: River[]
  ): { lakes: Lake[]; updatedLandMask: Uint8Array } {
    const lakes: Lake[] = [];
    const updatedLandMask = new Uint8Array(landMask);

    // Find terrain depressions
    const depressions = this.findDepressions(elevationData, landMask);

    // Sort by suitability
    depressions.sort((a, b) => b.score - a.score);

    // Create lakes at best locations
    let lakeCount = 0;
    const usedArea = new Set<number>();

    for (const depression of depressions) {
      if (lakeCount >= this.config.maxLakes) break;
      if (usedArea.has(depression.centerIdx)) continue;

      const lake = this.createLake(
        depression,
        elevationData,
        updatedLandMask,
        rivers,
        usedArea
      );

      if (lake) {
        lakes.push(lake);
        lakeCount++;
      }
    }

    // Generate mountain lakes if enabled
    if (this.config.mountainLakes) {
      const mountainLakes = this.generateMountainLakes(
        elevationData,
        updatedLandMask,
        usedArea
      );
      lakes.push(...mountainLakes);
    }

    return { lakes, updatedLandMask };
  }

  /**
   * Find terrain depressions suitable for lakes
   */
  private findDepressions(
    elevationData: Float32Array,
    landMask: Uint8Array
  ): Array<{ centerIdx: number; score: number; elevation: number }> {
    const { width, height } = this;
    const depressions: Array<{ centerIdx: number; score: number; elevation: number }> = [];

    // Use a grid-based search to find local minima
    const gridSize = 20;

    for (let gy = 0; gy < height; gy += gridSize) {
      for (let gx = 0; gx < width; gx += gridSize) {
        let minElevation = Infinity;
        let minIdx = -1;

        // Find minimum in this grid cell
        for (let dy = 0; dy < gridSize && gy + dy < height; dy++) {
          for (let dx = 0; dx < gridSize && gx + dx < width; dx++) {
            const x = gx + dx;
            const y = gy + dy;
            const idx = y * width + x;

            if (landMask[idx] !== 1) continue;

            const elevation = elevationData[idx];
            if (elevation < minElevation) {
              minElevation = elevation;
              minIdx = idx;
            }
          }
        }

        if (minIdx === -1) continue;

        // Calculate depression score
        const score = this.calculateDepressionScore(
          minIdx,
          minElevation,
          elevationData,
          landMask
        );

        if (score > 0.3) {
          depressions.push({
            centerIdx: minIdx,
            score,
            elevation: minElevation,
          });
        }
      }
    }

    return depressions;
  }

  /**
   * Calculate how suitable a location is for a lake
   */
  private calculateDepressionScore(
    centerIdx: number,
    centerElevation: number,
    elevationData: Float32Array,
    landMask: Uint8Array
  ): number {
    const { width, height } = this;
    const cx = centerIdx % width;
    const cy = Math.floor(centerIdx / width);
    const radius = 15;

    let higherNeighbors = 0;
    let totalNeighbors = 0;
    let totalElevationDiff = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = y * width + x;
        if (landMask[idx] !== 1) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        totalNeighbors++;
        const neighborElevation = elevationData[idx];
        
        if (neighborElevation > centerElevation) {
          higherNeighbors++;
          totalElevationDiff += neighborElevation - centerElevation;
        }
      }
    }

    if (totalNeighbors === 0) return 0;

    // Score based on being surrounded by higher terrain
    const surroundingScore = higherNeighbors / totalNeighbors;
    const depthScore = Math.min(1, totalElevationDiff / totalNeighbors / 0.1);

    return surroundingScore * 0.6 + depthScore * 0.4;
  }

  /**
   * Create a lake at a depression
   */
  private createLake(
    depression: { centerIdx: number; score: number; elevation: number },
    elevationData: Float32Array,
    landMask: Uint8Array,
    rivers: River[],
    usedArea: Set<number>
  ): Lake | null {
    const { width, height } = this;
    const { minSize, maxSize } = this.config;

    const cx = depression.centerIdx % width;
    const cy = Math.floor(depression.centerIdx / width);
    const baseElevation = depression.elevation;

    // Flood fill to create lake shape
    const lakePixels: number[] = [];
    const visited = new Set<number>();
    const queue: number[] = [depression.centerIdx];

    // Lake surface elevation slightly above depression bottom
    const surfaceElevation = baseElevation + 0.02;

    while (queue.length > 0 && lakePixels.length < maxSize) {
      const idx = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);

      const x = idx % width;
      const y = Math.floor(idx / width);

      // Check if this pixel should be lake
      if (landMask[idx] !== 1) continue;
      if (elevationData[idx] > surfaceElevation + 0.01) continue;
      if (usedArea.has(idx)) continue;

      lakePixels.push(idx);

      // Add neighbors to queue
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          const ni = ny * width + nx;
          if (!visited.has(ni)) {
            queue.push(ni);
          }
        }
      }
    }

    // Check minimum size
    if (lakePixels.length < minSize) return null;

    // Mark pixels as used and update land mask
    const boundary: Vector2[] = [];
    for (const idx of lakePixels) {
      usedArea.add(idx);
      landMask[idx] = 0; // Convert to water

      // Check if on boundary
      const x = idx % width;
      const y = Math.floor(idx / width);
      let isBoundary = false;

      for (let dy = -1; dy <= 1 && !isBoundary; dy++) {
        for (let dx = -1; dx <= 1 && !isBoundary; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ni = (y + dy) * width + (x + dx);
          if (ni >= 0 && ni < landMask.length && !lakePixels.includes(ni)) {
            isBoundary = true;
          }
        }
      }

      if (isBoundary) {
        boundary.push({ x, y });
      }
    }

    // Find connected rivers
    const inflows: string[] = [];
    let outflow: string | undefined;

    for (const river of rivers) {
      // Check if river touches lake
      for (const point of river.path) {
        const idx = Math.floor(point.y) * width + Math.floor(point.x);
        if (lakePixels.includes(idx) || this.isAdjacent(idx, lakePixels)) {
          // Check if this is inflow or outflow based on position in river
          const pathIdx = river.path.indexOf(point);
          if (pathIdx < river.path.length / 2) {
            // Near source = outflow
            outflow = river.id;
          } else {
            // Near mouth = inflow
            inflows.push(river.id);
          }
          break;
        }
      }
    }

    // Calculate depth
    let maxDepth = 0;
    for (const idx of lakePixels) {
      const depth = surfaceElevation - elevationData[idx];
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      id: `lake-${this.rng().toString(36).slice(2, 8)}`,
      name: this.generateLakeName(),
      center: { x: cx, y: cy },
      boundary,
      elevation: surfaceElevation,
      area: lakePixels.length,
      depth: maxDepth,
      inflows,
      outflow,
      type: 'freshwater',
    };
  }

  /**
   * Check if index is adjacent to any in list
   */
  private isAdjacent(idx: number, list: number[]): boolean {
    const { width } = this;
    const x = idx % width;
    const y = Math.floor(idx / width);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ni = (y + dy) * width + (x + dx);
        if (list.includes(ni)) return true;
      }
    }

    return false;
  }

  /**
   * Generate small mountain/alpine lakes
   */
  private generateMountainLakes(
    elevationData: Float32Array,
    landMask: Uint8Array,
    usedArea: Set<number>
  ): Lake[] {
    const { width, height } = this;
    const lakes: Lake[] = [];
    const { mountainLakeProbability } = this.config;

    // Find high elevation areas
    for (let y = 10; y < height - 10; y += 30) {
      for (let x = 10; x < width - 10; x += 30) {
        const idx = y * width + x;
        if (landMask[idx] !== 1) continue;
        if (elevationData[idx] < 0.65) continue; // Must be in mountains
        if (usedArea.has(idx)) continue;

        if (this.rng() > mountainLakeProbability) continue;

        // Create small circular lake
        const radius = 3 + Math.floor(this.rng() * 5);
        const lakePixels: number[] = [];
        const boundary: Vector2[] = [];

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > radius) continue;

            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            const ni = ny * width + nx;
            if (landMask[ni] !== 1) continue;
            if (usedArea.has(ni)) continue;

            lakePixels.push(ni);
            usedArea.add(ni);
            landMask[ni] = 0;

            // Is boundary?
            if (Math.abs(dist - radius) < 1.5) {
              boundary.push({ x: nx, y: ny });
            }
          }
        }

        if (lakePixels.length >= 10) {
          lakes.push({
            id: `mlake-${this.rng().toString(36).slice(2, 8)}`,
            name: this.generateLakeName(),
            center: { x, y },
            boundary,
            elevation: elevationData[idx],
            area: lakePixels.length,
            depth: 0.05,
            inflows: [],
            type: 'glacial',
          });
        }
      }
    }

    return lakes;
  }

  /**
   * Generate a random lake name
   */
  private generateLakeName(): string {
    const prefix = LAKE_PREFIXES[Math.floor(this.rng() * LAKE_PREFIXES.length)];
    const suffix = LAKE_SUFFIXES[Math.floor(this.rng() * LAKE_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
  }
}
```

---

## 6.5 Forest Generator

### 6.5.1 src/core/generation/features/ForestGenerator.ts

**Instruction for Claude Code:**
> Create the forest generator at `src/core/generation/features/ForestGenerator.ts`. This distributes forests based on climate, elevation, and moisture.

```typescript
import { SimplexNoise } from '../noise';
import type { Vector2 } from '@/types';
import type {
  ForestGenerationConfig,
  ForestRegion,
  ClimateCell,
} from './types';

/**
 * Default forest generation configuration
 */
export const DEFAULT_FOREST_CONFIG: ForestGenerationConfig = {
  enabled: true,
  coverageTarget: 0.3,
  moistureThreshold: 0.4,
  avoidSteepSlopes: true,
  maxSlope: 0.3,
  clustering: 0.7,
  edgeNoise: 0.5,
};

/**
 * Forest type based on climate
 */
type ForestType = 'deciduous' | 'coniferous' | 'tropical' | 'boreal' | 'mixed';

/**
 * Forest generator using climate-aware distribution
 */
export class ForestGenerator {
  private config: ForestGenerationConfig;
  private noise: SimplexNoise;
  private clusterNoise: SimplexNoise;
  private width: number;
  private height: number;
  private rng: () => number;

  constructor(
    config: ForestGenerationConfig,
    width: number,
    height: number,
    seed: number
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.noise = new SimplexNoise(seed + 7000);
    this.clusterNoise = new SimplexNoise(seed + 7001);
    this.rng = this.createRng(seed + 7000);
  }

  /**
   * Create seeded random number generator
   */
  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Generate forests
   */
  generate(
    landMask: Uint8Array,
    elevationData: Float32Array,
    climateData: ClimateCell[]
  ): { forests: ForestRegion[]; densityMap: Float32Array } {
    const { width, height } = this;
    const densityMap = new Float32Array(width * height);

    // Step 1: Calculate base forest suitability
    this.calculateSuitability(landMask, elevationData, climateData, densityMap);

    // Step 2: Apply clustering
    this.applyClustering(densityMap, landMask);

    // Step 3: Apply edge noise for organic boundaries
    this.applyEdgeNoise(densityMap, landMask);

    // Step 4: Normalize to target coverage
    this.normalizeToTarget(densityMap, landMask);

    // Step 5: Extract forest regions
    const forests = this.extractRegions(densityMap, climateData, landMask);

    return { forests, densityMap };
  }

  /**
   * Calculate forest suitability for each cell
   */
  private calculateSuitability(
    landMask: Uint8Array,
    elevationData: Float32Array,
    climateData: ClimateCell[],
    densityMap: Float32Array
  ): void {
    const { width, height } = this;
    const { moistureThreshold, avoidSteepSlopes, maxSlope } = this.config;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Must be on land
        if (landMask[idx] !== 1) {
          densityMap[idx] = 0;
          continue;
        }

        const climate = climateData[idx];
        const elevation = elevationData[idx];

        // Check moisture threshold
        if (climate.moisture < moistureThreshold) {
          densityMap[idx] = 0;
          continue;
        }

        // Check elevation (no forests on high mountains)
        if (elevation > 0.8) {
          densityMap[idx] = 0;
          continue;
        }

        // Check slope if enabled
        if (avoidSteepSlopes) {
          const slope = this.calculateSlope(x, y, elevationData);
          if (slope > maxSlope) {
            densityMap[idx] = Math.max(0, 1 - slope / maxSlope) * 0.3;
            continue;
          }
        }

        // Calculate suitability based on climate
        let suitability = 0;

        // Moisture contribution (more moisture = denser forests)
        const moistureScore = (climate.moisture - moistureThreshold) / (1 - moistureThreshold);
        suitability += moistureScore * 0.5;

        // Temperature contribution (moderate temps best)
        const tempScore = 1 - Math.abs(climate.temperature - 0.5) * 2;
        suitability += tempScore * 0.3;

        // Elevation contribution (lowlands to mid-elevation best)
        const elevationScore = elevation < 0.6 ? 1 : 1 - (elevation - 0.6) / 0.2;
        suitability += elevationScore * 0.2;

        // Rain shadow penalty
        if (climate.inRainShadow) {
          suitability *= 0.5;
        }

        densityMap[idx] = Math.max(0, Math.min(1, suitability));
      }
    }
  }

  /**
   * Calculate terrain slope at point
   */
  private calculateSlope(
    x: number,
    y: number,
    elevationData: Float32Array
  ): number {
    const { width, height } = this;
    const idx = y * width + x;
    const currentElevation = elevationData[idx];

    let maxSlope = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const ni = ny * width + nx;
        const neighborElevation = elevationData[ni];
        const dist = Math.sqrt(dx * dx + dy * dy);
        const slope = Math.abs(currentElevation - neighborElevation) / dist;

        maxSlope = Math.max(maxSlope, slope);
      }
    }

    return maxSlope;
  }

  /**
   * Apply clustering to create coherent forest patches
   */
  private applyClustering(
    densityMap: Float32Array,
    landMask: Uint8Array
  ): void {
    const { width, height } = this;
    const { clustering } = this.config;

    // Generate cluster noise
    const clusterValues = new Float32Array(width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const noise = this.clusterNoise.fbm(
          x / width * 8,
          y / height * 8,
          4,
          0.5,
          2.0
        );
        clusterValues[idx] = (noise + 1) / 2; // Normalize to 0-1
      }
    }

    // Blend with suitability
    for (let i = 0; i < densityMap.length; i++) {
      if (landMask[i] !== 1) continue;
      
      const original = densityMap[i];
      const cluster = clusterValues[i];
      
      // Clustering creates distinct patches
      const threshold = 0.5 - clustering * 0.3;
      const clusterMultiplier = cluster > threshold ? 1.2 : 0.5;
      
      densityMap[i] = Math.min(1, original * clusterMultiplier);
    }
  }

  /**
   * Apply edge noise for organic forest boundaries
   */
  private applyEdgeNoise(
    densityMap: Float32Array,
    landMask: Uint8Array
  ): void {
    const { width, height } = this;
    const { edgeNoise } = this.config;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (landMask[idx] !== 1) continue;
        if (densityMap[idx] < 0.1) continue;

        // Add small-scale noise to edges
        const noiseVal = this.noise.noise2D(
          x * 0.1,
          y * 0.1
        );
        
        densityMap[idx] += noiseVal * edgeNoise * 0.3;
        densityMap[idx] = Math.max(0, Math.min(1, densityMap[idx]));
      }
    }
  }

  /**
   * Normalize density to achieve target coverage
   */
  private normalizeToTarget(
    densityMap: Float32Array,
    landMask: Uint8Array
  ): void {
    const { coverageTarget } = this.config;

    // Count current coverage
    let totalLand = 0;
    let totalForest = 0;

    for (let i = 0; i < landMask.length; i++) {
      if (landMask[i] === 1) {
        totalLand++;
        if (densityMap[i] > 0.5) {
          totalForest++;
        }
      }
    }

    const currentCoverage = totalForest / totalLand;
    
    if (currentCoverage === 0) return;

    // Adjust threshold to hit target
    const ratio = coverageTarget / currentCoverage;
    
    for (let i = 0; i < densityMap.length; i++) {
      if (landMask[i] === 1) {
        densityMap[i] = Math.min(1, densityMap[i] * ratio);
      }
    }
  }

  /**
   * Extract distinct forest regions
   */
  private extractRegions(
    densityMap: Float32Array,
    climateData: ClimateCell[],
    landMask: Uint8Array
  ): ForestRegion[] {
    const { width, height } = this;
    const visited = new Uint8Array(width * height);
    const regions: ForestRegion[] = [];
    const minRegionSize = 50;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;
        if (landMask[idx] !== 1) continue;
        if (densityMap[idx] < 0.5) continue;

        // Flood fill to find region
        const regionPixels: number[] = [];
        const queue: number[] = [idx];
        const boundary: Vector2[] = [];

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited[current]) continue;
          if (landMask[current] !== 1) continue;
          if (densityMap[current] < 0.4) continue;

          visited[current] = 1;
          regionPixels.push(current);

          const cx = current % width;
          const cy = Math.floor(current / width);

          // Check neighbors
          let isBoundary = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;

              const nx = cx + dx;
              const ny = cy + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                isBoundary = true;
                continue;
              }

              const ni = ny * width + nx;
              if (densityMap[ni] < 0.4 || landMask[ni] !== 1) {
                isBoundary = true;
              }
              
              if (!visited[ni] && densityMap[ni] >= 0.4 && landMask[ni] === 1) {
                queue.push(ni);
              }
            }
          }

          if (isBoundary) {
            boundary.push({ x: cx, y: cy });
          }
        }

        if (regionPixels.length < minRegionSize) continue;

        // Determine forest type based on climate
        const avgTemp = regionPixels.reduce(
          (sum, i) => sum + climateData[i].temperature,
          0
        ) / regionPixels.length;

        const avgMoisture = regionPixels.reduce(
          (sum, i) => sum + climateData[i].moisture,
          0
        ) / regionPixels.length;

        const type = this.determineForestType(avgTemp, avgMoisture);

        // Calculate average density
        const avgDensity = regionPixels.reduce(
          (sum, i) => sum + densityMap[i],
          0
        ) / regionPixels.length;

        // Create region density map
        const regionDensityMap = new Float32Array(width * height);
        for (const pixel of regionPixels) {
          regionDensityMap[pixel] = densityMap[pixel];
        }

        regions.push({
          id: `forest-${this.rng().toString(36).slice(2, 8)}`,
          type,
          boundary,
          densityMap: regionDensityMap,
          averageDensity: avgDensity,
          area: regionPixels.length,
        });
      }
    }

    return regions;
  }

  /**
   * Determine forest type based on climate
   */
  private determineForestType(temperature: number, moisture: number): ForestType {
    if (temperature > 0.7 && moisture > 0.7) {
      return 'tropical';
    }
    if (temperature < 0.3) {
      return 'boreal';
    }
    if (temperature < 0.5) {
      return 'coniferous';
    }
    if (moisture > 0.6) {
      return 'deciduous';
    }
    return 'mixed';
  }
}
```

---

## 6.6 Climate Generator

### 6.6.1 src/core/generation/features/ClimateGenerator.ts

**Instruction for Claude Code:**
> Create the climate generator at `src/core/generation/features/ClimateGenerator.ts`. This simulates temperature, moisture, and wind patterns.

```typescript
import { SimplexNoise } from '../noise';
import type {
  ClimateGenerationConfig,
  ClimateCell,
} from './types';

/**
 * Default climate generation configuration
 */
export const DEFAULT_CLIMATE_CONFIG: ClimateGenerationConfig = {
  enabled: true,
  equatorPosition: 0.5,
  temperatureVariation: 0.2,
  windDirection: Math.PI * 0.25, // Northeast trade winds
  rainShadowStrength: 0.6,
  oceanMoistureStrength: 0.8,
  elevationCooling: 0.3,
};

/**
 * Climate simulation generator
 */
export class ClimateGenerator {
  private config: ClimateGenerationConfig;
  private noise: SimplexNoise;
  private width: number;
  private height: number;

  constructor(
    config: ClimateGenerationConfig,
    width: number,
    height: number,
    seed: number
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.noise = new SimplexNoise(seed + 8000);
  }

  /**
   * Generate climate data for all cells
   */
  generate(
    landMask: Uint8Array,
    elevationData: Float32Array
  ): ClimateCell[] {
    const { width, height } = this;
    const climateData: ClimateCell[] = new Array(width * height);

    // Step 1: Calculate base temperature
    const temperatureMap = this.calculateTemperature(elevationData);

    // Step 2: Calculate distance to ocean
    const oceanDistance = this.calculateOceanDistance(landMask);

    // Step 3: Calculate moisture with rain shadows
    const moistureMap = this.calculateMoisture(
      landMask,
      elevationData,
      oceanDistance
    );

    // Step 4: Calculate wind
    const windData = this.calculateWind(elevationData, landMask);

    // Step 5: Combine into climate cells
    for (let i = 0; i < width * height; i++) {
      climateData[i] = {
        temperature: temperatureMap[i],
        moisture: moistureMap[i],
        windDirection: windData.directions[i],
        windStrength: windData.strengths[i],
        inRainShadow: moistureMap[i] < 0.3 && landMask[i] === 1,
      };
    }

    return climateData;
  }

  /**
   * Calculate temperature based on latitude and elevation
   */
  private calculateTemperature(elevationData: Float32Array): Float32Array {
    const { width, height } = this;
    const { equatorPosition, temperatureVariation, elevationCooling } = this.config;
    const temperatureMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const normalizedY = y / height;
        const elevation = elevationData[idx];

        // Base temperature from latitude (hot at equator, cold at poles)
        const latitudeTemp = 1 - Math.abs(normalizedY - equatorPosition) * 2;

        // Elevation cooling
        const elevationTemp = 1 - elevation * elevationCooling;

        // Add noise for variation
        const noiseVal = this.noise.noise2D(x * 0.02, y * 0.02) * temperatureVariation;

        // Combine
        let temperature = latitudeTemp * 0.6 + elevationTemp * 0.3 + 0.1 + noiseVal;
        temperature = Math.max(0, Math.min(1, temperature));

        temperatureMap[idx] = temperature;
      }
    }

    return temperatureMap;
  }

  /**
   * Calculate distance to nearest ocean for each cell
   */
  private calculateOceanDistance(landMask: Uint8Array): Float32Array {
    const { width, height } = this;
    const distance = new Float32Array(width * height).fill(Infinity);
    const queue: { x: number; y: number; dist: number }[] = [];

    // Initialize with all ocean cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (landMask[idx] === 0) {
          distance[idx] = 0;
          queue.push({ x, y, dist: 0 });
        }
      }
    }

    // BFS to calculate distances
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    ];

    while (queue.length > 0) {
      const { x, y, dist } = queue.shift()!;

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const ni = ny * width + nx;
        const newDist = dist + 1;

        if (newDist < distance[ni]) {
          distance[ni] = newDist;
          queue.push({ x: nx, y: ny, dist: newDist });
        }
      }
    }

    // Normalize
    const maxDist = Math.max(...distance);
    for (let i = 0; i < distance.length; i++) {
      distance[i] = distance[i] / maxDist;
    }

    return distance;
  }

  /**
   * Calculate moisture with rain shadow effects
   */
  private calculateMoisture(
    landMask: Uint8Array,
    elevationData: Float32Array,
    oceanDistance: Float32Array
  ): Float32Array {
    const { width, height } = this;
    const { windDirection, rainShadowStrength, oceanMoistureStrength } = this.config;
    const moistureMap = new Float32Array(width * height);

    // Wind vector
    const windX = Math.cos(windDirection);
    const windY = Math.sin(windDirection);

    // First pass: base moisture from ocean proximity
    for (let i = 0; i < width * height; i++) {
      const oceanProximity = 1 - oceanDistance[i];
      moistureMap[i] = oceanProximity * oceanMoistureStrength;
    }

    // Second pass: simulate wind carrying moisture and rain shadows
    // Process in wind direction order
    const sortedIndices = Array.from({ length: width * height }, (_, i) => i)
      .sort((a, b) => {
        const ax = a % width;
        const ay = Math.floor(a / width);
        const bx = b % width;
        const by = Math.floor(b / width);
        const dotA = ax * windX + ay * windY;
        const dotB = bx * windX + by * windY;
        return dotA - dotB;
      });

    for (const idx of sortedIndices) {
      if (landMask[idx] !== 1) continue;

      const x = idx % width;
      const y = Math.floor(idx / width);
      const elevation = elevationData[idx];

      // Check upwind for mountains (rain shadow)
      let rainShadow = 0;
      const checkDist = 30;

      for (let d = 1; d < checkDist; d++) {
        const ux = Math.round(x - windX * d);
        const uy = Math.round(y - windY * d);
        if (ux < 0 || ux >= width || uy < 0 || uy >= height) break;

        const ui = uy * width + ux;
        const upwindElevation = elevationData[ui];

        // If upwind terrain is higher, we're in rain shadow
        if (upwindElevation > elevation + 0.1) {
          rainShadow = Math.max(
            rainShadow,
            (upwindElevation - elevation) * rainShadowStrength * (1 - d / checkDist)
          );
        }
      }

      // Apply rain shadow
      moistureMap[idx] = Math.max(0, moistureMap[idx] - rainShadow);

      // Mountains get more precipitation (orographic effect)
      if (elevation > 0.5 && elevation < 0.8) {
        const upwindMoisture = this.getUpwindMoisture(x, y, windX, windY, moistureMap);
        if (upwindMoisture > 0.3) {
          moistureMap[idx] += 0.2 * (elevation - 0.5);
        }
      }

      // Add some noise for variation
      const noiseVal = this.noise.noise2D(x * 0.03, y * 0.03) * 0.15;
      moistureMap[idx] = Math.max(0, Math.min(1, moistureMap[idx] + noiseVal));
    }

    return moistureMap;
  }

  /**
   * Get average moisture upwind from a point
   */
  private getUpwindMoisture(
    x: number,
    y: number,
    windX: number,
    windY: number,
    moistureMap: Float32Array
  ): number {
    const { width, height } = this;
    let total = 0;
    let count = 0;

    for (let d = 1; d <= 10; d++) {
      const ux = Math.round(x - windX * d);
      const uy = Math.round(y - windY * d);
      if (ux < 0 || ux >= width || uy < 0 || uy >= height) break;

      const ui = uy * width + ux;
      total += moistureMap[ui];
      count++;
    }

    return count > 0 ? total / count : 0;
  }

  /**
   * Calculate wind direction and strength
   */
  private calculateWind(
    elevationData: Float32Array,
    landMask: Uint8Array
  ): { directions: Float32Array; strengths: Float32Array } {
    const { width, height } = this;
    const { windDirection } = this.config;
    
    const directions = new Float32Array(width * height);
    const strengths = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const elevation = elevationData[idx];

        // Base wind direction with noise
        const noiseVal = this.noise.noise2D(x * 0.01, y * 0.01);
        directions[idx] = windDirection + noiseVal * 0.5;

        // Wind strength (reduced by mountains)
        let strength = 0.5;
        if (landMask[idx] === 0) {
          strength = 0.8; // Stronger over water
        } else if (elevation > 0.6) {
          strength = 0.3; // Weaker in mountains
        }

        strengths[idx] = strength;
      }
    }

    return { directions, strengths };
  }
}
```

---

## 6.7 Biome Assignment System

### 6.7.1 src/core/generation/features/BiomeAssigner.ts

**Instruction for Claude Code:**
> Create the biome assigner at `src/core/generation/features/BiomeAssigner.ts`. This assigns biomes based on climate, elevation, and features.

```typescript
import type { BiomeType } from '@/core/terrain/types';
import type { ClimateCell } from './types';

/**
 * Biome assignment based on climate conditions
 */
export class BiomeAssigner {
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Assign biomes to all cells
   */
  assign(
    landMask: Uint8Array,
    elevationData: Float32Array,
    climateData: ClimateCell[],
    forestDensity: Float32Array
  ): Uint8Array {
    const biomeData = new Uint8Array(this.width * this.height);

    for (let i = 0; i < landMask.length; i++) {
      const isLand = landMask[i] === 1;
      const elevation = elevationData[i];
      const climate = climateData[i];
      const forest = forestDensity[i];

      const biome = this.determineBiome(
        isLand,
        elevation,
        climate.temperature,
        climate.moisture,
        forest
      );

      biomeData[i] = this.biomeToIndex(biome);
    }

    return biomeData;
  }

  /**
   * Determine biome from conditions
   */
  private determineBiome(
    isLand: boolean,
    elevation: number,
    temperature: number,
    moisture: number,
    forestDensity: number
  ): BiomeType {
    // Water biomes
    if (!isLand) {
      if (elevation < 0.25) return 'ocean';
      return 'shallowWater';
    }

    // High elevation biomes
    if (elevation > 0.85) return 'highMountain';
    if (elevation > 0.7) return 'mountain';
    if (elevation > 0.6 && temperature < 0.3) return 'snow';

    // Beach (low elevation near water handled by coastline)
    if (elevation < 0.42) return 'beach';

    // Cold biomes
    if (temperature < 0.2) {
      if (moisture > 0.5) return 'snow';
      return 'tundra';
    }

    // Hot biomes
    if (temperature > 0.75) {
      if (moisture < 0.25) return 'desert';
      if (moisture > 0.65 && forestDensity > 0.5) return 'jungle';
      if (moisture > 0.4) return 'savanna';
      return 'desert';
    }

    // Temperate biomes
    if (moisture < 0.3) {
      return temperature > 0.5 ? 'desert' : 'tundra';
    }

    if (moisture > 0.7) {
      if (forestDensity > 0.6) return 'denseForest';
      if (temperature < 0.4) return 'swamp';
    }

    // Forest biomes
    if (forestDensity > 0.5) {
      if (temperature < 0.4) return 'forest'; // Coniferous
      return 'denseForest'; // Deciduous/mixed
    }

    if (forestDensity > 0.3) {
      return 'forest';
    }

    // Grassland
    return 'grassland';
  }

  /**
   * Convert biome type to index
   */
  private biomeToIndex(biome: BiomeType): number {
    const biomeOrder: BiomeType[] = [
      'ocean',
      'shallowWater',
      'beach',
      'grassland',
      'forest',
      'denseForest',
      'desert',
      'savanna',
      'tundra',
      'snow',
      'mountain',
      'highMountain',
      'swamp',
      'volcanic',
      'coral',
      'jungle',
    ];
    return biomeOrder.indexOf(biome);
  }
}
```

---

## 6.8 Feature Generator Orchestrator

### 6.8.1 src/core/generation/features/FeatureGenerator.ts

**Instruction for Claude Code:**
> Create the main feature generator at `src/core/generation/features/FeatureGenerator.ts`. This orchestrates all feature generation steps.

```typescript
import { MountainGenerator, DEFAULT_MOUNTAIN_CONFIG } from './MountainGenerator';
import { RiverGenerator, DEFAULT_RIVER_CONFIG } from './RiverGenerator';
import { LakeGenerator, DEFAULT_LAKE_CONFIG } from './LakeGenerator';
import { ForestGenerator, DEFAULT_FOREST_CONFIG } from './ForestGenerator';
import { ClimateGenerator, DEFAULT_CLIMATE_CONFIG } from './ClimateGenerator';
import { BiomeAssigner } from './BiomeAssigner';
import type {
  FeatureGenerationConfig,
  FeatureGenerationResult,
  FeatureGenerationProgress,
} from './types';

/**
 * Default feature generation configuration
 */
export const DEFAULT_FEATURE_CONFIG: FeatureGenerationConfig = {
  seed: Date.now(),
  mountains: DEFAULT_MOUNTAIN_CONFIG,
  rivers: DEFAULT_RIVER_CONFIG,
  lakes: DEFAULT_LAKE_CONFIG,
  forests: DEFAULT_FOREST_CONFIG,
  climate: DEFAULT_CLIMATE_CONFIG,
};

/**
 * Main feature generation orchestrator
 */
export class FeatureGenerator {
  private config: FeatureGenerationConfig;
  private onProgress?: (progress: FeatureGenerationProgress) => void;
  private width: number;
  private height: number;

  constructor(
    config: FeatureGenerationConfig,
    width: number,
    height: number,
    onProgress?: (progress: FeatureGenerationProgress) => void
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.onProgress = onProgress;
  }

  /**
   * Report progress
   */
  private report(
    stage: FeatureGenerationProgress['stage'],
    progress: number,
    message: string
  ): void {
    this.onProgress?.({ stage, progress, message });
  }

  /**
   * Generate all features
   */
  async generate(
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap?: Uint8Array
  ): Promise<FeatureGenerationResult> {
    const startTime = performance.now();
    const { width, height, config } = this;

    // Work with copies to not modify originals
    const workingElevation = new Float32Array(elevationData);
    const workingLandMask = new Uint8Array(landMask);

    // Step 1: Generate climate
    this.report('climate', 0, 'Simulating climate...');
    const climateGenerator = new ClimateGenerator(
      config.climate,
      width,
      height,
      config.seed
    );
    const climateData = climateGenerator.generate(workingLandMask, workingElevation);
    this.report('climate', 1, 'Climate simulation complete');

    // Step 2: Generate mountains
    let mountainRanges: FeatureGenerationResult['mountainRanges'] = [];
    let peaks: FeatureGenerationResult['peaks'] = [];

    if (config.mountains.enabled) {
      this.report('mountains', 0, 'Generating mountains...');
      const mountainGenerator = new MountainGenerator(
        config.mountains,
        width,
        height,
        config.seed
      );
      const mountainResult = mountainGenerator.generate(
        workingLandMask,
        workingElevation,
        plateMap
      );
      mountainRanges = mountainResult.ranges;
      peaks = mountainResult.peaks;
      this.report('mountains', 1, 'Mountains complete');
    }

    // Step 3: Generate rivers
    let rivers: FeatureGenerationResult['rivers'] = [];

    if (config.rivers.enabled) {
      this.report('rivers', 0, 'Generating rivers...');
      const riverGenerator = new RiverGenerator(
        config.rivers,
        width,
        height,
        config.seed
      );
      const riverResult = riverGenerator.generate(workingLandMask, workingElevation);
      rivers = riverResult.rivers;
      this.report('rivers', 1, 'Rivers complete');
    }

    // Step 4: Generate lakes
    let lakes: FeatureGenerationResult['lakes'] = [];

    if (config.lakes.enabled) {
      this.report('lakes', 0, 'Generating lakes...');
      const lakeGenerator = new LakeGenerator(
        config.lakes,
        width,
        height,
        config.seed
      );
      const lakeResult = lakeGenerator.generate(
        workingLandMask,
        workingElevation,
        rivers
      );
      lakes = lakeResult.lakes;
      // Update land mask with lakes
      workingLandMask.set(lakeResult.updatedLandMask);
      this.report('lakes', 1, 'Lakes complete');
    }

    // Step 5: Generate forests
    let forests: FeatureGenerationResult['forests'] = [];
    let forestDensity = new Float32Array(width * height);

    if (config.forests.enabled) {
      this.report('forests', 0, 'Generating forests...');
      const forestGenerator = new ForestGenerator(
        config.forests,
        width,
        height,
        config.seed
      );
      const forestResult = forestGenerator.generate(
        workingLandMask,
        workingElevation,
        climateData
      );
      forests = forestResult.forests;
      forestDensity = forestResult.densityMap;
      this.report('forests', 1, 'Forests complete');
    }

    // Step 6: Assign biomes
    this.report('biomes', 0, 'Assigning biomes...');
    const biomeAssigner = new BiomeAssigner(width, height);
    const biomeData = biomeAssigner.assign(
      workingLandMask,
      workingElevation,
      climateData,
      forestDensity
    );
    this.report('biomes', 1, 'Biomes assigned');

    // Finalize
    this.report('finalizing', 0, 'Finalizing...');
    const generationTime = performance.now() - startTime;
    this.report('finalizing', 1, 'Complete');

    return {
      mountainRanges,
      peaks,
      rivers,
      lakes,
      forests,
      climateData,
      elevationData: workingElevation,
      biomeData,
      metadata: {
        mountainCount: peaks.length,
        riverCount: rivers.length,
        lakeCount: lakes.length,
        forestCoverage: this.calculateForestCoverage(forestDensity, workingLandMask),
        generationTime,
      },
    };
  }

  /**
   * Calculate forest coverage percentage
   */
  private calculateForestCoverage(
    forestDensity: Float32Array,
    landMask: Uint8Array
  ): number {
    let landCount = 0;
    let forestCount = 0;

    for (let i = 0; i < landMask.length; i++) {
      if (landMask[i] === 1) {
        landCount++;
        if (forestDensity[i] > 0.5) {
          forestCount++;
        }
      }
    }

    return landCount > 0 ? forestCount / landCount : 0;
  }
}
```

---

## 6.9 Feature Generation Store

### 6.9.1 src/stores/useFeatureStore.ts

**Instruction for Claude Code:**
> Create a Zustand store at `src/stores/useFeatureStore.ts` for managing feature generation state.

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  FeatureGenerationConfig,
  FeatureGenerationResult,
  FeatureGenerationProgress,
} from '@/core/generation/features/types';
import {
  FeatureGenerator,
  DEFAULT_FEATURE_CONFIG,
} from '@/core/generation/features/FeatureGenerator';

interface FeatureState {
  // Configuration
  config: FeatureGenerationConfig;
  
  // Generation state
  isGenerating: boolean;
  progress: FeatureGenerationProgress | null;
  result: FeatureGenerationResult | null;
  error: string | null;
  
  // Feature visibility
  showMountains: boolean;
  showRivers: boolean;
  showLakes: boolean;
  showForests: boolean;
  showClimate: boolean;
}

interface FeatureActions {
  setConfig: (config: Partial<FeatureGenerationConfig>) => void;
  setMountainConfig: (config: Partial<FeatureGenerationConfig['mountains']>) => void;
  setRiverConfig: (config: Partial<FeatureGenerationConfig['rivers']>) => void;
  setLakeConfig: (config: Partial<FeatureGenerationConfig['lakes']>) => void;
  setForestConfig: (config: Partial<FeatureGenerationConfig['forests']>) => void;
  setClimateConfig: (config: Partial<FeatureGenerationConfig['climate']>) => void;
  
  generate: (
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap?: Uint8Array
  ) => Promise<FeatureGenerationResult | null>;
  
  setVisibility: (feature: keyof FeatureState, visible: boolean) => void;
  reset: () => void;
}

type FeatureStore = FeatureState & FeatureActions;

const initialState: FeatureState = {
  config: DEFAULT_FEATURE_CONFIG,
  isGenerating: false,
  progress: null,
  result: null,
  error: null,
  showMountains: true,
  showRivers: true,
  showLakes: true,
  showForests: true,
  showClimate: false,
};

export const useFeatureStore = create<FeatureStore>()(
  immer((set, get) => ({
    ...initialState,

    setConfig: (partialConfig) => {
      set((state) => {
        Object.assign(state.config, partialConfig);
      });
    },

    setMountainConfig: (mountainConfig) => {
      set((state) => {
        Object.assign(state.config.mountains, mountainConfig);
      });
    },

    setRiverConfig: (riverConfig) => {
      set((state) => {
        Object.assign(state.config.rivers, riverConfig);
      });
    },

    setLakeConfig: (lakeConfig) => {
      set((state) => {
        Object.assign(state.config.lakes, lakeConfig);
      });
    },

    setForestConfig: (forestConfig) => {
      set((state) => {
        Object.assign(state.config.forests, forestConfig);
      });
    },

    setClimateConfig: (climateConfig) => {
      set((state) => {
        Object.assign(state.config.climate, climateConfig);
      });
    },

    generate: async (landMask, elevationData, plateMap) => {
      const state = get();
      if (state.isGenerating) return null;

      set((s) => {
        s.isGenerating = true;
        s.progress = null;
        s.error = null;
      });

      try {
        const width = Math.sqrt(landMask.length);
        const height = width;

        const generator = new FeatureGenerator(
          state.config,
          width,
          height,
          (progress) => {
            set((s) => {
              s.progress = progress;
            });
          }
        );

        const result = await generator.generate(
          landMask,
          elevationData,
          plateMap
        );

        set((s) => {
          s.result = result;
          s.isGenerating = false;
          s.progress = null;
        });

        return result;
      } catch (error) {
        set((s) => {
          s.error = error instanceof Error ? error.message : 'Feature generation failed';
          s.isGenerating = false;
          s.progress = null;
        });
        return null;
      }
    },

    setVisibility: (feature, visible) => {
      set((state) => {
        (state as any)[feature] = visible;
      });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Selector hooks
export const useFeatureConfig = () => useFeatureStore((s) => s.config);
export const useFeatureResult = () => useFeatureStore((s) => s.result);
export const useFeatureProgress = () =>
  useFeatureStore((s) => ({
    isGenerating: s.isGenerating,
    progress: s.progress,
  }));
```

---

## 6.10 Feature Generation UI Panel

### 6.10.1 src/components/panels/FeaturePanel.tsx

**Instruction for Claude Code:**
> Create the feature panel UI at `src/components/panels/FeaturePanel.tsx`. This provides controls for feature generation parameters.

```typescript
import { useState, useCallback } from 'react';
import {
  Mountain,
  Waves,
  Droplets,
  Trees,
  Cloud,
  Play,
  Square,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import {
  useFeatureStore,
  useFeatureConfig,
  useFeatureProgress,
} from '@/stores/useFeatureStore';
import { useGenerationStore } from '@/stores/useGenerationStore';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon,
  enabled,
  onToggle,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-ink-800">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          className="flex items-center gap-2 hover:bg-ink-800/50 transition-colors flex-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-ink-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ink-400" />
          )}
          <span className="text-ink-400">{icon}</span>
          <span className="text-sm font-medium text-ink-200">{title}</span>
        </button>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {isOpen && enabled && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: SliderFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-400">{label}</label>
        <span className="text-xs text-ink-300 tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export function FeaturePanel() {
  const config = useFeatureConfig();
  const { isGenerating, progress } = useFeatureProgress();
  const generationResult = useGenerationStore((s) => s.result);
  
  const {
    setMountainConfig,
    setRiverConfig,
    setLakeConfig,
    setForestConfig,
    setClimateConfig,
    generate,
    showMountains,
    showRivers,
    showLakes,
    showForests,
    showClimate,
    setVisibility,
  } = useFeatureStore();

  const handleGenerate = useCallback(async () => {
    if (!generationResult) return;
    
    await generate(
      generationResult.landMask,
      generationResult.heightmap,
      generationResult.plateMap
    );
  }, [generationResult, generate]);

  const canGenerate = !!generationResult && !isGenerating;

  return (
    <div className="flex flex-col h-full bg-ink-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-800">
        <h2 className="text-sm font-semibold text-ink-100">Features</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showMountains', !showMountains)}
            title="Toggle Mountains"
          >
            <Mountain className={cn('w-4 h-4', showMountains ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showRivers', !showRivers)}
            title="Toggle Rivers"
          >
            <Waves className={cn('w-4 h-4', showRivers ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showLakes', !showLakes)}
            title="Toggle Lakes"
          >
            <Droplets className={cn('w-4 h-4', showLakes ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showForests', !showForests)}
            title="Toggle Forests"
          >
            <Trees className={cn('w-4 h-4', showForests ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mountains */}
        <CollapsibleSection
          title="Mountains"
          icon={<Mountain className="w-4 h-4" />}
          enabled={config.mountains.enabled}
          onToggle={(v) => setMountainConfig({ enabled: v })}
          defaultOpen
        >
          <SliderField
            label="Range Count"
            value={config.mountains.rangeCount}
            onChange={(v) => setMountainConfig({ rangeCount: v })}
            min={1}
            max={10}
            step={1}
          />
          <SliderField
            label="Roughness"
            value={config.mountains.roughness}
            onChange={(v) => setMountainConfig({ roughness: v })}
            min={0}
            max={1}
          />
          <SliderField
            label="Isolated Peaks"
            value={config.mountains.isolatedPeakCount}
            onChange={(v) => setMountainConfig({ isolatedPeakCount: v })}
            min={0}
            max={20}
            step={1}
          />
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-400">Follow Tectonics</label>
            <Switch
              checked={config.mountains.followTectonics}
              onCheckedChange={(v) => setMountainConfig({ followTectonics: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Rivers */}
        <CollapsibleSection
          title="Rivers"
          icon={<Waves className="w-4 h-4" />}
          enabled={config.rivers.enabled}
          onToggle={(v) => setRiverConfig({ enabled: v })}
        >
          <SliderField
            label="Max Rivers"
            value={config.rivers.maxRivers}
            onChange={(v) => setRiverConfig({ maxRivers: v })}
            min={1}
            max={50}
            step={1}
          />
          <SliderField
            label="Width Multiplier"
            value={config.rivers.widthMultiplier}
            onChange={(v) => setRiverConfig({ widthMultiplier: v })}
            min={0.5}
            max={3}
          />
          <SliderField
            label="Erosion Strength"
            value={config.rivers.erosionStrength}
            onChange={(v) => setRiverConfig({ erosionStrength: v })}
            min={0}
            max={0.5}
          />
          <SliderField
            label="Meander Factor"
            value={config.rivers.meanderFactor}
            onChange={(v) => setRiverConfig({ meanderFactor: v })}
            min={0}
            max={1}
          />
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-400">Tributaries</label>
            <Switch
              checked={config.rivers.generateTributaries}
              onCheckedChange={(v) => setRiverConfig({ generateTributaries: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Lakes */}
        <CollapsibleSection
          title="Lakes"
          icon={<Droplets className="w-4 h-4" />}
          enabled={config.lakes.enabled}
          onToggle={(v) => setLakeConfig({ enabled: v })}
        >
          <SliderField
            label="Max Lakes"
            value={config.lakes.maxLakes}
            onChange={(v) => setLakeConfig({ maxLakes: v })}
            min={1}
            max={30}
            step={1}
          />
          <SliderField
            label="Min Size"
            value={config.lakes.minSize}
            onChange={(v) => setLakeConfig({ minSize: v })}
            min={10}
            max={100}
            step={5}
          />
          <SliderField
            label="Max Size"
            value={config.lakes.maxSize}
            onChange={(v) => setLakeConfig({ maxSize: v })}
            min={50}
            max={500}
            step={10}
          />
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-400">Mountain Lakes</label>
            <Switch
              checked={config.lakes.mountainLakes}
              onCheckedChange={(v) => setLakeConfig({ mountainLakes: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Forests */}
        <CollapsibleSection
          title="Forests"
          icon={<Trees className="w-4 h-4" />}
          enabled={config.forests.enabled}
          onToggle={(v) => setForestConfig({ enabled: v })}
        >
          <SliderField
            label="Coverage Target"
            value={config.forests.coverageTarget}
            onChange={(v) => setForestConfig({ coverageTarget: v })}
            min={0.1}
            max={0.7}
          />
          <SliderField
            label="Moisture Threshold"
            value={config.forests.moistureThreshold}
            onChange={(v) => setForestConfig({ moistureThreshold: v })}
            min={0.2}
            max={0.7}
          />
          <SliderField
            label="Clustering"
            value={config.forests.clustering}
            onChange={(v) => setForestConfig({ clustering: v })}
            min={0}
            max={1}
          />
          <SliderField
            label="Edge Noise"
            value={config.forests.edgeNoise}
            onChange={(v) => setForestConfig({ edgeNoise: v })}
            min={0}
            max={1}
          />
        </CollapsibleSection>

        {/* Climate */}
        <CollapsibleSection
          title="Climate"
          icon={<Cloud className="w-4 h-4" />}
          enabled={config.climate.enabled}
          onToggle={(v) => setClimateConfig({ enabled: v })}
        >
          <SliderField
            label="Equator Position"
            value={config.climate.equatorPosition}
            onChange={(v) => setClimateConfig({ equatorPosition: v })}
            min={0.2}
            max={0.8}
          />
          <SliderField
            label="Temperature Variation"
            value={config.climate.temperatureVariation}
            onChange={(v) => setClimateConfig({ temperatureVariation: v })}
            min={0}
            max={0.5}
          />
          <SliderField
            label="Rain Shadow Strength"
            value={config.climate.rainShadowStrength}
            onChange={(v) => setClimateConfig({ rainShadowStrength: v })}
            min={0}
            max={1}
          />
          <SliderField
            label="Ocean Moisture"
            value={config.climate.oceanMoistureStrength}
            onChange={(v) => setClimateConfig({ oceanMoistureStrength: v })}
            min={0.3}
            max={1}
          />
        </CollapsibleSection>
      </div>

      {/* Footer - Generation Controls */}
      <div className="border-t border-ink-800 p-3 space-y-3">
        {/* Progress Bar */}
        {isGenerating && progress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-400">{progress.message}</span>
              <span className="text-ink-300 tabular-nums">
                {Math.round(progress.progress * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-parchment-500 transition-all duration-300"
                style={{ width: `${progress.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={!canGenerate}
          variant={isGenerating ? 'destructive' : 'primary'}
        >
          {isGenerating ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate Features
            </>
          )}
        </Button>

        {!generationResult && (
          <p className="text-xs text-ink-500 text-center">
            Generate a world first in the Generation tab
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 6.11 Feature Renderer

### 6.11.1 src/core/terrain/FeatureRenderer.ts

**Instruction for Claude Code:**
> Create a feature renderer at `src/core/terrain/FeatureRenderer.ts` for drawing rivers, mountains, lakes, and forests on the terrain.

```typescript
import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js';
import type { FeatureGenerationResult, River, Lake, MountainPeak } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Feature rendering options
 */
export interface FeatureRenderOptions {
  showMountains: boolean;
  showRivers: boolean;
  showLakes: boolean;
  showForests: boolean;
  riverColor: number;
  lakeColor: number;
  mountainColor: number;
  forestColor: number;
  styleBlend: number; // 0 = realistic, 1 = parchment
}

const DEFAULT_OPTIONS: FeatureRenderOptions = {
  showMountains: true,
  showRivers: true,
  showLakes: true,
  showForests: true,
  riverColor: 0x4a90d9,
  lakeColor: 0x5b9bd5,
  mountainColor: 0x8b7355,
  forestColor: 0x228b22,
  styleBlend: 0.5,
};

/**
 * Renderer for map features (rivers, mountains, lakes, forests)
 */
export class FeatureRenderer {
  private container: Container;
  private riverGraphics: Graphics;
  private lakeGraphics: Graphics;
  private mountainGraphics: Graphics;
  private forestGraphics: Graphics;
  
  private options: FeatureRenderOptions;
  private result: FeatureGenerationResult | null = null;

  constructor(parentContainer: Container) {
    this.container = new Container();
    this.container.label = 'features';
    parentContainer.addChild(this.container);

    // Create graphics layers (order matters for z-index)
    this.forestGraphics = new Graphics();
    this.forestGraphics.label = 'forests';
    this.container.addChild(this.forestGraphics);

    this.lakeGraphics = new Graphics();
    this.lakeGraphics.label = 'lakes';
    this.container.addChild(this.lakeGraphics);

    this.riverGraphics = new Graphics();
    this.riverGraphics.label = 'rivers';
    this.container.addChild(this.riverGraphics);

    this.mountainGraphics = new Graphics();
    this.mountainGraphics.label = 'mountains';
    this.container.addChild(this.mountainGraphics);

    this.options = { ...DEFAULT_OPTIONS };
  }

  /**
   * Set rendering options
   */
  setOptions(options: Partial<FeatureRenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.updateVisibility();
    if (this.result) {
      this.render();
    }
  }

  /**
   * Update layer visibility
   */
  private updateVisibility(): void {
    this.mountainGraphics.visible = this.options.showMountains;
    this.riverGraphics.visible = this.options.showRivers;
    this.lakeGraphics.visible = this.options.showLakes;
    this.forestGraphics.visible = this.options.showForests;
  }

  /**
   * Set feature generation result and render
   */
  setResult(result: FeatureGenerationResult): void {
    this.result = result;
    this.render();
  }

  /**
   * Clear all features
   */
  clear(): void {
    this.riverGraphics.clear();
    this.lakeGraphics.clear();
    this.mountainGraphics.clear();
    this.forestGraphics.clear();
    this.result = null;
  }

  /**
   * Render all features
   */
  render(): void {
    if (!this.result) return;

    this.renderForests();
    this.renderLakes();
    this.renderRivers();
    this.renderMountains();
  }

  /**
   * Render rivers as curved lines
   */
  private renderRivers(): void {
    this.riverGraphics.clear();
    if (!this.result || !this.options.showRivers) return;

    const { styleBlend } = this.options;
    
    // Parchment style: darker, more ink-like
    const realisticColor = 0x4a90d9;
    const parchmentColor = 0x2c5f99;
    const color = this.lerpColor(realisticColor, parchmentColor, styleBlend);

    for (const river of this.result.rivers) {
      if (river.path.length < 2) continue;

      // Draw river with varying width
      for (let i = 1; i < river.path.length; i++) {
        const prev = river.path[i - 1];
        const curr = river.path[i];
        const width = Math.max(0.5, river.widths[i] * (1 - styleBlend * 0.3));

        this.riverGraphics
          .moveTo(prev.x, prev.y)
          .lineTo(curr.x, curr.y)
          .stroke({ width, color, cap: 'round', join: 'round' });
      }

      // Add parchment-style bank lines
      if (styleBlend > 0.3) {
        this.drawRiverBanks(river, styleBlend);
      }
    }
  }

  /**
   * Draw parchment-style river banks
   */
  private drawRiverBanks(river: River, styleBlend: number): void {
    const bankColor = 0x1a1a1a;
    const alpha = styleBlend * 0.3;

    for (let i = 1; i < river.path.length; i += 3) {
      const curr = river.path[i];
      const width = river.widths[i] * 1.5;

      // Small perpendicular lines to indicate banks
      const prev = river.path[i - 1];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const perpX = -dy / len;
      const perpY = dx / len;

      this.riverGraphics
        .moveTo(curr.x + perpX * width, curr.y + perpY * width)
        .lineTo(curr.x + perpX * width * 1.5, curr.y + perpY * width * 1.5)
        .stroke({ width: 0.5, color: bankColor, alpha });
    }
  }

  /**
   * Render lakes
   */
  private renderLakes(): void {
    this.lakeGraphics.clear();
    if (!this.result || !this.options.showLakes) return;

    const { styleBlend } = this.options;
    const realisticColor = 0x5b9bd5;
    const parchmentColor = 0x8bb8d9;
    const fillColor = this.lerpColor(realisticColor, parchmentColor, styleBlend);

    for (const lake of this.result.lakes) {
      if (lake.boundary.length < 3) continue;

      // Draw lake fill
      this.lakeGraphics.poly(lake.boundary.flatMap(p => [p.x, p.y]));
      this.lakeGraphics.fill({ color: fillColor, alpha: 0.8 });

      // Draw lake outline
      const outlineColor = styleBlend > 0.5 ? 0x1a1a1a : 0x3a7ab8;
      this.lakeGraphics.stroke({
        width: styleBlend > 0.5 ? 1 : 0.5,
        color: outlineColor,
        alpha: 0.6,
      });

      // Parchment style: add wave patterns
      if (styleBlend > 0.3) {
        this.drawLakeWaves(lake, styleBlend);
      }
    }
  }

  /**
   * Draw parchment-style wave patterns on lakes
   */
  private drawLakeWaves(lake: Lake, styleBlend: number): void {
    const waveColor = 0x1a1a1a;
    const alpha = styleBlend * 0.2;
    const spacing = 8;

    // Draw horizontal wave lines
    const minY = Math.min(...lake.boundary.map(p => p.y));
    const maxY = Math.max(...lake.boundary.map(p => p.y));

    for (let y = minY + spacing; y < maxY - spacing; y += spacing) {
      const intersections = this.findLakeIntersections(lake, y);
      
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x1 = intersections[i];
        const x2 = intersections[i + 1];
        
        // Draw wavy line
        this.lakeGraphics.moveTo(x1 + 2, y);
        for (let x = x1 + 4; x < x2 - 2; x += 4) {
          const waveY = y + Math.sin(x * 0.3) * 1;
          this.lakeGraphics.lineTo(x, waveY);
        }
        this.lakeGraphics.stroke({ width: 0.3, color: waveColor, alpha });
      }
    }
  }

  /**
   * Find x-intersections of lake boundary at given y
   */
  private findLakeIntersections(lake: Lake, y: number): number[] {
    const intersections: number[] = [];
    const boundary = lake.boundary;

    for (let i = 0; i < boundary.length; i++) {
      const p1 = boundary[i];
      const p2 = boundary[(i + 1) % boundary.length];

      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        const t = (y - p1.y) / (p2.y - p1.y);
        intersections.push(p1.x + t * (p2.x - p1.x));
      }
    }

    return intersections.sort((a, b) => a - b);
  }

  /**
   * Render mountain peaks
   */
  private renderMountains(): void {
    this.mountainGraphics.clear();
    if (!this.result || !this.options.showMountains) return;

    const { styleBlend } = this.options;

    for (const peak of this.result.peaks) {
      if (styleBlend > 0.3) {
        this.drawParchmentMountain(peak, styleBlend);
      } else {
        this.drawRealisticMountain(peak, styleBlend);
      }
    }
  }

  /**
   * Draw realistic mountain shading
   */
  private drawRealisticMountain(peak: MountainPeak, styleBlend: number): void {
    // Just a subtle highlight for realistic mode
    const color = 0xffffff;
    const alpha = (1 - styleBlend) * 0.15 * peak.elevation;

    this.mountainGraphics.circle(peak.position.x, peak.position.y, peak.radius * 0.3);
    this.mountainGraphics.fill({ color, alpha });
  }

  /**
   * Draw parchment-style mountain symbol
   */
  private drawParchmentMountain(peak: MountainPeak, styleBlend: number): void {
    const { position, radius, elevation } = peak;
    const color = 0x1a1a1a;
    const alpha = styleBlend * 0.6;
    const height = radius * elevation * 1.5;

    // Draw mountain triangle
    this.mountainGraphics
      .moveTo(position.x, position.y - height)
      .lineTo(position.x - radius * 0.6, position.y + radius * 0.3)
      .lineTo(position.x + radius * 0.6, position.y + radius * 0.3)
      .closePath()
      .stroke({ width: 1, color, alpha });

    // Snow cap for high peaks
    if (elevation > 0.8) {
      const snowHeight = height * 0.3;
      this.mountainGraphics
        .moveTo(position.x, position.y - height)
        .lineTo(position.x - radius * 0.2, position.y - height + snowHeight)
        .lineTo(position.x + radius * 0.2, position.y - height + snowHeight)
        .closePath()
        .fill({ color: 0xffffff, alpha: alpha * 0.8 });
    }
  }

  /**
   * Render forest density
   */
  private renderForests(): void {
    this.forestGraphics.clear();
    if (!this.result || !this.options.showForests) return;

    const { styleBlend } = this.options;

    for (const forest of this.result.forests) {
      if (styleBlend > 0.3) {
        this.drawParchmentForest(forest.boundary, forest.averageDensity, styleBlend);
      }
      // Realistic forest is handled by biome colors
    }
  }

  /**
   * Draw parchment-style forest symbols
   */
  private drawParchmentForest(
    boundary: Vector2[],
    density: number,
    styleBlend: number
  ): void {
    if (boundary.length < 3) return;

    const color = 0x1a1a1a;
    const alpha = styleBlend * 0.4 * density;

    // Calculate bounding box
    const minX = Math.min(...boundary.map(p => p.x));
    const maxX = Math.max(...boundary.map(p => p.x));
    const minY = Math.min(...boundary.map(p => p.y));
    const maxY = Math.max(...boundary.map(p => p.y));

    // Draw tree symbols
    const spacing = 12 / density;
    
    for (let y = minY; y < maxY; y += spacing) {
      for (let x = minX; x < maxX; x += spacing) {
        // Check if point is inside boundary (simple ray casting)
        if (!this.isPointInPolygon({ x, y }, boundary)) continue;

        // Draw small tree symbol
        const treeHeight = 4 + Math.random() * 3;
        this.mountainGraphics
          .moveTo(x, y)
          .lineTo(x - 2, y + treeHeight)
          .lineTo(x + 2, y + treeHeight)
          .closePath()
          .fill({ color, alpha: alpha * 0.6 });
      }
    }
  }

  /**
   * Check if point is inside polygon
   */
  private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Linear interpolation between colors
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

---

## 6.12 Index Exports

### 6.12.1 src/core/generation/features/index.ts

**Instruction for Claude Code:**
> Create index file at `src/core/generation/features/index.ts`.

```typescript
export * from './types';
export { MountainGenerator, DEFAULT_MOUNTAIN_CONFIG } from './MountainGenerator';
export { RiverGenerator, DEFAULT_RIVER_CONFIG } from './RiverGenerator';
export { LakeGenerator, DEFAULT_LAKE_CONFIG } from './LakeGenerator';
export { ForestGenerator, DEFAULT_FOREST_CONFIG } from './ForestGenerator';
export { ClimateGenerator, DEFAULT_CLIMATE_CONFIG } from './ClimateGenerator';
export { BiomeAssigner } from './BiomeAssigner';
export { FeatureGenerator, DEFAULT_FEATURE_CONFIG } from './FeatureGenerator';
```

---

## 6.13 Verification Checklist for Phase 6

After implementing Phase 6, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ Feature panel appears in left panel tabs
□ Mountain section expands/collapses
□ Mountain enabled toggle works
□ Range count, roughness, isolated peaks sliders work
□ Follow tectonics toggle works
□ River section expands/collapses
□ River enabled toggle works
□ Max rivers, width, erosion, meander sliders work
□ Tributaries toggle works
□ Lake section expands/collapses
□ Lake enabled toggle works
□ Max lakes, min/max size sliders work
□ Mountain lakes toggle works
□ Forest section expands/collapses
□ Forest enabled toggle works
□ Coverage, moisture threshold, clustering sliders work
□ Climate section expands/collapses
□ Climate enabled toggle works
□ Equator position, temperature variation sliders work
□ Rain shadow, ocean moisture sliders work
□ Generate Features button works
□ Progress bar shows during generation
□ Mountains appear on terrain after generation
□ Mountain ranges follow expected shapes
□ Isolated peaks appear separately
□ Rivers flow from mountains to ocean
□ Rivers vary in width (narrow at source, wide at mouth)
□ River paths meander appropriately
□ Lakes appear in terrain depressions
□ Lakes connect to rivers where appropriate
□ Mountain lakes appear at high elevations
□ Forests cluster in appropriate climate zones
□ Forest density varies based on moisture
□ Biomes update based on climate
□ Visibility toggles work for each feature type
□ Parchment style renders features differently
□ Feature generation completes in reasonable time
□ No memory leaks on repeated generation
□ Features integrate with existing terrain renderer
```

---

## Summary

Phase 6 establishes the procedural feature generation system:

1. **Mountain Generator** - Spine-based mountain ranges with isolated peaks
2. **River Generator** - Flow accumulation algorithm for realistic river networks
3. **Lake Generator** - Depression-based lake placement with mountain lakes
4. **Forest Generator** - Climate-aware forest distribution
5. **Climate Generator** - Temperature, moisture, and rain shadow simulation
6. **Biome Assigner** - Automatic biome assignment from climate data
7. **Feature Renderer** - Visual rendering of all features with style blending
8. **Feature Store** - State management for feature generation
9. **Feature Panel** - Complete UI for feature controls

---

## Next Steps

**Phase 7: Feature Tools (Mountains, Forests, Water)** will cover:
- Mountain stamp/path tool for manual placement
- Forest brush with procedural variation
- River/path spline tool for drawing waterways
- Lake shape tool
- Feature eraser and modification tools
- Integration with undo/redo system