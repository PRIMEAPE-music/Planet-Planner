import { SimplexNoise } from '../noise/SimplexNoise';
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
        const elevation = elevationData[idx] ?? 0.5;

        // Skip if no climate data
        if (!climate) {
          densityMap[idx] = 0;
          continue;
        }

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
    const currentElevation = elevationData[idx] ?? 0.5;

    let maxSlope = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const ni = ny * width + nx;
        const neighborElevation = elevationData[ni] ?? 0.5;
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

      const original = densityMap[i] ?? 0;
      const cluster = clusterValues[i] ?? 0.5;

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

        const currentDensity = densityMap[idx] ?? 0;
        if (currentDensity < 0.1) continue;

        // Add small-scale noise to edges
        const noiseVal = this.noise.noise2D(
          x * 0.1,
          y * 0.1
        );

        densityMap[idx] = Math.max(0, Math.min(1, currentDensity + noiseVal * edgeNoise * 0.3));
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
        const density = densityMap[i] ?? 0;
        if (density > 0.5) {
          totalForest++;
        }
      }
    }

    if (totalLand === 0) return;
    const currentCoverage = totalForest / totalLand;

    if (currentCoverage === 0) return;

    // Adjust threshold to hit target
    const ratio = coverageTarget / currentCoverage;

    for (let i = 0; i < densityMap.length; i++) {
      if (landMask[i] === 1) {
        const density = densityMap[i] ?? 0;
        densityMap[i] = Math.min(1, density * ratio);
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
    // Shared scratch buffer — reused across regions to avoid per-region full-map allocations
    const sharedDensityBuf = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;
        if (landMask[idx] !== 1) continue;

        const startDensity = densityMap[idx] ?? 0;
        if (startDensity < 0.5) continue;

        // Flood fill with index-based queue (O(1) dequeue)
        const regionPixels: number[] = [];
        const queue: number[] = [idx];
        let queueHead = 0;
        const boundary: Vector2[] = [];

        while (queueHead < queue.length) {
          const current = queue[queueHead++]!;
          if (visited[current]) continue;
          if (landMask[current] !== 1) continue;

          const currentDensity = densityMap[current] ?? 0;
          if (currentDensity < 0.4) continue;

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
              const neighborDensity = densityMap[ni] ?? 0;
              if (neighborDensity < 0.4 || landMask[ni] !== 1) {
                isBoundary = true;
              }

              if (!visited[ni] && neighborDensity >= 0.4 && landMask[ni] === 1) {
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
        let tempSum = 0;
        let moistureSum = 0;
        let validClimateCount = 0;

        for (const pixelIdx of regionPixels) {
          const climate = climateData[pixelIdx];
          if (climate) {
            tempSum += climate.temperature;
            moistureSum += climate.moisture;
            validClimateCount++;
          }
        }

        const avgTemp = validClimateCount > 0 ? tempSum / validClimateCount : 0.5;
        const avgMoisture = validClimateCount > 0 ? moistureSum / validClimateCount : 0.5;

        const type = this.determineForestType(avgTemp, avgMoisture);

        // Calculate average density
        let densitySum = 0;
        for (const pixelIdx of regionPixels) {
          densitySum += densityMap[pixelIdx] ?? 0;
        }
        const avgDensity = densitySum / regionPixels.length;

        // Write region pixels into shared buffer, then copy to final
        for (const pixel of regionPixels) {
          sharedDensityBuf[pixel] = densityMap[pixel] ?? 0;
        }
        const regionDensityMap = new Float32Array(sharedDensityBuf);
        // Zero out only written pixels (O(regionSize) instead of O(width*height))
        for (const pixel of regionPixels) {
          sharedDensityBuf[pixel] = 0;
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
