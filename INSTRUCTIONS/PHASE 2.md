# PHASE 2: Layer System & Rendering Pipeline

---

## Overview

Phase 2 focuses on building the visual foundation of Planet Planner:
- Layer container management synchronized with Pixi.js
- Procedural parchment texture generation
- Render pipeline with blend modes and effects
- Layer panel UI component
- Viewport culling for performance optimization

---

### 2.1 Layer System Architecture

#### 2.1.1 src/core/layers/Layer.ts

```typescript
import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js';
import type { Layer as LayerData, BlendMode, Bounds } from '@/types';

/**
 * Map our blend mode names to Pixi.js blend modes
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
  private _bounds: Bounds | null = null;

  constructor(data: LayerData) {
    this.id = data.id;
    this._data = data;

    // Main container (for transforms, blend modes)
    this.container = new Container();
    this.container.label = `layer-${data.id}`;

    // Content container (for actual drawing)
    this.contentContainer = new Container();
    this.contentContainer.label = `layer-content-${data.id}`;
    this.container.addChild(this.contentContainer);

    this.applyProperties();
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
    this.container.blendMode = BLEND_MODE_MAP[this._data.blendMode] as any;
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
      this.contentContainer.removeChild(child);
      child.destroy({ children: true });
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
```

#### 2.1.2 src/core/layers/LayerManager.ts

```typescript
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
      const layer = this.layers.get(order[i]);
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
```

#### 2.1.3 src/core/layers/index.ts

```typescript
export { LayerContainer } from './Layer';
export { LayerManager } from './LayerManager';
export type { LayerManagerEvents } from './LayerManager';
```

---

### 2.2 Procedural Parchment Texture Generation

#### 2.2.1 src/core/rendering/noise.ts

```typescript
/**
 * Simple 2D Perlin-like noise implementation
 * Used for procedural texture generation
 */

// Permutation table
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Initialize permutation table with seed
export function initNoise(seed: number = 0): void {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }

  // Shuffle with seed
  let n = seed;
  for (let i = 255; i > 0; i--) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    const j = n % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }

  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
  }
}

// Initialize with default seed
initNoise(42);

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const g = GRAD[hash & 7];
  return g[0] * x + g[1] * y;
}

/**
 * 2D Perlin noise
 * @returns value between -1 and 1
 */
export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);

  const u = fade(x);
  const v = fade(y);

  const A = PERM[X] + Y;
  const B = PERM[X + 1] + Y;

  return lerp(
    lerp(grad(PERM[A], x, y), grad(PERM[B], x - 1, y), u),
    lerp(grad(PERM[A + 1], x, y - 1), grad(PERM[B + 1], x - 1, y - 1), u),
    v
  );
}

/**
 * Fractal Brownian Motion (multi-octave noise)
 */
export function fbm(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Turbulence (absolute value FBM)
 */
export function turbulence(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(noise2D(x * frequency, y * frequency));
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Ridged noise (inverted absolute value)
 */
export function ridgedNoise(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 1;

  for (let i = 0; i < octaves; i++) {
    let signal = noise2D(x * frequency, y * frequency);
    signal = 1 - Math.abs(signal);
    signal *= signal * weight;
    weight = Math.min(1, Math.max(0, signal * 2));
    value += signal * amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value;
}
```

#### 2.2.2 src/core/rendering/ParchmentGenerator.ts

```typescript
import { Application, Container, Graphics, RenderTexture, Sprite, Filter } from 'pixi.js';
import { fbm, turbulence, initNoise } from './noise';
import { PARCHMENT_COLORS, INK_COLORS } from '@/constants';
import { hexToRgb, blendColors } from '@/utils';

export interface ParchmentConfig {
  /** Base parchment color */
  baseColor: string;
  /** Secondary color for variation */
  secondaryColor: string;
  /** Noise scale (lower = larger features) */
  noiseScale: number;
  /** Number of noise octaves */
  octaves: number;
  /** Color variation intensity (0-1) */
  colorVariation: number;
  /** Stain intensity (0-1) */
  stainIntensity: number;
  /** Edge darkening intensity (0-1) */
  edgeDarkening: number;
  /** Grain intensity (0-1) */
  grainIntensity: number;
  /** Fiber visibility (0-1) */
  fiberIntensity: number;
}

const DEFAULT_PARCHMENT_CONFIG: ParchmentConfig = {
  baseColor: PARCHMENT_COLORS.base,
  secondaryColor: PARCHMENT_COLORS.medium,
  noiseScale: 0.005,
  octaves: 4,
  colorVariation: 0.15,
  stainIntensity: 0.1,
  edgeDarkening: 0.3,
  grainIntensity: 0.05,
  fiberIntensity: 0.03,
};

/**
 * Generates procedural parchment textures
 */
export class ParchmentGenerator {
  private app: Application;
  private config: ParchmentConfig;

  constructor(app: Application, config: Partial<ParchmentConfig> = {}) {
    this.app = app;
    this.config = { ...DEFAULT_PARCHMENT_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ParchmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate a parchment texture
   */
  async generate(
    width: number,
    height: number,
    seed: number = Date.now()
  ): Promise<RenderTexture> {
    initNoise(seed);

    const texture = RenderTexture.create({
      width,
      height,
      resolution: 1,
    });

    // Create canvas for pixel manipulation
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const baseRgb = hexToRgb(this.config.baseColor)!;
    const secondaryRgb = hexToRgb(this.config.secondaryColor)!;

    // Generate parchment pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Base noise for color variation
        const baseNoise = fbm(
          x * this.config.noiseScale,
          y * this.config.noiseScale,
          this.config.octaves
        );

        // Stain noise (larger scale, irregular)
        const stainNoise = turbulence(
          x * this.config.noiseScale * 0.3,
          y * this.config.noiseScale * 0.3,
          3
        );

        // Fine grain noise
        const grainNoise = fbm(
          x * this.config.noiseScale * 10,
          y * this.config.noiseScale * 10,
          2
        );

        // Fiber noise (directional)
        const fiberNoise = fbm(
          x * this.config.noiseScale * 5,
          y * this.config.noiseScale * 0.5,
          2
        );

        // Edge vignette
        const edgeX = Math.min(x, width - x) / (width * 0.3);
        const edgeY = Math.min(y, height - y) / (height * 0.3);
        const edge = Math.min(1, Math.min(edgeX, edgeY));
        const vignette = 1 - (1 - edge) * this.config.edgeDarkening;

        // Combine color influences
        const colorMix = (baseNoise * 0.5 + 0.5) * this.config.colorVariation;
        const stainMix = stainNoise * this.config.stainIntensity;
        const grainMix = grainNoise * this.config.grainIntensity;
        const fiberMix = fiberNoise * this.config.fiberIntensity;

        // Calculate final color
        let r = baseRgb.r + (secondaryRgb.r - baseRgb.r) * colorMix;
        let g = baseRgb.g + (secondaryRgb.g - baseRgb.g) * colorMix;
        let b = baseRgb.b + (secondaryRgb.b - baseRgb.b) * colorMix;

        // Apply stains (darken)
        const stainDarken = 1 - stainMix * 0.3;
        r *= stainDarken;
        g *= stainDarken;
        b *= stainDarken;

        // Apply grain
        r += grainMix * 30 - 15;
        g += grainMix * 30 - 15;
        b += grainMix * 30 - 15;

        // Apply fibers (slight lightening in horizontal direction)
        r += fiberMix * 20;
        g += fiberMix * 18;
        b += fiberMix * 15;

        // Apply vignette
        r *= vignette;
        g *= vignette;
        b *= vignette;

        // Clamp values
        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Create sprite from canvas and render to texture
    const img = new Image();
    img.src = canvas.toDataURL();

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    const sprite = Sprite.from(canvas);
    this.app.renderer.render({
      container: sprite,
      target: texture,
    });

    sprite.destroy();

    return texture;
  }

  /**
   * Generate a tiling parchment texture
   */
  async generateTiling(
    width: number,
    height: number,
    seed: number = Date.now()
  ): Promise<RenderTexture> {
    initNoise(seed);

    const texture = RenderTexture.create({
      width,
      height,
      resolution: 1,
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const baseRgb = hexToRgb(this.config.baseColor)!;
    const secondaryRgb = hexToRgb(this.config.secondaryColor)!;

    // Generate tiling parchment using seamless noise
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Use torus mapping for seamless tiling
        const nx = x / width;
        const ny = y / height;
        const angle1 = nx * Math.PI * 2;
        const angle2 = ny * Math.PI * 2;

        // Map to 4D torus
        const scale = this.config.noiseScale * 100;
        const x1 = Math.cos(angle1) * scale;
        const y1 = Math.sin(angle1) * scale;
        const x2 = Math.cos(angle2) * scale;
        const y2 = Math.sin(angle2) * scale;

        // Simplified noise for tiling (using 2D approximation)
        const baseNoise = fbm(x1 + x2, y1 + y2, this.config.octaves);
        const grainNoise = fbm(x1 * 10 + x2 * 10, y1 * 10 + y2 * 10, 2);

        const colorMix = (baseNoise * 0.5 + 0.5) * this.config.colorVariation;
        const grainMix = grainNoise * this.config.grainIntensity;

        let r = baseRgb.r + (secondaryRgb.r - baseRgb.r) * colorMix;
        let g = baseRgb.g + (secondaryRgb.g - baseRgb.g) * colorMix;
        let b = baseRgb.b + (secondaryRgb.b - baseRgb.b) * colorMix;

        r += grainMix * 30 - 15;
        g += grainMix * 30 - 15;
        b += grainMix * 30 - 15;

        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const sprite = Sprite.from(canvas);
    this.app.renderer.render({
      container: sprite,
      target: texture,
    });

    sprite.destroy();

    return texture;
  }
}
```

#### 2.2.3 src/core/rendering/RenderPipeline.ts

```typescript
import { Application, Container, Graphics, RenderTexture, Sprite, TilingSprite } from 'pixi.js';
import { LayerManager } from '../layers/LayerManager';
import { ParchmentGenerator, ParchmentConfig } from './ParchmentGenerator';
import type { Bounds, Viewport } from '@/types';

export interface RenderPipelineConfig {
  /** Enable parchment overlay */
  parchmentEnabled: boolean;
  /** Parchment overlay opacity */
  parchmentOpacity: number;
  /** Parchment blend mode */
  parchmentBlendMode: 'multiply' | 'overlay' | 'soft-light';
  /** Enable viewport culling */
  cullingEnabled: boolean;
  /** Parchment generation config */
  parchmentConfig?: Partial<ParchmentConfig>;
}

const DEFAULT_PIPELINE_CONFIG: RenderPipelineConfig = {
  parchmentEnabled: true,
  parchmentOpacity: 0.3,
  parchmentBlendMode: 'multiply',
  cullingEnabled: true,
};

/**
 * Render pipeline managing the composition of all layers and effects
 */
export class RenderPipeline {
  private app: Application;
  private layerManager: LayerManager;
  private parchmentGenerator: ParchmentGenerator;
  private config: RenderPipelineConfig;

  // Containers
  private rootContainer: Container;
  private backgroundContainer: Container;
  private layerContainer: Container;
  private effectContainer: Container;
  private overlayContainer: Container;

  // Parchment
  private parchmentSprite: TilingSprite | null = null;
  private parchmentTexture: RenderTexture | null = null;

  // Background
  private backgroundGraphics: Graphics;

  // Canvas dimensions
  private canvasWidth: number = 4096;
  private canvasHeight: number = 4096;

  constructor(
    app: Application,
    rootContainer: Container,
    config: Partial<RenderPipelineConfig> = {}
  ) {
    this.app = app;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };

    // Setup container hierarchy
    this.rootContainer = rootContainer;

    this.backgroundContainer = new Container();
    this.backgroundContainer.label = 'background';
    this.rootContainer.addChild(this.backgroundContainer);

    this.layerContainer = new Container();
    this.layerContainer.label = 'layers';
    this.rootContainer.addChild(this.layerContainer);

    this.effectContainer = new Container();
    this.effectContainer.label = 'effects';
    this.rootContainer.addChild(this.effectContainer);

    this.overlayContainer = new Container();
    this.overlayContainer.label = 'overlay';
    this.rootContainer.addChild(this.overlayContainer);

    // Setup background
    this.backgroundGraphics = new Graphics();
    this.backgroundContainer.addChild(this.backgroundGraphics);

    // Setup layer manager
    this.layerManager = new LayerManager(this.layerContainer);

    // Setup parchment generator
    this.parchmentGenerator = new ParchmentGenerator(app, config.parchmentConfig);
  }

  /**
   * Initialize the render pipeline
   */
  async init(canvasWidth: number, canvasHeight: number): Promise<void> {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.drawBackground();

    if (this.config.parchmentEnabled) {
      await this.initParchment();
    }
  }

  /**
   * Draw the canvas background
   */
  private drawBackground(): void {
    this.backgroundGraphics.clear();

    // Ocean/void color outside canvas
    this.backgroundGraphics.rect(
      -10000,
      -10000,
      this.canvasWidth + 20000,
      this.canvasHeight + 20000
    );
    this.backgroundGraphics.fill({ color: 0x0c1929 });

    // Canvas area (parchment base color)
    this.backgroundGraphics.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.backgroundGraphics.fill({ color: 0xf4e4c1 });

    // Subtle canvas border
    this.backgroundGraphics.setStrokeStyle({ width: 4, color: 0x8b7355 });
    this.backgroundGraphics.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.backgroundGraphics.stroke();
  }

  /**
   * Initialize parchment texture overlay
   */
  private async initParchment(): Promise<void> {
    // Generate tiling parchment texture (256x256 for performance)
    this.parchmentTexture = await this.parchmentGenerator.generateTiling(256, 256, 12345);

    // Create tiling sprite that covers the canvas
    this.parchmentSprite = new TilingSprite({
      texture: this.parchmentTexture,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });

    this.parchmentSprite.alpha = this.config.parchmentOpacity;
    this.parchmentSprite.blendMode = this.config.parchmentBlendMode as any;

    this.overlayContainer.addChild(this.parchmentSprite);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RenderPipelineConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.parchmentSprite) {
      this.parchmentSprite.alpha = this.config.parchmentOpacity;
      this.parchmentSprite.blendMode = this.config.parchmentBlendMode as any;
      this.parchmentSprite.visible = this.config.parchmentEnabled;
    }
  }

  /**
   * Get the layer manager
   */
  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  /**
   * Get the layer container (for direct access)
   */
  getLayerContainer(): Container {
    return this.layerContainer;
  }

  /**
   * Update render pipeline (called each frame)
   */
  update(viewport: Viewport): void {
    // Perform viewport culling
    if (this.config.cullingEnabled) {
      this.layerManager.cullToViewport(viewport.bounds);
    }
  }

  /**
   * Regenerate parchment texture with new seed
   */
  async regenerateParchment(seed?: number): Promise<void> {
    if (this.parchmentTexture) {
      this.parchmentTexture.destroy(true);
    }

    this.parchmentTexture = await this.parchmentGenerator.generateTiling(
      256,
      256,
      seed ?? Date.now()
    );

    if (this.parchmentSprite) {
      this.parchmentSprite.texture = this.parchmentTexture;
    }
  }

  /**
   * Set parchment configuration
   */
  async setParchmentConfig(config: Partial<ParchmentConfig>): Promise<void> {
    this.parchmentGenerator.setConfig(config);
    await this.regenerateParchment();
  }

  /**
   * Resize canvas dimensions
   */
  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.drawBackground();

    if (this.parchmentSprite) {
      this.parchmentSprite.width = width;
      this.parchmentSprite.height = height;
    }
  }

  /**
   * Get canvas dimensions
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Export the current canvas to an image
   */
  async exportToImage(
    format: 'png' | 'jpeg' = 'png',
    quality: number = 1
  ): Promise<Blob> {
    // Disable culling temporarily
    this.layerManager.disableCulling();

    // Create render texture for the entire canvas
    const renderTexture = RenderTexture.create({
      width: this.canvasWidth,
      height: this.canvasHeight,
      resolution: 1,
    });

    // Render to texture
    this.app.renderer.render({
      container: this.rootContainer,
      target: renderTexture,
    });

    // Extract to canvas
    const canvas = this.app.renderer.extract.canvas({
      target: renderTexture,
    }) as HTMLCanvasElement;

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export canvas'));
          }
          renderTexture.destroy(true);
        },
        `image/${format}`,
        quality
      );
    });
  }

  /**
   * Destroy the render pipeline
   */
  destroy(): void {
    this.layerManager.destroy();
    this.parchmentTexture?.destroy(true);
    this.backgroundGraphics.destroy();
    this.backgroundContainer.destroy({ children: true });
    this.layerContainer.destroy({ children: true });
    this.effectContainer.destroy({ children: true });
    this.overlayContainer.destroy({ children: true });
  }
}
```

#### 2.2.4 src/core/rendering/index.ts

```typescript
export { ParchmentGenerator } from './ParchmentGenerator';
export type { ParchmentConfig } from './ParchmentGenerator';
export { RenderPipeline } from './RenderPipeline';
export type { RenderPipelineConfig } from './RenderPipeline';
export * from './noise';
```

---

### 2.3 Updated Canvas Engine with Render Pipeline

#### 2.3.1 src/core/canvas/CanvasEngine.ts (Updated)

```typescript
import { Application, Container } from 'pixi.js';
import { Camera } from './Camera';
import { Grid } from './Grid';
import { InputHandler } from './InputHandler';
import { RenderPipeline, RenderPipelineConfig } from '../rendering/RenderPipeline';
import { LayerManager } from '../layers/LayerManager';
import type { Vector2, GridConfig, Viewport, CameraConfig, LayerState } from '@/types';
import { DEFAULT_CANVAS_DIMENSIONS, CANVAS_CONSTANTS } from '@/constants';

export interface CanvasEngineConfig {
  backgroundColor?: string;
  width?: number;
  height?: number;
  cameraConfig?: Partial<CameraConfig>;
  gridConfig?: Partial<GridConfig>;
  renderConfig?: Partial<RenderPipelineConfig>;
}

export interface CanvasEngineCallbacks {
  onViewportChange?: (viewport: Viewport) => void;
  onGridChange?: (config: GridConfig) => void;
  onPointerDown?: (position: Vector2, worldPosition: Vector2) => void;
  onPointerMove?: (position: Vector2, worldPosition: Vector2, isDragging: boolean) => void;
  onPointerUp?: (position: Vector2, worldPosition: Vector2) => void;
}

/**
 * Main canvas engine wrapping Pixi.js
 * Manages rendering, camera, grid, layers, and input
 */
export class CanvasEngine {
  private app: Application | null = null;
  private worldContainer: Container | null = null;
  private camera: Camera | null = null;
  private grid: Grid | null = null;
  private inputHandler: InputHandler | null = null;
  private renderPipeline: RenderPipeline | null = null;
  private callbacks: CanvasEngineCallbacks = {};
  private isInitialized: boolean = false;
  private isPanning: boolean = false;
  private isDrawing: boolean = false;
  private lastPointerPosition: Vector2 = { x: 0, y: 0 };

  private canvasWidth: number = DEFAULT_CANVAS_DIMENSIONS.width;
  private canvasHeight: number = DEFAULT_CANVAS_DIMENSIONS.height;

  /**
   * Initialize the canvas engine
   */
  async init(
    container: HTMLElement,
    config: CanvasEngineConfig = {},
    callbacks: CanvasEngineCallbacks = {}
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('CanvasEngine already initialized');
      return;
    }

    this.callbacks = callbacks;
    this.canvasWidth = config.width ?? DEFAULT_CANVAS_DIMENSIONS.width;
    this.canvasHeight = config.height ?? DEFAULT_CANVAS_DIMENSIONS.height;

    // Initialize Pixi Application
    this.app = new Application();
    await this.app.init({
      background: config.backgroundColor ?? CANVAS_CONSTANTS.DEFAULT_BACKGROUND_COLOR,
      resizeTo: container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Setup world container
    this.worldContainer = new Container();
    this.worldContainer.label = 'world';
    this.app.stage.addChild(this.worldContainer);

    // Setup render pipeline
    this.renderPipeline = new RenderPipeline(
      this.app,
      this.worldContainer,
      config.renderConfig
    );
    await this.renderPipeline.init(this.canvasWidth, this.canvasHeight);

    // Setup camera
    this.camera = new Camera(this.worldContainer, config.cameraConfig);
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);

    // Setup grid (add to world container, above layers)
    const gridContainer = new Container();
    gridContainer.label = 'grid';
    this.worldContainer.addChild(gridContainer);
    this.grid = new Grid(gridContainer, config.gridConfig);

    // Setup input handler
    this.inputHandler = new InputHandler(
      this.app.canvas as HTMLCanvasElement,
      (screen) => this.camera!.screenToWorld(screen)
    );

    this.setupInputHandlers();
    this.setupResizeHandler(container);

    // Start render loop
    this.app.ticker.add(this.update);

    this.isInitialized = true;

    // Center camera on canvas
    this.camera.setCenter({
      x: this.canvasWidth / 2,
      y: this.canvasHeight / 2,
    });

    // Initial viewport update
    this.emitViewportChange();
  }

  /**
   * Setup input event handlers
   */
  private setupInputHandlers(): void {
    if (!this.inputHandler || !this.camera) return;

    this.inputHandler.on('pointerdown', (state, event) => {
      if (event instanceof PointerEvent) {
        // Middle mouse or space+click for panning
        if (state.isMiddleDown || (state.isPrimaryDown && state.modifiers.alt)) {
          this.isPanning = true;
          this.lastPointerPosition = { ...state.screenPosition };
        } else if (state.isPrimaryDown) {
          this.isDrawing = true;
          this.callbacks.onPointerDown?.(state.screenPosition, state.worldPosition);
        }
      }
    });

    this.inputHandler.on('pointermove', (state) => {
      if (this.isPanning && this.camera) {
        const delta = {
          x: state.screenPosition.x - this.lastPointerPosition.x,
          y: state.screenPosition.y - this.lastPointerPosition.y,
        };
        this.camera.panBy({ x: -delta.x, y: -delta.y });
        this.lastPointerPosition = { ...state.screenPosition };
      } else {
        this.callbacks.onPointerMove?.(
          state.screenPosition,
          state.worldPosition,
          this.isDrawing
        );
      }
    });

    this.inputHandler.on('pointerup', (state) => {
      if (this.isPanning) {
        this.isPanning = false;
      } else if (this.isDrawing) {
        this.isDrawing = false;
        this.callbacks.onPointerUp?.(state.screenPosition, state.worldPosition);
      }
    });

    this.inputHandler.on('wheel', (state, event) => {
      if (event instanceof WheelEvent && this.camera) {
        this.camera.zoomBy(event.deltaY, state.screenPosition);
      }
    });
  }

  /**
   * Setup window resize handler
   */
  private setupResizeHandler(container: HTMLElement): void {
    const resizeObserver = new ResizeObserver(() => {
      if (this.app && this.camera) {
        this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
        this.emitViewportChange();
      }
    });

    resizeObserver.observe(container);
  }

  /**
   * Main update loop
   */
  private update = (): void => {
    if (!this.app || !this.camera || !this.grid || !this.renderPipeline) return;

    const deltaTime = this.app.ticker.deltaMS / 1000;

    // Update camera (smooth movement)
    const cameraChanged = this.camera.update(deltaTime);

    if (cameraChanged) {
      this.emitViewportChange();
    }

    // Get current viewport
    const viewport = this.camera.getViewport();

    // Update grid
    this.grid.render(viewport.bounds, viewport.zoom);

    // Update render pipeline (culling, etc.)
    this.renderPipeline.update(viewport);
  };

  /**
   * Emit viewport change to callback
   */
  private emitViewportChange(): void {
    if (!this.camera || !this.inputHandler) return;

    const viewport = this.camera.getViewport();
    this.callbacks.onViewportChange?.(viewport);

    // Update input handler's world transform
    this.inputHandler.setWorldTransform((screen) => this.camera!.screenToWorld(screen));
  }

  // Public API

  /**
   * Check if engine is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the Pixi.js application
   */
  getApp(): Application | null {
    return this.app;
  }

  /**
   * Get the world container
   */
  getWorldContainer(): Container | null {
    return this.worldContainer;
  }

  /**
   * Get the layer manager
   */
  getLayerManager(): LayerManager | null {
    return this.renderPipeline?.getLayerManager() ?? null;
  }

  /**
   * Get the render pipeline
   */
  getRenderPipeline(): RenderPipeline | null {
    return this.renderPipeline;
  }

  /**
   * Sync layer state from store
   */
  syncLayerState(state: LayerState): void {
    this.renderPipeline?.getLayerManager().syncWithState(state);
  }

  /**
   * Get current viewport
   */
  getViewport(): Viewport | null {
    return this.camera?.getViewport() ?? null;
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.camera?.setZoom(zoom);
  }

  /**
   * Set center position
   */
  setCenter(center: Vector2): void {
    this.camera?.setCenter(center);
  }

  /**
   * Reset camera to default
   */
  resetCamera(): void {
    this.camera?.reset();
  }

  /**
   * Fit camera to canvas bounds
   */
  fitToCanvas(): void {
    this.camera?.fitToBounds({
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
  }

  /**
   * Update grid configuration
   */
  setGridConfig(config: Partial<GridConfig>): void {
    this.grid?.setConfig(config);
    if (this.grid) {
      this.callbacks.onGridChange?.(this.grid.getConfig());
    }
  }

  /**
   * Get grid configuration
   */
  getGridConfig(): GridConfig | null {
    return this.grid?.getConfig() ?? null;
  }

  /**
   * Snap position to grid
   */
  snapToGrid(x: number, y: number): Vector2 {
    return this.grid?.snapToGrid(x, y) ?? { x, y };
  }

  /**
   * Convert screen to world coordinates
   */
  screenToWorld(screen: Vector2): Vector2 {
    return this.camera?.screenToWorld(screen) ?? screen;
  }

  /**
   * Convert world to screen coordinates
   */
  worldToScreen(world: Vector2): Vector2 {
    return this.camera?.worldToScreen(world) ?? world;
  }

  /**
   * Get canvas dimensions
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Export canvas to image
   */
  async exportToImage(format: 'png' | 'jpeg' = 'png'): Promise<Blob | null> {
    return this.renderPipeline?.exportToImage(format) ?? null;
  }

  /**
   * Destroy the engine and cleanup
   */
  destroy(): void {
    if (!this.isInitialized) return;

    this.app?.ticker.remove(this.update);
    this.inputHandler?.destroy();
    this.grid?.destroy();
    this.renderPipeline?.destroy();
    this.app?.destroy(true, { children: true });

    this.app = null;
    this.worldContainer = null;
    this.camera = null;
    this.grid = null;
    this.inputHandler = null;
    this.renderPipeline = null;

    this.isInitialized = false;
  }
}
```

---

### 2.4 Update Core Index

#### 2.4.1 src/core/index.ts (Updated)

```typescript
export * from './canvas';
export * from './layers';
export * from './rendering';
```

---

### 2.5 UI Components

#### 2.5.1 src/components/ui/index.ts

```typescript
export { Button, type ButtonProps } from './Button';
export { Slider } from './Slider';
export { Toggle } from './Toggle';
export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './Tooltip';
export { ScrollArea } from './ScrollArea';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './DropdownMenu';
```

#### 2.5.2 src/components/ui/Button.tsx

```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-ink-700 text-parchment-100 shadow hover:bg-ink-600',
        destructive:
          'bg-red-900 text-parchment-100 shadow-sm hover:bg-red-800',
        outline:
          'border border-ink-600 bg-transparent text-ink-200 shadow-sm hover:bg-ink-800 hover:text-parchment-100',
        secondary:
          'bg-ink-800 text-parchment-200 shadow-sm hover:bg-ink-700',
        ghost:
          'text-ink-300 hover:bg-ink-800 hover:text-parchment-100',
        link:
          'text-parchment-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

#### 2.5.3 src/components/ui/Slider.tsx

```typescript
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/utils';

const Slider = React.forwardRef
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-ink-800">
      <SliderPrimitive.Range className="absolute h-full bg-parchment-500" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-parchment-500 bg-parchment-200 shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-parchment-400 disabled:pointer-events-none disabled:opacity-50 hover:bg-parchment-100" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
```

#### 2.5.4 src/components/ui/Toggle.tsx

```typescript
import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-ink-800 hover:text-parchment-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-400 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-ink-700 data-[state=on]:text-parchment-100',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-ink-700 bg-transparent shadow-sm hover:bg-ink-800',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2',
        lg: 'h-10 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Toggle = React.forwardRef
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
```

#### 2.5.5 src/components/ui/Tooltip.tsx

```typescript
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-tooltip overflow-hidden rounded-md bg-ink-900 px-3 py-1.5 text-xs text-parchment-200 shadow-md animate-fade-in',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

#### 2.5.6 src/components/ui/ScrollArea.tsx

```typescript
import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/utils';

const ScrollArea = React.forwardRef
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = 'vertical', ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      'flex touch-none select-none transition-colors',
      orientation === 'vertical' &&
        'h-full w-2.5 border-l border-l-transparent p-[1px]',
      orientation === 'horizontal' &&
        'h-2.5 flex-col border-t border-t-transparent p-[1px]',
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-ink-600 hover:bg-ink-500" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
```

#### 2.5.7 src/components/ui/DropdownMenu.tsx

```typescript
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuContent = React.forwardRef
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-modal min-w-[8rem] overflow-hidden rounded-md border border-ink-700 bg-ink-900 p-1 text-parchment-200 shadow-lg animate-fade-in',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-ink-700 focus:text-parchment-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = React.forwardRef
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-ink-700', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuLabel = React.forwardRef
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-xs font-semibold text-parchment-400',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
```

---

### 2.6 Layer Panel Component

#### 2.6.1 src/components/layout/LayerPanel.tsx

```typescript
import React, { useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  Layers,
  MoreVertical,
} from 'lucide-react';
import { useLayerStore } from '@/stores';
import {
  Button,
  ScrollArea,
  Slider,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui';
import { cn } from '@/utils';
import type { Layer, LayerType, BlendMode } from '@/types';

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  isActive: boolean;
}

const LAYER_TYPE_ICONS: Record<LayerType, string> = {
  terrain: '🏔️',
  biome: '🌿',
  elevation: '📊',
  water: '💧',
  feature: '🌲',
  icon: '📍',
  path: '🛤️',
  label: '🏷️',
  effect: '✨',
  reference: '🖼️',
};

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];

function LayerItem({ layer, isSelected, isActive }: LayerItemProps) {
  const {
    toggleLayerVisibility,
    toggleLayerLocked,
    selectLayer,
    setLayerOpacity,
    setLayerBlendMode,
    deleteLayer,
    duplicateLayer,
    moveLayer,
    setLayerName,
  } = useLayerStore();

  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(layer.name);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditName(layer.name);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [layer.name]);

  const handleNameSubmit = useCallback(() => {
    if (editName.trim()) {
      setLayerName(layer.id, editName.trim());
    }
    setIsEditing(false);
  }, [editName, layer.id, setLayerName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNameSubmit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditName(layer.name);
      }
    },
    [handleNameSubmit, layer.name]
  );

  return (
    <div
      className={cn(
        'group flex flex-col rounded-md border transition-colors',
        isSelected
          ? 'border-parchment-500 bg-ink-800'
          : 'border-transparent hover:bg-ink-800/50',
        isActive && 'ring-1 ring-parchment-400'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-1 p-1.5 cursor-pointer"
        onClick={() => selectLayer(layer.id)}
      >
        {/* Visibility toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
            >
              {layer.visible ? (
                <Eye className="h-3.5 w-3.5 text-parchment-300" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-ink-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {layer.visible ? 'Hide layer' : 'Show layer'}
          </TooltipContent>
        </Tooltip>

        {/* Lock toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerLocked(layer.id);
              }}
            >
              {layer.locked ? (
                <Lock className="h-3.5 w-3.5 text-parchment-500" />
              ) : (
                <Unlock className="h-3.5 w-3.5 text-ink-500" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {layer.locked ? 'Unlock layer' : 'Lock layer'}
          </TooltipContent>
        </Tooltip>

        {/* Layer type icon */}
        <span className="text-sm shrink-0" title={layer.type}>
          {LAYER_TYPE_ICONS[layer.type]}
        </span>

        {/* Layer name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-ink-700 text-parchment-100 text-sm px-1 py-0.5 rounded outline-none focus:ring-1 focus:ring-parchment-400"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 text-sm text-parchment-200 truncate"
            onDoubleClick={handleDoubleClick}
          >
            {layer.name}
          </span>
        )}

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Layer Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => moveLayer(layer.id, 'up')}>
              <ChevronUp className="h-4 w-4 mr-2" />
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => moveLayer(layer.id, 'down')}>
              <ChevronDown className="h-4 w-4 mr-2" />
              Move Down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => duplicateLayer(layer.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => deleteLayer(layer.id)}
              className="text-red-400 focus:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded controls (when selected) */}
      {isSelected && (
        <div className="px-2 pb-2 space-y-2">
          {/* Opacity slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-400 w-14">Opacity</span>
            <Slider
              value={[layer.opacity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => setLayerOpacity(layer.id, value / 100)}
              className="flex-1"
            />
            <span className="text-xs text-parchment-300 w-8 text-right">
              {Math.round(layer.opacity * 100)}%
            </span>
          </div>

          {/* Blend mode dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-400 w-14">Blend</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 justify-between h-7 text-xs"
                >
                  {BLEND_MODES.find((m) => m.value === layer.blendMode)?.label}
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-60 overflow-auto">
                {BLEND_MODES.map((mode) => (
                  <DropdownMenuItem
                    key={mode.value}
                    onClick={() => setLayerBlendMode(layer.id, mode.value)}
                    className={cn(
                      layer.blendMode === mode.value && 'bg-ink-700'
                    )}
                  >
                    {mode.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}

export function LayerPanel() {
  const { layers, rootOrder, selectedIds, activeId, createLayer } =
    useLayerStore();

  const handleAddLayer = useCallback(
    (type: LayerType) => {
      createLayer({ type });
    },
    [createLayer]
  );

  // Get layers in reverse order (top layer first in UI)
  const orderedLayers = [...rootOrder].reverse().map((id) => layers[id]).filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-ink-900 border-l border-ink-700">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-700">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-parchment-400" />
          <span className="text-sm font-medium text-parchment-200">Layers</span>
        </div>

        {/* Add layer dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Add Layer</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAddLayer('terrain')}>
              {LAYER_TYPE_ICONS.terrain} Terrain
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddLayer('water')}>
              {LAYER_TYPE_ICONS.water} Water
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddLayer('feature')}>
              {LAYER_TYPE_ICONS.feature} Features
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddLayer('icon')}>
              {LAYER_TYPE_ICONS.icon} Icons
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddLayer('path')}>
              {LAYER_TYPE_ICONS.path} Paths
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddLayer('label')}>
              {LAYER_TYPE_ICONS.label} Labels
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAddLayer('effect')}>
              {LAYER_TYPE_ICONS.effect} Effect
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddLayer('reference')}>
              {LAYER_TYPE_ICONS.reference} Reference
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Layer list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {orderedLayers.length === 0 ? (
            <div className="text-center py-8 text-ink-500 text-sm">
              No layers yet.
              <br />
              Click + to add a layer.
            </div>
          ) : (
            orderedLayers.map((layer) => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isSelected={selectedIds.includes(layer.id)}
                isActive={activeId === layer.id}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer with layer count */}
      <div className="px-3 py-1.5 border-t border-ink-700 text-xs text-ink-400">
        {orderedLayers.length} layer{orderedLayers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
```

#### 2.6.2 src/components/layout/index.ts

```typescript
export { LayerPanel } from './LayerPanel';
export { AppShell } from './AppShell';
export { Toolbar } from './Toolbar';
export { PropertiesPanel } from './PropertiesPanel';
export { StatusBar } from './StatusBar';
```

---

### 2.7 Layout Components

#### 2.7.1 src/components/layout/AppShell.tsx

```typescript
import React from 'react';
import { cn } from '@/utils';

interface AppShellProps {
  toolbar?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  statusBar?: React.ReactNode;
  children: React.ReactNode;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
}

export function AppShell({
  toolbar,
  leftPanel,
  rightPanel,
  statusBar,
  children,
  leftPanelOpen = true,
  rightPanelOpen = true,
}: AppShellProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-ink-950">
      {/* Toolbar */}
      {toolbar && (
        <div className="h-toolbar shrink-0 border-b border-ink-700">
          {toolbar}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        {leftPanel && (
          <div
            className={cn(
              'shrink-0 transition-all duration-200 overflow-hidden',
              leftPanelOpen ? 'w-panel' : 'w-0'
            )}
          >
            {leftPanel}
          </div>
        )}

        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">{children}</div>

        {/* Right panel */}
        {rightPanel && (
          <div
            className={cn(
              'shrink-0 transition-all duration-200 overflow-hidden',
              rightPanelOpen ? 'w-panel' : 'w-0'
            )}
          >
            {rightPanel}
          </div>
        )}
      </div>

      {/* Status bar */}
      {statusBar && (
        <div className="h-7 shrink-0 border-t border-ink-700">{statusBar}</div>
      )}
    </div>
  );
}
```

#### 2.7.2 src/components/layout/Toolbar.tsx

```typescript
import React from 'react';
import {
  MousePointer2,
  Hand,
  Brush,
  Eraser,
  Square,
  Spline,
  PaintBucket,
  Stamp,
  Type,
  Pipette,
  Grid3X3,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
} from 'lucide-react';
import { useToolStore, useCanvasStore } from '@/stores';
import {
  Button,
  Toggle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui';
import { cn } from '@/utils';
import type { ToolType } from '@/types';

const TOOLS: { type: ToolType; icon: React.ElementType; label: string; shortcut?: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { type: 'brush', icon: Brush, label: 'Brush', shortcut: 'B' },
  { type: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { type: 'shape', icon: Square, label: 'Shape', shortcut: 'U' },
  { type: 'path', icon: Spline, label: 'Path', shortcut: 'P' },
  { type: 'fill', icon: PaintBucket, label: 'Fill', shortcut: 'G' },
  { type: 'stamp', icon: Stamp, label: 'Stamp', shortcut: 'S' },
  { type: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { type: 'eyedropper', icon: Pipette, label: 'Eyedropper', shortcut: 'I' },
];

interface ToolbarProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitToCanvas?: () => void;
  onResetCamera?: () => void;
  onExport?: () => void;
}

export function Toolbar({
  onZoomIn,
  onZoomOut,
  onFitToCanvas,
  onResetCamera,
  onExport,
}: ToolbarProps) {
  const { activeTool, setActiveTool } = useToolStore();
  const { grid, toggleGrid, toggleSnapToGrid } = useCanvasStore();

  return (
    <div className="h-full flex items-center justify-between px-2 bg-ink-900">
      {/* Left: Tools */}
      <div className="flex items-center gap-1">
        {TOOLS.map(({ type, icon: Icon, label, shortcut }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Toggle
                pressed={activeTool === type}
                onPressedChange={() => setActiveTool(type)}
                size="sm"
                className="h-8 w-8"
              >
                <Icon className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {label}
              {shortcut && (
                <span className="ml-2 text-ink-400 text-xs">({shortcut})</span>
              )}
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-ink-700 mx-2" />

        {/* Grid controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={grid.visible}
              onPressedChange={toggleGrid}
              size="sm"
              className="h-8 w-8"
            >
              <Grid3X3 className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Toggle Grid (G)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={grid.snapToGrid}
              onPressedChange={toggleSnapToGrid}
              size="sm"
              className="h-8 w-8"
            >
              <Magnet className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Snap to Grid</TooltipContent>
        </Tooltip>
      </div>

      {/* Center: Title */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-lg font-display text-parchment-300">
          Planet Planner
        </span>
      </div>

      {/* Right: View controls */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out (-)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In (+)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onFitToCanvas}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Canvas (0)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onResetCamera}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset View</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-ink-700 mx-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export Map</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
```

#### 2.7.3 src/components/layout/PropertiesPanel.tsx

```typescript
import React from 'react';
import { Settings2 } from 'lucide-react';
import { useToolStore } from '@/stores';
import { Slider, ScrollArea } from '@/components/ui';
import type { BrushToolOptions } from '@/types';

export function PropertiesPanel() {
  const { activeTool, options, setToolOptions } = useToolStore();
  const toolOptions = options[activeTool] as BrushToolOptions;

  return (
    <div className="flex flex-col h-full bg-ink-900 border-l border-ink-700">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-ink-700">
        <Settings2 className="h-4 w-4 text-parchment-400" />
        <span className="text-sm font-medium text-parchment-200">
          Tool Options
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Size</span>
              <span className="text-xs text-parchment-300">
                {toolOptions.size}px
              </span>
            </div>
            <Slider
              value={[toolOptions.size]}
              min={1}
              max={200}
              step={1}
              onValueChange={([value]) =>
                setToolOptions(activeTool, { size: value })
              }
            />
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Opacity</span>
              <span className="text-xs text-parchment-300">
                {Math.round(toolOptions.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[toolOptions.opacity * 100]}
              min={1}
              max={100}
              step={1}
              onValueChange={([value]) =>
                setToolOptions(activeTool, { opacity: value / 100 })
              }
            />
          </div>

          {/* Hardness (for brush/eraser) */}
          {('hardness' in toolOptions) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Hardness</span>
                <span className="text-xs text-parchment-300">
                  {Math.round((toolOptions as BrushToolOptions).hardness * 100)}%
                </span>
              </div>
              <Slider
                value={[(toolOptions as BrushToolOptions).hardness * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  setToolOptions(activeTool, { hardness: value / 100 })
                }
              />
            </div>
          )}

          {/* Colors */}
          <div className="space-y-2">
            <span className="text-xs text-ink-400">Colors</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={toolOptions.primaryColor}
                  onChange={(e) =>
                    setToolOptions(activeTool, { primaryColor: e.target.value })
                  }
                  className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                />
                <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500">
                  Primary
                </span>
              </div>
              <div className="relative">
                <input
                  type="color"
                  value={toolOptions.secondaryColor}
                  onChange={(e) =>
                    setToolOptions(activeTool, { secondaryColor: e.target.value })
                  }
                  className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                />
                <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500">
                  Secondary
                </span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
```

#### 2.7.4 src/components/layout/StatusBar.tsx

```typescript
import React from 'react';
import { useCanvasStore } from '@/stores';

interface StatusBarProps {
  cursorPosition?: { x: number; y: number };
}

export function StatusBar({ cursorPosition }: StatusBarProps) {
  const { viewport, dimensions } = useCanvasStore();

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div className="h-full flex items-center justify-between px-3 bg-ink-900 text-xs text-ink-400">
      {/* Left: Cursor position */}
      <div className="flex items-center gap-4">
        {cursorPosition && (
          <span>
            X: {Math.round(cursorPosition.x)} Y: {Math.round(cursorPosition.y)}
          </span>
        )}
      </div>

      {/* Center: Canvas info */}
      <div className="flex items-center gap-4">
        <span>
          Canvas: {dimensions.width} × {dimensions.height}
        </span>
      </div>

      {/* Right: Zoom */}
      <div className="flex items-center gap-4">
        <span>Zoom: {zoomPercent}%</span>
      </div>
    </div>
  );
}
```

---

### 2.8 Canvas Container Component

#### 2.8.1 src/components/canvas/CanvasContainer.tsx

```typescript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEngine } from '@/core';
import { useCanvasStore, useLayerStore } from '@/stores';
import type { Vector2 } from '@/types';

interface CanvasContainerProps {
  onEngineReady?: (engine: CanvasEngine) => void;
  onCursorMove?: (position: Vector2) => void;
}

export function CanvasContainer({ onEngineReady, onCursorMove }: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { setViewport, grid, setGrid } = useCanvasStore();
  const layerState = useLayerStore();

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;

    const engine = new CanvasEngine();
    engineRef.current = engine;

    engine
      .init(
        containerRef.current,
        {
          width: 4096,
          height: 4096,
          gridConfig: grid,
        },
        {
          onViewportChange: (viewport) => {
            setViewport(viewport);
          },
          onGridChange: (config) => {
            setGrid(config);
          },
          onPointerMove: (screen, world) => {
            onCursorMove?.(world);
          },
        }
      )
      .then(() => {
        setIsReady(true);
        onEngineReady?.(engine);
      });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync grid config
  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.setGridConfig(grid);
    }
  }, [isReady, grid]);

  // Sync layer state
  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.syncLayerState(layerState);
    }
  }, [isReady, layerState.layers, layerState.rootOrder]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-ink-950"
      style={{ touchAction: 'none' }}
    />
  );
}
```

#### 2.8.2 src/components/canvas/index.ts

```typescript
export { CanvasContainer } from './CanvasContainer';
```

---

### 2.9 Main App Component

#### 2.9.1 src/App.tsx

```typescript
import React, { useState, useCallback, useRef } from 'react';
import { TooltipProvider } from '@/components/ui';
import {
  AppShell,
  Toolbar,
  LayerPanel,
  PropertiesPanel,
  StatusBar,
} from '@/components/layout';
import { CanvasContainer } from '@/components/canvas';
import { CanvasEngine } from '@/core';
import type { Vector2 } from '@/types';

export default function App() {
  const engineRef = useRef<CanvasEngine | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Vector2>({ x: 0, y: 0 });
  const [leftPanelOpen] = useState(true);
  const [rightPanelOpen] = useState(true);

  const handleEngineReady = useCallback((engine: CanvasEngine) => {
    engineRef.current = engine;
    // Fit to canvas on initial load
    engine.fitToCanvas();
  }, []);

  const handleCursorMove = useCallback((position: Vector2) => {
    setCursorPosition(position);
  }, []);

  const handleZoomIn = useCallback(() => {
    const viewport = engineRef.current?.getViewport();
    if (viewport) {
      engineRef.current?.setZoom(viewport.zoom * 1.25);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const viewport = engineRef.current?.getViewport();
    if (viewport) {
      engineRef.current?.setZoom(viewport.zoom * 0.8);
    }
  }, []);

  const handleFitToCanvas = useCallback(() => {
    engineRef.current?.fitToCanvas();
  }, []);

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCamera();
  }, []);

  const handleExport = useCallback(async () => {
    const blob = await engineRef.current?.exportToImage('png');
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'planet-planner-map.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell
        toolbar={
          <Toolbar
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToCanvas={handleFitToCanvas}
            onResetCamera={handleResetCamera}
            onExport={handleExport}
          />
        }
        leftPanel={<PropertiesPanel />}
        rightPanel={<LayerPanel />}
        statusBar={<StatusBar cursorPosition={cursorPosition} />}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
      >
        <CanvasContainer
          onEngineReady={handleEngineReady}
          onCursorMove={handleCursorMove}
        />
      </AppShell>
    </TooltipProvider>
  );
}
```

---

### 2.10 Styles

#### 2.10.1 src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Cinzel:wght@400;500;600;700&family=IM+Fell+English:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-ink-700;
  }

  body {
    @apply bg-ink-950 text-parchment-200 font-body;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-ink-900;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-ink-600 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-ink-500;
  }

  /* Color input styling */
  input[type='color'] {
    -webkit-appearance: none;
    border: none;
    padding: 0;
  }

  input[type='color']::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }
}

@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

---

### 2.11 Entry Point

#### 2.11.1 src/main.tsx

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### 2.11.2 index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Planet Planner - Fantasy World Map Builder" />
    <title>Planet Planner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### 2.12 Additional Dependencies

Add these to your package.json if not already present:

```bash
npm install zustand immer
npm install @radix-ui/react-slider @radix-ui/react-toggle @radix-ui/react-tooltip
npm install @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area @radix-ui/react-slot
```

Also install the Immer middleware for Zustand:

```bash
npm install immer
```

Update **src/stores/useCanvasStore.ts** and others to use the immer middleware:

```typescript
import { immer } from 'zustand/middleware/immer';
```

---

### 2.13 Verification Checklist for Phase 2

After implementing Phase 2, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ Canvas renders with parchment texture overlay
□ Parchment has visible paper grain and color variation
□ Layer panel displays on the right side
□ Can add new layers of different types
□ Can toggle layer visibility (eye icon)
□ Can toggle layer lock (lock icon)
□ Layer opacity slider works
□ Blend mode dropdown works
□ Can rename layers by double-clicking
□ Can delete and duplicate layers
□ Can reorder layers (move up/down)
□ Selected layer has visual highlight
□ Tool options panel shows on the left
□ Tool size and opacity sliders work
□ Color pickers work
□ Status bar shows cursor position and zoom
□ Toolbar zoom controls work
□ Export button downloads PNG
□ Pan with Alt+drag or middle mouse
□ Zoom with scroll wheel
□ Grid toggles on/off
□ Snap to grid toggles on/off
```

---

## Summary

Phase 2 establishes:

1. **Layer System** - Full CRUD operations with visual sync to Pixi.js
2. **Parchment Generation** - Procedural textures with noise-based patterns
3. **Render Pipeline** - Compositing layers with blend modes and effects
4. **Layer Panel UI** - Complete layer management interface
5. **Tool Properties Panel** - Size, opacity, color controls
6. **App Shell Layout** - Responsive toolbar, panels, status bar

