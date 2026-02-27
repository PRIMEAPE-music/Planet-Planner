import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  FeatureToolType,
  MountainStampSettings,
  MountainPathSettings,
  ForestBrushSettings,
  RiverSplineSettings,
  LakeShapeSettings,
  FeatureEraserSettings,
  FeatureEditOperation,
} from '@/core/tools/features/types';
import { DEFAULT_MOUNTAIN_STAMP_SETTINGS } from '@/core/tools/features/MountainStampTool';
import { DEFAULT_MOUNTAIN_PATH_SETTINGS } from '@/core/tools/features/MountainPathTool';
import { DEFAULT_FOREST_BRUSH_SETTINGS } from '@/core/tools/features/ForestBrushTool';
import { DEFAULT_RIVER_SPLINE_SETTINGS } from '@/core/tools/features/RiverSplineTool';
import { DEFAULT_LAKE_SHAPE_SETTINGS } from '@/core/tools/features/LakeShapeTool';
import { DEFAULT_FEATURE_ERASER_SETTINGS } from '@/core/tools/features/FeatureEraserTool';

interface FeatureToolsState {
  // Active tool
  activeTool: FeatureToolType | null;

  // Tool settings
  mountainStampSettings: MountainStampSettings;
  mountainPathSettings: MountainPathSettings;
  forestBrushSettings: ForestBrushSettings;
  riverSplineSettings: RiverSplineSettings;
  lakeShapeSettings: LakeShapeSettings;
  featureEraserSettings: FeatureEraserSettings;

  // Edit history for undo/redo
  editHistory: FeatureEditOperation[];
  historyIndex: number;

  // UI state
  showPreview: boolean;
}

interface FeatureToolsActions {
  setActiveTool: (tool: FeatureToolType | null) => void;

  // Settings updates
  setMountainStampSettings: (settings: Partial<MountainStampSettings>) => void;
  setMountainPathSettings: (settings: Partial<MountainPathSettings>) => void;
  setForestBrushSettings: (settings: Partial<ForestBrushSettings>) => void;
  setRiverSplineSettings: (settings: Partial<RiverSplineSettings>) => void;
  setLakeShapeSettings: (settings: Partial<LakeShapeSettings>) => void;
  setFeatureEraserSettings: (settings: Partial<FeatureEraserSettings>) => void;

  // History
  addEditOperation: (operation: FeatureEditOperation) => void;
  undo: () => FeatureEditOperation | null;
  redo: () => FeatureEditOperation | null;
  clearHistory: () => void;

  // UI
  setShowPreview: (show: boolean) => void;

  // Reset
  reset: () => void;
}

type FeatureToolsStore = FeatureToolsState & FeatureToolsActions;

const initialState: FeatureToolsState = {
  activeTool: null,
  mountainStampSettings: DEFAULT_MOUNTAIN_STAMP_SETTINGS,
  mountainPathSettings: DEFAULT_MOUNTAIN_PATH_SETTINGS,
  forestBrushSettings: DEFAULT_FOREST_BRUSH_SETTINGS,
  riverSplineSettings: DEFAULT_RIVER_SPLINE_SETTINGS,
  lakeShapeSettings: DEFAULT_LAKE_SHAPE_SETTINGS,
  featureEraserSettings: DEFAULT_FEATURE_ERASER_SETTINGS,
  editHistory: [],
  historyIndex: -1,
  showPreview: true,
};

export const useFeatureToolsStore = create<FeatureToolsStore>()(
  immer((set, get) => ({
    ...initialState,

    setActiveTool: (tool) => {
      set((state) => {
        state.activeTool = tool;
      });
    },

    setMountainStampSettings: (settings) => {
      set((state) => {
        Object.assign(state.mountainStampSettings, settings);
      });
    },

    setMountainPathSettings: (settings) => {
      set((state) => {
        Object.assign(state.mountainPathSettings, settings);
      });
    },

    setForestBrushSettings: (settings) => {
      set((state) => {
        Object.assign(state.forestBrushSettings, settings);
      });
    },

    setRiverSplineSettings: (settings) => {
      set((state) => {
        Object.assign(state.riverSplineSettings, settings);
      });
    },

    setLakeShapeSettings: (settings) => {
      set((state) => {
        Object.assign(state.lakeShapeSettings, settings);
      });
    },

    setFeatureEraserSettings: (settings) => {
      set((state) => {
        Object.assign(state.featureEraserSettings, settings);
      });
    },

    addEditOperation: (operation) => {
      set((state) => {
        // Remove any operations after current index
        state.editHistory = state.editHistory.slice(0, state.historyIndex + 1);
        state.editHistory.push(operation);
        state.historyIndex = state.editHistory.length - 1;
      });
    },

    undo: () => {
      const state = get();
      if (state.historyIndex < 0) return null;

      const operation = state.editHistory[state.historyIndex];
      set((s) => {
        s.historyIndex--;
      });
      return operation ?? null;
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.editHistory.length - 1) return null;

      set((s) => {
        s.historyIndex++;
      });
      return state.editHistory[state.historyIndex + 1] ?? null;
    },

    clearHistory: () => {
      set((state) => {
        state.editHistory = [];
        state.historyIndex = -1;
      });
    },

    setShowPreview: (show) => {
      set((state) => {
        state.showPreview = show;
      });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Selectors
export const useActiveFeatureTool = () => useFeatureToolsStore((s) => s.activeTool);
export const useMountainStampSettings = () => useFeatureToolsStore((s) => s.mountainStampSettings);
export const useMountainPathSettings = () => useFeatureToolsStore((s) => s.mountainPathSettings);
export const useForestBrushSettings = () => useFeatureToolsStore((s) => s.forestBrushSettings);
export const useRiverSplineSettings = () => useFeatureToolsStore((s) => s.riverSplineSettings);
export const useLakeShapeSettings = () => useFeatureToolsStore((s) => s.lakeShapeSettings);
export const useFeatureEraserSettings = () => useFeatureToolsStore((s) => s.featureEraserSettings);
export const useShowPreview = () => useFeatureToolsStore((s) => s.showPreview);
