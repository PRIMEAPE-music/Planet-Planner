import type { HistoryCommand } from './commands';
import type { LayerManager } from '../layers/LayerManager';
import { useLayerStore } from '@/stores';
import { debug } from '@/utils';

/**
 * Execute a command in the undo direction.
 */
export function undoCommand(cmd: HistoryCommand, layerManager: LayerManager | null): void {
  switch (cmd.kind) {
    // ---- State commands ---- //

    case 'layer:create': {
      // Undo creation = delete the layer
      useLayerStore.setState((state) => {
        const layers = { ...state.layers };
        delete layers[cmd.layerId];
        return {
          layers,
          rootOrder: state.rootOrder.filter((id) => id !== cmd.layerId),
          activeId: cmd.previousActiveId,
          selectedIds: cmd.previousSelectedIds,
        };
      });
      break;
    }

    case 'layer:delete': {
      // Undo deletion = recreate the layer from snapshot
      useLayerStore.setState((state) => {
        const layers = { ...state.layers, [cmd.layerId]: cmd.layerSnapshot };
        const rootOrder = [...state.rootOrder];
        rootOrder.splice(cmd.rootOrderIndex, 0, cmd.layerId);
        return {
          layers,
          rootOrder,
          activeId: cmd.previousActiveId,
          selectedIds: cmd.previousSelectedIds,
        };
      });
      // Re-attach saved display children to the recreated visual layer
      if (layerManager && cmd.displayChildren.length > 0) {
        // syncWithState will be triggered by the store change, creating the LayerContainer.
        // We need to force sync first, then attach children.
        layerManager.syncWithState(useLayerStore.getState());
        const layer = layerManager.getLayer(cmd.layerId);
        if (layer) {
          for (const child of cmd.displayChildren) {
            layer.addContent(child);
          }
          layer.markDirty();
        }
      }
      break;
    }

    case 'layer:duplicate': {
      // Undo duplication = delete the duplicated layer
      useLayerStore.setState((state) => {
        const layers = { ...state.layers };
        delete layers[cmd.newLayerId];
        return {
          layers,
          rootOrder: state.rootOrder.filter((id) => id !== cmd.newLayerId),
          activeId: cmd.previousActiveId,
          selectedIds: cmd.previousSelectedIds,
        };
      });
      break;
    }

    case 'layer:reorder': {
      useLayerStore.setState({ rootOrder: cmd.previousOrder });
      break;
    }

    case 'layer:property': {
      useLayerStore.setState((state) => {
        const layer = state.layers[cmd.layerId];
        if (!layer) return state;
        return {
          layers: {
            ...state.layers,
            [cmd.layerId]: {
              ...layer,
              [cmd.property]: cmd.previousValue,
              updatedAt: Date.now(),
            },
          },
        };
      });
      break;
    }

    // ---- Graphics commands ---- //

    case 'graphics:add': {
      // Undo add = remove the graphics
      if (layerManager) {
        const layer = layerManager.getLayer(cmd.layerId);
        if (layer && cmd.graphics.parent) {
          cmd.graphics.parent.removeChild(cmd.graphics);
          layer.markDirty();
        }
      }
      break;
    }

    case 'graphics:remove': {
      // Undo remove = add the graphics back
      if (layerManager) {
        const layer = layerManager.getLayer(cmd.layerId);
        if (layer) {
          layer.addContent(cmd.graphics);
          layer.markDirty();
        }
      }
      break;
    }
  }

  debug.log('[executor] undo:', cmd.kind);
}

/**
 * Execute a command in the redo direction.
 */
export function redoCommand(cmd: HistoryCommand, layerManager: LayerManager | null): void {
  switch (cmd.kind) {
    // ---- State commands ---- //

    case 'layer:create': {
      // Redo creation = re-run createLayer logic via direct state
      const now = Date.now();
      const layer = {
        id: cmd.layerId,
        name: cmd.options.name ?? `Layer`,
        type: cmd.options.type,
        visible: cmd.options.visible ?? true,
        locked: false,
        opacity: cmd.options.opacity ?? 1,
        blendMode: cmd.options.blendMode ?? 'normal' as const,
        order: cmd.insertIndex,
        parentId: cmd.options.parentId ?? null,
        isGroup: false,
        isExpanded: true,
        bounds: null,
        metadata: cmd.options.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      };
      useLayerStore.setState((state) => {
        const rootOrder = [...state.rootOrder];
        rootOrder.splice(cmd.insertIndex, 0, cmd.layerId);
        return {
          layers: { ...state.layers, [cmd.layerId]: layer },
          rootOrder,
          activeId: cmd.layerId,
          selectedIds: [cmd.layerId],
        };
      });
      break;
    }

    case 'layer:delete': {
      // Redo deletion = remove again
      // First, save current display children in case we need to undo again
      if (layerManager) {
        const layer = layerManager.getLayer(cmd.layerId);
        if (layer) {
          cmd.displayChildren = [...layer.contentContainer.children];
          // Detach children without destroying them
          while (layer.contentContainer.children.length > 0) {
            layer.contentContainer.removeChild(layer.contentContainer.children[0]!);
          }
        }
      }
      useLayerStore.setState((state) => {
        const layers = { ...state.layers };
        delete layers[cmd.layerId];
        const rootOrder = state.rootOrder.filter((id) => id !== cmd.layerId);
        return {
          layers,
          rootOrder,
          activeId: state.activeId === cmd.layerId ? (rootOrder[0] ?? null) : state.activeId,
          selectedIds: state.selectedIds.filter((id) => id !== cmd.layerId),
        };
      });
      break;
    }

    case 'layer:duplicate': {
      // Redo duplication = recreate the duplicate
      const sourceLayer = useLayerStore.getState().layers[cmd.sourceLayerId];
      if (!sourceLayer) break;
      const now = Date.now();
      const dupLayer = {
        ...sourceLayer,
        id: cmd.newLayerId,
        name: `${sourceLayer.name} Copy`,
        createdAt: now,
        updatedAt: now,
      };
      useLayerStore.setState((state) => {
        const rootOrder = [...state.rootOrder];
        rootOrder.splice(cmd.insertIndex, 0, cmd.newLayerId);
        return {
          layers: { ...state.layers, [cmd.newLayerId]: dupLayer },
          rootOrder,
          activeId: cmd.newLayerId,
          selectedIds: [cmd.newLayerId],
        };
      });
      break;
    }

    case 'layer:reorder': {
      useLayerStore.setState({ rootOrder: cmd.newOrder });
      break;
    }

    case 'layer:property': {
      useLayerStore.setState((state) => {
        const layer = state.layers[cmd.layerId];
        if (!layer) return state;
        return {
          layers: {
            ...state.layers,
            [cmd.layerId]: {
              ...layer,
              [cmd.property]: cmd.newValue,
              updatedAt: Date.now(),
            },
          },
        };
      });
      break;
    }

    // ---- Graphics commands ---- //

    case 'graphics:add': {
      // Redo add = add the graphics back
      if (layerManager) {
        const layer = layerManager.getLayer(cmd.layerId);
        if (layer) {
          layer.addContent(cmd.graphics);
          layer.markDirty();
        }
      }
      break;
    }

    case 'graphics:remove': {
      // Redo remove = remove the graphics again
      if (layerManager) {
        const layer = layerManager.getLayer(cmd.layerId);
        if (layer && cmd.graphics.parent) {
          cmd.graphics.parent.removeChild(cmd.graphics);
          layer.markDirty();
        }
      }
      break;
    }
  }

  debug.log('[executor] redo:', cmd.kind);
}
