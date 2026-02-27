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

            const elevation = elevationData[idx] ?? 1;
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
        const neighborElevation = elevationData[idx] ?? 0;

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
      const idx = queue.shift();
      if (idx === undefined) continue;
      if (visited.has(idx)) continue;
      visited.add(idx);

      const x = idx % width;
      const y = Math.floor(idx / width);

      // Check if this pixel should be lake
      if (landMask[idx] !== 1) continue;
      const elevation = elevationData[idx] ?? 1;
      if (elevation > surfaceElevation + 0.01) continue;
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
      const elevation = elevationData[idx] ?? surfaceElevation;
      const depth = surfaceElevation - elevation;
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
        const elevation = elevationData[idx] ?? 0;
        if (elevation < 0.65) continue; // Must be in mountains
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
            elevation,
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
