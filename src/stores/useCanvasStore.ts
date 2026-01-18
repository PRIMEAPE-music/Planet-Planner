import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Viewport, GridConfig } from '@/types';
import { DEFAULT_VIEWPORT, DEFAULT_GRID_CONFIG, DEFAULT_CANVAS_DIMENSIONS } from '@/constants';

interface CanvasStoreState {
  // Viewport
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;

  // Grid
  grid: GridConfig;
  setGrid: (config: Partial<GridConfig>) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;

  // Canvas dimensions
  dimensions: { width: number; height: number };
  setDimensions: (width: number, height: number) => void;

  // Interaction state
  isInteracting: boolean;
  setIsInteracting: (value: boolean) => void;
}

export const useCanvasStore = create<CanvasStoreState>()(
  immer((set) => ({
    // Viewport
    viewport: DEFAULT_VIEWPORT,
    setViewport: (viewport) =>
      set((state) => {
        state.viewport = viewport;
      }),

    // Grid
    grid: DEFAULT_GRID_CONFIG,
    setGrid: (config) =>
      set((state) => {
        Object.assign(state.grid, config);
      }),
    toggleGrid: () =>
      set((state) => {
        state.grid.visible = !state.grid.visible;
      }),
    toggleSnapToGrid: () =>
      set((state) => {
        state.grid.snapToGrid = !state.grid.snapToGrid;
      }),

    // Canvas dimensions
    dimensions: DEFAULT_CANVAS_DIMENSIONS,
    setDimensions: (width, height) =>
      set((state) => {
        state.dimensions = { width, height };
      }),

    // Interaction state
    isInteracting: false,
    setIsInteracting: (value) =>
      set((state) => {
        state.isInteracting = value;
      }),
  }))
);
