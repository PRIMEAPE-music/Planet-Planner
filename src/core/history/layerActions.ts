import { useLayerStore } from '@/stores';
import { useHistoryStore } from '@/stores/useHistoryStore';
import type { CreateLayerOptions, Layer } from '@/types';
import type { HistoryCommand } from './commands';

/**
 * Create a layer with undo support.
 */
export function createLayerWithUndo(options: CreateLayerOptions): string {
  const before = useLayerStore.getState();
  const previousActiveId = before.activeId;
  const previousSelectedIds = [...before.selectedIds];

  const layerId = useLayerStore.getState().createLayer(options);

  const after = useLayerStore.getState();
  const insertIndex = after.rootOrder.indexOf(layerId);

  const cmd: HistoryCommand = {
    kind: 'layer:create',
    layerId,
    options,
    insertIndex,
    previousActiveId,
    previousSelectedIds,
  };
  useHistoryStore.getState().push(cmd);

  return layerId;
}

/**
 * Delete a layer with undo support.
 * Captures the layer snapshot and its display children for restoration.
 */
export function deleteLayerWithUndo(layerId: string): void {
  const before = useLayerStore.getState();
  const layerSnapshot = before.layers[layerId];
  if (!layerSnapshot) return;

  const rootOrderIndex = before.rootOrder.indexOf(layerId);
  const previousActiveId = before.activeId;
  const previousSelectedIds = [...before.selectedIds];

  // Grab display children from the LayerManager before deletion destroys them
  const lm = useHistoryStore.getState()._layerManager;
  const visualLayer = lm?.getLayer(layerId);
  const displayChildren = visualLayer
    ? [...visualLayer.contentContainer.children]
    : [];

  // Detach children so they aren't destroyed when the layer is removed
  if (visualLayer) {
    while (visualLayer.contentContainer.children.length > 0) {
      visualLayer.contentContainer.removeChild(visualLayer.contentContainer.children[0]!);
    }
  }

  useLayerStore.getState().deleteLayer(layerId);

  const cmd: HistoryCommand = {
    kind: 'layer:delete',
    layerId,
    layerSnapshot: { ...layerSnapshot },
    rootOrderIndex,
    previousActiveId,
    previousSelectedIds,
    displayChildren,
  };
  useHistoryStore.getState().push(cmd);
}

/**
 * Duplicate a layer with undo support.
 */
export function duplicateLayerWithUndo(layerId: string): string | null {
  const before = useLayerStore.getState();
  const previousActiveId = before.activeId;
  const previousSelectedIds = [...before.selectedIds];

  const newId = useLayerStore.getState().duplicateLayer(layerId);
  if (!newId) return null;

  const after = useLayerStore.getState();
  const insertIndex = after.rootOrder.indexOf(newId);

  const cmd: HistoryCommand = {
    kind: 'layer:duplicate',
    sourceLayerId: layerId,
    newLayerId: newId,
    insertIndex,
    previousActiveId,
    previousSelectedIds,
  };
  useHistoryStore.getState().push(cmd);

  return newId;
}

/**
 * Reorder layers with undo support.
 */
export function reorderLayersWithUndo(newOrder: string[]): void {
  const previousOrder = [...useLayerStore.getState().rootOrder];

  useLayerStore.getState().reorderLayers(newOrder);

  const cmd: HistoryCommand = {
    kind: 'layer:reorder',
    previousOrder,
    newOrder: [...newOrder],
  };
  useHistoryStore.getState().push(cmd);
}

// --- Property change helpers ---

function pushPropertyChange(layerId: string, property: keyof Layer, previousValue: unknown, newValue: unknown): void {
  const cmd: HistoryCommand = {
    kind: 'layer:property',
    layerId,
    property,
    previousValue,
    newValue,
  };
  useHistoryStore.getState().push(cmd);
}

export function toggleLayerVisibilityWithUndo(layerId: string): void {
  const layer = useLayerStore.getState().layers[layerId];
  if (!layer) return;

  const prev = layer.visible;
  useLayerStore.getState().toggleLayerVisibility(layerId);
  pushPropertyChange(layerId, 'visible', prev, !prev);
}

export function toggleLayerLockedWithUndo(layerId: string): void {
  const layer = useLayerStore.getState().layers[layerId];
  if (!layer) return;

  const prev = layer.locked;
  useLayerStore.getState().toggleLayerLocked(layerId);
  pushPropertyChange(layerId, 'locked', prev, !prev);
}

export function setLayerOpacityWithUndo(layerId: string, opacity: number): void {
  const layer = useLayerStore.getState().layers[layerId];
  if (!layer) return;

  const prev = layer.opacity;
  useLayerStore.getState().setLayerOpacity(layerId, opacity);
  pushPropertyChange(layerId, 'opacity', prev, Math.max(0, Math.min(1, opacity)));
}

export function setLayerBlendModeWithUndo(layerId: string, blendMode: Layer['blendMode']): void {
  const layer = useLayerStore.getState().layers[layerId];
  if (!layer) return;

  const prev = layer.blendMode;
  useLayerStore.getState().setLayerBlendMode(layerId, blendMode);
  pushPropertyChange(layerId, 'blendMode', prev, blendMode);
}

export function setLayerNameWithUndo(layerId: string, name: string): void {
  const layer = useLayerStore.getState().layers[layerId];
  if (!layer) return;

  const prev = layer.name;
  useLayerStore.getState().setLayerName(layerId, name);
  pushPropertyChange(layerId, 'name', prev, name);
}
