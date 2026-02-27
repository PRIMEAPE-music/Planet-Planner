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
  /** Cache for getBlendedColor results: "biomeId|colorKey|blend" → hex string */
  private blendCache: Map<string, string> = new Map();
  /** The styleBlend value the cache was built for (cleared on change) */
  private cachedBlend: number = -1;

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
   * Clear the blended color cache (call when biome definitions change)
   */
  clearCache(): void {
    this.blendCache.clear();
    this.cachedBlend = -1;
  }

  /**
   * Get interpolated color between realistic and parchment (memoized)
   */
  getBlendedColor(
    biome: BiomeDefinition,
    colorKey: keyof BiomeColorPalette,
    styleBlend: number
  ): string {
    // Invalidate cache if styleBlend changed (new render pass)
    if (styleBlend !== this.cachedBlend) {
      this.blendCache.clear();
      this.cachedBlend = styleBlend;
    }

    const key = `${biome.id}|${colorKey}`;
    let result = this.blendCache.get(key);
    if (result === undefined) {
      const realistic = biome.realisticColors[colorKey];
      const parchment = biome.parchmentColors[colorKey];
      result = this.interpolateColor(realistic, parchment, styleBlend);
      this.blendCache.set(key, result);
    }
    return result;
  }

  /**
   * Interpolate between two hex colors
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16) || 0;
    const g1 = parseInt(color1.slice(3, 5), 16) || 0;
    const b1 = parseInt(color1.slice(5, 7), 16) || 0;

    const r2 = parseInt(color2.slice(1, 3), 16) || 0;
    const g2 = parseInt(color2.slice(3, 5), 16) || 0;
    const b2 = parseInt(color2.slice(5, 7), 16) || 0;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// Export singleton instance
export const biomeRegistry = new BiomeRegistry();
