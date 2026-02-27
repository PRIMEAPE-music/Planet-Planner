import { Container, Graphics, Sprite } from 'pixi.js';
import type { Layer as LayerData, BlendMode, Bounds } from '@/types';

/**
 * Map app-level blend modes to Pixi v8 blend mode strings.
 * Pixi v8 accepts CSS-style blend mode names directly.
 */
const BLEND_MODE_MAP: Record<BlendMode, string> = {
  'normal': 'normal',
  'add': 'add',
  'multiply': 'multiply',
  'screen': 'screen',
  'overlay': 'overlay',
  'darken': 'darken',
  'lighten': 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  'difference': 'difference',
  'exclusion': 'exclusion',
};

/**
 * Visual layer class wrapping Pixi.js Container
 * Handles rendering and visual properties
 */
export class LayerContainer {
  readonly id: string;
  readonly container: Container;
  readonly contentContainer: Container;

  private _data: LayerData;
  private _isDirty: boolean = true;

  constructor(data: LayerData) {
    this.id = data.id;
    this._data = data;

    // Main container (for transforms, blend modes, AND content)
    this.container = new Container();
    this.container.label = `layer-${data.id}`;

    // CRITICAL FIX: Pixi v8 sets blendMode to "inherit" by default which breaks rendering!
    // Must explicitly set to "normal" to match working test container
    this.container.blendMode = 'normal';

    // Make contentContainer the same as container to reduce nesting depth
    this.contentContainer = this.container;
  }

  /**
   * Get layer data
   */
  get data(): LayerData {
    return this._data;
  }

  /**
   * Update layer data and apply visual changes
   */
  updateData(data: Partial<LayerData>): void {
    this._data = { ...this._data, ...data };
    this.applyProperties();
    this._isDirty = true;
  }

  /**
   * Apply visual properties from data
   */
  private applyProperties(): void {
    this.container.visible = this._data.visible;
    this.container.alpha = this._data.opacity;

    // Apply blend mode (Pixi v8 accepts CSS blend mode names directly)
    const pixiBlend = BLEND_MODE_MAP[this._data.blendMode] ?? 'normal';
    this.container.blendMode = pixiBlend as any;
  }

  /**
   * Check if layer needs re-render
   */
  get isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * Mark layer as needing re-render
   */
  markDirty(): void {
    this._isDirty = true;
  }

  /**
   * Clear dirty flag
   */
  clearDirty(): void {
    this._isDirty = false;
  }

  /**
   * Get layer bounds in world coordinates
   */
  getBounds(): Bounds | null {
    if (this.contentContainer.children.length === 0) {
      return null;
    }

    const pixiBounds = this.contentContainer.getBounds();
    return {
      x: pixiBounds.x,
      y: pixiBounds.y,
      width: pixiBounds.width,
      height: pixiBounds.height,
    };
  }

  /**
   * Check if layer intersects with viewport
   */
  intersectsViewport(viewportBounds: Bounds): boolean {
    const bounds = this.getBounds();
    if (!bounds) return true; // Empty layers always "intersect"

    return (
      bounds.x < viewportBounds.x + viewportBounds.width &&
      bounds.x + bounds.width > viewportBounds.x &&
      bounds.y < viewportBounds.y + viewportBounds.height &&
      bounds.y + bounds.height > viewportBounds.y
    );
  }

  /**
   * Clear all content from the layer
   */
  clear(): void {
    while (this.contentContainer.children.length > 0) {
      const child = this.contentContainer.children[0];
      if (child) {
        this.contentContainer.removeChild(child);
        child.destroy({ children: true });
      }
    }
    this._isDirty = true;
  }

  /**
   * Add a display object to the layer
   */
  addContent(child: Container | Graphics | Sprite): void {
    this.contentContainer.addChild(child);
    this._isDirty = true;
  }

  /**
   * Remove a display object from the layer
   */
  removeContent(child: Container | Graphics | Sprite): void {
    this.contentContainer.removeChild(child);
    this._isDirty = true;
  }

  /**
   * Destroy the layer and cleanup resources
   */
  destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }
}
