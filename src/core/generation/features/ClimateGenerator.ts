import { SimplexNoise } from '../noise/SimplexNoise';
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
      const moisture = moistureMap[i] ?? 0.5;
      climateData[i] = {
        temperature: temperatureMap[i] ?? 0.5,
        moisture,
        windDirection: windData.directions[i] ?? 0,
        windStrength: windData.strengths[i] ?? 0.5,
        inRainShadow: moisture < 0.3 && landMask[i] === 1,
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
        const elevation = elevationData[idx] ?? 0.5;

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
    // Index-based queue for O(1) dequeue instead of O(n) shift()
    const queue: number[] = [];
    const distQueue: number[] = [];
    let head = 0;

    // Initialize with all ocean cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (landMask[idx] === 0) {
          distance[idx] = 0;
          queue.push(idx);
          distQueue.push(0);
        }
      }
    }

    // BFS to calculate distances
    const dxArr = [-1, 1, 0, 0];
    const dyArr = [0, 0, -1, 1];

    while (head < queue.length) {
      const flatIdx = queue[head]!;
      const dist = distQueue[head]!;
      head++;

      const x = flatIdx % width;
      const y = (flatIdx - x) / width;

      for (let d = 0; d < 4; d++) {
        const nx = x + dxArr[d]!;
        const ny = y + dyArr[d]!;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

        const ni = ny * width + nx;
        const newDist = dist + 1;

        if (newDist < distance[ni]!) {
          distance[ni] = newDist;
          queue.push(ni);
          distQueue.push(newDist);
        }
      }
    }

    // Normalize
    let maxDist = 0;
    for (let i = 0; i < distance.length; i++) {
      const d = distance[i] ?? Infinity;
      if (d !== Infinity && d > maxDist) {
        maxDist = d;
      }
    }
    if (maxDist > 0) {
      for (let i = 0; i < distance.length; i++) {
        const d = distance[i] ?? Infinity;
        distance[i] = d === Infinity ? 1 : d / maxDist;
      }
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
      const oceanProximity = 1 - (oceanDistance[i] ?? 1);
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
      const elevation = elevationData[idx] ?? 0.5;

      // Check upwind for mountains (rain shadow)
      let rainShadow = 0;
      const checkDist = 30;

      for (let d = 1; d < checkDist; d++) {
        const ux = Math.round(x - windX * d);
        const uy = Math.round(y - windY * d);
        if (ux < 0 || ux >= width || uy < 0 || uy >= height) break;

        const ui = uy * width + ux;
        const upwindElevation = elevationData[ui] ?? 0.5;

        // If upwind terrain is higher, we're in rain shadow
        if (upwindElevation > elevation + 0.1) {
          rainShadow = Math.max(
            rainShadow,
            (upwindElevation - elevation) * rainShadowStrength * (1 - d / checkDist)
          );
        }
      }

      // Apply rain shadow
      const currentMoisture = moistureMap[idx] ?? 0;
      moistureMap[idx] = Math.max(0, currentMoisture - rainShadow);

      // Mountains get more precipitation (orographic effect)
      if (elevation > 0.5 && elevation < 0.8) {
        const upwindMoisture = this.getUpwindMoisture(x, y, windX, windY, moistureMap);
        if (upwindMoisture > 0.3) {
          moistureMap[idx] = (moistureMap[idx] ?? 0) + 0.2 * (elevation - 0.5);
        }
      }

      // Add some noise for variation
      const noiseVal = this.noise.noise2D(x * 0.03, y * 0.03) * 0.15;
      moistureMap[idx] = Math.max(0, Math.min(1, (moistureMap[idx] ?? 0) + noiseVal));
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
      total += moistureMap[ui] ?? 0;
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
        const elevation = elevationData[idx] ?? 0.5;

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
