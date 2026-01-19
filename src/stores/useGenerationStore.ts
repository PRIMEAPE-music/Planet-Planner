import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  LandmassGenerationConfig,
  GenerationResult,
  GenerationProgress,
  GenerationPreset,
} from '@/core/generation/types';
import {
  DEFAULT_GENERATION_CONFIG,
  generateSeed,
  applyPreset,
  parseSeed,
} from '@/core/generation/presets';
import { LandmassGenerator } from '@/core/generation/LandmassGenerator';

interface GenerationState {
  // Configuration
  config: LandmassGenerationConfig;
  activePreset: GenerationPreset;

  // Generation state
  isGenerating: boolean;
  progress: GenerationProgress | null;
  result: GenerationResult | null;
  error: string | null;

  // Preview mode
  previewEnabled: boolean;
  previewResult: GenerationResult | null;

  // History for undo
  history: GenerationResult[];
  historyIndex: number;
}

interface GenerationActions {
  // Configuration
  setConfig: (config: Partial<LandmassGenerationConfig>) => void;
  setPreset: (presetId: GenerationPreset) => void;
  randomizeSeed: () => void;
  setSeed: (seedInput: string) => void;

  // Generation
  generate: () => Promise<void>;
  cancelGeneration: () => void;

  // Preview
  setPreviewEnabled: (enabled: boolean) => void;
  generatePreview: () => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;

  // Reset
  reset: () => void;
}

type GenerationStore = GenerationState & GenerationActions;

const initialState: GenerationState = {
  config: {
    ...DEFAULT_GENERATION_CONFIG,
    seed: generateSeed(),
  },
  activePreset: 'continental',
  isGenerating: false,
  progress: null,
  result: null,
  error: null,
  previewEnabled: false,
  previewResult: null,
  history: [],
  historyIndex: -1,
};

let currentGenerator: LandmassGenerator | null = null;
let abortController: AbortController | null = null;

export const useGenerationStore = create<GenerationStore>()(
  immer((set, get) => ({
    ...initialState,

    setConfig: (partialConfig) => {
      set((state) => {
        // Deep merge config
        if (partialConfig.terrainNoise) {
          state.config.terrainNoise = {
            ...state.config.terrainNoise,
            ...partialConfig.terrainNoise,
          };
        }
        if (partialConfig.continentShape) {
          state.config.continentShape = {
            ...state.config.continentShape,
            ...partialConfig.continentShape,
          };
        }
        if (partialConfig.coastline) {
          state.config.coastline = {
            ...state.config.coastline,
            ...partialConfig.coastline,
          };
        }
        if (partialConfig.islands) {
          state.config.islands = {
            ...state.config.islands,
            ...partialConfig.islands,
          };
        }
        if (partialConfig.tectonics) {
          state.config.tectonics = {
            ...state.config.tectonics,
            ...partialConfig.tectonics,
          };
        }
        if (partialConfig.seed) {
          state.config.seed = partialConfig.seed;
        }
        if (partialConfig.width) state.config.width = partialConfig.width;
        if (partialConfig.height) state.config.height = partialConfig.height;
        if (partialConfig.quality) state.config.quality = partialConfig.quality;

        // If changing parameters, switch to custom preset
        if (state.activePreset !== 'custom') {
          state.activePreset = 'custom';
        }
      });
    },

    setPreset: (presetId) => {
      set((state) => {
        state.activePreset = presetId;
        const newConfig = applyPreset(state.config, presetId);
        state.config = newConfig;
      });
    },

    randomizeSeed: () => {
      set((state) => {
        state.config.seed = generateSeed();
      });
    },

    setSeed: (seedInput) => {
      set((state) => {
        state.config.seed = parseSeed(seedInput);
      });
    },

    generate: async () => {
      const state = get();
      if (state.isGenerating) return;

      // Cancel any existing generation
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();

      set((s) => {
        s.isGenerating = true;
        s.progress = null;
        s.error = null;
      });

      try {
        currentGenerator = new LandmassGenerator(state.config, (progress) => {
          set((s) => {
            s.progress = progress;
          });
        });

        const result = await currentGenerator.generate();

        // Check if aborted
        if (abortController?.signal.aborted) {
          return;
        }

        set((s) => {
          // Add previous result to history
          if (s.result) {
            s.history = [...s.history.slice(0, s.historyIndex + 1), s.result];
            s.historyIndex = s.history.length - 1;
          }

          s.result = result;
          s.isGenerating = false;
          s.progress = null;
        });
      } catch (error) {
        if (abortController?.signal.aborted) {
          return;
        }

        set((s) => {
          s.error = error instanceof Error ? error.message : 'Generation failed';
          s.isGenerating = false;
          s.progress = null;
        });
      }
    },

    cancelGeneration: () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      currentGenerator = null;

      set((s) => {
        s.isGenerating = false;
        s.progress = null;
      });
    },

    setPreviewEnabled: (enabled) => {
      set((s) => {
        s.previewEnabled = enabled;
        if (!enabled) {
          s.previewResult = null;
        }
      });
    },

    generatePreview: async () => {
      const state = get();

      // Use lower quality for preview
      const previewConfig: LandmassGenerationConfig = {
        ...state.config,
        width: Math.floor(state.config.width / 4),
        height: Math.floor(state.config.height / 4),
        quality: 'draft',
      };

      const generator = new LandmassGenerator(previewConfig);
      const result = await generator.generate();

      set((s) => {
        s.previewResult = result;
      });
    },

    undo: () => {
      set((s) => {
        if (s.historyIndex > 0) {
          s.historyIndex--;
          s.result = s.history[s.historyIndex] ?? null;
        }
      });
    },

    redo: () => {
      set((s) => {
        if (s.historyIndex < s.history.length - 1) {
          s.historyIndex++;
          s.result = s.history[s.historyIndex] ?? null;
        }
      });
    },

    reset: () => {
      if (abortController) {
        abortController.abort();
      }
      set({
        ...initialState,
        config: {
          ...DEFAULT_GENERATION_CONFIG,
          seed: generateSeed(),
        },
      });
    },
  }))
);

// Selector hooks for performance - use primitive selectors to avoid React 19 issues
export const useGenerationConfig = () => useGenerationStore((s) => s.config);

export const useGenerationResult = () => useGenerationStore((s) => s.result);

// Split into separate hooks to avoid creating objects in selectors
export const useIsGenerating = () => useGenerationStore((s) => s.isGenerating);

export const useGenerationProgressData = () => useGenerationStore((s) => s.progress);

// Combined hook that returns stable references
export const useGenerationProgress = () => {
  const isGenerating = useGenerationStore((s) => s.isGenerating);
  const progress = useGenerationStore((s) => s.progress);
  return { isGenerating, progress };
};

export const useActivePreset = () => useGenerationStore((s) => s.activePreset);
