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
