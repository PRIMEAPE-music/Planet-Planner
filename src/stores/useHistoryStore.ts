import { create } from 'zustand';
import type { HistoryCommand } from '@/core/history/commands';
import { getCommandLabel } from '@/core/history/commands';
import { undoCommand, redoCommand } from '@/core/history/executor';
import type { LayerManager } from '@/core/layers/LayerManager';

interface HistoryState {
  undoStack: HistoryCommand[];
  redoStack: HistoryCommand[];
  maxSize: number;

  /** LayerManager ref — set once at engine init */
  _layerManager: LayerManager | null;
  setLayerManager: (lm: LayerManager) => void;

  push: (cmd: HistoryCommand) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undoLabel: () => string | null;
  redoLabel: () => string | null;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxSize: 50,
  _layerManager: null,

  setLayerManager: (lm) => set({ _layerManager: lm }),

  push: (cmd) => {
    set((state) => {
      const newUndoStack = [...state.undoStack, cmd];
      if (newUndoStack.length > state.maxSize) {
        newUndoStack.shift();
      }
      return {
        undoStack: newUndoStack,
        redoStack: [],
      };
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const cmd = state.undoStack[state.undoStack.length - 1]!;
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, cmd],
    });

    undoCommand(cmd, state._layerManager);
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const cmd = state.redoStack[state.redoStack.length - 1]!;
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, cmd],
    });

    redoCommand(cmd, state._layerManager);
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  undoLabel: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return null;
    return getCommandLabel(stack[stack.length - 1]!);
  },

  redoLabel: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return null;
    return getCommandLabel(stack[stack.length - 1]!);
  },
}));
