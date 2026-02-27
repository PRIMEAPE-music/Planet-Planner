import { SimplexNoise } from '../noise/SimplexNoise';
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
      const elevation = elevationData[idx] ?? 0;
      if (elevation < 0.4) continue;

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
      const width = widths[spineIndex] ?? 20;
      const baseElevation = elevations[spineIndex] ?? 0.7;

      if (!spinePoint) continue;

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
          const currentElevation = elevationData[idx] ?? 0;
          const addedElevation = (elevation - currentElevation) * falloff + noiseVal * (1 - t);
          elevationData[idx] = Math.max(
            currentElevation,
            currentElevation + Math.max(0, addedElevation)
          );
        }
      }
    }
  }
}
