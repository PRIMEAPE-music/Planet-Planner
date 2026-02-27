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
  generationError: string | null;
  setGenerationError: (error: string | null) => void;

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
    generationError: null,
    setGenerationError: (error) =>
      set((state) => {
        state.generationError = error;
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
