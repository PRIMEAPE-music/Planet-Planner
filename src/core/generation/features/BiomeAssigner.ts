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
      const elevation = elevationData[i] ?? 0.5;
      const climate = climateData[i];
      const forest = forestDensity[i] ?? 0;

      const biome = this.determineBiome(
        isLand,
        elevation,
        climate?.temperature ?? 0.5,
        climate?.moisture ?? 0.5,
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
