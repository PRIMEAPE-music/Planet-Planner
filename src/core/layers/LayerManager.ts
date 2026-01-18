import { Container } from 'pixi.js';
import { LayerContainer } from './Layer';
import type { Layer as LayerData, LayerState, Bounds } from '@/types';

export interface LayerManagerEvents {
  'layer:created': LayerContainer;
  'layer:deleted': string;
  'layer:updated': LayerContainer;
  'layer:reordered': string[];
}

type EventCallback<T> = (data: T) => void;

/**
 * Manages all visual layers and their synchronization with the store
 */
export class LayerManager {
  private rootContainer: Container;
  private layers: Map<string, LayerContainer> = new Map();
  private layerOrder: string[] = [];
  private listeners: Map<keyof LayerManagerEvents, Set<EventCallback<any>>> = new Map();

  constructor(rootContainer: Container) {
    this.rootContainer = rootContainer;
  }

  /**
   * Subscribe to layer events
   */
  on<K extends keyof LayerManagerEvents>(
    event: K,
    callback: EventCallback<LayerManagerEvents[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event
   */
  private emit<K extends keyof LayerManagerEvents>(
    event: K,
    data: LayerManagerEvents[K]
  ): void {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  /**
   * Synchronize with layer store state
   */
  syncWithState(state: LayerState): void {
    const { layers: layerData, rootOrder } = state;

    // Find layers to add, update, or remove
    const currentIds = new Set(this.layers.keys());
    const newIds = new Set(Object.keys(layerData));

    // Remove deleted layers
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        this.removeLayer(id);
      }
    }

    // Add or update layers
    for (const id of newIds) {
      const data = layerData[id];
      if (!data) continue;
      if (currentIds.has(id)) {
        this.updateLayer(id, data);
      } else {
        this.createLayer(data);
      }
    }

    // Update order
    this.setLayerOrder(rootOrder);
  }

  /**
   * Create a new visual layer
   */
  createLayer(data: LayerData): LayerContainer {
    if (this.layers.has(data.id)) {
      console.warn(`Layer ${data.id} already exists`);
      return this.layers.get(data.id)!;
    }

    const layer = new LayerContainer(data);
    this.layers.set(data.id, layer);
    this.rootContainer.addChild(layer.container);

    this.emit('layer:created', layer);
    return layer;
  }

  /**
   * Update an existing layer
   */
  updateLayer(id: string, data: Partial<LayerData>): void {
    const layer = this.layers.get(id);
    if (!layer) {
      console.warn(`Layer ${id} not found`);
      return;
    }

    layer.updateData(data);
    this.emit('layer:updated', layer);
  }

  /**
   * Remove a layer
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    this.rootContainer.removeChild(layer.container);
    layer.destroy();
    this.layers.delete(id);

    this.layerOrder = this.layerOrder.filter((lid) => lid !== id);
    this.emit('layer:deleted', id);
  }

  /**
   * Get a layer by ID
   */
  getLayer(id: string): LayerContainer | undefined {
    return this.layers.get(id);
  }

  /**
   * Get all layers
   */
  getAllLayers(): LayerContainer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Set layer order (affects z-index)
   */
  setLayerOrder(order: string[]): void {
    this.layerOrder = [...order];

    // Reorder containers in Pixi.js
    // Lower index = rendered first = behind
    for (let i = 0; i < order.length; i++) {
      const layerId = order[i];
      if (!layerId) continue;
      const layer = this.layers.get(layerId);
      if (layer) {
        this.rootContainer.setChildIndex(layer.container, i);
      }
    }

    this.emit('layer:reordered', this.layerOrder);
  }

  /**
   * Get current layer order
   */
  getLayerOrder(): string[] {
    return [...this.layerOrder];
  }

  /**
   * Perform viewport culling - hide layers outside viewport
   */
  cullToViewport(viewportBounds: Bounds): void {
    for (const layer of this.layers.values()) {
      // Don't cull if layer is marked as non-cullable or is already hidden
      if (!layer.data.visible) continue;

      const intersects = layer.intersectsViewport(viewportBounds);
      layer.container.renderable = intersects;
    }
  }

  /**
   * Mark all layers as renderable (disable culling)
   */
  disableCulling(): void {
    for (const layer of this.layers.values()) {
      layer.container.renderable = true;
    }
  }

  /**
   * Get layers that are dirty (need re-render)
   */
  getDirtyLayers(): LayerContainer[] {
    return Array.from(this.layers.values()).filter((layer) => layer.isDirty);
  }

  /**
   * Clear all dirty flags
   */
  clearAllDirty(): void {
    for (const layer of this.layers.values()) {
      layer.clearDirty();
    }
  }

  /**
   * Get combined bounds of all visible layers
   */
  getVisibleBounds(): Bounds | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const layer of this.layers.values()) {
      if (!layer.data.visible) continue;

      const bounds = layer.getBounds();
      if (!bounds) continue;

      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    if (minX === Infinity) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Destroy all layers and cleanup
   */
  destroy(): void {
    for (const layer of this.layers.values()) {
      layer.destroy();
    }
    this.layers.clear();
    this.layerOrder = [];
  }
}
