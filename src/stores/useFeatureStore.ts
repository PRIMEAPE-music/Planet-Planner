import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  FeatureGenerationConfig,
  FeatureGenerationResult,
  FeatureGenerationProgress,
} from '@/core/generation/features/types';
import {
  FeatureGenerator,
  DEFAULT_FEATURE_CONFIG,
} from '@/core/generation/features/FeatureGenerator';

interface FeatureState {
  // Configuration
  config: FeatureGenerationConfig;

  // Generation state
  isGenerating: boolean;
  progress: FeatureGenerationProgress | null;
  result: FeatureGenerationResult | null;
  error: string | null;

  // Feature visibility
  showMountains: boolean;
  showRivers: boolean;
  showLakes: boolean;
  showForests: boolean;
  showClimate: boolean;
}

interface FeatureActions {
  setConfig: (config: Partial<FeatureGenerationConfig>) => void;
  setMountainConfig: (config: Partial<FeatureGenerationConfig['mountains']>) => void;
  setRiverConfig: (config: Partial<FeatureGenerationConfig['rivers']>) => void;
  setLakeConfig: (config: Partial<FeatureGenerationConfig['lakes']>) => void;
  setForestConfig: (config: Partial<FeatureGenerationConfig['forests']>) => void;
  setClimateConfig: (config: Partial<FeatureGenerationConfig['climate']>) => void;

  generate: (
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap?: Uint8Array
  ) => Promise<FeatureGenerationResult | null>;

  setVisibility: (feature: keyof Pick<FeatureState, 'showMountains' | 'showRivers' | 'showLakes' | 'showForests' | 'showClimate'>, visible: boolean) => void;
  reset: () => void;
}

type FeatureStore = FeatureState & FeatureActions;

const initialState: FeatureState = {
  config: DEFAULT_FEATURE_CONFIG,
  isGenerating: false,
  progress: null,
  result: null,
  error: null,
  showMountains: true,
  showRivers: true,
  showLakes: true,
  showForests: true,
  showClimate: false,
};

export const useFeatureStore = create<FeatureStore>()(
  immer((set, get) => ({
    ...initialState,

    setConfig: (partialConfig) => {
      set((state) => {
        Object.assign(state.config, partialConfig);
      });
    },

    setMountainConfig: (mountainConfig) => {
      set((state) => {
        Object.assign(state.config.mountains, mountainConfig);
      });
    },

    setRiverConfig: (riverConfig) => {
      set((state) => {
        Object.assign(state.config.rivers, riverConfig);
      });
    },

    setLakeConfig: (lakeConfig) => {
      set((state) => {
        Object.assign(state.config.lakes, lakeConfig);
      });
    },

    setForestConfig: (forestConfig) => {
      set((state) => {
        Object.assign(state.config.forests, forestConfig);
      });
    },

    setClimateConfig: (climateConfig) => {
      set((state) => {
        Object.assign(state.config.climate, climateConfig);
      });
    },

    generate: async (landMask, elevationData, plateMap) => {
      const state = get();
      if (state.isGenerating) return null;

      set((s) => {
        s.isGenerating = true;
        s.progress = null;
        s.error = null;
      });

      try {
        const width = Math.sqrt(landMask.length);
        const height = width;

        const generator = new FeatureGenerator(
          state.config,
          width,
          height,
          (progress) => {
            set((s) => {
              s.progress = progress;
            });
          }
        );

        const result = await generator.generate(
          landMask,
          elevationData,
          plateMap
        );

        set((s) => {
          s.result = result;
          s.isGenerating = false;
          s.progress = null;
        });

        return result;
      } catch (error) {
        set((s) => {
          s.error = error instanceof Error ? error.message : 'Feature generation failed';
          s.isGenerating = false;
          s.progress = null;
        });
        return null;
      }
    },

    setVisibility: (feature, visible) => {
      set((state) => {
        state[feature] = visible;
      });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Selector hooks
export const useFeatureConfig = () => useFeatureStore((s) => s.config);
export const useFeatureResult = () => useFeatureStore((s) => s.result);
export const useFeatureProgress = () => {
  const isGenerating = useFeatureStore((s) => s.isGenerating);
  const progress = useFeatureStore((s) => s.progress);
  return { isGenerating, progress };
};
export const useFeatureVisibility = () => {
  const showMountains = useFeatureStore((s) => s.showMountains);
  const showRivers = useFeatureStore((s) => s.showRivers);
  const showLakes = useFeatureStore((s) => s.showLakes);
  const showForests = useFeatureStore((s) => s.showForests);
  const showClimate = useFeatureStore((s) => s.showClimate);
  return { showMountains, showRivers, showLakes, showForests, showClimate };
};
