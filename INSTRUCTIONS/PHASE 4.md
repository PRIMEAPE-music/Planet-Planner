# PHASE 4: Terrain & Biome System

## Detailed Instructional Guide for Claude Code

---

## Overview

Phase 4 builds the terrain foundation for Planet Planner:
- Biome definitions with realistic and parchment color palettes
- Procedural terrain texture generation
- Elevation/heightmap system with hillshading
- Ink-style coastline rendering
- Biome transition blending with natural gradients
- Style slider for realistic ↔ parchment rendering

---

### 4.1 Biome System Architecture

#### 4.1.1 src/core/terrain/types.ts

```typescript
import type { Vector2 } from '@/types';

/**
 * Biome type identifiers
 */
export type BiomeType =
  | 'ocean'
  | 'shallowWater'
  | 'beach'
  | 'grassland'
  | 'forest'
  | 'denseForest'
  | 'desert'
  | 'savanna'
  | 'tundra'
  | 'snow'
  | 'mountain'
  | 'highMountain'
  | 'swamp'
  | 'volcanic'
  | 'coral'
  | 'jungle';

/**
 * Biome definition with visual properties
 */
export interface BiomeDefinition {
  /** Unique identifier */
  id: BiomeType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Realistic color palette */
  realisticColors: BiomeColorPalette;
  /** Parchment/map color palette */
  parchmentColors: BiomeColorPalette;
  /** Elevation range (0-1) where this biome occurs */
  elevationRange: { min: number; max: number };
  /** Moisture range (0-1) where this biome occurs */
  moistureRange: { min: number; max: number };
  /** Temperature range (0-1) where this biome occurs */
  temperatureRange: { min: number; max: number };
  /** Texture settings */
  texture: BiomeTextureSettings;
  /** Is this a water biome */
  isWater: boolean;
  /** Transition priority (higher = this biome shows on top in transitions) */
  transitionPriority: number;
}

/**
 * Color palette for a biome
 */
export interface BiomeColorPalette {
  /** Base/primary color */
  base: string;
  /** Darker variation */
  dark: string;
  /** Lighter variation */
  light: string;
  /** Accent color for details */
  accent: string;
  /** Shadow color */
  shadow: string;
  /** Highlight color */
  highlight: string;
}

/**
 * Texture generation settings for a biome
 */
export interface BiomeTextureSettings {
  /** Noise scale for base texture */
  noiseScale: number;
  /** Number of noise octaves */
  octaves: number;
  /** Texture detail level (0-1) */
  detail: number;
  /** Pattern type */
  pattern: 'noise' | 'stipple' | 'crosshatch' | 'waves' | 'none';
  /** Pattern density */
  patternDensity: number;
  /** Enable terrain features (grass tufts, rocks, etc.) */
  features: boolean;
}

/**
 * Terrain cell data
 */
export interface TerrainCell {
  /** Position in grid */
  position: Vector2;
  /** Elevation (0-1, 0 = deepest ocean, 1 = highest peak) */
  elevation: number;
  /** Moisture level (0-1) */
  moisture: number;
  /** Temperature (0-1, 0 = coldest, 1 = hottest) */
  temperature: number;
  /** Assigned biome */
  biome: BiomeType;
  /** Is this cell land (above water level) */
  isLand: boolean;
  /** Distance to nearest coastline (negative = water, positive = land) */
  coastDistance: number;
  /** Normal vector for hillshading */
  normal: Vector2;
}

/**
 * Terrain map configuration
 */
export interface TerrainMapConfig {
  /** Map width in cells */
  width: number;
  /** Map height in cells */
  height: number;
  /** Cell size in pixels */
  cellSize: number;
  /** Sea level (0-1 elevation threshold) */
  seaLevel: number;
  /** Global seed for generation */
  seed: number;
}

/**
 * Elevation layer data
 */
export interface ElevationData {
  /** Raw elevation values (0-1) */
  values: Float32Array;
  /** Width of the elevation grid */
  width: number;
  /** Height of the elevation grid */
  height: number;
  /** Minimum elevation value */
  min: number;
  /** Maximum elevation value */
  max: number;
}

/**
 * Style blend settings
 */
export interface TerrainStyleSettings {
  /** Blend between realistic (0) and parchment (1) */
  styleBlend: number;
  /** Coastline ink intensity */
  coastlineIntensity: number;
  /** Hillshade intensity */
  hillshadeIntensity: number;
  /** Color saturation adjustment */
  saturation: number;
  /** Brightness adjustment */
  brightness: number;
  /** Show biome patterns */
  showPatterns: boolean;
}
```

#### 4.1.2 src/core/terrain/BiomeRegistry.ts

```typescript
import type { BiomeDefinition, BiomeType, BiomeColorPalette } from './types';

/**
 * Default biome definitions
 */
const DEFAULT_BIOMES: BiomeDefinition[] = [
  // Water biomes
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep ocean waters',
    realisticColors: {
      base: '#0a4a7c',
      dark: '#062d4d',
      light: '#1565a0',
      accent: '#0d47a1',
      shadow: '#041e3a',
      highlight: '#2196f3',
    },
    parchmentColors: {
      base: '#5b8fa8',
      dark: '#3d6b82',
      light: '#7eb3cc',
      accent: '#4a7c91',
      shadow: '#2d4f5e',
      highlight: '#a8d4e6',
    },
    elevationRange: { min: 0, max: 0.3 },
    moistureRange: { min: 0, max: 1 },
    temperatureRange: { min: 0, max: 1 },
    texture: {
      noiseScale: 0.02,
      octaves: 3,
      detail: 0.5,
      pattern: 'waves',
      patternDensity: 0.3,
      features: false,
    },
    isWater: true,
    transitionPriority: 0,
  },
  {
    id: 'shallowWater',
    name: 'Shallow Water',
    description: 'Coastal and shallow waters',
    realisticColors: {
      base: '#1e88a8',
      dark: '#0d5c73',
      light: '#4fc3dc',
      accent: '#26a69a',
      shadow: '#0a4a5e',
      highlight: '#80deea',
    },
    parchmentColors: {
      base: '#7cc5d4',
      dark: '#5a9aa8',
      light: '#a8e0eb',
      accent: '#6bb3c2',
      shadow: '#4a8591',
      highlight: '#c5eef5',
    },
    elevationRange: { min: 0.3, max: 0.45 },
    moistureRange: { min: 0, max: 1 },
    temperatureRange: { min: 0, max: 1 },
    texture: {
      noiseScale: 0.03,
      octaves: 2,
      detail: 0.3,
      pattern: 'waves',
      patternDensity: 0.2,
      features: false,
    },
    isWater: true,
    transitionPriority: 1,
  },
  // Coastal
  {
    id: 'beach',
    name: 'Beach',
    description: 'Sandy coastal areas',
    realisticColors: {
      base: '#e6d5a8',
      dark: '#c4b078',
      light: '#f5edd8',
      accent: '#d4c4a0',
      shadow: '#a89860',
      highlight: '#fff8e7',
    },
    parchmentColors: {
      base: '#e8dcc0',
      dark: '#c9bc9a',
      light: '#f5efe0',
      accent: '#ddd0b0',
      shadow: '#b5a888',
      highlight: '#faf6ed',
    },
    elevationRange: { min: 0.45, max: 0.5 },
    moistureRange: { min: 0, max: 0.4 },
    temperatureRange: { min: 0.3, max: 1 },
    texture: {
      noiseScale: 0.05,
      octaves: 2,
      detail: 0.2,
      pattern: 'stipple',
      patternDensity: 0.4,
      features: false,
    },
    isWater: false,
    transitionPriority: 2,
  },
  // Lowland biomes
  {
    id: 'grassland',
    name: 'Grassland',
    description: 'Temperate grasslands and plains',
    realisticColors: {
      base: '#7cb342',
      dark: '#558b2f',
      light: '#9ccc65',
      accent: '#8bc34a',
      shadow: '#33691e',
      highlight: '#c5e1a5',
    },
    parchmentColors: {
      base: '#b8c9a0',
      dark: '#94a878',
      light: '#d4e0c0',
      accent: '#a8b890',
      shadow: '#788860',
      highlight: '#e8f0d8',
    },
    elevationRange: { min: 0.5, max: 0.65 },
    moistureRange: { min: 0.3, max: 0.6 },
    temperatureRange: { min: 0.3, max: 0.7 },
    texture: {
      noiseScale: 0.04,
      octaves: 3,
      detail: 0.4,
      pattern: 'noise',
      patternDensity: 0.3,
      features: true,
    },
    isWater: false,
    transitionPriority: 3,
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Temperate forests',
    realisticColors: {
      base: '#4a7c3f',
      dark: '#2e5a27',
      light: '#6b9b5a',
      accent: '#558b2f',
      shadow: '#1b3d15',
      highlight: '#8bc34a',
    },
    parchmentColors: {
      base: '#8fa878',
      dark: '#6b8258',
      light: '#b0c498',
      accent: '#7d9668',
      shadow: '#4d6040',
      highlight: '#c8d8b8',
    },
    elevationRange: { min: 0.5, max: 0.7 },
    moistureRange: { min: 0.5, max: 0.8 },
    temperatureRange: { min: 0.3, max: 0.7 },
    texture: {
      noiseScale: 0.03,
      octaves: 4,
      detail: 0.6,
      pattern: 'noise',
      patternDensity: 0.5,
      features: true,
    },
    isWater: false,
    transitionPriority: 4,
  },
  {
    id: 'denseForest',
    name: 'Dense Forest',
    description: 'Thick, old-growth forests',
    realisticColors: {
      base: '#2d5a27',
      dark: '#1a3d15',
      light: '#4a7c3f',
      accent: '#33691e',
      shadow: '#0d2608',
      highlight: '#558b2f',
    },
    parchmentColors: {
      base: '#6b8258',
      dark: '#4d6040',
      light: '#8fa878',
      accent: '#5a7048',
      shadow: '#3a4830',
      highlight: '#a8c090',
    },
    elevationRange: { min: 0.55, max: 0.75 },
    moistureRange: { min: 0.7, max: 1 },
    temperatureRange: { min: 0.3, max: 0.7 },
    texture: {
      noiseScale: 0.025,
      octaves: 4,
      detail: 0.8,
      pattern: 'noise',
      patternDensity: 0.7,
      features: true,
    },
    isWater: false,
    transitionPriority: 5,
  },
  // Dry biomes
  {
    id: 'desert',
    name: 'Desert',
    description: 'Arid desert regions',
    realisticColors: {
      base: '#d4a056',
      dark: '#b8863c',
      light: '#e8c078',
      accent: '#c49a4a',
      shadow: '#8c6830',
      highlight: '#f5dca0',
    },
    parchmentColors: {
      base: '#dcc8a0',
      dark: '#c4a878',
      light: '#ecdcc0',
      accent: '#d0b890',
      shadow: '#a89060',
      highlight: '#f5ecd8',
    },
    elevationRange: { min: 0.5, max: 0.7 },
    moistureRange: { min: 0, max: 0.2 },
    temperatureRange: { min: 0.6, max: 1 },
    texture: {
      noiseScale: 0.02,
      octaves: 3,
      detail: 0.3,
      pattern: 'stipple',
      patternDensity: 0.5,
      features: true,
    },
    isWater: false,
    transitionPriority: 3,
  },
  {
    id: 'savanna',
    name: 'Savanna',
    description: 'Tropical grasslands with scattered trees',
    realisticColors: {
      base: '#c6a060',
      dark: '#a88040',
      light: '#dcc080',
      accent: '#b89050',
      shadow: '#806030',
      highlight: '#edd8a0',
    },
    parchmentColors: {
      base: '#d4c4a0',
      dark: '#b8a480',
      light: '#e8dcc0',
      accent: '#c8b490',
      shadow: '#988868',
      highlight: '#f0e8d0',
    },
    elevationRange: { min: 0.5, max: 0.65 },
    moistureRange: { min: 0.2, max: 0.4 },
    temperatureRange: { min: 0.6, max: 0.9 },
    texture: {
      noiseScale: 0.03,
      octaves: 3,
      detail: 0.4,
      pattern: 'noise',
      patternDensity: 0.3,
      features: true,
    },
    isWater: false,
    transitionPriority: 3,
  },
  // Cold biomes
  {
    id: 'tundra',
    name: 'Tundra',
    description: 'Cold, treeless plains',
    realisticColors: {
      base: '#a8b8a0',
      dark: '#889880',
      light: '#c8d8c0',
      accent: '#98a890',
      shadow: '#687860',
      highlight: '#e0ead8',
    },
    parchmentColors: {
      base: '#c8d0c0',
      dark: '#a8b0a0',
      light: '#e0e8d8',
      accent: '#b8c0b0',
      shadow: '#889080',
      highlight: '#f0f4e8',
    },
    elevationRange: { min: 0.5, max: 0.7 },
    moistureRange: { min: 0.3, max: 0.6 },
    temperatureRange: { min: 0, max: 0.25 },
    texture: {
      noiseScale: 0.04,
      octaves: 2,
      detail: 0.3,
      pattern: 'stipple',
      patternDensity: 0.2,
      features: true,
    },
    isWater: false,
    transitionPriority: 3,
  },
  {
    id: 'snow',
    name: 'Snow',
    description: 'Permanent snow and ice',
    realisticColors: {
      base: '#eceff1',
      dark: '#cfd8dc',
      light: '#ffffff',
      accent: '#e0e5e8',
      shadow: '#b0bec5',
      highlight: '#ffffff',
    },
    parchmentColors: {
      base: '#f0f0e8',
      dark: '#d8d8d0',
      light: '#fafaf8',
      accent: '#e8e8e0',
      shadow: '#c0c0b8',
      highlight: '#ffffff',
    },
    elevationRange: { min: 0.5, max: 1 },
    moistureRange: { min: 0, max: 1 },
    temperatureRange: { min: 0, max: 0.15 },
    texture: {
      noiseScale: 0.05,
      octaves: 2,
      detail: 0.2,
      pattern: 'noise',
      patternDensity: 0.1,
      features: false,
    },
    isWater: false,
    transitionPriority: 6,
  },
  // Mountain biomes
  {
    id: 'mountain',
    name: 'Mountain',
    description: 'Rocky mountain terrain',
    realisticColors: {
      base: '#78909c',
      dark: '#546e7a',
      light: '#90a4ae',
      accent: '#607d8b',
      shadow: '#37474f',
      highlight: '#b0bec5',
    },
    parchmentColors: {
      base: '#a8b0a8',
      dark: '#889088',
      light: '#c8d0c8',
      accent: '#98a098',
      shadow: '#687068',
      highlight: '#e0e8e0',
    },
    elevationRange: { min: 0.7, max: 0.85 },
    moistureRange: { min: 0, max: 1 },
    temperatureRange: { min: 0, max: 1 },
    texture: {
      noiseScale: 0.02,
      octaves: 4,
      detail: 0.7,
      pattern: 'crosshatch',
      patternDensity: 0.4,
      features: true,
    },
    isWater: false,
    transitionPriority: 7,
  },
  {
    id: 'highMountain',
    name: 'High Mountain',
    description: 'Alpine peaks and ridges',
    realisticColors: {
      base: '#546e7a',
      dark: '#37474f',
      light: '#78909c',
      accent: '#455a64',
      shadow: '#263238',
      highlight: '#90a4ae',
    },
    parchmentColors: {
      base: '#889088',
      dark: '#687068',
      light: '#a8b0a8',
      accent: '#788078',
      shadow: '#505850',
      highlight: '#c0c8c0',
    },
    elevationRange: { min: 0.85, max: 1 },
    moistureRange: { min: 0, max: 1 },
    temperatureRange: { min: 0, max: 1 },
    texture: {
      noiseScale: 0.015,
      octaves: 5,
      detail: 0.9,
      pattern: 'crosshatch',
      patternDensity: 0.6,
      features: true,
    },
    isWater: false,
    transitionPriority: 8,
  },
  // Special biomes
  {
    id: 'swamp',
    name: 'Swamp',
    description: 'Wetlands and marshes',
    realisticColors: {
      base: '#6d7c5a',
      dark: '#4a5840',
      light: '#8a9c70',
      accent: '#5d6b4a',
      shadow: '#3a4830',
      highlight: '#a8b890',
    },
    parchmentColors: {
      base: '#98a080',
      dark: '#788860',
      light: '#b8c0a0',
      accent: '#889070',
      shadow: '#606848',
      highlight: '#d0d8b8',
    },
    elevationRange: { min: 0.45, max: 0.52 },
    moistureRange: { min: 0.8, max: 1 },
    temperatureRange: { min: 0.4, max: 0.8 },
    texture: {
      noiseScale: 0.035,
      octaves: 3,
      detail: 0.5,
      pattern: 'stipple',
      patternDensity: 0.6,
      features: true,
    },
    isWater: false,
    transitionPriority: 2,
  },
  {
    id: 'volcanic',
    name: 'Volcanic',
    description: 'Volcanic terrain with lava flows',
    realisticColors: {
      base: '#4a3830',
      dark: '#2d2420',
      light: '#5d4840',
      accent: '#8b4513',
      shadow: '#1a1410',
      highlight: '#6d5848',
    },
    parchmentColors: {
      base: '#685850',
      dark: '#504038',
      light: '#887868',
      accent: '#786050',
      shadow: '#383028',
      highlight: '#a09080',
    },
    elevationRange: { min: 0.6, max: 0.9 },
    moistureRange: { min: 0, max: 0.3 },
    temperatureRange: { min: 0.7, max: 1 },
    texture: {
      noiseScale: 0.025,
      octaves: 4,
      detail: 0.8,
      pattern: 'noise',
      patternDensity: 0.7,
      features: true,
    },
    isWater: false,
    transitionPriority: 7,
  },
  {
    id: 'jungle',
    name: 'Jungle',
    description: 'Dense tropical rainforest',
    realisticColors: {
      base: '#2e7d32',
      dark: '#1b5e20',
      light: '#43a047',
      accent: '#388e3c',
      shadow: '#0d3d10',
      highlight: '#66bb6a',
    },
    parchmentColors: {
      base: '#6a9a60',
      dark: '#4a7a40',
      light: '#8aba80',
      accent: '#5a8a50',
      shadow: '#3a5a30',
      highlight: '#a8d098',
    },
    elevationRange: { min: 0.5, max: 0.7 },
    moistureRange: { min: 0.8, max: 1 },
    temperatureRange: { min: 0.7, max: 1 },
    texture: {
      noiseScale: 0.02,
      octaves: 5,
      detail: 0.9,
      pattern: 'noise',
      patternDensity: 0.8,
      features: true,
    },
    isWater: false,
    transitionPriority: 5,
  },
  {
    id: 'coral',
    name: 'Coral Reef',
    description: 'Shallow tropical waters with coral',
    realisticColors: {
      base: '#26c6da',
      dark: '#00acc1',
      light: '#4dd0e1',
      accent: '#00bcd4',
      shadow: '#0097a7',
      highlight: '#80deea',
    },
    parchmentColors: {
      base: '#88d0d8',
      dark: '#60b0b8',
      light: '#a8e0e8',
      accent: '#78c0c8',
      shadow: '#4898a0',
      highlight: '#c0eef0',
    },
    elevationRange: { min: 0.35, max: 0.45 },
    moistureRange: { min: 0, max: 1 },
    temperatureRange: { min: 0.7, max: 1 },
    texture: {
      noiseScale: 0.04,
      octaves: 3,
      detail: 0.5,
      pattern: 'stipple',
      patternDensity: 0.5,
      features: false,
    },
    isWater: true,
    transitionPriority: 1,
  },
];

/**
 * Registry for biome definitions
 */
export class BiomeRegistry {
  private biomes: Map<BiomeType, BiomeDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Register default biomes
   */
  private registerDefaults(): void {
    for (const biome of DEFAULT_BIOMES) {
      this.biomes.set(biome.id, biome);
    }
  }

  /**
   * Get a biome by ID
   */
  get(id: BiomeType): BiomeDefinition | undefined {
    return this.biomes.get(id);
  }

  /**
   * Get all biomes
   */
  getAll(): BiomeDefinition[] {
    return Array.from(this.biomes.values());
  }

  /**
   * Get all land biomes
   */
  getLandBiomes(): BiomeDefinition[] {
    return this.getAll().filter((b) => !b.isWater);
  }

  /**
   * Get all water biomes
   */
  getWaterBiomes(): BiomeDefinition[] {
    return this.getAll().filter((b) => b.isWater);
  }

  /**
   * Register a custom biome
   */
  register(biome: BiomeDefinition): void {
    this.biomes.set(biome.id, biome);
  }

  /**
   * Determine biome based on elevation, moisture, and temperature
   */
  determineBiome(
    elevation: number,
    moisture: number,
    temperature: number,
    seaLevel: number = 0.45
  ): BiomeType {
    // Water check
    if (elevation < seaLevel) {
      if (elevation < 0.3) return 'ocean';
      if (temperature > 0.7 && elevation > 0.35) return 'coral';
      return 'shallowWater';
    }

    // Beach
    if (elevation < seaLevel + 0.05) {
      if (moisture > 0.8 && temperature > 0.4) return 'swamp';
      return 'beach';
    }

    // High elevation
    if (elevation > 0.85) return 'highMountain';
    if (elevation > 0.7) return 'mountain';

    // Temperature-based primary selection
    if (temperature < 0.15) return 'snow';
    if (temperature < 0.25) return 'tundra';

    // Hot and dry
    if (temperature > 0.6 && moisture < 0.2) return 'desert';
    if (temperature > 0.6 && moisture < 0.4) return 'savanna';

    // Hot and wet
    if (temperature > 0.7 && moisture > 0.8) return 'jungle';

    // Temperate zones
    if (moisture > 0.8) return 'swamp';
    if (moisture > 0.7) return 'denseForest';
    if (moisture > 0.5) return 'forest';

    return 'grassland';
  }

  /**
   * Get interpolated color between realistic and parchment
   */
  getBlendedColor(
    biome: BiomeDefinition,
    colorKey: keyof BiomeColorPalette,
    styleBlend: number
  ): string {
    const realistic = biome.realisticColors[colorKey];
    const parchment = biome.parchmentColors[colorKey];
    return this.interpolateColor(realistic, parchment, styleBlend);
  }

  /**
   * Interpolate between two hex colors
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// Export singleton instance
export const biomeRegistry = new BiomeRegistry();
```

---

### 4.2 Elevation System

#### 4.2.1 src/core/terrain/ElevationMap.ts

```typescript
import { fbm, turbulence, ridgedNoise, initNoise } from '../rendering/noise';
import type { ElevationData, Vector2 } from './types';

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
    const v00 = values[y0 * width + x0];
    const v10 = values[y0 * width + x1];
    const v01 = values[y1 * width + x0];
    const v11 = values[y1 * width + x1];

    const v0 = v00 + (v10 - v00) * fx;
    const v1 = v01 + (v11 - v01) * fx;

    return v0 + (v1 - v0) * fy;
  }

  /**
   * Calculate normal vector at a point (for hillshading)
   */
  getNormalAt(x: number, y: number, strength: number = 1): Vector2 {
    if (!this.data) return { x: 0, y: -1 };

    const { width, height } = this.data;

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
        const heightDiff = values[idx] - values[newIdx];

        if (heightDiff > 0) {
          // Moving downhill - erode and carry sediment
          const erosion = Math.min(heightDiff, erosionStrength);
          values[idx] -= erosion;
          sediment += erosion;
          speed = Math.min(2, speed + 0.1);
        } else {
          // Moving uphill or flat - deposit sediment
          const deposit = Math.min(sediment, -heightDiff + 0.001);
          values[newIdx] += deposit;
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
      min = Math.min(min, values[i]);
      max = Math.max(max, values[i]);
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
              sum += values[ny * width + nx];
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
      const normalized = (values[i] - min) / range;
      const gray = Math.round(normalized * 255);

      data[i * 4] = gray;
      data[i * 4 + 1] = gray;
      data[i * 4 + 2] = gray;
      data[i * 4 + 3] = 255;
    }

    return imageData;
  }
}
```

---

### 4.3 Terrain Renderer

#### 4.3.1 src/core/terrain/TerrainRenderer.ts

```typescript
import { Application, Container, Graphics, RenderTexture, Sprite, Texture } from 'pixi.js';
import { ElevationMap } from './ElevationMap';
import { biomeRegistry, BiomeRegistry } from './BiomeRegistry';
import { fbm, initNoise } from '../rendering/noise';
import type {
  BiomeType,
  BiomeDefinition,
  TerrainMapConfig,
  TerrainStyleSettings,
  TerrainCell,
  Vector2,
} from './types';
import { hexToRgb } from '@/utils';

/**
 * Default terrain style settings
 */
const DEFAULT_STYLE: TerrainStyleSettings = {
  styleBlend: 0.7, // 70% toward parchment
  coastlineIntensity: 0.8,
  hillshadeIntensity: 0.6,
  saturation: 1.0,
  brightness: 1.0,
  showPatterns: true,
};

/**
 * Renders terrain with biomes, elevation, and stylistic effects
 */
export class TerrainRenderer {
  private app: Application;
  private container: Container;
  private elevationMap: ElevationMap;
  private registry: BiomeRegistry;
  private config: TerrainMapConfig;
  private style: TerrainStyleSettings;

  // Render targets
  private terrainTexture: RenderTexture | null = null;
  private terrainSprite: Sprite | null = null;

  // Cached terrain data
  private cells: TerrainCell[] = [];
  private moistureMap: Float32Array | null = null;
  private temperatureMap: Float32Array | null = null;

  constructor(
    app: Application,
    container: Container,
    config: Partial<TerrainMapConfig> = {}
  ) {
    this.app = app;
    this.container = container;
    this.elevationMap = new ElevationMap();
    this.registry = biomeRegistry;

    this.config = {
      width: config.width ?? 256,
      height: config.height ?? 256,
      cellSize: config.cellSize ?? 16,
      seaLevel: config.seaLevel ?? 0.45,
      seed: config.seed ?? Date.now(),
    };

    this.style = { ...DEFAULT_STYLE };
  }

  /**
   * Set style settings
   */
  setStyle(style: Partial<TerrainStyleSettings>): void {
    this.style = { ...this.style, ...style };
  }

  /**
   * Get current style settings
   */
  getStyle(): TerrainStyleSettings {
    return { ...this.style };
  }

  /**
   * Generate terrain
   */
  async generate(seed?: number): Promise<void> {
    const useSeed = seed ?? this.config.seed;
    this.config.seed = useSeed;

    initNoise(useSeed);

    // Generate elevation
    this.elevationMap.generate(this.config.width, this.config.height, useSeed);

    // Optional: Apply erosion for more realistic terrain
    // this.elevationMap.erode(500, 0.05);
    // this.elevationMap.smooth(1);

    // Generate moisture map
    this.generateMoistureMap(useSeed + 1000);

    // Generate temperature map
    this.generateTemperatureMap(useSeed + 2000);

    // Assign biomes to cells
    this.assignBiomes();

    // Render terrain
    await this.render();
  }

  /**
   * Generate moisture map
   */
  private generateMoistureMap(seed: number): void {
    initNoise(seed);

    const { width, height } = this.config;
    this.moistureMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Base moisture from noise
        let moisture = fbm(x * 0.01, y * 0.01, 4, 2.0, 0.5);
        moisture = (moisture + 1) / 2;

        // Increase moisture near water
        const elevation = this.elevationMap.getElevationAt(x, y);
        if (elevation < this.config.seaLevel) {
          moisture = 1;
        } else {
          // Distance-based moisture from coastline
          const coastDist = (elevation - this.config.seaLevel) / (1 - this.config.seaLevel);
          moisture = moisture * 0.7 + (1 - coastDist) * 0.3;
        }

        this.moistureMap[y * width + x] = Math.max(0, Math.min(1, moisture));
      }
    }
  }

  /**
   * Generate temperature map (based on latitude + elevation)
   */
  private generateTemperatureMap(seed: number): void {
    initNoise(seed);

    const { width, height } = this.config;
    this.temperatureMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Latitude-based temperature (cooler at top and bottom)
        const latitudeNorm = y / height;
        const latitudeTemp = 1 - Math.abs(latitudeNorm - 0.5) * 2;

        // Elevation cooling
        const elevation = this.elevationMap.getElevationAt(x, y);
        const elevationCooling = Math.max(0, elevation - this.config.seaLevel) * 0.8;

        // Add some noise variation
        const noise = fbm(x * 0.02, y * 0.02, 2, 2.0, 0.5) * 0.1;

        let temperature = latitudeTemp - elevationCooling + noise;
        temperature = Math.max(0, Math.min(1, temperature));

        this.temperatureMap[y * width + x] = temperature;
      }
    }
  }

  /**
   * Assign biomes to all cells
   */
  private assignBiomes(): void {
    const { width, height } = this.config;
    this.cells = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        const elevation = this.elevationMap.getElevationAt(x, y);
        const moisture = this.moistureMap?.[idx] ?? 0.5;
        const temperature = this.temperatureMap?.[idx] ?? 0.5;

        const biome = this.registry.determineBiome(
          elevation,
          moisture,
          temperature,
          this.config.seaLevel
        );

        const isLand = elevation >= this.config.seaLevel;
        const normal = this.elevationMap.getNormalAt(x, y, 1);

        this.cells.push({
          position: { x, y },
          elevation,
          moisture,
          temperature,
          biome,
          isLand,
          coastDistance: isLand ? elevation - this.config.seaLevel : elevation - this.config.seaLevel,
          normal,
        });
      }
    }
  }

  /**
   * Render terrain to texture
   */
  async render(): Promise<void> {
    const { width, height, cellSize } = this.config;
    const pixelWidth = width * cellSize;
    const pixelHeight = height * cellSize;

    // Create or resize render texture
    if (this.terrainTexture) {
      this.terrainTexture.destroy(true);
    }

    this.terrainTexture = RenderTexture.create({
      width: pixelWidth,
      height: pixelHeight,
      resolution: 1,
    });

    // Create canvas for pixel manipulation
    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(pixelWidth, pixelHeight);
    const data = imageData.data;

    // Render each pixel
    for (let py = 0; py < pixelHeight; py++) {
      for (let px = 0; px < pixelWidth; px++) {
        const cellX = Math.floor(px / cellSize);
        const cellY = Math.floor(py / cellSize);
        const cellIdx = cellY * width + cellX;

        if (cellIdx >= this.cells.length) continue;

        const cell = this.cells[cellIdx];
        const biome = this.registry.get(cell.biome);

        if (!biome) continue;

        // Get base color
        const baseColor = this.getPixelColor(
          px,
          py,
          cell,
          biome,
          cellSize
        );

        // Apply hillshading
        const hillshade = this.elevationMap.getHillshadeAt(
          px / cellSize,
          py / cellSize,
          { x: -0.7, y: -0.7 },
          this.style.hillshadeIntensity
        );

        // Apply color adjustments
        const pixelIdx = (py * pixelWidth + px) * 4;
        data[pixelIdx] = Math.round(baseColor.r * hillshade * this.style.brightness);
        data[pixelIdx + 1] = Math.round(baseColor.g * hillshade * this.style.brightness);
        data[pixelIdx + 2] = Math.round(baseColor.b * hillshade * this.style.brightness);
        data[pixelIdx + 3] = 255;
      }
    }

    // Draw coastlines
    this.drawCoastlines(data, pixelWidth, pixelHeight);

    ctx.putImageData(imageData, 0, 0);

    // Create sprite from canvas
    const texture = Texture.from(canvas);
    
    if (this.terrainSprite) {
      this.terrainSprite.destroy();
    }

    this.terrainSprite = new Sprite(texture);
    this.container.addChild(this.terrainSprite);
  }

  /**
   * Get pixel color with biome blending and patterns
   */
  private getPixelColor(
    px: number,
    py: number,
    cell: TerrainCell,
    biome: BiomeDefinition,
    cellSize: number
  ): { r: number; g: number; b: number } {
    // Get blended base color
    const baseColorHex = this.registry.getBlendedColor(
      biome,
      'base',
      this.style.styleBlend
    );
    const baseColor = hexToRgb(baseColorHex)!;

    // Add noise variation
    const noiseVal = fbm(
      px * biome.texture.noiseScale,
      py * biome.texture.noiseScale,
      biome.texture.octaves
    );

    // Get variation colors
    const darkColorHex = this.registry.getBlendedColor(biome, 'dark', this.style.styleBlend);
    const lightColorHex = this.registry.getBlendedColor(biome, 'light', this.style.styleBlend);
    const darkColor = hexToRgb(darkColorHex)!;
    const lightColor = hexToRgb(lightColorHex)!;

    // Blend based on noise
    const t = (noiseVal + 1) / 2; // 0-1
    let r, g, b;

    if (t < 0.5) {
      const blend = t * 2;
      r = darkColor.r + (baseColor.r - darkColor.r) * blend;
      g = darkColor.g + (baseColor.g - darkColor.g) * blend;
      b = darkColor.b + (baseColor.b - darkColor.b) * blend;
    } else {
      const blend = (t - 0.5) * 2;
      r = baseColor.r + (lightColor.r - baseColor.r) * blend;
      g = baseColor.g + (lightColor.g - baseColor.g) * blend;
      b = baseColor.b + (lightColor.b - baseColor.b) * blend;
    }

    // Add pattern overlay if enabled
    if (this.style.showPatterns && biome.texture.pattern !== 'none') {
      const pattern = this.getPatternValue(
        px,
        py,
        biome.texture.pattern,
        biome.texture.patternDensity
      );

      const shadowColor = hexToRgb(
        this.registry.getBlendedColor(biome, 'shadow', this.style.styleBlend)
      )!;

      r = r * (1 - pattern * 0.3) + shadowColor.r * pattern * 0.3;
      g = g * (1 - pattern * 0.3) + shadowColor.g * pattern * 0.3;
      b = b * (1 - pattern * 0.3) + shadowColor.b * pattern * 0.3;
    }

    // Apply saturation
    if (this.style.saturation !== 1) {
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = gray + (r - gray) * this.style.saturation;
      g = gray + (g - gray) * this.style.saturation;
      b = gray + (b - gray) * this.style.saturation;
    }

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    };
  }

  /**
   * Get pattern value for stylistic rendering
   */
  private getPatternValue(
    x: number,
    y: number,
    pattern: string,
    density: number
  ): number {
    switch (pattern) {
      case 'stipple': {
        // Random dots
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);
        return rand < density * 0.1 ? 1 : 0;
      }

      case 'crosshatch': {
        // Diagonal lines
        const line1 = ((x + y) % 8) < 1 ? 1 : 0;
        const line2 = ((x - y + 1000) % 8) < 1 ? 1 : 0;
        return (line1 + line2) * density;
      }

      case 'waves': {
        // Wavy horizontal lines
        const wave = Math.sin(x * 0.1 + Math.sin(y * 0.05) * 2);
        return wave > 0.8 ? density : 0;
      }

      case 'noise':
      default: {
        // Perlin noise pattern
        const n = fbm(x * 0.05, y * 0.05, 2);
        return n > 0.5 ? density * (n - 0.5) * 2 : 0;
      }
    }
  }

  /**
   * Draw ink-style coastlines
   */
  private drawCoastlines(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    if (this.style.coastlineIntensity <= 0) return;

    const { cellSize } = this.config;
    const intensity = this.style.coastlineIntensity;

    // Ink color (darker for realistic, softer for parchment)
    const inkColor = {
      r: Math.round(38 + (90 - 38) * this.style.styleBlend),
      g: Math.round(33 + (75 - 33) * this.style.styleBlend),
      b: Math.round(30 + (65 - 30) * this.style.styleBlend),
    };

    // Find coastline pixels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellIdx = cellY * this.config.width + cellX;

        if (cellIdx >= this.cells.length) continue;

        const cell = this.cells[cellIdx];

        // Check if this is near a coastline
        if (Math.abs(cell.coastDistance) < 0.05) {
          // Check neighboring cells for land/water transition
          let isCoastline = false;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;

              const nx = cellX + dx;
              const ny = cellY + dy;

              if (nx < 0 || nx >= this.config.width || ny < 0 || ny >= this.config.height) continue;

              const neighborIdx = ny * this.config.width + nx;
              if (neighborIdx >= this.cells.length) continue;

              const neighbor = this.cells[neighborIdx];

              if (cell.isLand !== neighbor.isLand) {
                isCoastline = true;
                break;
              }
            }
            if (isCoastline) break;
          }

          if (isCoastline) {
            // Draw coastline pixel with some variation
            const variation = Math.random() * 0.3;
            const alpha = intensity * (0.7 + variation);

            const pixelIdx = (y * width + x) * 4;
            data[pixelIdx] = Math.round(data[pixelIdx] * (1 - alpha) + inkColor.r * alpha);
            data[pixelIdx + 1] = Math.round(data[pixelIdx + 1] * (1 - alpha) + inkColor.g * alpha);
            data[pixelIdx + 2] = Math.round(data[pixelIdx + 2] * (1 - alpha) + inkColor.b * alpha);
          }
        }
      }
    }
  }

  /**
   * Get cell at position
   */
  getCellAt(worldX: number, worldY: number): TerrainCell | null {
    const { cellSize, width, height } = this.config;
    const cellX = Math.floor(worldX / cellSize);
    const cellY = Math.floor(worldY / cellSize);

    if (cellX < 0 || cellX >= width || cellY < 0 || cellY >= height) {
      return null;
    }

    return this.cells[cellY * width + cellX] ?? null;
  }

  /**
   * Get biome at position
   */
  getBiomeAt(worldX: number, worldY: number): BiomeType | null {
    const cell = this.getCellAt(worldX, worldY);
    return cell?.biome ?? null;
  }

  /**
   * Get elevation at position
   */
  getElevationAt(worldX: number, worldY: number): number {
    const { cellSize } = this.config;
    return this.elevationMap.getElevationAt(worldX / cellSize, worldY / cellSize);
  }

  /**
   * Paint biome at position
   */
  paintBiome(
    worldX: number,
    worldY: number,
    biome: BiomeType,
    radius: number = 1
  ): void {
    const { cellSize, width, height } = this.config;
    const centerX = Math.floor(worldX / cellSize);
    const centerY = Math.floor(worldY / cellSize);
    const cellRadius = Math.ceil(radius / cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        // Check if within circular radius
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cellRadius) continue;

        const idx = y * width + x;
        if (idx < this.cells.length) {
          this.cells[idx].biome = biome;
        }
      }
    }
  }

  /**
   * Modify elevation at position
   */
  modifyElevation(
    worldX: number,
    worldY: number,
    delta: number,
    radius: number = 1
  ): void {
    const data = this.elevationMap.getData();
    if (!data) return;

    const { cellSize, width, height } = this.config;
    const centerX = Math.floor(worldX / cellSize);
    const centerY = Math.floor(worldY / cellSize);
    const cellRadius = Math.ceil(radius / cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        // Falloff based on distance
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cellRadius) continue;

        const falloff = 1 - dist / cellRadius;
        const idx = y * width + x;

        data.values[idx] = Math.max(0, Math.min(1, data.values[idx] + delta * falloff));

        // Update cell
        if (idx < this.cells.length) {
          this.cells[idx].elevation = data.values[idx];
          this.cells[idx].isLand = data.values[idx] >= this.config.seaLevel;

          // Reassign biome based on new elevation
          const moisture = this.moistureMap?.[idx] ?? 0.5;
          const temperature = this.temperatureMap?.[idx] ?? 0.5;
          this.cells[idx].biome = this.registry.determineBiome(
            data.values[idx],
            moisture,
            temperature,
            this.config.seaLevel
          );
        }
      }
    }
  }

  /**
   * Get terrain sprite
   */
  getSprite(): Sprite | null {
    return this.terrainSprite;
  }

  /**
   * Get configuration
   */
  getConfig(): TerrainMapConfig {
    return { ...this.config };
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    this.terrainTexture?.destroy(true);
    this.terrainSprite?.destroy();
    this.cells = [];
    this.moistureMap = null;
    this.temperatureMap = null;
  }
}
```

---

### 4.4 Terrain Layer Integration

#### 4.4.1 src/core/terrain/TerrainLayer.ts

```typescript
import { Container, Graphics } from 'pixi.js';
import { TerrainRenderer } from './TerrainRenderer';
import { LayerContainer } from '../layers/Layer';
import type { Layer as LayerData } from '@/types';
import type { BiomeType, TerrainStyleSettings } from './types';
import type { Application } from 'pixi.js';

/**
 * Specialized layer for terrain rendering
 */
export class TerrainLayer extends LayerContainer {
  private terrainRenderer: TerrainRenderer | null = null;
  private terrainContainer: Container;

  constructor(data: LayerData, app: Application) {
    super(data);

    this.terrainContainer = new Container();
    this.terrainContainer.label = 'terrain-render';
    this.contentContainer.addChild(this.terrainContainer);
  }

  /**
   * Initialize terrain renderer
   */
  initRenderer(app: Application, width: number, height: number, cellSize: number = 16): void {
    this.terrainRenderer = new TerrainRenderer(app, this.terrainContainer, {
      width: Math.ceil(width / cellSize),
      height: Math.ceil(height / cellSize),
      cellSize,
    });
  }

  /**
   * Generate terrain
   */
  async generateTerrain(seed?: number): Promise<void> {
    if (!this.terrainRenderer) return;
    await this.terrainRenderer.generate(seed);
    this.markDirty();
  }

  /**
   * Set terrain style
   */
  setStyle(style: Partial<TerrainStyleSettings>): void {
    this.terrainRenderer?.setStyle(style);
  }

  /**
   * Get terrain style
   */
  getStyle(): TerrainStyleSettings | null {
    return this.terrainRenderer?.getStyle() ?? null;
  }

  /**
   * Get biome at position
   */
  getBiomeAt(x: number, y: number): BiomeType | null {
    return this.terrainRenderer?.getBiomeAt(x, y) ?? null;
  }

  /**
   * Get elevation at position
   */
  getElevationAt(x: number, y: number): number {
    return this.terrainRenderer?.getElevationAt(x, y) ?? 0;
  }

  /**
   * Paint biome
   */
  paintBiome(x: number, y: number, biome: BiomeType, radius: number): void {
    this.terrainRenderer?.paintBiome(x, y, biome, radius);
    this.markDirty();
  }

  /**
   * Modify elevation
   */
  modifyElevation(x: number, y: number, delta: number, radius: number): void {
    this.terrainRenderer?.modifyElevation(x, y, delta, radius);
    this.markDirty();
  }

  /**
   * Re-render terrain
   */
  async rerender(): Promise<void> {
    await this.terrainRenderer?.render();
  }

  /**
   * Get terrain renderer
   */
  getRenderer(): TerrainRenderer | null {
    return this.terrainRenderer;
  }

  /**
   * Override destroy to cleanup terrain renderer
   */
  destroy(): void {
    this.terrainRenderer?.destroy();
    super.destroy();
  }
}
```

#### 4.4.2 src/core/terrain/index.ts

```typescript
export * from './types';
export { BiomeRegistry, biomeRegistry } from './BiomeRegistry';
export { ElevationMap } from './ElevationMap';
export type { ElevationGeneratorConfig } from './ElevationMap';
export { TerrainRenderer } from './TerrainRenderer';
export { TerrainLayer } from './TerrainLayer';
```

---

### 4.5 Update Core Index

#### 4.5.1 src/core/index.ts (Updated)

```typescript
export * from './canvas';
export * from './layers';
export * from './rendering';
export * from './tools';
export * from './terrain';
```

---

### 4.6 Terrain Store

#### 4.6.1 src/stores/useTerrainStore.ts

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BiomeType, TerrainStyleSettings, TerrainMapConfig } from '@/core/terrain';

interface TerrainStoreState {
  // Configuration
  config: TerrainMapConfig;
  setConfig: (config: Partial<TerrainMapConfig>) => void;

  // Style settings
  style: TerrainStyleSettings;
  setStyle: (style: Partial<TerrainStyleSettings>) => void;
  setStyleBlend: (blend: number) => void;

  // Active biome for painting
  activeBiome: BiomeType;
  setActiveBiome: (biome: BiomeType) => void;

  // Generation state
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  lastSeed: number;
  setLastSeed: (seed: number) => void;

  // Brush settings for terrain editing
  terrainBrush: {
    size: number;
    strength: number;
    mode: 'paint' | 'raise' | 'lower' | 'smooth';
  };
  setTerrainBrush: (brush: Partial<TerrainStoreState['terrainBrush']>) => void;
}

export const useTerrainStore = create<TerrainStoreState>()(
  immer((set) => ({
    // Configuration
    config: {
      width: 256,
      height: 256,
      cellSize: 16,
      seaLevel: 0.45,
      seed: Date.now(),
    },
    setConfig: (config) =>
      set((state) => {
        Object.assign(state.config, config);
      }),

    // Style settings
    style: {
      styleBlend: 0.7,
      coastlineIntensity: 0.8,
      hillshadeIntensity: 0.6,
      saturation: 1.0,
      brightness: 1.0,
      showPatterns: true,
    },
    setStyle: (style) =>
      set((state) => {
        Object.assign(state.style, style);
      }),
    setStyleBlend: (blend) =>
      set((state) => {
        state.style.styleBlend = Math.max(0, Math.min(1, blend));
      }),

    // Active biome
    activeBiome: 'grassland',
    setActiveBiome: (biome) =>
      set((state) => {
        state.activeBiome = biome;
      }),

    // Generation state
    isGenerating: false,
    setIsGenerating: (value) =>
      set((state) => {
        state.isGenerating = value;
      }),
    lastSeed: Date.now(),
    setLastSeed: (seed) =>
      set((state) => {
        state.lastSeed = seed;
      }),

    // Terrain brush
    terrainBrush: {
      size: 50,
      strength: 0.1,
      mode: 'paint',
    },
    setTerrainBrush: (brush) =>
      set((state) => {
        Object.assign(state.terrainBrush, brush);
      }),
  }))
);
```

#### 4.6.2 src/stores/index.ts (Updated)

```typescript
export { useCanvasStore } from './useCanvasStore';
export { useToolStore } from './useToolStore';
export { useLayerStore } from './useLayerStore';
export { useTerrainStore } from './useTerrainStore';
```

---

### 4.7 Terrain Brush Tool

#### 4.7.1 src/core/tools/TerrainBrushTool.ts

```typescript
import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import { StrokeSmoother } from './StrokeSmoothing';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BiomeType } from '../terrain/types';
import type { Vector2 } from '@/types';
import { vec2Length, vec2Sub, vec2Lerp } from '@/utils';

export interface TerrainBrushOptions {
  size: number;
  strength: number;
  mode: 'paint' | 'raise' | 'lower' | 'smooth';
  activeBiome: BiomeType;
}

/**
 * Specialized brush tool for terrain editing
 */
export class TerrainBrushTool extends BaseTool {
  readonly id = 'terrainBrush';
  readonly name = 'Terrain Brush';
  readonly icon = 'Mountain';
  readonly shortcut = 'T';

  private smoother: StrokeSmoother;
  private lastDrawnPoint: Vector2 | null = null;

  private options: TerrainBrushOptions = {
    size: 50,
    strength: 0.1,
    mode: 'paint',
    activeBiome: 'grassland',
  };

  // Callback to get terrain layer
  private getTerrainLayer?: () => any;

  constructor() {
    super();
    this.smoother = new StrokeSmoother({
      enabled: true,
      smoothing: 0.3,
      minDistance: 5,
    });
  }

  setOptions(options: Partial<TerrainBrushOptions>): void {
    this.options = { ...this.options, ...options };
  }

  setTerrainLayerGetter(getter: () => any): void {
    this.getTerrainLayer = getter;
  }

  getCursor(): ToolCursor {
    return {
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.options.size / 2,
    };
  }

  onPointerDown(ctx: ToolContext): void {
    this.smoother.reset();
    const point = this.smoother.addPoint(ctx.worldPosition, 1);

    if (point) {
      this.applyBrush(ctx, point.position);
      this.lastDrawnPoint = point.position;
    }
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking) return;

    const point = this.smoother.addPoint(ctx.worldPosition, 1);

    if (point && this.lastDrawnPoint) {
      // Interpolate between points
      const distance = vec2Length(vec2Sub(point.position, this.lastDrawnPoint));
      const spacing = this.options.size * 0.25;
      const steps = Math.ceil(distance / spacing);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pos = vec2Lerp(this.lastDrawnPoint, point.position, t);
        this.applyBrush(ctx, pos);
      }

      this.lastDrawnPoint = point.position;
    }
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    this.lastDrawnPoint = null;

    // Trigger re-render of terrain
    const terrainLayer = this.getTerrainLayer?.();
    if (terrainLayer) {
      terrainLayer.rerender();
    }

    return {
      type: 'terrain-edit',
      layerId: ctx.activeLayer?.id ?? '',
      undoData: {},
      redoData: {},
    };
  }

  /**
   * Apply brush effect at position
   */
  private applyBrush(ctx: ToolContext, position: Vector2): void {
    const terrainLayer = this.getTerrainLayer?.();
    if (!terrainLayer) return;

    const renderer = terrainLayer.getRenderer?.();
    if (!renderer) return;

    switch (this.options.mode) {
      case 'paint':
        renderer.paintBiome(
          position.x,
          position.y,
          this.options.activeBiome,
          this.options.size
        );
        break;

      case 'raise':
        renderer.modifyElevation(
          position.x,
          position.y,
          this.options.strength,
          this.options.size
        );
        break;

      case 'lower':
        renderer.modifyElevation(
          position.x,
          position.y,
          -this.options.strength,
          this.options.size
        );
        break;

      case 'smooth':
        // Smooth would require more complex implementation
        break;
    }
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;
    const size = this.options.size;

    // Outer circle
    this.previewGraphics.setStrokeStyle({
      width: 2 / zoom,
      color: 0xffffff,
      alpha: 0.8,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, size / 2);
    this.previewGraphics.stroke();

    // Inner circle (strength indicator)
    const innerSize = size * 0.3;
    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0xffffff,
      alpha: 0.4,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, innerSize / 2);
    this.previewGraphics.stroke();

    // Mode indicator
    let modeColor = 0x00ff00; // Paint
    if (this.options.mode === 'raise') modeColor = 0xff8800;
    if (this.options.mode === 'lower') modeColor = 0x0088ff;
    if (this.options.mode === 'smooth') modeColor = 0xff00ff;

    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 3 / zoom);
    this.previewGraphics.fill({ color: modeColor, alpha: 0.8 });
  }
}
```

---

### 4.8 Terrain Panel Component

#### 4.8.1 src/components/layout/TerrainPanel.tsx

```typescript
import React, { useCallback } from 'react';
import {
  Mountain,
  Droplets,
  Thermometer,
  Palette,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Waves,
} from 'lucide-react';
import { useTerrainStore } from '@/stores';
import { biomeRegistry } from '@/core/terrain';
import {
  Button,
  Slider,
  ScrollArea,
  Toggle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui';
import { cn } from '@/utils';
import type { BiomeType } from '@/core/terrain';

interface TerrainPanelProps {
  onGenerate?: (seed?: number) => void;
  onStyleChange?: () => void;
}

export function TerrainPanel({ onGenerate, onStyleChange }: TerrainPanelProps) {
  const {
    style,
    setStyle,
    setStyleBlend,
    activeBiome,
    setActiveBiome,
    terrainBrush,
    setTerrainBrush,
    isGenerating,
    lastSeed,
  } = useTerrainStore();

  const biomes = biomeRegistry.getAll();
  const landBiomes = biomes.filter((b) => !b.isWater);
  const waterBiomes = biomes.filter((b) => b.isWater);

  const handleGenerate = useCallback(() => {
    const newSeed = Date.now();
    onGenerate?.(newSeed);
  }, [onGenerate]);

  const handleRegenerateWithSeed = useCallback(() => {
    onGenerate?.(lastSeed);
  }, [onGenerate, lastSeed]);

  return (
    <div className="flex flex-col h-full bg-ink-900 border-l border-ink-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-700">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-parchment-400" />
          <span className="text-sm font-medium text-parchment-200">Terrain</span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate New Terrain</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Style Blend Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Style</span>
              <span className="text-xs text-parchment-300">
                {style.styleBlend < 0.3
                  ? 'Realistic'
                  : style.styleBlend > 0.7
                  ? 'Parchment'
                  : 'Mixed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-500">Real</span>
              <Slider
                value={[style.styleBlend * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => {
                  setStyleBlend(value / 100);
                  onStyleChange?.();
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-ink-500">Map</span>
            </div>
          </div>

          {/* Hillshade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Hillshade</span>
              <span className="text-xs text-parchment-300">
                {Math.round(style.hillshadeIntensity * 100)}%
              </span>
            </div>
            <Slider
              value={[style.hillshadeIntensity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => {
                setStyle({ hillshadeIntensity: value / 100 });
                onStyleChange?.();
              }}
            />
          </div>

          {/* Coastline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Coastline Ink</span>
              <span className="text-xs text-parchment-300">
                {Math.round(style.coastlineIntensity * 100)}%
              </span>
            </div>
            <Slider
              value={[style.coastlineIntensity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => {
                setStyle({ coastlineIntensity: value / 100 });
                onStyleChange?.();
              }}
            />
          </div>

          {/* Brush Settings */}
          <div className="space-y-2 pt-2 border-t border-ink-700">
            <span className="text-xs text-ink-400 font-medium">Terrain Brush</span>

            {/* Mode toggles */}
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'paint'}
                    onPressedChange={() => setTerrainBrush({ mode: 'paint' })}
                    size="sm"
                    className="flex-1"
                  >
                    <Palette className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Paint Biome</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'raise'}
                    onPressedChange={() => setTerrainBrush({ mode: 'raise' })}
                    size="sm"
                    className="flex-1"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Raise Terrain</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'lower'}
                    onPressedChange={() => setTerrainBrush({ mode: 'lower' })}
                    size="sm"
                    className="flex-1"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Lower Terrain</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'smooth'}
                    onPressedChange={() => setTerrainBrush({ mode: 'smooth' })}
                    size="sm"
                    className="flex-1"
                  >
                    <Waves className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Smooth Terrain</TooltipContent>
              </Tooltip>
            </div>

            {/* Brush size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Size</span>
                <span className="text-xs text-parchment-300">{terrainBrush.size}px</span>
              </div>
              <Slider
                value={[terrainBrush.size]}
                min={10}
                max={200}
                step={5}
                onValueChange={([value]) => setTerrainBrush({ size: value })}
              />
            </div>

            {/* Brush strength */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Strength</span>
                <span className="text-xs text-parchment-300">
                  {Math.round(terrainBrush.strength * 100)}%
                </span>
              </div>
              <Slider
                value={[terrainBrush.strength * 100]}
                min={1}
                max={50}
                step={1}
                onValueChange={([value]) => setTerrainBrush({ strength: value / 100 })}
              />
            </div>
          </div>

          {/* Biome Palette */}
          <div className="space-y-2 pt-2 border-t border-ink-700">
            <span className="text-xs text-ink-400 font-medium">Biomes</span>

            {/* Land biomes */}
            <div className="space-y-1">
              <span className="text-[10px] text-ink-500">Land</span>
              <div className="grid grid-cols-4 gap-1">
                {landBiomes.map((biome) => (
                  <Tooltip key={biome.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-full aspect-square rounded border-2 transition-all',
                          activeBiome === biome.id
                            ? 'border-parchment-400 scale-110'
                            : 'border-transparent hover:border-ink-500'
                        )}
                        style={{
                          backgroundColor: biome.parchmentColors.base,
                        }}
                        onClick={() => setActiveBiome(biome.id)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{biome.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Water biomes */}
            <div className="space-y-1">
              <span className="text-[10px] text-ink-500">Water</span>
              <div className="grid grid-cols-4 gap-1">
                {waterBiomes.map((biome) => (
                  <Tooltip key={biome.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-full aspect-square rounded border-2 transition-all',
                          activeBiome === biome.id
                            ? 'border-parchment-400 scale-110'
                            : 'border-transparent hover:border-ink-500'
                        )}
                        style={{
                          backgroundColor: biome.parchmentColors.base,
                        }}
                        onClick={() => setActiveBiome(biome.id)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{biome.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-ink-700 text-xs text-ink-400">
        Seed: {lastSeed}
      </div>
    </div>
  );
}
```

---

### 4.9 Update PropertiesPanel to Include Terrain

#### 4.9.1 src/components/layout/PropertiesPanel.tsx (Updated)

```typescript
import React, { useState } from 'react';
import { Settings2, Mountain, Brush } from 'lucide-react';
import { useToolStore, useTerrainStore } from '@/stores';
import { Slider, ScrollArea, Toggle } from '@/components/ui';
import { TerrainPanel } from './TerrainPanel';
import { cn } from '@/utils';
import type { BrushToolOptions } from '@/types';

type PanelTab = 'tool' | 'terrain';

interface PropertiesPanelProps {
  onTerrainGenerate?: (seed?: number) => void;
  onTerrainStyleChange?: () => void;
}

export function PropertiesPanel({
  onTerrainGenerate,
  onTerrainStyleChange,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('tool');
  const { activeTool, options, setToolOptions } = useToolStore();
  const toolOptions = options[activeTool] as BrushToolOptions;

  return (
    <div className="flex flex-col h-full bg-ink-900 border-r border-ink-700">
      {/* Tab Header */}
      <div className="flex border-b border-ink-700">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'tool'
              ? 'bg-ink-800 text-parchment-200'
              : 'text-ink-400 hover:text-parchment-300'
          )}
          onClick={() => setActiveTab('tool')}
        >
          <Brush className="h-3.5 w-3.5" />
          Tool
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'terrain'
              ? 'bg-ink-800 text-parchment-200'
              : 'text-ink-400 hover:text-parchment-300'
          )}
          onClick={() => setActiveTab('terrain')}
        >
          <Mountain className="h-3.5 w-3.5" />
          Terrain
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tool' ? (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Size</span>
                <span className="text-xs text-parchment-300">{toolOptions.size}px</span>
              </div>
              <Slider
                value={[toolOptions.size]}
                min={1}
                max={200}
                step={1}
                onValueChange={([value]) => setToolOptions(activeTool, { size: value })}
              />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Opacity</span>
                <span className="text-xs text-parchment-300">
                  {Math.round(toolOptions.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[toolOptions.opacity * 100]}
                min={1}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  setToolOptions(activeTool, { opacity: value / 100 })
                }
              />
            </div>

            {/* Hardness (for brush/eraser) */}
            {'hardness' in toolOptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400">Hardness</span>
                  <span className="text-xs text-parchment-300">
                    {Math.round((toolOptions as BrushToolOptions).hardness * 100)}%
                  </span>
                </div>
                <Slider
                  value={[(toolOptions as BrushToolOptions).hardness * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([value]) =>
                    setToolOptions(activeTool, { hardness: value / 100 })
                  }
                />
              </div>
            )}

            {/* Colors */}
            <div className="space-y-2">
              <span className="text-xs text-ink-400">Colors</span>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={toolOptions.primaryColor}
                    onChange={(e) =>
                      setToolOptions(activeTool, { primaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                  />
                  <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500">
                    Primary
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="color"
                    value={toolOptions.secondaryColor}
                    onChange={(e) =>
                      setToolOptions(activeTool, { secondaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                  />
                  <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500">
                    Secondary
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <TerrainPanel
          onGenerate={onTerrainGenerate}
          onStyleChange={onTerrainStyleChange}
        />
      )}
    </div>
  );
}
```

---

### 4.10 Integration with App

#### 4.10.1 Update src/App.tsx

```typescript
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui';
import {
  AppShell,
  Toolbar,
  LayerPanel,
  PropertiesPanel,
  StatusBar,
} from '@/components/layout';
import { CanvasContainer } from '@/components/canvas';
import { useLayerStore, useTerrainStore } from '@/stores';
import { CanvasEngine, TerrainRenderer } from '@/core';
import type { Vector2 } from '@/types';

export default function App() {
  const engineRef = useRef<CanvasEngine | null>(null);
  const terrainRendererRef = useRef<TerrainRenderer | null>(null);

  const [cursorPosition, setCursorPosition] = useState<Vector2>({ x: 0, y: 0 });
  const [leftPanelOpen] = useState(true);
  const [rightPanelOpen] = useState(true);

  const { createLayer, rootOrder } = useLayerStore();
  const { style, setIsGenerating, setLastSeed } = useTerrainStore();

  // Create default layer on first render
  useEffect(() => {
    if (rootOrder.length === 0) {
      createLayer({ type: 'terrain', name: 'Terrain' });
    }
  }, []);

  const handleEngineReady = useCallback((engine: CanvasEngine) => {
    engineRef.current = engine;

    // Initialize terrain renderer
    const app = engine.getApp();
    const layerManager = engine.getLayerManager();

    if (app && layerManager) {
      const terrainContainer = layerManager.getLayer(
        useLayerStore.getState().rootOrder[0]
      )?.contentContainer;

      if (terrainContainer) {
        terrainRendererRef.current = new TerrainRenderer(app, terrainContainer, {
          width: 256,
          height: 256,
          cellSize: 16,
        });

        // Generate initial terrain
        handleTerrainGenerate(Date.now());
      }
    }

    engine.fitToCanvas();
  }, []);

  const handleCursorMove = useCallback((position: Vector2) => {
    setCursorPosition(position);
  }, []);

  const handleTerrainGenerate = useCallback(async (seed?: number) => {
    if (!terrainRendererRef.current) return;

    const useSeed = seed ?? Date.now();
    setIsGenerating(true);
    setLastSeed(useSeed);

    try {
      await terrainRendererRef.current.generate(useSeed);
    } finally {
      setIsGenerating(false);
    }
  }, [setIsGenerating, setLastSeed]);

  const handleTerrainStyleChange = useCallback(async () => {
    if (!terrainRendererRef.current) return;

    terrainRendererRef.current.setStyle(useTerrainStore.getState().style);
    await terrainRendererRef.current.render();
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell
        toolbar={<Toolbar />}
        leftPanel={
          <PropertiesPanel
            onTerrainGenerate={handleTerrainGenerate}
            onTerrainStyleChange={handleTerrainStyleChange}
          />
        }
        rightPanel={<LayerPanel />}
        statusBar={<StatusBar cursorPosition={cursorPosition} />}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
      >
        <CanvasContainer
          onEngineReady={handleEngineReady}
          onCursorMove={handleCursorMove}
        />
      </AppShell>
    </TooltipProvider>
  );
}
```

---

### 4.11 Update CanvasContainer for Engine Ready Callback

#### 4.11.1 src/components/canvas/CanvasContainer.tsx (Updated)

```typescript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasEngine, useKeyboardShortcuts } from '@/hooks';
import { CanvasEngine } from '@/core';
import type { Vector2 } from '@/types';

interface CanvasContainerProps {
  onEngineReady?: (engine: CanvasEngine) => void;
  onCursorMove?: (position: Vector2) => void;
}

export function CanvasContainer({ onEngineReady, onCursorMove }: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState<Vector2>({ x: 0, y: 0 });

  const { engine, isReady } = useCanvasEngine({
    containerRef,
    onReady: (eng) => {
      onEngineReady?.(eng);
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onZoomIn: () => {
      const viewport = engine?.getViewport();
      if (viewport) {
        engine?.setZoom(viewport.zoom * 1.25);
      }
    },
    onZoomOut: () => {
      const viewport = engine?.getViewport();
      if (viewport) {
        engine?.setZoom(viewport.zoom * 0.8);
      }
    },
    onFitToCanvas: () => {
      engine?.fitToCanvas();
    },
    onUndo: () => {
      console.log('Undo');
    },
    onRedo: () => {
      console.log('Redo');
    },
  });

  // Track cursor position for status bar
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!engine) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const screenPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const worldPos = engine.screenToWorld(screenPos);
      setCursorPos(worldPos);
      onCursorMove?.(worldPos);
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [engine, onCursorMove]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-ink-950 outline-none"
      tabIndex={0}
      style={{ touchAction: 'none' }}
    />
  );
}
```

---

### 4.12 Verification Checklist for Phase 4

After implementing Phase 4, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ Terrain generates on initial load
□ Terrain displays with procedural continents and water
□ Biomes are assigned based on elevation/moisture/temperature
□ Style slider changes between realistic and parchment looks
□ Hillshading is visible on terrain
□ Coastlines have ink-style rendering
□ Terrain panel shows in properties panel
□ Can switch between Tool and Terrain tabs
□ Biome palette displays all biomes
□ Can select different biomes
□ Brush mode toggles work (paint/raise/lower/smooth)
□ Brush size slider works
□ Brush strength slider works
□ Regenerate terrain button works
□ Seed is displayed in footer
□ Colors blend smoothly between biomes
□ Water biomes display correctly
□ Mountain areas show elevation shading
□ Patterns (stipple, crosshatch, waves) visible at higher zoom
□ Performance is acceptable (smooth panning/zooming)
```

---

## Summary

Phase 4 establishes the terrain foundation:

1. **Biome System** - 16 biomes with realistic and parchment color palettes
2. **Elevation Generation** - Multi-octave noise with erosion and smoothing
3. **Climate Simulation** - Moisture and temperature maps for biome determination
4. **Terrain Renderer** - Pixel-based rendering with hillshading
5. **Ink Coastlines** - Stylized coastline rendering
6. **Style Blending** - Slider for realistic ↔ parchment appearance
7. **Terrain Brush** - Paint biomes and modify elevation
8. **Terrain Panel** - UI for terrain controls and biome palette

---

## Next Steps

**Phase 5: Procedural Generation - Landmass** will cover:
- Noise-based continent generation with configurable parameters
- Coastline detail algorithms (roughening, fjords, bays)
- Island and archipelago generation
- Generation parameter UI panel
- Seed system for reproducible generation
- Preview mode for generation parameters

Ready to proceed when you are!