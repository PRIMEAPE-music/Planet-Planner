import { SimplexNoise, WorleyNoise } from './noise';
import type {
  LandmassGenerationConfig,
  GenerationResult,
  GenerationProgress,
} from './types';
import type { Vector2 } from '@/types';

/**
 * Generation constants — extracted from inline magic numbers.
 */

/** Tectonic plate noise scale factor: sqrt(plateCount) * this value gives the spatial frequency */
const PLATE_SCALE_FACTOR = 2;

/** Pixel search radius for detecting coastline transitions (land ↔ water) */
const COASTLINE_SEARCH_RADIUS = 3;

/** Minimum pixel area for a landmass to count as a continent (vs. small island noise) */
const MIN_CONTINENT_PIXELS = 1000;

/** Distance threshold (F2−F1) below which a pixel is considered on a tectonic plate boundary */
const PLATE_BOUNDARY_THRESHOLD = 0.1;

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
    this.applyContinentShaping(heightmap);
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
  private applyContinentShaping(heightmap: Float32Array): void {
    const { width, height, continentShape } = this.config;
    const { edgeFalloff, edgeFalloffStrength, stretchX, stretchY, fragmentation } =
      continentShape;

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
          heightmap[idx] = (heightmap[idx] ?? 0) + fragment * fragmentation * 0.3;
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
            case 'circular': {
              // Distance from center
              const dist = Math.sqrt(nx * nx + ny * ny);
              falloff = Math.max(0, 1 - dist);
              falloff = this.smoothstep(0, 1, falloff);
              break;
            }

            case 'square': {
              // Distance from edges
              const edgeDistX = 1 - Math.abs(nx);
              const edgeDistY = 1 - Math.abs(ny);
              falloff = Math.min(edgeDistX, edgeDistY);
              falloff = this.smoothstep(0, 0.5, falloff);
              break;
            }

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
          heightmap[idx] = (heightmap[idx] ?? 0) * blendedFalloff;
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
    const targetThreshold = sorted[Math.floor(size * (1 - landRatio))] ?? 0.5;

    // Use the higher of seaLevel or calculated threshold
    const threshold = Math.max(seaLevel, targetThreshold);

    // Apply threshold
    for (let i = 0; i < size; i++) {
      landMask[i] = (heightmap[i] ?? 0) >= threshold ? 1 : 0;
    }
  }

  /**
   * Generate tectonic plates using Worley noise
   */
  private generateTectonicPlates(
    heightmap: Float32Array,
    _landMask: Uint8Array
  ): Uint8Array {
    const { width, height } = this.config;
    const { plateCount, boundaryNoise, convergentMountains, divergentRifts } =
      this.config.tectonics;

    const plateMap = new Uint8Array(width * height);
    const plateNoise = new WorleyNoise(this.config.seed.value + 2000);

    // Assign plates
    const plateScale = Math.sqrt(plateCount) * PLATE_SCALE_FACTOR;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const nx = (x / width) * plateScale;
        const ny = (y / height) * plateScale;

        // Get plate ID (0 to plateCount-1)
        const cellId = plateNoise.getCellId(nx, ny);
        plateMap[idx] = Math.abs(cellId) % plateCount;

        // Modify heightmap at plate boundaries
        const boundaryDist = plateNoise.noise2D_F1F2(nx, ny);

        if (boundaryDist < PLATE_BOUNDARY_THRESHOLD) {
          // At boundary
          // Add noise to boundary
          const bNoise =
            this.simplexNoise.noise2D((x / width) * 20, (y / height) * 20) *
            boundaryNoise;

          // Convergent = mountains, divergent = rifts
          const isConvergent = cellId % 2 === 0;

          if (isConvergent && convergentMountains) {
            heightmap[idx] = (heightmap[idx] ?? 0) + 0.2 + bNoise;
          } else if (!isConvergent && divergentRifts) {
            heightmap[idx] = (heightmap[idx] ?? 0) - 0.1 - bNoise * 0.5;
          }
        }
      }
    }

    return plateMap;
  }

  /**
   * Apply coastline detail (fjords, bays, peninsulas)
   */
  private applyCoastlineDetail(
    heightmap: Float32Array,
    landMask: Uint8Array
  ): void {
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
      let modifier =
        detailNoise.fbm(
          nx * coastline.detailFrequency,
          ny * coastline.detailFrequency,
          4,
          0.5,
          2.0
        ) *
        coastline.detailAmplitude *
        coastline.roughness;

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
          modifier -= (coastline.fjordDepth * (fjord - 0.7)) / 0.3;
        }
      }

      // Bays
      if (coastline.bays) {
        const bay = bayNoise.noise2D(
          nx * coastline.bayFrequency,
          ny * coastline.bayFrequency
        );
        if (bay > 0.6) {
          modifier -= (coastline.baySize * (bay - 0.6)) / 0.4;
        }
      }

      // Peninsulas
      if (coastline.peninsulas) {
        const peninsula = detailNoise.noise2D(
          nx * coastline.peninsulaFrequency + 100,
          ny * coastline.peninsulaFrequency + 100
        );
        if (peninsula > 0.7) {
          modifier += (0.15 * (peninsula - 0.7)) / 0.3;
        }
      }

      heightmap[idx] = (heightmap[idx] ?? 0) + modifier;
    }

    // Re-apply sea level after modifications
    const threshold = this.config.continentShape.seaLevel;
    for (let i = 0; i < heightmap.length; i++) {
      landMask[i] = (heightmap[i] ?? 0) >= threshold ? 1 : 0;
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
    for (let y = COASTLINE_SEARCH_RADIUS; y < height - COASTLINE_SEARCH_RADIUS; y++) {
      for (let x = COASTLINE_SEARCH_RADIUS; x < width - COASTLINE_SEARCH_RADIUS; x++) {
        // Check if near coastline
        let nearWater = false;
        let nearLand = false;

        for (
          let dy = -COASTLINE_SEARCH_RADIUS;
          dy <= COASTLINE_SEARCH_RADIUS && !(nearWater && nearLand);
          dy++
        ) {
          for (
            let dx = -COASTLINE_SEARCH_RADIUS;
            dx <= COASTLINE_SEARCH_RADIUS && !(nearWater && nearLand);
            dx++
          ) {
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

    // Pre-compute distance-to-land map (O(width*height) BFS, replaces per-query O(n²) ring search)
    const distMap = this.buildDistanceMap(landMask);

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

        // Check if in water and far enough from land (O(1) lookup)
        if (landMask[idx] === 0) {
          const distToLand = distMap[idx] ?? 0;
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
        islandRng() *
          (islands.islandsPerCluster.max - islands.islandsPerCluster.min + 1) +
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
          const elevation =
            (1 - dist / radius) * 0.3 + this.config.continentShape.seaLevel + 0.05;
          heightmap[idx] = Math.max(heightmap[idx] ?? 0, elevation);
          landMask[idx] = 1;
        }
      }
    }
  }

  /**
   * Build a distance-to-land map via multi-source BFS.
   * Each cell stores the Chebyshev distance to the nearest land pixel.
   * Runs in O(width × height) — far faster than per-query ring search.
   */
  private buildDistanceMap(landMask: Uint8Array): Uint16Array {
    const { width, height } = this.config;
    const size = width * height;
    const dist = new Uint16Array(size);
    dist.fill(0xFFFF); // sentinel = not yet visited

    // Seed BFS from all land pixels
    const queue: number[] = [];
    for (let i = 0; i < size; i++) {
      if (landMask[i] === 1) {
        dist[i] = 0;
        queue.push(i);
      }
    }

    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++]!;
      const x = idx % width;
      const y = (idx - x) / width;
      const d = dist[idx]! + 1;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          if (d < dist[ni]!) {
            dist[ni] = d;
            queue.push(ni);
          }
        }
      }
    }

    return dist;
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
          if (points.length > 10) {
            // Filter tiny coastlines
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

    const maxPoints = 50000;

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
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (landMask[idx] === 1 && visited[idx] === 0) {
          const size = this.floodFill(x, y, landMask, visited);
          if (size >= MIN_CONTINENT_PIXELS) {
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
      const point = stack.pop();
      if (!point) break;

      const { x, y } = point;
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
