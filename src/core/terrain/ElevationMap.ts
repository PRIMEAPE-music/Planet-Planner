import { fbm, ridgedNoise, initNoise } from '../rendering/noise';
import type { ElevationData } from './types';
import type { Vector2 } from '@/types';

/**
 * Configuration for elevation generation
 */
export interface ElevationGeneratorConfig {
  /** Base noise scale */
  scale: number;
  /** Number of octaves for detail */
  octaves: number;
  /** Lacunarity (frequency multiplier per octave) */
  lacunarity: number;
  /** Persistence (amplitude multiplier per octave) */
  persistence: number;
  /** Mountain ridgedness (0 = smooth, 1 = ridged) */
  ridgedness: number;
  /** Continent size factor */
  continentScale: number;
  /** Sea level adjustment */
  seaLevelBias: number;
}

const DEFAULT_CONFIG: ElevationGeneratorConfig = {
  scale: 0.002,
  octaves: 6,
  lacunarity: 2.0,
  persistence: 0.5,
  ridgedness: 0.3,
  continentScale: 0.0005,
  seaLevelBias: 0,
};

/**
 * Generates and manages elevation data
 */
export class ElevationMap {
  private data: ElevationData | null = null;
  private config: ElevationGeneratorConfig;

  constructor(config: Partial<ElevationGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate elevation map
   */
  generate(width: number, height: number, seed: number = Date.now()): ElevationData {
    initNoise(seed);

    const values = new Float32Array(width * height);
    let min = Infinity;
    let max = -Infinity;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Large-scale continental shape
        const continental = fbm(
          x * this.config.continentScale,
          y * this.config.continentScale,
          3,
          2.0,
          0.5
        );

        // Medium-scale terrain features
        const terrain = fbm(
          x * this.config.scale,
          y * this.config.scale,
          this.config.octaves,
          this.config.lacunarity,
          this.config.persistence
        );

        // Ridged noise for mountain ranges
        const ridged = ridgedNoise(
          x * this.config.scale * 2,
          y * this.config.scale * 2,
          4,
          this.config.lacunarity,
          this.config.persistence
        );

        // Combine noise layers
        let elevation = continental * 0.4 + terrain * 0.4;

        // Add ridged mountains where terrain is high
        const mountainMask = Math.max(0, (terrain + 0.5) * 2 - 1);
        elevation += ridged * mountainMask * this.config.ridgedness * 0.3;

        // Normalize to 0-1
        elevation = (elevation + 1) / 2;

        // Apply sea level bias
        elevation += this.config.seaLevelBias;

        // Clamp
        elevation = Math.max(0, Math.min(1, elevation));

        values[idx] = elevation;
        min = Math.min(min, elevation);
        max = Math.max(max, elevation);
      }
    }

    this.data = { values, width, height, min, max };
    return this.data;
  }

  /**
   * Get elevation data
   */
  getData(): ElevationData | null {
    return this.data;
  }

  /**
   * Get elevation at a specific point (with bilinear interpolation)
   */
  getElevationAt(x: number, y: number): number {
    if (!this.data) return 0;

    const { values, width, height } = this.data;

    // Clamp coordinates
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));

    // Get integer and fractional parts
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const fx = x - x0;
    const fy = y - y0;

    // Bilinear interpolation
    const v00 = values[y0 * width + x0] ?? 0;
    const v10 = values[y0 * width + x1] ?? 0;
    const v01 = values[y1 * width + x0] ?? 0;
    const v11 = values[y1 * width + x1] ?? 0;

    const v0 = v00 + (v10 - v00) * fx;
    const v1 = v01 + (v11 - v01) * fx;

    return v0 + (v1 - v0) * fy;
  }

  /**
   * Calculate normal vector at a point (for hillshading)
   */
  getNormalAt(x: number, y: number, strength: number = 1): Vector2 {
    if (!this.data) return { x: 0, y: -1 };

    // Sample neighboring elevations
    const left = this.getElevationAt(x - 1, y);
    const right = this.getElevationAt(x + 1, y);
    const up = this.getElevationAt(x, y - 1);
    const down = this.getElevationAt(x, y + 1);

    // Calculate gradient
    const dx = (right - left) * strength;
    const dy = (down - up) * strength;

    // Normalize
    const len = Math.sqrt(dx * dx + dy * dy + 1);

    return {
      x: -dx / len,
      y: -dy / len,
    };
  }

  /**
   * Calculate hillshade value at a point
   */
  getHillshadeAt(
    x: number,
    y: number,
    lightDir: Vector2 = { x: -0.7, y: -0.7 },
    strength: number = 1
  ): number {
    const normal = this.getNormalAt(x, y, strength * 50);

    // Dot product with light direction
    const dot = normal.x * lightDir.x + normal.y * lightDir.y;

    // Map to 0-1 range with ambient light
    return 0.3 + Math.max(0, dot) * 0.7;
  }

  /**
   * Erode terrain using simple hydraulic erosion simulation
   */
  erode(iterations: number = 1000, erosionStrength: number = 0.1): void {
    if (!this.data) return;

    const { values, width, height } = this.data;

    for (let i = 0; i < iterations; i++) {
      // Random starting position
      let x = Math.random() * (width - 2) + 1;
      let y = Math.random() * (height - 2) + 1;
      let sediment = 0;
      let speed = 1;

      // Simulate water droplet
      for (let step = 0; step < 64; step++) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const idx = iy * width + ix;

        // Calculate gradient
        const normal = this.getNormalAt(x, y, 1);

        // Move in gradient direction
        x += normal.x * speed;
        y += normal.y * speed;

        // Check bounds
        if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) break;

        const newIdx = Math.floor(y) * width + Math.floor(x);
        const currentVal = values[idx] ?? 0;
        const newVal = values[newIdx] ?? 0;
        const heightDiff = currentVal - newVal;

        if (heightDiff > 0) {
          // Moving downhill - erode and carry sediment
          const erosion = Math.min(heightDiff, erosionStrength);
          values[idx] = currentVal - erosion;
          sediment += erosion;
          speed = Math.min(2, speed + 0.1);
        } else {
          // Moving uphill or flat - deposit sediment
          const deposit = Math.min(sediment, -heightDiff + 0.001);
          values[newIdx] = newVal + deposit;
          sediment -= deposit;
          speed = Math.max(0.5, speed - 0.1);
        }

        // Natural sediment loss
        sediment *= 0.95;
      }
    }

    // Recalculate min/max
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const val = values[i] ?? 0;
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
    this.data.min = min;
    this.data.max = max;
  }

  /**
   * Apply gaussian blur to smooth terrain
   */
  smooth(radius: number = 1): void {
    if (!this.data) return;

    const { values, width, height } = this.data;
    const newValues = new Float32Array(values.length);

    // Simple box blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              sum += values[ny * width + nx] ?? 0;
              count++;
            }
          }
        }

        newValues[y * width + x] = sum / count;
      }
    }

    this.data.values = newValues;
  }

  /**
   * Export elevation data as image data (for visualization)
   */
  toImageData(): ImageData {
    if (!this.data) {
      return new ImageData(1, 1);
    }

    const { values, width, height, min, max } = this.data;
    const imageData = new ImageData(width, height);
    const data = imageData.data;
    const range = max - min || 1;

    for (let i = 0; i < values.length; i++) {
      const val = values[i] ?? 0;
      const normalized = (val - min) / range;
      const gray = Math.round(normalized * 255);

      data[i * 4] = gray;
      data[i * 4 + 1] = gray;
      data[i * 4 + 2] = gray;
      data[i * 4 + 3] = 255;
    }

    return imageData;
  }
}
