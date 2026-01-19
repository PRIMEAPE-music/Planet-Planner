# PHASE 5: Procedural Generation - Landmass

## Detailed Instructional Guide for Claude Code

---

## Overview

Phase 5 builds the procedural continent/landmass generation system for Planet Planner:
- Multi-octave noise-based continent generation with configurable parameters
- Coastline detail algorithms (roughening, fjords, bays, peninsulas)
- Island and archipelago generation
- Tectonic plate simulation for realistic continent shapes
- Seed system for reproducible generation
- Generation parameter UI panel with live preview
- Generation presets (Pangaea, archipelago, continental, etc.)

---

## 5.1 Generation System Architecture

### 5.1.1 src/core/generation/types.ts

**Instruction for Claude Code:**
> Create a new file at `src/core/generation/types.ts`. This defines all TypeScript types for the landmass generation system. The types support configurable noise parameters, coastline styles, and generation presets.

```typescript
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
```

---

### 5.1.2 src/core/generation/noise/SimplexNoise.ts

**Instruction for Claude Code:**
> Create a new file at `src/core/generation/noise/SimplexNoise.ts`. This implements a seeded Simplex noise generator. Simplex noise is preferred over Perlin noise for terrain generation due to fewer directional artifacts.

```typescript
/**
 * Seeded Simplex Noise implementation
 * Based on Stefan Gustavson's implementation
 * Optimized for terrain generation
 */
export class SimplexNoise {
  private perm: Uint8Array;
  private permMod12: Uint8Array;
  
  // Gradient vectors for 2D
  private static readonly grad2 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  // Skewing factors for 2D
  private static readonly F2 = 0.5 * (Math.sqrt(3) - 1);
  private static readonly G2 = (3 - Math.sqrt(3)) / 6;

  constructor(seed: number = 0) {
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    this.seed(seed);
  }

  /**
   * Initialize permutation table with seed
   */
  seed(seed: number): void {
    // Create base permutation
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Shuffle using seeded random
    let s = seed;
    for (let i = 255; i > 0; i--) {
      // Simple LCG for seeded random
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Extend to 512 for wrapping
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  /**
   * 2D Simplex noise
   * @returns Value in range [-1, 1]
   */
  noise2D(x: number, y: number): number {
    const { F2, G2, grad2 } = SimplexNoise;
    
    // Skew input space to determine simplex cell
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew back to (x, y) space
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;

    // Distances from cell origin
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex we're in
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    // Offsets for corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hash coordinates
    const ii = i & 255;
    const jj = j & 255;

    // Calculate contributions from corners
    let n0 = 0, n1 = 0, n2 = 0;

    // Corner 0
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = this.permMod12[ii + this.perm[jj]] % 8;
      t0 *= t0;
      n0 = t0 * t0 * (grad2[gi0][0] * x0 + grad2[gi0][1] * y0);
    }

    // Corner 1
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] % 8;
      t1 *= t1;
      n1 = t1 * t1 * (grad2[gi1][0] * x1 + grad2[gi1][1] * y1);
    }

    // Corner 2
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] % 8;
      t2 *= t2;
      n2 = t2 * t2 * (grad2[gi2][0] * x2 + grad2[gi2][1] * y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  /**
   * Fractional Brownian Motion (multi-octave noise)
   */
  fbm(
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Ridged multi-fractal noise (good for mountain ridges)
   */
  ridged(
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      // Take absolute value and invert to create ridges
      let signal = this.noise2D(x * frequency, y * frequency);
      signal = 1 - Math.abs(signal);
      signal *= signal; // Square for sharper ridges
      
      total += signal * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Turbulence (absolute value noise)
   */
  turbulence(
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += Math.abs(this.noise2D(x * frequency, y * frequency)) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
```

---

### 5.1.3 src/core/generation/noise/WorleyNoise.ts

**Instruction for Claude Code:**
> Create a new file at `src/core/generation/noise/WorleyNoise.ts`. Worley (cellular) noise creates organic cell-like patterns useful for island clusters and tectonic plates.

```typescript
import type { Vector2 } from '@/types';

/**
 * Seeded Worley (Cellular) Noise implementation
 * Creates organic cell-like patterns
 */
export class WorleyNoise {
  private seed: number;

  constructor(seed: number = 0) {
    this.seed = seed;
  }

  /**
   * Seeded pseudo-random number generator
   */
  private random(x: number, y: number, seed: number = 0): number {
    // Hash function
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  }

  /**
   * Generate random point in cell
   */
  private cellPoint(cellX: number, cellY: number): Vector2 {
    const r1 = this.random(cellX, cellY, this.seed);
    const r2 = this.random(cellX, cellY, this.seed + 1);
    return {
      x: cellX + r1,
      y: cellY + r2,
    };
  }

  /**
   * Calculate Worley noise at point
   * @param x X coordinate
   * @param y Y coordinate
   * @param distanceType Distance metric to use
   * @returns Value in range [0, 1]
   */
  noise2D(
    x: number,
    y: number,
    distanceType: 'euclidean' | 'manhattan' | 'chebyshev' = 'euclidean'
  ): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    let minDist = Infinity;

    // Check surrounding cells (3x3 grid)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = this.cellPoint(cellX + dx, cellY + dy);
        
        let dist: number;
        switch (distanceType) {
          case 'manhattan':
            dist = Math.abs(x - neighbor.x) + Math.abs(y - neighbor.y);
            break;
          case 'chebyshev':
            dist = Math.max(Math.abs(x - neighbor.x), Math.abs(y - neighbor.y));
            break;
          case 'euclidean':
          default:
            const dx2 = x - neighbor.x;
            const dy2 = y - neighbor.y;
            dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        }

        minDist = Math.min(minDist, dist);
      }
    }

    // Normalize to [0, 1] (approximate)
    return Math.min(1, minDist);
  }

  /**
   * Get F1-F2 difference (creates cell boundaries)
   */
  noise2D_F1F2(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    let dist1 = Infinity;
    let dist2 = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = this.cellPoint(cellX + dx, cellY + dy);
        const ddx = x - neighbor.x;
        const ddy = y - neighbor.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);

        if (dist < dist1) {
          dist2 = dist1;
          dist1 = dist;
        } else if (dist < dist2) {
          dist2 = dist;
        }
      }
    }

    return dist2 - dist1;
  }

  /**
   * Get cell ID at point (for plate assignments)
   */
  getCellId(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    let minDist = Infinity;
    let closestCell = { x: 0, y: 0 };

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = this.cellPoint(cellX + dx, cellY + dy);
        const ddx = x - neighbor.x;
        const ddy = y - neighbor.y;
        const dist = ddx * ddx + ddy * ddy;

        if (dist < minDist) {
          minDist = dist;
          closestCell = { x: cellX + dx, y: cellY + dy };
        }
      }
    }

    // Return unique ID for cell
    return (closestCell.x * 73856093) ^ (closestCell.y * 19349663);
  }

  /**
   * Update seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
}
```

---

### 5.1.4 src/core/generation/noise/index.ts

**Instruction for Claude Code:**
> Create an index file at `src/core/generation/noise/index.ts` to export all noise generators.

```typescript
export { SimplexNoise } from './SimplexNoise';
export { WorleyNoise } from './WorleyNoise';
```

---

## 5.2 Landmass Generator Core

### 5.2.1 src/core/generation/LandmassGenerator.ts

**Instruction for Claude Code:**
> Create the main landmass generator at `src/core/generation/LandmassGenerator.ts`. This orchestrates all generation steps and produces the final heightmap and land mask.

```typescript
import { SimplexNoise, WorleyNoise } from './noise';
import type {
  LandmassGenerationConfig,
  GenerationResult,
  GenerationProgress,
  NoiseConfig,
  CoastlineConfig,
  IslandConfig,
  TectonicConfig,
  GenerationSeed,
} from './types';
import type { Vector2 } from '@/types';

/**
 * Main landmass generation engine
 * Produces heightmaps and land masks from configuration
 */
export class LandmassGenerator {
  private config: LandmassGenerationConfig;
  private simplexNoise: SimplexNoise;
  private worleyNoise: WorleyNoise;
  private onProgress?: (progress: GenerationProgress) => void;

  constructor(
    config: LandmassGenerationConfig,
    onProgress?: (progress: GenerationProgress) => void
  ) {
    this.config = config;
    this.onProgress = onProgress;
    this.simplexNoise = new SimplexNoise(config.seed.value);
    this.worleyNoise = new WorleyNoise(config.seed.value);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LandmassGenerationConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.seed) {
      this.simplexNoise.seed(config.seed.value);
      this.worleyNoise.setSeed(config.seed.value);
    }
  }

  /**
   * Report progress
   */
  private report(
    stage: GenerationProgress['stage'],
    progress: number,
    message: string
  ): void {
    this.onProgress?.({ stage, progress, message });
  }

  /**
   * Main generation entry point
   */
  async generate(): Promise<GenerationResult> {
    const startTime = performance.now();
    const { width, height } = this.config;
    const size = width * height;

    // Initialize arrays
    const heightmap = new Float32Array(size);
    const landMask = new Uint8Array(size);
    let plateMap: Uint8Array | undefined;

    // Step 1: Generate base terrain noise
    this.report('noise', 0, 'Generating base terrain...');
    this.generateBaseNoise(heightmap);
    this.report('noise', 1, 'Base terrain complete');

    // Step 2: Apply continent shaping
    this.report('continents', 0, 'Shaping continents...');
    this.applyContientShaping(heightmap);
    this.report('continents', 0.5, 'Applying sea level...');
    this.applySeaLevel(heightmap, landMask);
    this.report('continents', 1, 'Continents shaped');

    // Step 3: Generate tectonic plates (if enabled)
    if (this.config.tectonics.enabled) {
      this.report('tectonics', 0, 'Simulating tectonics...');
      plateMap = this.generateTectonicPlates(heightmap, landMask);
      this.report('tectonics', 1, 'Tectonics complete');
    }

    // Step 4: Apply coastline detail
    this.report('coastlines', 0, 'Detailing coastlines...');
    this.applyCoastlineDetail(heightmap, landMask);
    this.report('coastlines', 1, 'Coastlines detailed');

    // Step 5: Generate islands
    let islandCenters: Vector2[] = [];
    if (this.config.islands.enabled) {
      this.report('islands', 0, 'Generating islands...');
      islandCenters = this.generateIslands(heightmap, landMask);
      this.report('islands', 1, 'Islands generated');
    }

    // Step 6: Extract coastline points
    this.report('finalizing', 0, 'Extracting coastlines...');
    const coastlinePoints = this.extractCoastlinePoints(landMask);
    this.report('finalizing', 0.5, 'Calculating statistics...');

    // Calculate metadata
    const landCoverage = this.calculateLandCoverage(landMask);
    const continentCount = this.countContinents(landMask);
    const islandCount = islandCenters.length;
    const generationTime = performance.now() - startTime;

    this.report('finalizing', 1, 'Generation complete');

    return {
      heightmap,
      landMask,
      plateMap,
      coastlinePoints,
      islandCenters,
      metadata: {
        seed: this.config.seed.value,
        landCoverage,
        continentCount,
        islandCount,
        generationTime,
      },
    };
  }

  /**
   * Generate base terrain using multi-octave noise
   */
  private generateBaseNoise(heightmap: Float32Array): void {
    const { width, height, terrainNoise } = this.config;
    const { frequency, octaves, persistence, lacunarity } = terrainNoise;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;

        let value: number;
        
        switch (terrainNoise.type) {
          case 'ridged':
            value = this.simplexNoise.ridged(
              nx * frequency,
              ny * frequency,
              octaves,
              persistence,
              lacunarity
            );
            break;
          case 'worley':
            value = 1 - this.worleyNoise.noise2D(nx * frequency, ny * frequency);
            break;
          case 'perlin':
          case 'simplex':
          default:
            value = this.simplexNoise.fbm(
              nx * frequency,
              ny * frequency,
              octaves,
              persistence,
              lacunarity
            );
            // Normalize from [-1, 1] to [0, 1]
            value = (value + 1) / 2;
        }

        heightmap[y * width + x] = value;
      }
    }
  }

  /**
   * Apply continent shaping (edge falloff, stretching, fragmentation)
   */
  private applyContientShaping(heightmap: Float32Array): void {
    const { width, height, continentShape } = this.config;
    const { edgeFalloff, edgeFalloffStrength, stretchX, stretchY, fragmentation } = continentShape;

    // Apply fragmentation noise
    if (fragmentation > 0) {
      const fragmentNoise = new SimplexNoise(this.config.seed.value + 1000);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const nx = (x / width) * stretchX;
          const ny = (y / height) * stretchY;
          
          // Higher fragmentation = more small-scale noise that can break up land
          const fragment = fragmentNoise.fbm(nx * 8, ny * 8, 4, 0.5, 2.0);
          heightmap[idx] += fragment * fragmentation * 0.3;
        }
      }
    }

    // Apply edge falloff
    if (edgeFalloff !== 'none') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const nx = (x / width) * 2 - 1; // -1 to 1
          const ny = (y / height) * 2 - 1;

          let falloff: number;
          
          switch (edgeFalloff) {
            case 'circular':
              // Distance from center
              const dist = Math.sqrt(nx * nx + ny * ny);
              falloff = Math.max(0, 1 - dist);
              falloff = this.smoothstep(0, 1, falloff);
              break;
              
            case 'square':
              // Distance from edges
              const edgeDistX = 1 - Math.abs(nx);
              const edgeDistY = 1 - Math.abs(ny);
              falloff = Math.min(edgeDistX, edgeDistY);
              falloff = this.smoothstep(0, 0.5, falloff);
              break;
              
            case 'gradient':
              // Top-to-bottom gradient (good for single continent)
              falloff = 1 - Math.abs(ny);
              falloff = this.smoothstep(0, 1, falloff);
              break;
              
            default:
              falloff = 1;
          }

          // Apply falloff with configurable strength
          const blendedFalloff = 1 - (1 - falloff) * edgeFalloffStrength;
          heightmap[idx] *= blendedFalloff;
        }
      }
    }
  }

  /**
   * Apply sea level threshold to create land mask
   */
  private applySeaLevel(heightmap: Float32Array, landMask: Uint8Array): void {
    const { seaLevel, landRatio } = this.config.continentShape;
    const size = heightmap.length;

    // First pass: find threshold for desired land ratio
    const sorted = Float32Array.from(heightmap).sort();
    const targetThreshold = sorted[Math.floor(size * (1 - landRatio))];
    
    // Use the higher of seaLevel or calculated threshold
    const threshold = Math.max(seaLevel, targetThreshold);

    // Apply threshold
    for (let i = 0; i < size; i++) {
      landMask[i] = heightmap[i] >= threshold ? 1 : 0;
    }
  }

  /**
   * Generate tectonic plates using Worley noise
   */
  private generateTectonicPlates(
    heightmap: Float32Array,
    landMask: Uint8Array
  ): Uint8Array {
    const { width, height } = this.config;
    const { plateCount, boundaryNoise, convergentMountains, divergentRifts } = this.config.tectonics;
    
    const plateMap = new Uint8Array(width * height);
    const plateNoise = new WorleyNoise(this.config.seed.value + 2000);
    
    // Assign plates
    const plateScale = Math.sqrt(plateCount) * 2;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const nx = x / width * plateScale;
        const ny = y / height * plateScale;
        
        // Get plate ID (0 to plateCount-1)
        const cellId = plateNoise.getCellId(nx, ny);
        plateMap[idx] = Math.abs(cellId) % plateCount;
        
        // Modify heightmap at plate boundaries
        const boundaryDist = plateNoise.noise2D_F1F2(nx, ny);
        
        if (boundaryDist < 0.1) { // At boundary
          // Add noise to boundary
          const bNoise = this.simplexNoise.noise2D(
            (x / width) * 20,
            (y / height) * 20
          ) * boundaryNoise;
          
          // Convergent = mountains, divergent = rifts
          const isConvergent = (cellId % 2) === 0;
          
          if (isConvergent && convergentMountains) {
            heightmap[idx] += 0.2 + bNoise;
          } else if (!isConvergent && divergentRifts) {
            heightmap[idx] -= 0.1 + bNoise * 0.5;
          }
        }
      }
    }

    return plateMap;
  }

  /**
   * Apply coastline detail (fjords, bays, peninsulas)
   */
  private applyCoastlineDetail(heightmap: Float32Array, landMask: Uint8Array): void {
    const { width, height } = this.config;
    const coastline = this.config.coastline;
    
    // Create detail noise
    const detailNoise = new SimplexNoise(this.config.seed.value + 3000);
    const fjordNoise = new SimplexNoise(this.config.seed.value + 3001);
    const bayNoise = new SimplexNoise(this.config.seed.value + 3002);
    
    // Find coastline pixels
    const coastlinePixels = this.findCoastlinePixels(landMask);
    
    // Apply detail to coastline area
    for (const { x, y } of coastlinePixels) {
      const idx = y * width + x;
      const nx = x / width;
      const ny = y / height;
      
      // Base roughness
      let modifier = detailNoise.fbm(
        nx * coastline.detailFrequency,
        ny * coastline.detailFrequency,
        4,
        0.5,
        2.0
      ) * coastline.detailAmplitude * coastline.roughness;

      // Fjords (deep inlets)
      if (coastline.fjords) {
        const fjord = fjordNoise.ridged(
          nx * coastline.fjordFrequency,
          ny * coastline.fjordFrequency,
          3,
          0.5,
          2.0
        );
        if (fjord > 0.7) {
          modifier -= coastline.fjordDepth * (fjord - 0.7) / 0.3;
        }
      }

      // Bays
      if (coastline.bays) {
        const bay = bayNoise.noise2D(
          nx * coastline.bayFrequency,
          ny * coastline.bayFrequency
        );
        if (bay > 0.6) {
          modifier -= coastline.baySize * (bay - 0.6) / 0.4;
        }
      }

      // Peninsulas
      if (coastline.peninsulas) {
        const peninsula = detailNoise.noise2D(
          nx * coastline.peninsulaFrequency + 100,
          ny * coastline.peninsulaFrequency + 100
        );
        if (peninsula > 0.7) {
          modifier += 0.15 * (peninsula - 0.7) / 0.3;
        }
      }

      heightmap[idx] += modifier;
    }

    // Re-apply sea level after modifications
    const threshold = this.config.continentShape.seaLevel;
    for (let i = 0; i < heightmap.length; i++) {
      landMask[i] = heightmap[i] >= threshold ? 1 : 0;
    }

    // Smooth coastlines
    for (let i = 0; i < coastline.smoothingIterations; i++) {
      this.smoothCoastline(landMask);
    }
  }

  /**
   * Find pixels on the coastline (land adjacent to water)
   */
  private findCoastlinePixels(landMask: Uint8Array): Vector2[] {
    const { width, height } = this.config;
    const pixels: Vector2[] = [];
    const searchRadius = 3;

    for (let y = searchRadius; y < height - searchRadius; y++) {
      for (let x = searchRadius; x < width - searchRadius; x++) {
        const idx = y * width + x;
        
        // Check if near coastline
        let nearWater = false;
        let nearLand = false;
        
        for (let dy = -searchRadius; dy <= searchRadius && !(nearWater && nearLand); dy++) {
          for (let dx = -searchRadius; dx <= searchRadius && !(nearWater && nearLand); dx++) {
            const ni = (y + dy) * width + (x + dx);
            if (landMask[ni] === 1) nearLand = true;
            else nearWater = true;
          }
        }
        
        if (nearWater && nearLand) {
          pixels.push({ x, y });
        }
      }
    }

    return pixels;
  }

  /**
   * Smooth coastline using cellular automata rules
   */
  private smoothCoastline(landMask: Uint8Array): void {
    const { width, height } = this.config;
    const temp = new Uint8Array(landMask);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        // Count neighbors
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (temp[(y + dy) * width + (x + dx)] === 1) {
              neighbors++;
            }
          }
        }
        
        // Smooth based on neighbor count
        if (neighbors >= 5) landMask[idx] = 1;
        else if (neighbors <= 3) landMask[idx] = 0;
        // else keep current value
      }
    }
  }

  /**
   * Generate islands and archipelagos
   */
  private generateIslands(
    heightmap: Float32Array,
    landMask: Uint8Array
  ): Vector2[] {
    const { width, height } = this.config;
    const islands = this.config.islands;
    const islandCenters: Vector2[] = [];

    // Generate cluster centers
    const clusterCenters: Vector2[] = [];
    const clusterRng = this.seededRandom(this.config.seed.value + 4000);

    for (let i = 0; i < islands.clusterCount; i++) {
      let attempts = 0;
      let center: Vector2 | null = null;

      while (attempts < 100 && !center) {
        const x = Math.floor(clusterRng() * width);
        const y = Math.floor(clusterRng() * height);
        const idx = y * width + x;

        // Check if in water and far enough from land
        if (landMask[idx] === 0) {
          const distToLand = this.distanceToLand(x, y, landMask);
          if (
            distToLand >= islands.mainlandDistance.min &&
            distToLand <= islands.mainlandDistance.max
          ) {
            center = { x, y };
          }
        }
        attempts++;
      }

      if (center) {
        clusterCenters.push(center);
      }
    }

    // Generate islands in each cluster
    const islandRng = this.seededRandom(this.config.seed.value + 4001);

    for (const cluster of clusterCenters) {
      const islandCount = Math.floor(
        islandRng() * (islands.islandsPerCluster.max - islands.islandsPerCluster.min + 1) +
        islands.islandsPerCluster.min
      );

      for (let i = 0; i < islandCount; i++) {
        // Random position within cluster
        const angle = islandRng() * Math.PI * 2;
        const dist = islandRng() * islands.clusterSpread;
        const ix = Math.floor(cluster.x + Math.cos(angle) * dist);
        const iy = Math.floor(cluster.y + Math.sin(angle) * dist);

        if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;
        if (landMask[iy * width + ix] === 1) continue;

        // Island size
        const size = Math.floor(
          islandRng() * (islands.sizeRange.max - islands.sizeRange.min + 1) +
          islands.sizeRange.min
        );

        // Generate island shape
        this.generateSingleIsland(ix, iy, size, heightmap, landMask, islandRng);
        islandCenters.push({ x: ix, y: iy });
      }
    }

    return islandCenters;
  }

  /**
   * Generate a single island at position
   */
  private generateSingleIsland(
    cx: number,
    cy: number,
    size: number,
    heightmap: Float32Array,
    landMask: Uint8Array,
    rng: () => number
  ): void {
    const { width, height } = this.config;
    const shapeVariation = this.config.islands.shapeVariation;

    // Create island shape using noise-modified circle
    const islandNoise = new SimplexNoise(Math.floor(rng() * 1000000));

    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const idx = y * width + x;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Noise-modified radius
        const angle = Math.atan2(dy, dx);
        const noiseVal = islandNoise.noise2D(
          Math.cos(angle) * 2,
          Math.sin(angle) * 2
        );
        const radius = size * (1 + noiseVal * shapeVariation);
        
        if (dist <= radius) {
          // Elevation falls off from center
          const elevation = (1 - dist / radius) * 0.3 + this.config.continentShape.seaLevel + 0.05;
          heightmap[idx] = Math.max(heightmap[idx], elevation);
          landMask[idx] = 1;
        }
      }
    }
  }

  /**
   * Calculate distance to nearest land
   */
  private distanceToLand(x: number, y: number, landMask: Uint8Array): number {
    const { width, height } = this.config;
    const maxDist = Math.max(width, height);

    for (let r = 1; r < maxDist; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          
          if (landMask[ny * width + nx] === 1) {
            return r;
          }
        }
      }
    }

    return maxDist;
  }

  /**
   * Extract coastline points for rendering
   */
  private extractCoastlinePoints(landMask: Uint8Array): Vector2[][] {
    const { width, height } = this.config;
    const coastlines: Vector2[][] = [];
    const visited = new Set<number>();

    // Find all coastline starting points
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (visited.has(idx)) continue;
        if (landMask[idx] !== 1) continue;
        
        // Check if on coastline
        let isCoastline = false;
        for (let dy = -1; dy <= 1 && !isCoastline; dy++) {
          for (let dx = -1; dx <= 1 && !isCoastline; dx++) {
            if (landMask[(y + dy) * width + (x + dx)] === 0) {
              isCoastline = true;
            }
          }
        }
        
        if (isCoastline) {
          // Trace coastline
          const points = this.traceCoastline(x, y, landMask, visited);
          if (points.length > 10) { // Filter tiny coastlines
            coastlines.push(points);
          }
        }
      }
    }

    return coastlines;
  }

  /**
   * Trace a coastline from starting point
   */
  private traceCoastline(
    startX: number,
    startY: number,
    landMask: Uint8Array,
    visited: Set<number>
  ): Vector2[] {
    const { width, height } = this.config;
    const points: Vector2[] = [];
    
    let x = startX;
    let y = startY;
    const directions = [
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 },
    ];
    
    const maxPoints = 10000;
    
    while (points.length < maxPoints) {
      const idx = y * width + x;
      
      if (visited.has(idx) && points.length > 2) break;
      
      visited.add(idx);
      points.push({ x, y });
      
      // Find next coastline point
      let found = false;
      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        
        const ni = ny * width + nx;
        if (visited.has(ni)) continue;
        if (landMask[ni] !== 1) continue;
        
        // Check if on coastline
        let isCoastline = false;
        for (let ddy = -1; ddy <= 1 && !isCoastline; ddy++) {
          for (let ddx = -1; ddx <= 1 && !isCoastline; ddx++) {
            const checkY = ny + ddy;
            const checkX = nx + ddx;
            if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
              if (landMask[checkY * width + checkX] === 0) {
                isCoastline = true;
              }
            }
          }
        }
        
        if (isCoastline) {
          x = nx;
          y = ny;
          found = true;
          break;
        }
      }
      
      if (!found) break;
    }
    
    return points;
  }

  /**
   * Calculate land coverage percentage
   */
  private calculateLandCoverage(landMask: Uint8Array): number {
    let landCount = 0;
    for (let i = 0; i < landMask.length; i++) {
      if (landMask[i] === 1) landCount++;
    }
    return landCount / landMask.length;
  }

  /**
   * Count distinct continents using flood fill
   */
  private countContinents(landMask: Uint8Array): number {
    const { width, height } = this.config;
    const visited = new Uint8Array(width * height);
    let count = 0;
    const minSize = 1000; // Minimum pixels to count as continent

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (landMask[idx] === 1 && visited[idx] === 0) {
          const size = this.floodFill(x, y, landMask, visited);
          if (size >= minSize) {
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * Flood fill to mark connected land and return size
   */
  private floodFill(
    startX: number,
    startY: number,
    landMask: Uint8Array,
    visited: Uint8Array
  ): number {
    const { width, height } = this.config;
    const stack: Vector2[] = [{ x: startX, y: startY }];
    let size = 0;

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const idx = y * width + x;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[idx] === 1 || landMask[idx] === 0) continue;

      visited[idx] = 1;
      size++;

      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

    return size;
  }

  /**
   * Smoothstep interpolation
   */
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Create seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }
}
```

---

## 5.3 Generation Presets

### 5.3.1 src/core/generation/presets.ts

**Instruction for Claude Code:**
> Create preset definitions at `src/core/generation/presets.ts`. These provide quick starting configurations for different world types.

```typescript
import type { PresetDefinition, LandmassGenerationConfig } from './types';

/**
 * Default generation configuration
 */
export const DEFAULT_GENERATION_CONFIG: LandmassGenerationConfig = {
  seed: { value: Date.now(), display: '' },
  width: 512,
  height: 512,
  terrainNoise: {
    frequency: 3,
    octaves: 6,
    persistence: 0.5,
    lacunarity: 2.0,
    type: 'simplex',
  },
  continentShape: {
    landRatio: 0.35,
    seaLevel: 0.4,
    edgeFalloff: 'circular',
    edgeFalloffStrength: 0.8,
    fragmentation: 0.3,
    stretchX: 1.0,
    stretchY: 1.0,
  },
  coastline: {
    roughness: 0.5,
    detailFrequency: 15,
    detailAmplitude: 0.1,
    fjords: true,
    fjordFrequency: 8,
    fjordDepth: 0.15,
    bays: true,
    bayFrequency: 6,
    baySize: 0.1,
    peninsulas: true,
    peninsulaFrequency: 4,
    smoothingIterations: 2,
  },
  islands: {
    enabled: true,
    clusterCount: 3,
    islandsPerCluster: { min: 3, max: 8 },
    sizeRange: { min: 5, max: 20 },
    clusterSpread: 50,
    mainlandDistance: { min: 30, max: 150 },
    shapeVariation: 0.3,
  },
  tectonics: {
    enabled: false,
    plateCount: 8,
    boundaryNoise: 0.1,
    convergentMountains: true,
    divergentRifts: true,
  },
  quality: 'normal',
};

/**
 * Generation presets
 */
export const GENERATION_PRESETS: PresetDefinition[] = [
  {
    id: 'continental',
    name: 'Continental',
    description: 'Multiple distinct continents with realistic coastlines',
    config: {
      continentShape: {
        ...DEFAULT_GENERATION_CONFIG.continentShape,
        landRatio: 0.35,
        fragmentation: 0.5,
        edgeFalloff: 'circular',
        edgeFalloffStrength: 0.6,
      },
      islands: {
        ...DEFAULT_GENERATION_CONFIG.islands,
        enabled: true,
        clusterCount: 4,
      },
    },
  },
  {
    id: 'pangaea',
    name: 'Pangaea',
    description: 'Single supercontinent surrounded by ocean',
    config: {
      continentShape: {
        ...DEFAULT_GENERATION_CONFIG.continentShape,
        landRatio: 0.4,
        fragmentation: 0.1,
        edgeFalloff: 'circular',
        edgeFalloffStrength: 0.9,
      },
      islands: {
        ...DEFAULT_GENERATION_CONFIG.islands,
        enabled: false,
      },
      coastline: {
        ...DEFAULT_GENERATION_CONFIG.coastline,
        fjords: false,
        bays: true,
        bayFrequency: 4,
      },
    },
  },
  {
    id: 'archipelago',
    name: 'Archipelago',
    description: 'Scattered islands and small landmasses',
    config: {
      terrainNoise: {
        ...DEFAULT_GENERATION_CONFIG.terrainNoise,
        frequency: 5,
        octaves: 4,
      },
      continentShape: {
        ...DEFAULT_GENERATION_CONFIG.continentShape,
        landRatio: 0.25,
        fragmentation: 0.8,
        seaLevel: 0.5,
        edgeFalloff: 'none',
      },
      islands: {
        ...DEFAULT_GENERATION_CONFIG.islands,
        enabled: true,
        clusterCount: 8,
        islandsPerCluster: { min: 5, max: 15 },
        sizeRange: { min: 3, max: 15 },
      },
    },
  },
  {
    id: 'islands',
    name: 'Island Chain',
    description: 'Linear chain of islands (volcanic style)',
    config: {
      terrainNoise: {
        ...DEFAULT_GENERATION_CONFIG.terrainNoise,
        type: 'worley',
        frequency: 4,
      },
      continentShape: {
        ...DEFAULT_GENERATION_CONFIG.continentShape,
        landRatio: 0.15,
        fragmentation: 0.9,
        seaLevel: 0.55,
        edgeFalloff: 'gradient',
        edgeFalloffStrength: 0.3,
        stretchX: 2.0,
        stretchY: 0.5,
      },
      islands: {
        ...DEFAULT_GENERATION_CONFIG.islands,
        enabled: true,
        clusterCount: 2,
        islandsPerCluster: { min: 8, max: 20 },
        sizeRange: { min: 5, max: 25 },
        clusterSpread: 100,
      },
    },
  },
  {
    id: 'fractured',
    name: 'Fractured',
    description: 'Highly detailed coastlines with many inlets',
    config: {
      terrainNoise: {
        ...DEFAULT_GENERATION_CONFIG.terrainNoise,
        frequency: 4,
        octaves: 8,
        persistence: 0.55,
      },
      continentShape: {
        ...DEFAULT_GENERATION_CONFIG.continentShape,
        landRatio: 0.4,
        fragmentation: 0.6,
      },
      coastline: {
        ...DEFAULT_GENERATION_CONFIG.coastline,
        roughness: 0.8,
        detailFrequency: 25,
        detailAmplitude: 0.15,
        fjords: true,
        fjordFrequency: 12,
        fjordDepth: 0.2,
        bays: true,
        bayFrequency: 10,
        smoothingIterations: 1,
      },
    },
  },
  {
    id: 'ringworld',
    name: 'Ring World',
    description: 'Land around edges with central sea',
    config: {
      continentShape: {
        ...DEFAULT_GENERATION_CONFIG.continentShape,
        landRatio: 0.35,
        fragmentation: 0.2,
        edgeFalloff: 'circular',
        edgeFalloffStrength: -0.8, // Inverted - land at edges
      },
      islands: {
        ...DEFAULT_GENERATION_CONFIG.islands,
        enabled: true,
        clusterCount: 2,
        mainlandDistance: { min: 10, max: 80 },
      },
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Fully customizable generation parameters',
    config: {},
  },
];

/**
 * Get preset by ID
 */
export function getPreset(id: string): PresetDefinition | undefined {
  return GENERATION_PRESETS.find((p) => p.id === id);
}

/**
 * Apply preset to config
 */
export function applyPreset(
  baseConfig: LandmassGenerationConfig,
  presetId: string
): LandmassGenerationConfig {
  const preset = getPreset(presetId);
  if (!preset) return baseConfig;

  return {
    ...baseConfig,
    ...preset.config,
    terrainNoise: {
      ...baseConfig.terrainNoise,
      ...(preset.config.terrainNoise || {}),
    },
    continentShape: {
      ...baseConfig.continentShape,
      ...(preset.config.continentShape || {}),
    },
    coastline: {
      ...baseConfig.coastline,
      ...(preset.config.coastline || {}),
    },
    islands: {
      ...baseConfig.islands,
      ...(preset.config.islands || {}),
    },
    tectonics: {
      ...baseConfig.tectonics,
      ...(preset.config.tectonics || {}),
    },
  };
}

/**
 * Generate random seed
 */
export function generateSeed(): { value: number; display: string } {
  const value = Math.floor(Math.random() * 2147483647);
  const display = value.toString(16).toUpperCase().padStart(8, '0');
  return { value, display };
}

/**
 * Parse seed from string
 */
export function parseSeed(input: string): { value: number; display: string } {
  // Try hex first
  const hexMatch = input.match(/^[0-9A-Fa-f]+$/);
  if (hexMatch) {
    const value = parseInt(input, 16);
    return { value, display: input.toUpperCase() };
  }
  
  // Try number
  const numValue = parseInt(input, 10);
  if (!isNaN(numValue)) {
    return {
      value: Math.abs(numValue) % 2147483647,
      display: Math.abs(numValue).toString(16).toUpperCase().padStart(8, '0'),
    };
  }
  
  // Hash string
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  const value = Math.abs(hash);
  return { value, display: value.toString(16).toUpperCase().padStart(8, '0') };
}
```

---

## 5.4 Generation Store

### 5.4.1 src/stores/useGenerationStore.ts

**Instruction for Claude Code:**
> Create a Zustand store at `src/stores/useGenerationStore.ts` for managing generation state and configuration.

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  LandmassGenerationConfig,
  GenerationResult,
  GenerationProgress,
  GenerationPreset,
} from '@/core/generation/types';
import {
  DEFAULT_GENERATION_CONFIG,
  generateSeed,
  applyPreset,
  parseSeed,
} from '@/core/generation/presets';
import { LandmassGenerator } from '@/core/generation/LandmassGenerator';

interface GenerationState {
  // Configuration
  config: LandmassGenerationConfig;
  activePreset: GenerationPreset;
  
  // Generation state
  isGenerating: boolean;
  progress: GenerationProgress | null;
  result: GenerationResult | null;
  error: string | null;
  
  // Preview mode
  previewEnabled: boolean;
  previewResult: GenerationResult | null;
  
  // History for undo
  history: GenerationResult[];
  historyIndex: number;
}

interface GenerationActions {
  // Configuration
  setConfig: (config: Partial<LandmassGenerationConfig>) => void;
  setPreset: (presetId: GenerationPreset) => void;
  randomizeSeed: () => void;
  setSeed: (seedInput: string) => void;
  
  // Generation
  generate: () => Promise<void>;
  cancelGeneration: () => void;
  
  // Preview
  setPreviewEnabled: (enabled: boolean) => void;
  generatePreview: () => Promise<void>;
  
  // History
  undo: () => void;
  redo: () => void;
  
  // Reset
  reset: () => void;
}

type GenerationStore = GenerationState & GenerationActions;

const initialState: GenerationState = {
  config: {
    ...DEFAULT_GENERATION_CONFIG,
    seed: generateSeed(),
  },
  activePreset: 'continental',
  isGenerating: false,
  progress: null,
  result: null,
  error: null,
  previewEnabled: false,
  previewResult: null,
  history: [],
  historyIndex: -1,
};

let currentGenerator: LandmassGenerator | null = null;
let abortController: AbortController | null = null;

export const useGenerationStore = create<GenerationStore>()(
  immer((set, get) => ({
    ...initialState,

    setConfig: (partialConfig) => {
      set((state) => {
        // Deep merge config
        Object.assign(state.config, partialConfig);
        
        // If changing parameters, switch to custom preset
        if (state.activePreset !== 'custom') {
          state.activePreset = 'custom';
        }
      });
    },

    setPreset: (presetId) => {
      set((state) => {
        state.activePreset = presetId;
        state.config = applyPreset(state.config, presetId);
      });
    },

    randomizeSeed: () => {
      set((state) => {
        state.config.seed = generateSeed();
      });
    },

    setSeed: (seedInput) => {
      set((state) => {
        state.config.seed = parseSeed(seedInput);
      });
    },

    generate: async () => {
      const state = get();
      if (state.isGenerating) return;

      // Cancel any existing generation
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();

      set((s) => {
        s.isGenerating = true;
        s.progress = null;
        s.error = null;
      });

      try {
        currentGenerator = new LandmassGenerator(
          state.config,
          (progress) => {
            set((s) => {
              s.progress = progress;
            });
          }
        );

        const result = await currentGenerator.generate();

        // Check if aborted
        if (abortController?.signal.aborted) {
          return;
        }

        set((s) => {
          // Add previous result to history
          if (s.result) {
            s.history = [...s.history.slice(0, s.historyIndex + 1), s.result];
            s.historyIndex = s.history.length - 1;
          }
          
          s.result = result;
          s.isGenerating = false;
          s.progress = null;
        });
      } catch (error) {
        if (abortController?.signal.aborted) {
          return;
        }
        
        set((s) => {
          s.error = error instanceof Error ? error.message : 'Generation failed';
          s.isGenerating = false;
          s.progress = null;
        });
      }
    },

    cancelGeneration: () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      currentGenerator = null;
      
      set((s) => {
        s.isGenerating = false;
        s.progress = null;
      });
    },

    setPreviewEnabled: (enabled) => {
      set((s) => {
        s.previewEnabled = enabled;
        if (!enabled) {
          s.previewResult = null;
        }
      });
    },

    generatePreview: async () => {
      const state = get();
      
      // Use lower quality for preview
      const previewConfig: LandmassGenerationConfig = {
        ...state.config,
        width: Math.floor(state.config.width / 4),
        height: Math.floor(state.config.height / 4),
        quality: 'draft',
      };

      const generator = new LandmassGenerator(previewConfig);
      const result = await generator.generate();

      set((s) => {
        s.previewResult = result;
      });
    },

    undo: () => {
      set((s) => {
        if (s.historyIndex > 0) {
          s.historyIndex--;
          s.result = s.history[s.historyIndex];
        }
      });
    },

    redo: () => {
      set((s) => {
        if (s.historyIndex < s.history.length - 1) {
          s.historyIndex++;
          s.result = s.history[s.historyIndex];
        }
      });
    },

    reset: () => {
      if (abortController) {
        abortController.abort();
      }
      set(initialState);
    },
  }))
);

// Selector hooks for performance
export const useGenerationConfig = () =>
  useGenerationStore((s) => s.config);

export const useGenerationResult = () =>
  useGenerationStore((s) => s.result);

export const useGenerationProgress = () =>
  useGenerationStore((s) => ({
    isGenerating: s.isGenerating,
    progress: s.progress,
  }));

export const useActivePreset = () =>
  useGenerationStore((s) => s.activePreset);
```

---

## 5.5 Generation UI Components

### 5.5.1 src/components/panels/GenerationPanel.tsx

**Instruction for Claude Code:**
> Create the main generation panel UI at `src/components/panels/GenerationPanel.tsx`. This provides controls for all generation parameters.

```typescript
import { useState, useCallback } from 'react';
import {
  Dices,
  Play,
  Square,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import {
  useGenerationStore,
  useGenerationConfig,
  useGenerationProgress,
  useActivePreset,
} from '@/stores/useGenerationStore';
import { GENERATION_PRESETS } from '@/core/generation/presets';
import type { GenerationPreset, NoiseConfig } from '@/core/generation/types';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-ink-800">
      <button
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-ink-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-medium text-ink-200">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-ink-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ink-400" />
        )}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
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
  unit?: string;
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  unit = '',
}: SliderFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-400">{label}</label>
        <span className="text-xs text-ink-300 tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
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

export function GenerationPanel() {
  const config = useGenerationConfig();
  const { isGenerating, progress } = useGenerationProgress();
  const activePreset = useActivePreset();
  
  const {
    setConfig,
    setPreset,
    randomizeSeed,
    setSeed,
    generate,
    cancelGeneration,
    setPreviewEnabled,
    undo,
    redo,
  } = useGenerationStore();

  const handlePresetChange = useCallback(
    (value: string) => {
      setPreset(value as GenerationPreset);
    },
    [setPreset]
  );

  const handleSeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSeed(e.target.value);
    },
    [setSeed]
  );

  return (
    <div className="flex flex-col h-full bg-ink-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-800">
        <h2 className="text-sm font-semibold text-ink-100">World Generation</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Preset Selection */}
        <div className="px-3 py-3 border-b border-ink-800">
          <label className="block text-xs text-ink-400 mb-1.5">Preset</label>
          <Select value={activePreset} onValueChange={handlePresetChange}>
            {GENERATION_PRESETS.map((preset) => (
              <Select.Option key={preset.id} value={preset.id}>
                {preset.name}
              </Select.Option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-ink-500">
            {GENERATION_PRESETS.find((p) => p.id === activePreset)?.description}
          </p>
        </div>

        {/* Seed */}
        <div className="px-3 py-3 border-b border-ink-800">
          <label className="block text-xs text-ink-400 mb-1.5">Seed</label>
          <div className="flex gap-2">
            <Input
              value={config.seed.display}
              onChange={handleSeedChange}
              className="flex-1 font-mono text-sm"
              placeholder="Enter seed..."
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={randomizeSeed}
              title="Random Seed"
            >
              <Dices className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Terrain Noise */}
        <CollapsibleSection title="Terrain Noise" defaultOpen>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-ink-400 mb-1.5">
                Noise Type
              </label>
              <Select
                value={config.terrainNoise.type}
                onValueChange={(v) =>
                  setConfig({
                    terrainNoise: {
                      ...config.terrainNoise,
                      type: v as NoiseConfig['type'],
                    },
                  })
                }
              >
                <Select.Option value="simplex">Simplex</Select.Option>
                <Select.Option value="perlin">Perlin</Select.Option>
                <Select.Option value="ridged">Ridged</Select.Option>
                <Select.Option value="worley">Worley</Select.Option>
              </Select>
            </div>

            <SliderField
              label="Frequency"
              value={config.terrainNoise.frequency}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, frequency: v },
                })
              }
              min={1}
              max={10}
              step={0.1}
            />

            <SliderField
              label="Octaves"
              value={config.terrainNoise.octaves}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, octaves: v },
                })
              }
              min={1}
              max={10}
              step={1}
            />

            <SliderField
              label="Persistence"
              value={config.terrainNoise.persistence}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, persistence: v },
                })
              }
              min={0.1}
              max={0.9}
            />

            <SliderField
              label="Lacunarity"
              value={config.terrainNoise.lacunarity}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, lacunarity: v },
                })
              }
              min={1.5}
              max={3}
            />
          </div>
        </CollapsibleSection>

        {/* Continent Shape */}
        <CollapsibleSection title="Continent Shape" defaultOpen>
          <div className="space-y-3">
            <SliderField
              label="Land Coverage"
              value={config.continentShape.landRatio}
              onChange={(v) =>
                setConfig({
                  continentShape: { ...config.continentShape, landRatio: v },
                })
              }
              min={0.1}
              max={0.7}
              unit="%"
            />

            <SliderField
              label="Sea Level"
              value={config.continentShape.seaLevel}
              onChange={(v) =>
                setConfig({
                  continentShape: { ...config.continentShape, seaLevel: v },
                })
              }
              min={0.2}
              max={0.6}
            />

            <SliderField
              label="Fragmentation"
              value={config.continentShape.fragmentation}
              onChange={(v) =>
                setConfig({
                  continentShape: { ...config.continentShape, fragmentation: v },
                })
              }
              min={0}
              max={1}
            />

            <div>
              <label className="block text-xs text-ink-400 mb-1.5">
                Edge Falloff
              </label>
              <Select
                value={config.continentShape.edgeFalloff}
                onValueChange={(v) =>
                  setConfig({
                    continentShape: {
                      ...config.continentShape,
                      edgeFalloff: v as typeof config.continentShape.edgeFalloff,
                    },
                  })
                }
              >
                <Select.Option value="none">None</Select.Option>
                <Select.Option value="circular">Circular</Select.Option>
                <Select.Option value="square">Square</Select.Option>
                <Select.Option value="gradient">Gradient</Select.Option>
              </Select>
            </div>

            {config.continentShape.edgeFalloff !== 'none' && (
              <SliderField
                label="Falloff Strength"
                value={config.continentShape.edgeFalloffStrength}
                onChange={(v) =>
                  setConfig({
                    continentShape: {
                      ...config.continentShape,
                      edgeFalloffStrength: v,
                    },
                  })
                }
                min={-1}
                max={1}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Coastline Detail */}
        <CollapsibleSection title="Coastline Detail">
          <div className="space-y-3">
            <SliderField
              label="Roughness"
              value={config.coastline.roughness}
              onChange={(v) =>
                setConfig({
                  coastline: { ...config.coastline, roughness: v },
                })
              }
              min={0}
              max={1}
            />

            <SliderField
              label="Detail Frequency"
              value={config.coastline.detailFrequency}
              onChange={(v) =>
                setConfig({
                  coastline: { ...config.coastline, detailFrequency: v },
                })
              }
              min={5}
              max={30}
              step={1}
            />

            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Fjords</label>
              <Switch
                checked={config.coastline.fjords}
                onCheckedChange={(v) =>
                  setConfig({
                    coastline: { ...config.coastline, fjords: v },
                  })
                }
              />
            </div>

            {config.coastline.fjords && (
              <SliderField
                label="Fjord Depth"
                value={config.coastline.fjordDepth}
                onChange={(v) =>
                  setConfig({
                    coastline: { ...config.coastline, fjordDepth: v },
                  })
                }
                min={0.05}
                max={0.3}
              />
            )}

            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Bays</label>
              <Switch
                checked={config.coastline.bays}
                onCheckedChange={(v) =>
                  setConfig({
                    coastline: { ...config.coastline, bays: v },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Peninsulas</label>
              <Switch
                checked={config.coastline.peninsulas}
                onCheckedChange={(v) =>
                  setConfig({
                    coastline: { ...config.coastline, peninsulas: v },
                  })
                }
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Islands */}
        <CollapsibleSection title="Islands">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Enable Islands</label>
              <Switch
                checked={config.islands.enabled}
                onCheckedChange={(v) =>
                  setConfig({
                    islands: { ...config.islands, enabled: v },
                  })
                }
              />
            </div>

            {config.islands.enabled && (
              <>
                <SliderField
                  label="Cluster Count"
                  value={config.islands.clusterCount}
                  onChange={(v) =>
                    setConfig({
                      islands: { ...config.islands, clusterCount: v },
                    })
                  }
                  min={1}
                  max={10}
                  step={1}
                />

                <SliderField
                  label="Max Islands per Cluster"
                  value={config.islands.islandsPerCluster.max}
                  onChange={(v) =>
                    setConfig({
                      islands: {
                        ...config.islands,
                        islandsPerCluster: {
                          ...config.islands.islandsPerCluster,
                          max: v,
                        },
                      },
                    })
                  }
                  min={1}
                  max={20}
                  step={1}
                />

                <SliderField
                  label="Cluster Spread"
                  value={config.islands.clusterSpread}
                  onChange={(v) =>
                    setConfig({
                      islands: { ...config.islands, clusterSpread: v },
                    })
                  }
                  min={20}
                  max={150}
                  step={5}
                />

                <SliderField
                  label="Shape Variation"
                  value={config.islands.shapeVariation}
                  onChange={(v) =>
                    setConfig({
                      islands: { ...config.islands, shapeVariation: v },
                    })
                  }
                  min={0}
                  max={0.5}
                />
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Tectonics */}
        <CollapsibleSection title="Tectonics">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">
                Enable Tectonic Simulation
              </label>
              <Switch
                checked={config.tectonics.enabled}
                onCheckedChange={(v) =>
                  setConfig({
                    tectonics: { ...config.tectonics, enabled: v },
                  })
                }
              />
            </div>

            {config.tectonics.enabled && (
              <>
                <SliderField
                  label="Plate Count"
                  value={config.tectonics.plateCount}
                  onChange={(v) =>
                    setConfig({
                      tectonics: { ...config.tectonics, plateCount: v },
                    })
                  }
                  min={3}
                  max={15}
                  step={1}
                />

                <div className="flex items-center justify-between">
                  <label className="text-xs text-ink-400">
                    Convergent Mountains
                  </label>
                  <Switch
                    checked={config.tectonics.convergentMountains}
                    onCheckedChange={(v) =>
                      setConfig({
                        tectonics: {
                          ...config.tectonics,
                          convergentMountains: v,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-ink-400">Divergent Rifts</label>
                  <Switch
                    checked={config.tectonics.divergentRifts}
                    onCheckedChange={(v) =>
                      setConfig({
                        tectonics: { ...config.tectonics, divergentRifts: v },
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
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
          onClick={isGenerating ? cancelGeneration : generate}
          variant={isGenerating ? 'destructive' : 'primary'}
        >
          {isGenerating ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate World
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

---

### 5.5.2 src/components/panels/GenerationPreview.tsx

**Instruction for Claude Code:**
> Create a preview component at `src/components/panels/GenerationPreview.tsx` for displaying generation results as a minimap.

```typescript
import { useEffect, useRef, useMemo } from 'react';
import { useGenerationStore } from '@/stores/useGenerationStore';
import type { GenerationResult } from '@/core/generation/types';

interface GenerationPreviewProps {
  result: GenerationResult | null;
  width?: number;
  height?: number;
  showCoastlines?: boolean;
}

export function GenerationPreview({
  result,
  width = 256,
  height = 256,
  showCoastlines = true,
}: GenerationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!result || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { landMask, heightmap, coastlinePoints } = result;
    const srcWidth = Math.sqrt(landMask.length);
    const srcHeight = srcWidth;

    // Create image data
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Scale factors
    const scaleX = srcWidth / width;
    const scaleY = srcHeight / height;

    // Draw terrain
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const srcIdx = srcY * srcWidth + srcX;
        const dstIdx = (y * width + x) * 4;

        const isLand = landMask[srcIdx] === 1;
        const elevation = heightmap[srcIdx];

        if (isLand) {
          // Land colors based on elevation
          const green = Math.floor(80 + elevation * 100);
          const brown = Math.floor(60 + elevation * 80);
          data[dstIdx] = brown; // R
          data[dstIdx + 1] = green; // G
          data[dstIdx + 2] = 40; // B
        } else {
          // Water colors based on depth
          const depth = 1 - elevation;
          data[dstIdx] = Math.floor(30 + depth * 20); // R
          data[dstIdx + 1] = Math.floor(60 + depth * 40); // G
          data[dstIdx + 2] = Math.floor(120 + depth * 60); // B
        }
        data[dstIdx + 3] = 255; // A
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw coastlines
    if (showCoastlines && coastlinePoints.length > 0) {
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;

      for (const coastline of coastlinePoints) {
        if (coastline.length < 2) continue;

        ctx.beginPath();
        ctx.moveTo(coastline[0].x / scaleX, coastline[0].y / scaleY);

        for (let i = 1; i < coastline.length; i++) {
          ctx.lineTo(coastline[i].x / scaleX, coastline[i].y / scaleY);
        }

        ctx.stroke();
      }
    }
  }, [result, width, height, showCoastlines]);

  // Metadata display
  const metadata = result?.metadata;

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-ink-700"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {metadata && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-400">
          <div>Land: {(metadata.landCoverage * 100).toFixed(1)}%</div>
          <div>Continents: {metadata.continentCount}</div>
          <div>Islands: {metadata.islandCount}</div>
          <div>Time: {metadata.generationTime.toFixed(0)}ms</div>
        </div>
      )}
    </div>
  );
}

/**
 * Connected preview that uses store state
 */
export function ConnectedGenerationPreview() {
  const result = useGenerationStore((s) => s.result);
  const previewResult = useGenerationStore((s) => s.previewResult);
  const previewEnabled = useGenerationStore((s) => s.previewEnabled);

  const displayResult = previewEnabled ? previewResult : result;

  if (!displayResult) {
    return (
      <div className="flex items-center justify-center h-64 bg-ink-800/50 rounded border border-ink-700">
        <p className="text-sm text-ink-500">
          No world generated yet
        </p>
      </div>
    );
  }

  return <GenerationPreview result={displayResult} />;
}
```

---

## 5.6 Integration with Terrain Renderer

### 5.6.1 src/core/terrain/TerrainRenderer.ts (Updates)

**Instruction for Claude Code:**
> Update the existing `TerrainRenderer.ts` to accept generation results and render them. This involves adding methods to apply a `GenerationResult` to the terrain data.

📁 `src/core/terrain/TerrainRenderer.ts`

🔍 **FIND:** (Add after existing imports)
```typescript
import type { GenerationResult } from '../generation/types';
```

➕ **ADD AFTER:** (the `setStyleBlend` method or at end of class)
```typescript
  /**
   * Apply generation result to terrain
   */
  applyGenerationResult(result: GenerationResult): void {
    const { heightmap, landMask } = result;
    const srcSize = Math.sqrt(heightmap.length);
    
    // Resize terrain data if needed
    if (this.width !== srcSize || this.height !== srcSize) {
      this.resize(srcSize, srcSize);
    }
    
    // Copy heightmap
    this.elevationData.set(heightmap);
    
    // Assign biomes based on heightmap and land mask
    this.assignBiomesFromGeneration(heightmap, landMask);
    
    // Regenerate climate data
    this.generateClimateData();
    
    // Re-render
    this.render();
  }
  
  /**
   * Assign biomes based on generation result
   */
  private assignBiomesFromGeneration(
    heightmap: Float32Array,
    landMask: Uint8Array
  ): void {
    const size = this.width * this.height;
    
    for (let i = 0; i < size; i++) {
      const isLand = landMask[i] === 1;
      const elevation = heightmap[i];
      
      if (!isLand) {
        // Water biomes
        if (elevation < 0.2) {
          this.biomeData[i] = this.biomeToIndex.get('ocean') ?? 0;
        } else {
          this.biomeData[i] = this.biomeToIndex.get('shallowWater') ?? 0;
        }
      } else {
        // Land biomes based on elevation
        // Climate will refine this later
        if (elevation > 0.85) {
          this.biomeData[i] = this.biomeToIndex.get('highMountain') ?? 0;
        } else if (elevation > 0.7) {
          this.biomeData[i] = this.biomeToIndex.get('mountain') ?? 0;
        } else if (elevation > 0.55) {
          this.biomeData[i] = this.biomeToIndex.get('forest') ?? 0;
        } else if (elevation > 0.45) {
          this.biomeData[i] = this.biomeToIndex.get('grassland') ?? 0;
        } else {
          this.biomeData[i] = this.biomeToIndex.get('beach') ?? 0;
        }
      }
    }
  }
```

---

## 5.7 Connecting Generation to App

### 5.7.1 src/App.tsx (Updates)

**Instruction for Claude Code:**
> Update `App.tsx` to include the generation panel and connect generation results to the terrain renderer.

📁 `src/App.tsx`

🔍 **FIND:** (in imports section, add)
```typescript
import { GenerationPanel } from '@/components/panels/GenerationPanel';
import { useGenerationStore } from '@/stores/useGenerationStore';
```

🔍 **FIND:** (inside the App component, add effect to connect generation to terrain)
```typescript
  // Connect generation results to terrain renderer
  const generationResult = useGenerationStore((s) => s.result);
  
  useEffect(() => {
    if (generationResult && engine) {
      const terrainRenderer = engine.getTerrainRenderer();
      if (terrainRenderer) {
        terrainRenderer.applyGenerationResult(generationResult);
      }
    }
  }, [generationResult, engine]);
```

🔍 **FIND:** (in the left panel section, add a tab for generation)

You'll want to add a new tab in the left panel that switches between Tools, Terrain, and Generation panels. The exact implementation depends on your existing panel structure, but the concept is:

```typescript
{/* Left Panel with Tabs */}
<div className="w-72 flex flex-col bg-ink-900 border-r border-ink-800">
  {/* Tab buttons */}
  <div className="flex border-b border-ink-800">
    <button
      className={cn(
        'flex-1 px-3 py-2 text-sm',
        activeLeftTab === 'tools' && 'bg-ink-800 text-ink-100'
      )}
      onClick={() => setActiveLeftTab('tools')}
    >
      Tools
    </button>
    <button
      className={cn(
        'flex-1 px-3 py-2 text-sm',
        activeLeftTab === 'terrain' && 'bg-ink-800 text-ink-100'
      )}
      onClick={() => setActiveLeftTab('terrain')}
    >
      Terrain
    </button>
    <button
      className={cn(
        'flex-1 px-3 py-2 text-sm',
        activeLeftTab === 'generate' && 'bg-ink-800 text-ink-100'
      )}
      onClick={() => setActiveLeftTab('generate')}
    >
      Generate
    </button>
  </div>
  
  {/* Panel content */}
  <div className="flex-1 overflow-hidden">
    {activeLeftTab === 'tools' && <ToolPanel />}
    {activeLeftTab === 'terrain' && <TerrainPanel />}
    {activeLeftTab === 'generate' && <GenerationPanel />}
  </div>
</div>
```

---

## 5.8 Index Exports

### 5.8.1 src/core/generation/index.ts

**Instruction for Claude Code:**
> Create index file at `src/core/generation/index.ts`.

```typescript
export * from './types';
export * from './noise';
export * from './presets';
export { LandmassGenerator } from './LandmassGenerator';
```

---

## 5.9 Verification Checklist for Phase 5

After implementing Phase 5, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ Generation panel appears in left panel tabs
□ Preset dropdown shows all presets (Continental, Pangaea, etc.)
□ Selecting preset updates configuration sliders
□ Seed input accepts text, numbers, and hex
□ Random seed button generates new seed
□ Terrain Noise section expands/collapses
□ Noise type dropdown works (Simplex, Perlin, Ridged, Worley)
□ Frequency, octaves, persistence, lacunarity sliders work
□ Continent Shape section works
□ Land coverage slider changes generation
□ Sea level slider affects water/land threshold
□ Fragmentation slider breaks up continents
□ Edge falloff dropdown and strength slider work
□ Coastline Detail section works
□ Roughness affects coastline complexity
□ Fjords, bays, peninsulas toggles work
□ Islands section works
□ Enable islands toggle shows/hides options
□ Cluster count, spread, variation sliders work
□ Tectonics section works
□ Enable tectonics toggle shows options
□ Plate count slider works
□ Generate button starts generation
□ Progress bar shows during generation
□ Cancel button stops generation
□ Generated terrain displays on canvas
□ Different presets produce visually distinct results
□ Same seed produces identical results
□ Undo/redo buttons work with generation history
□ Generation completes in reasonable time (<5s for 512x512)
□ No memory leaks on repeated generation
□ Coastlines are visible and smooth
□ Islands appear in water areas
□ Biomes are assigned based on elevation
```

---

## Summary

Phase 5 establishes the procedural landmass generation system:

1. **Noise System** - Simplex, Worley, and multi-octave noise generators
2. **Landmass Generator** - Core generation engine with configurable parameters
3. **Generation Presets** - Quick-start configurations for different world types
4. **Generation Store** - Zustand state management for generation
5. **Generation Panel** - Complete UI for all generation parameters
6. **Preview Component** - Minimap preview of generation results
7. **Terrain Integration** - Connecting generation to the existing terrain renderer

---

## Next Steps

**Phase 6: Procedural Generation - Features** will cover:
- Mountain range generation (spine-based algorithms)
- River system generation with flow simulation
- Lake placement based on topology
- Forest distribution algorithms
- Climate-aware automatic biome assignment
- Feature brush tools for manual adjustment

Ready to proceed when you are!