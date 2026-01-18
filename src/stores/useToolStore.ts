import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ToolType, ToolOptions, BrushToolOptions, ShapeToolOptions } from '@/types';
import { DEFAULT_TOOL_COLORS } from '@/constants';

const defaultBrushOptions: BrushToolOptions = {
  size: 20,
  opacity: 1,
  primaryColor: DEFAULT_TOOL_COLORS.primary,
  secondaryColor: DEFAULT_TOOL_COLORS.secondary,
  hardness: 0.8,
  spacing: 0.25,
  pressureSensitivity: true,
  pressureAffectsSize: true,
  pressureAffectsOpacity: false,
};

const defaultShapeOptions: ShapeToolOptions = {
  size: 20,
  opacity: 1,
  primaryColor: DEFAULT_TOOL_COLORS.primary,
  secondaryColor: DEFAULT_TOOL_COLORS.secondary,
  shapeType: 'rectangle',
  fill: true,
  stroke: true,
  strokeWidth: 2,
  cornerRadius: 0,
  polygonSides: 6,
};

interface ToolStoreState {
  // Active tool
  activeTool: ToolType;
  previousTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  swapToPreviousTool: () => void;

  // Tool options
  options: Record<ToolType, ToolOptions>;
  setToolOptions: <T extends ToolOptions>(tool: ToolType, options: Partial<T>) => void;
  getToolOptions: <T extends ToolOptions>(tool: ToolType) => T;

  // Tool state
  isToolActive: boolean;
  setIsToolActive: (value: boolean) => void;

  // Color shortcuts
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  swapColors: () => void;
}

export const useToolStore = create<ToolStoreState>()(
  immer((set, get) => ({
    // Active tool
    activeTool: 'brush',
    previousTool: 'select',
    setActiveTool: (tool) =>
      set((state) => {
        if (state.activeTool !== tool) {
          state.previousTool = state.activeTool;
          state.activeTool = tool;
        }
      }),
    swapToPreviousTool: () =>
      set((state) => {
        const temp = state.activeTool;
        state.activeTool = state.previousTool;
        state.previousTool = temp;
      }),

    // Tool options
    options: {
      select: { ...defaultBrushOptions },
      pan: { ...defaultBrushOptions },
      brush: { ...defaultBrushOptions },
      eraser: { ...defaultBrushOptions, size: 30 },
      shape: { ...defaultShapeOptions },
      path: { ...defaultBrushOptions, size: 4 },
      fill: { ...defaultBrushOptions },
      stamp: { ...defaultBrushOptions, size: 48 },
      text: {
        ...defaultBrushOptions,
        fontFamily: 'IM Fell English',
        fontSize: 24,
        fontWeight: 400,
        fontStyle: 'normal' as const,
        textAlign: 'left' as const,
      },
      eyedropper: { ...defaultBrushOptions },
    },
    setToolOptions: (tool, options) =>
      set((state) => {
        Object.assign(state.options[tool], options);
      }),
    getToolOptions: (tool) => get().options[tool] as any,

    // Tool state
    isToolActive: false,
    setIsToolActive: (value) =>
      set((state) => {
        state.isToolActive = value;
      }),

    // Color shortcuts
    setPrimaryColor: (color) =>
      set((state) => {
        const tool = state.activeTool;
        (state.options[tool] as any).primaryColor = color;
      }),
    setSecondaryColor: (color) =>
      set((state) => {
        const tool = state.activeTool;
        (state.options[tool] as any).secondaryColor = color;
      }),
    swapColors: () =>
      set((state) => {
        const tool = state.activeTool;
        const opts = state.options[tool] as any;
        const temp = opts.primaryColor;
        opts.primaryColor = opts.secondaryColor;
        opts.secondaryColor = temp;
      }),
  }))
);
