import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { Layer, LayerState, CreateLayerOptions, BlendMode } from '@/types';

interface LayerStoreState extends LayerState {
  // Layer CRUD
  createLayer: (options: CreateLayerOptions) => string;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => string | null;

  // Layer properties
  setLayerName: (id: string, name: string) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerLocked: (id: string, locked: boolean) => void;
  toggleLayerLocked: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: BlendMode) => void;

  // Layer ordering
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  reorderLayers: (newOrder: string[]) => void;

  // Selection
  selectLayer: (id: string, addToSelection?: boolean) => void;
  deselectLayer: (id: string) => void;
  clearSelection: () => void;
  setActiveLayer: (id: string | null) => void;

  // Groups
  toggleGroupExpanded: (id: string) => void;
}

export const useLayerStore = create<LayerStoreState>()(
  immer((set, get) => ({
    // Initial state
    layers: {},
    rootOrder: [],
    selectedIds: [],
    activeId: null,

    // Layer CRUD
    createLayer: (options) => {
      const id = nanoid();
      const now = Date.now();
      const existingLayers = Object.keys(get().layers).length;

      const layer: Layer = {
        id,
        name: options.name ?? `Layer ${existingLayers + 1}`,
        type: options.type,
        visible: options.visible ?? true,
        locked: false,
        opacity: options.opacity ?? 1,
        blendMode: options.blendMode ?? 'normal',
        order: existingLayers,
        parentId: options.parentId ?? null,
        isGroup: false,
        isExpanded: true,
        bounds: null,
        metadata: options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.layers[id] = layer;
        if (!layer.parentId) {
          state.rootOrder.push(id);
        }
        state.activeId = id;
        state.selectedIds = [id];
      });

      return id;
    },

    deleteLayer: (id) =>
      set((state) => {
        const layer = state.layers[id];
        if (!layer) return;

        // Remove from parent or root
        if (layer.parentId) {
          const parent = state.layers[layer.parentId];
          if (parent && 'childIds' in parent) {
            (parent as any).childIds = (parent as any).childIds.filter(
              (cid: string) => cid !== id
            );
          }
        } else {
          state.rootOrder = state.rootOrder.filter((rid) => rid !== id);
        }

        // Remove from selection
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        if (state.activeId === id) {
          state.activeId = state.rootOrder[0] ?? null;
        }

        delete state.layers[id];
      }),

    duplicateLayer: (id) => {
      const layer = get().layers[id];
      if (!layer) return null;

      const newId = nanoid();
      const now = Date.now();

      set((state) => {
        state.layers[newId] = {
          ...layer,
          id: newId,
          name: `${layer.name} Copy`,
          createdAt: now,
          updatedAt: now,
        };

        const index = state.rootOrder.indexOf(id);
        if (index !== -1) {
          state.rootOrder.splice(index + 1, 0, newId);
        } else {
          state.rootOrder.push(newId);
        }

        state.activeId = newId;
        state.selectedIds = [newId];
      });

      return newId;
    },

    // Layer properties
    setLayerName: (id, name) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].name = name;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerVisibility: (id, visible) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].visible = visible;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    toggleLayerVisibility: (id) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].visible = !state.layers[id].visible;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerLocked: (id, locked) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].locked = locked;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    toggleLayerLocked: (id) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].locked = !state.layers[id].locked;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerOpacity: (id, opacity) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].opacity = Math.max(0, Math.min(1, opacity));
          state.layers[id].updatedAt = Date.now();
        }
      }),

    setLayerBlendMode: (id, blendMode) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].blendMode = blendMode;
          state.layers[id].updatedAt = Date.now();
        }
      }),

    // Layer ordering
    moveLayer: (id, direction) =>
      set((state) => {
        const index = state.rootOrder.indexOf(id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index + 1 : index - 1;
        if (newIndex < 0 || newIndex >= state.rootOrder.length) return;

        const temp = state.rootOrder[index]!;
        state.rootOrder[index] = state.rootOrder[newIndex]!;
        state.rootOrder[newIndex] = temp;
      }),

    reorderLayers: (newOrder) =>
      set((state) => {
        state.rootOrder = newOrder;
      }),

    // Selection
    selectLayer: (id, addToSelection = false) =>
      set((state) => {
        if (addToSelection) {
          if (!state.selectedIds.includes(id)) {
            state.selectedIds.push(id);
          }
        } else {
          state.selectedIds = [id];
        }
        state.activeId = id;
      }),

    deselectLayer: (id) =>
      set((state) => {
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        if (state.activeId === id) {
          state.activeId = state.selectedIds[0] ?? null;
        }
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedIds = [];
      }),

    setActiveLayer: (id) =>
      set((state) => {
        state.activeId = id;
        if (id && !state.selectedIds.includes(id)) {
          state.selectedIds = [id];
        }
      }),

    // Groups
    toggleGroupExpanded: (id) =>
      set((state) => {
        if (state.layers[id]) {
          state.layers[id].isExpanded = !state.layers[id].isExpanded;
        }
      }),
  }))
);
