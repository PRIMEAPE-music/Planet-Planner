# PHASE 7: Feature Tools (Mountains, Forests, Water)

## Detailed Instructional Guide for Claude Code

---

## Overview

Phase 7 implements manual tools for placing and editing map features:
- Mountain stamp tool for placing individual peaks
- Mountain path tool for drawing ranges
- Forest brush with procedural tree variation
- River spline tool for drawing waterways
- Lake shape tool for creating water bodies
- Feature eraser and modification tools
- Selection and transform tools for features
- Integration with undo/redo system

---

## 7.1 Feature Tool Types

### 7.1.1 src/core/tools/features/types.ts

**Instruction for Claude Code:**
> Create a new file at `src/core/tools/features/types.ts`. This defines all types for feature editing tools.

```typescript
import type { Vector2 } from '@/types';
import type { MountainPeak, River, Lake, ForestRegion } from '@/core/generation/features/types';

/**
 * Feature tool types
 */
export type FeatureToolType =
  | 'mountain-stamp'
  | 'mountain-path'
  | 'forest-brush'
  | 'river-spline'
  | 'lake-shape'
  | 'feature-eraser'
  | 'feature-select';

/**
 * Mountain stamp tool settings
 */
export interface MountainStampSettings {
  /** Peak elevation (0-1) */
  elevation: number;
  /** Peak radius */
  radius: number;
  /** Peak sharpness (0 = rounded, 1 = sharp) */
  sharpness: number;
  /** Add snow cap */
  snowCap: boolean;
  /** Randomize slightly on each stamp */
  randomize: boolean;
  /** Randomization amount */
  randomAmount: number;
}

/**
 * Mountain path tool settings
 */
export interface MountainPathSettings {
  /** Range width */
  width: number;
  /** Peak elevation range */
  elevationRange: { min: number; max: number };
  /** Peaks per 100 units of path */
  peakDensity: number;
  /** Roughness/jaggedness */
  roughness: number;
  /** Smooth path */
  smoothPath: boolean;
}

/**
 * Forest brush tool settings
 */
export interface ForestBrushSettings {
  /** Brush radius */
  radius: number;
  /** Tree density (0-1) */
  density: number;
  /** Forest type */
  forestType: 'deciduous' | 'coniferous' | 'tropical' | 'mixed' | 'auto';
  /** Variation in tree placement */
  variation: number;
  /** Soft brush edges */
  softEdge: boolean;
  /** Edge falloff */
  edgeFalloff: number;
}

/**
 * River spline tool settings
 */
export interface RiverSplineSettings {
  /** Starting width */
  startWidth: number;
  /** Ending width */
  endWidth: number;
  /** Smooth spline */
  smooth: boolean;
  /** Smoothing tension */
  tension: number;
  /** Add tributaries automatically */
  autoTributaries: boolean;
  /** Erode terrain under river */
  erode: boolean;
  /** Erosion depth */
  erosionDepth: number;
}

/**
 * Lake shape tool settings
 */
export interface LakeShapeSettings {
  /** Lake type */
  type: 'freeform' | 'ellipse' | 'rectangle';
  /** Smooth edges */
  smoothEdges: boolean;
  /** Edge noise */
  edgeNoise: number;
  /** Lake depth */
  depth: number;
  /** Add waves pattern (parchment style) */
  wavePattern: boolean;
}

/**
 * Feature eraser tool settings
 */
export interface FeatureEraserSettings {
  /** Eraser radius */
  radius: number;
  /** What to erase */
  targets: {
    mountains: boolean;
    rivers: boolean;
    lakes: boolean;
    forests: boolean;
  };
  /** Soft erase (gradual removal) */
  soft: boolean;
}

/**
 * Feature selection state
 */
export interface FeatureSelection {
  /** Selected feature type */
  type: 'mountain' | 'river' | 'lake' | 'forest' | null;
  /** Selected feature ID */
  id: string | null;
  /** Selection bounds */
  bounds: { x: number; y: number; width: number; height: number } | null;
  /** Transform handles */
  handles: Vector2[];
}

/**
 * Spline point for river/path tools
 */
export interface SplinePoint {
  /** Position */
  position: Vector2;
  /** Control point 1 (for bezier) */
  control1?: Vector2;
  /** Control point 2 (for bezier) */
  control2?: Vector2;
  /** Width at this point */
  width?: number;
  /** Is this a corner (sharp) or smooth point */
  isCorner?: boolean;
}

/**
 * Active spline being edited
 */
export interface ActiveSpline {
  /** Spline points */
  points: SplinePoint[];
  /** Is closed (loop) */
  closed: boolean;
  /** Currently selected point index */
  selectedPoint: number | null;
  /** Currently dragging control handle */
  draggingHandle: 'control1' | 'control2' | null;
}

/**
 * Feature edit operation for undo/redo
 */
export interface FeatureEditOperation {
  /** Operation type */
  type: 'add' | 'remove' | 'modify' | 'transform';
  /** Feature type */
  featureType: 'mountain' | 'river' | 'lake' | 'forest';
  /** Feature ID */
  featureId: string;
  /** Previous state (for undo) */
  previousState: any;
  /** New state (for redo) */
  newState: any;
  /** Timestamp */
  timestamp: number;
}

/**
 * Feature tool context
 */
export interface FeatureToolContext {
  /** Current tool settings */
  settings: any;
  /** Active spline (for spline tools) */
  activeSpline: ActiveSpline | null;
  /** Current selection */
  selection: FeatureSelection;
  /** Preview graphics */
  previewVisible: boolean;
}
```

---

## 7.2 Feature Tool Base Class

### 7.2.1 src/core/tools/features/FeatureTool.ts

**Instruction for Claude Code:**
> Create the base feature tool class at `src/core/tools/features/FeatureTool.ts`. This extends the existing tool system for feature-specific functionality.

```typescript
import { Graphics, Container } from 'pixi.js';
import { BaseTool } from '../BaseTool';
import type { ToolContext, ToolCursor } from '../types';
import type { FeatureToolContext, FeatureSelection, FeatureEditOperation } from './types';
import type { Vector2 } from '@/types';

/**
 * Base class for feature editing tools
 */
export abstract class FeatureTool extends BaseTool {
  protected previewGraphics: Graphics;
  protected featureContext: FeatureToolContext;
  protected editHistory: FeatureEditOperation[] = [];
  protected historyIndex: number = -1;

  constructor(id: string, name: string, icon: string, parentContainer: Container) {
    super(id, name, icon);

    // Create preview graphics layer
    this.previewGraphics = new Graphics();
    this.previewGraphics.label = `${id}-preview`;
    this.previewGraphics.zIndex = 1000;
    parentContainer.addChild(this.previewGraphics);

    this.featureContext = {
      settings: {},
      activeSpline: null,
      selection: {
        type: null,
        id: null,
        bounds: null,
        handles: [],
      },
      previewVisible: true,
    };
  }

  /**
   * Get default cursor for feature tools
   */
  getCursor(): ToolCursor {
    return {
      type: 'crosshair',
      showSizeIndicator: true,
      sizeRadius: this.getBrushRadius(),
    };
  }

  /**
   * Get current brush/tool radius (override in subclasses)
   */
  protected getBrushRadius(): number {
    return 20;
  }

  /**
   * Update preview graphics
   */
  protected abstract updatePreview(ctx: ToolContext): void;

  /**
   * Clear preview graphics
   */
  protected clearPreview(): void {
    this.previewGraphics.clear();
  }

  /**
   * Show/hide preview
   */
  setPreviewVisible(visible: boolean): void {
    this.featureContext.previewVisible = visible;
    this.previewGraphics.visible = visible;
  }

  /**
   * Record edit operation for undo/redo
   */
  protected recordEdit(operation: Omit<FeatureEditOperation, 'timestamp'>): void {
    const fullOperation: FeatureEditOperation = {
      ...operation,
      timestamp: Date.now(),
    };

    // Remove any operations after current index (branching history)
    this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);
    this.editHistory.push(fullOperation);
    this.historyIndex = this.editHistory.length - 1;

    // Emit edit event
    this.emit('edit', fullOperation);
  }

  /**
   * Undo last operation
   */
  undo(): FeatureEditOperation | null {
    if (this.historyIndex < 0) return null;

    const operation = this.editHistory[this.historyIndex];
    this.historyIndex--;

    return operation;
  }

  /**
   * Redo last undone operation
   */
  redo(): FeatureEditOperation | null {
    if (this.historyIndex >= this.editHistory.length - 1) return null;

    this.historyIndex++;
    return this.editHistory[this.historyIndex];
  }

  /**
   * Check if point is near a feature
   */
  protected findFeatureAt(
    position: Vector2,
    features: { mountains: any[]; rivers: any[]; lakes: any[]; forests: any[] },
    tolerance: number = 10
  ): { type: string; id: string; feature: any } | null {
    // Check mountains
    for (const peak of features.mountains || []) {
      const dist = this.distance(position, peak.position);
      if (dist <= peak.radius + tolerance) {
        return { type: 'mountain', id: peak.id || '', feature: peak };
      }
    }

    // Check rivers
    for (const river of features.rivers || []) {
      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths?.[i] || 2;
        const dist = this.distance(position, point);
        if (dist <= width + tolerance) {
          return { type: 'river', id: river.id, feature: river };
        }
      }
    }

    // Check lakes
    for (const lake of features.lakes || []) {
      if (this.isPointInPolygon(position, lake.boundary)) {
        return { type: 'lake', id: lake.id, feature: lake };
      }
    }

    // Check forests
    for (const forest of features.forests || []) {
      if (this.isPointInPolygon(position, forest.boundary)) {
        return { type: 'forest', id: forest.id, feature: forest };
      }
    }

    return null;
  }

  /**
   * Calculate distance between two points
   */
  protected distance(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Check if point is inside polygon
   */
  protected isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Generate unique ID
   */
  protected generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Cleanup on deactivate
   */
  onDeactivate(): void {
    this.clearPreview();
    this.featureContext.activeSpline = null;
    this.featureContext.selection = {
      type: null,
      id: null,
      bounds: null,
      handles: [],
    };
  }

  /**
   * Destroy tool
   */
  destroy(): void {
    this.previewGraphics.destroy();
  }
}
```

---

## 7.3 Mountain Stamp Tool

### 7.3.1 src/core/tools/features/MountainStampTool.ts

**Instruction for Claude Code:**
> Create the mountain stamp tool at `src/core/tools/features/MountainStampTool.ts`. This allows placing individual mountain peaks.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { MountainStampSettings } from './types';
import type { MountainPeak } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Default mountain stamp settings
 */
export const DEFAULT_MOUNTAIN_STAMP_SETTINGS: MountainStampSettings = {
  elevation: 0.8,
  radius: 30,
  sharpness: 0.5,
  snowCap: true,
  randomize: true,
  randomAmount: 0.2,
};

/**
 * Tool for stamping individual mountain peaks
 */
export class MountainStampTool extends FeatureTool {
  private settings: MountainStampSettings;
  private onPeakCreated: ((peak: MountainPeak) => void) | null = null;

  constructor(parentContainer: Container) {
    super('mountain-stamp', 'Mountain Stamp', 'mountain', parentContainer);
    this.settings = { ...DEFAULT_MOUNTAIN_STAMP_SETTINGS };
  }

  /**
   * Set callback for when peak is created
   */
  setOnPeakCreated(callback: (peak: MountainPeak) => void): void {
    this.onPeakCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): MountainStampSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<MountainStampSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get brush radius for cursor
   */
  protected getBrushRadius(): number {
    return this.settings.radius;
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return {
      type: 'crosshair',
      showSizeIndicator: true,
      sizeRadius: this.settings.radius,
    };
  }

  /**
   * Handle pointer down - stamp a peak
   */
  onPointerDown(ctx: ToolContext): void {
    const peak = this.createPeak(ctx.worldPosition);
    
    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'mountain',
      featureId: peak.rangeId || this.generateId('peak'),
      previousState: null,
      newState: peak,
    });

    // Notify listeners
    this.onPeakCreated?.(peak);
  }

  /**
   * Handle pointer move - update preview
   */
  onPointerMove(ctx: ToolContext): void {
    this.updatePreview(ctx);
  }

  /**
   * Create a mountain peak at position
   */
  private createPeak(position: Vector2): MountainPeak {
    const { elevation, radius, sharpness, randomize, randomAmount } = this.settings;

    // Apply randomization if enabled
    let finalElevation = elevation;
    let finalRadius = radius;
    let finalSharpness = sharpness;

    if (randomize) {
      const randOffset = () => (Math.random() - 0.5) * 2 * randomAmount;
      finalElevation = Math.max(0.5, Math.min(0.98, elevation + randOffset() * 0.2));
      finalRadius = Math.max(10, radius + randOffset() * radius);
      finalSharpness = Math.max(0, Math.min(1, sharpness + randOffset() * 0.3));
    }

    return {
      position: { ...position },
      elevation: finalElevation,
      radius: finalRadius,
      sharpness: finalSharpness,
    };
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { radius, elevation, sharpness } = this.settings;

    // Draw mountain preview
    const height = radius * elevation * 1.5;
    const baseWidth = radius * 0.6;

    // Filled triangle
    this.previewGraphics
      .moveTo(worldPosition.x, worldPosition.y - height)
      .lineTo(worldPosition.x - baseWidth, worldPosition.y + radius * 0.3)
      .lineTo(worldPosition.x + baseWidth, worldPosition.y + radius * 0.3)
      .closePath()
      .fill({ color: 0x8b7355, alpha: 0.3 })
      .stroke({ width: 2, color: 0x5c4d3d, alpha: 0.8 });

    // Snow cap preview if enabled
    if (this.settings.snowCap && elevation > 0.7) {
      const snowHeight = height * 0.25;
      this.previewGraphics
        .moveTo(worldPosition.x, worldPosition.y - height)
        .lineTo(worldPosition.x - baseWidth * 0.3, worldPosition.y - height + snowHeight)
        .lineTo(worldPosition.x + baseWidth * 0.3, worldPosition.y - height + snowHeight)
        .closePath()
        .fill({ color: 0xffffff, alpha: 0.5 });
    }

    // Radius indicator
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, radius)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  }
}
```

---

## 7.4 Mountain Path Tool

### 7.4.1 src/core/tools/features/MountainPathTool.ts

**Instruction for Claude Code:**
> Create the mountain path tool at `src/core/tools/features/MountainPathTool.ts`. This allows drawing mountain ranges along a path.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { MountainPathSettings, SplinePoint, ActiveSpline } from './types';
import type { MountainRange, MountainPeak } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';
import { SimplexNoise } from '@/core/generation/noise';

/**
 * Default mountain path settings
 */
export const DEFAULT_MOUNTAIN_PATH_SETTINGS: MountainPathSettings = {
  width: 40,
  elevationRange: { min: 0.7, max: 0.9 },
  peakDensity: 8,
  roughness: 0.5,
  smoothPath: true,
};

/**
 * Tool for drawing mountain ranges along a path
 */
export class MountainPathTool extends FeatureTool {
  private settings: MountainPathSettings;
  private noise: SimplexNoise;
  private isDrawing: boolean = false;
  private pathPoints: Vector2[] = [];
  private onRangeCreated: ((range: MountainRange) => void) | null = null;

  constructor(parentContainer: Container) {
    super('mountain-path', 'Mountain Range', 'trending-up', parentContainer);
    this.settings = { ...DEFAULT_MOUNTAIN_PATH_SETTINGS };
    this.noise = new SimplexNoise(Date.now());
  }

  /**
   * Set callback for when range is created
   */
  setOnRangeCreated(callback: (range: MountainRange) => void): void {
    this.onRangeCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): MountainPathSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<MountainPathSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get brush radius for cursor
   */
  protected getBrushRadius(): number {
    return this.settings.width / 2;
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return {
      type: 'crosshair',
      showSizeIndicator: true,
      sizeRadius: this.settings.width / 2,
    };
  }

  /**
   * Handle pointer down - start drawing path
   */
  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.pathPoints = [{ ...ctx.worldPosition }];
  }

  /**
   * Handle pointer move - continue path or update preview
   */
  onPointerMove(ctx: ToolContext): void {
    if (this.isDrawing) {
      // Add point if far enough from last point
      const lastPoint = this.pathPoints[this.pathPoints.length - 1];
      const dist = this.distance(ctx.worldPosition, lastPoint);
      
      if (dist > 5) {
        this.pathPoints.push({ ...ctx.worldPosition });
      }
    }
    
    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up - finish path and create range
   */
  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing || this.pathPoints.length < 2) {
      this.isDrawing = false;
      this.pathPoints = [];
      this.clearPreview();
      return;
    }

    // Smooth path if enabled
    let finalPath = this.pathPoints;
    if (this.settings.smoothPath) {
      finalPath = this.smoothPath(this.pathPoints);
    }

    // Create mountain range
    const range = this.createRange(finalPath);

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'mountain',
      featureId: range.id,
      previousState: null,
      newState: range,
    });

    // Notify listeners
    this.onRangeCreated?.(range);

    // Reset
    this.isDrawing = false;
    this.pathPoints = [];
    this.clearPreview();
  }

  /**
   * Smooth path using Catmull-Rom spline
   */
  private smoothPath(points: Vector2[]): Vector2[] {
    if (points.length < 3) return points;

    const smoothed: Vector2[] = [];
    const tension = 0.5;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Add intermediate points
      for (let t = 0; t < 1; t += 0.2) {
        const x = this.catmullRom(p0.x, p1.x, p2.x, p3.x, t, tension);
        const y = this.catmullRom(p0.y, p1.y, p2.y, p3.y, t, tension);
        smoothed.push({ x, y });
      }
    }

    // Add last point
    smoothed.push(points[points.length - 1]);

    return smoothed;
  }

  /**
   * Catmull-Rom spline interpolation
   */
  private catmullRom(
    p0: number,
    p1: number,
    p2: number,
    p3: number,
    t: number,
    tension: number
  ): number {
    const t2 = t * t;
    const t3 = t2 * t;

    const s = (1 - tension) / 2;

    const b0 = s * (-t3 + 2 * t2 - t);
    const b1 = s * (-t3 + t2) + (2 * t3 - 3 * t2 + 1);
    const b2 = s * (t3 - 2 * t2 + t) + (-2 * t3 + 3 * t2);
    const b3 = s * (t3 - t2);

    return b0 * p0 + b1 * p1 + b2 * p2 + b3 * p3;
  }

  /**
   * Create mountain range from path
   */
  private createRange(spine: Vector2[]): MountainRange {
    const id = this.generateId('range');
    const { width, elevationRange, peakDensity, roughness } = this.settings;

    // Calculate total path length
    let totalLength = 0;
    for (let i = 1; i < spine.length; i++) {
      totalLength += this.distance(spine[i], spine[i - 1]);
    }

    // Generate widths along spine (taper at ends)
    const widths: number[] = spine.map((_, i) => {
      const t = i / (spine.length - 1);
      const taper = Math.sin(t * Math.PI);
      return width * (0.3 + taper * 0.7);
    });

    // Generate elevations along spine
    const elevations: number[] = spine.map((_, i) => {
      const t = i / (spine.length - 1);
      const noiseVal = this.noise.noise2D(i * 0.1, 0) * 0.5 + 0.5;
      const taper = Math.sin(t * Math.PI);
      return elevationRange.min + noiseVal * taper * (elevationRange.max - elevationRange.min);
    });

    // Calculate peak count based on path length
    const peakCount = Math.max(2, Math.floor((totalLength / 100) * peakDensity));

    // Generate peaks along spine
    const peaks = this.generatePeaksAlongSpine(spine, widths, elevations, peakCount, id);

    return {
      id,
      spine,
      widths,
      elevations,
      roughness,
      peakCount,
      peaks,
    };
  }

  /**
   * Generate peaks distributed along spine
   */
  private generatePeaksAlongSpine(
    spine: Vector2[],
    widths: number[],
    elevations: number[],
    peakCount: number,
    rangeId: string
  ): MountainPeak[] {
    const peaks: MountainPeak[] = [];

    for (let i = 0; i < peakCount; i++) {
      // Distribute peaks along spine
      const t = (i + 0.5 + (Math.random() - 0.5) * 0.3) / peakCount;
      const spineIndex = Math.min(
        spine.length - 1,
        Math.floor(t * spine.length)
      );

      const spinePoint = spine[spineIndex];
      const spineWidth = widths[spineIndex];
      const baseElevation = elevations[spineIndex];

      // Offset from spine
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * spineWidth * 0.3;

      const position = {
        x: spinePoint.x + Math.cos(offsetAngle) * offsetDist,
        y: spinePoint.y + Math.sin(offsetAngle) * offsetDist,
      };

      // Peak properties
      const elevation = Math.min(
        0.98,
        baseElevation + (Math.random() - 0.5) * 0.1
      );
      const radius = spineWidth * (0.3 + Math.random() * 0.4);
      const sharpness = 0.3 + Math.random() * this.settings.roughness * 0.5;

      peaks.push({
        position,
        elevation,
        radius,
        sharpness,
        rangeId,
      });
    }

    return peaks;
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { width } = this.settings;

    if (this.isDrawing && this.pathPoints.length > 0) {
      // Draw path
      this.previewGraphics.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
      
      for (let i = 1; i < this.pathPoints.length; i++) {
        this.previewGraphics.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
      }
      
      // Line to current position
      this.previewGraphics.lineTo(worldPosition.x, worldPosition.y);
      
      this.previewGraphics.stroke({
        width: 2,
        color: 0x8b7355,
        alpha: 0.8,
      });

      // Draw width indicators along path
      const displayPoints = [...this.pathPoints, worldPosition];
      for (let i = 0; i < displayPoints.length; i += 5) {
        const point = displayPoints[i];
        const t = i / displayPoints.length;
        const currentWidth = width * (0.3 + Math.sin(t * Math.PI) * 0.7);
        
        this.previewGraphics
          .circle(point.x, point.y, currentWidth / 2)
          .stroke({ width: 1, color: 0x8b7355, alpha: 0.3 });
      }
    } else {
      // Just show width indicator at cursor
      this.previewGraphics
        .circle(worldPosition.x, worldPosition.y, width / 2)
        .stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    }
  }
}
```

---

## 7.5 Forest Brush Tool

### 7.5.1 src/core/tools/features/ForestBrushTool.ts

**Instruction for Claude Code:**
> Create the forest brush tool at `src/core/tools/features/ForestBrushTool.ts`. This paints forest coverage with procedural tree placement.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { ForestBrushSettings } from './types';
import type { Vector2 } from '@/types';

/**
 * Default forest brush settings
 */
export const DEFAULT_FOREST_BRUSH_SETTINGS: ForestBrushSettings = {
  radius: 40,
  density: 0.7,
  forestType: 'auto',
  variation: 0.3,
  softEdge: true,
  edgeFalloff: 0.3,
};

/**
 * Forest paint stroke data
 */
export interface ForestStroke {
  id: string;
  points: Vector2[];
  radius: number;
  density: number;
  forestType: ForestBrushSettings['forestType'];
}

/**
 * Tool for painting forest areas
 */
export class ForestBrushTool extends FeatureTool {
  private settings: ForestBrushSettings;
  private isDrawing: boolean = false;
  private strokePoints: Vector2[] = [];
  private onForestPainted: ((stroke: ForestStroke) => void) | null = null;

  constructor(parentContainer: Container) {
    super('forest-brush', 'Forest Brush', 'trees', parentContainer);
    this.settings = { ...DEFAULT_FOREST_BRUSH_SETTINGS };
  }

  /**
   * Set callback for when forest is painted
   */
  setOnForestPainted(callback: (stroke: ForestStroke) => void): void {
    this.onForestPainted = callback;
  }

  /**
   * Get settings
   */
  getSettings(): ForestBrushSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<ForestBrushSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get brush radius for cursor
   */
  protected getBrushRadius(): number {
    return this.settings.radius;
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return {
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.settings.radius,
    };
  }

  /**
   * Handle pointer down - start painting
   */
  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.strokePoints = [{ ...ctx.worldPosition }];
    this.applyBrush(ctx.worldPosition);
  }

  /**
   * Handle pointer move - continue painting
   */
  onPointerMove(ctx: ToolContext): void {
    this.updatePreview(ctx);

    if (this.isDrawing) {
      const lastPoint = this.strokePoints[this.strokePoints.length - 1];
      const dist = this.distance(ctx.worldPosition, lastPoint);

      // Add point if moved enough (spacing based on radius)
      const spacing = this.settings.radius * 0.3;
      if (dist >= spacing) {
        this.strokePoints.push({ ...ctx.worldPosition });
        this.applyBrush(ctx.worldPosition);
      }
    }
  }

  /**
   * Handle pointer up - finish stroke
   */
  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing) return;

    const stroke: ForestStroke = {
      id: this.generateId('forest-stroke'),
      points: [...this.strokePoints],
      radius: this.settings.radius,
      density: this.settings.density,
      forestType: this.settings.forestType,
    };

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'forest',
      featureId: stroke.id,
      previousState: null,
      newState: stroke,
    });

    // Notify listeners
    this.onForestPainted?.(stroke);

    // Reset
    this.isDrawing = false;
    this.strokePoints = [];
  }

  /**
   * Apply brush at position (emit event for renderer)
   */
  private applyBrush(position: Vector2): void {
    // Emit brush application event
    this.emit('brush-apply', {
      position,
      radius: this.settings.radius,
      density: this.settings.density,
      softEdge: this.settings.softEdge,
      edgeFalloff: this.settings.edgeFalloff,
      variation: this.settings.variation,
      forestType: this.settings.forestType,
    });
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { radius, density, softEdge, edgeFalloff, variation } = this.settings;

    // Draw brush circle
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, radius)
      .stroke({ width: 2, color: 0x228b22, alpha: 0.8 });

    // Draw soft edge indicator
    if (softEdge) {
      const innerRadius = radius * (1 - edgeFalloff);
      this.previewGraphics
        .circle(worldPosition.x, worldPosition.y, innerRadius)
        .stroke({ width: 1, color: 0x228b22, alpha: 0.4 });
    }

    // Draw tree preview dots
    const treeCount = Math.floor(radius * radius * density * 0.01);
    for (let i = 0; i < Math.min(treeCount, 20); i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const tx = worldPosition.x + Math.cos(angle) * dist;
      const ty = worldPosition.y + Math.sin(angle) * dist;

      // Calculate density falloff for soft edge
      let alpha = 0.5;
      if (softEdge && dist > radius * (1 - edgeFalloff)) {
        alpha *= 1 - (dist - radius * (1 - edgeFalloff)) / (radius * edgeFalloff);
      }

      // Draw small tree symbol
      const treeSize = 3 + Math.random() * variation * 3;
      this.previewGraphics
        .moveTo(tx, ty - treeSize)
        .lineTo(tx - treeSize * 0.5, ty + treeSize * 0.3)
        .lineTo(tx + treeSize * 0.5, ty + treeSize * 0.3)
        .closePath()
        .fill({ color: 0x228b22, alpha });
    }

    // Draw stroke path if drawing
    if (this.isDrawing && this.strokePoints.length > 1) {
      this.previewGraphics.moveTo(this.strokePoints[0].x, this.strokePoints[0].y);
      for (let i = 1; i < this.strokePoints.length; i++) {
        this.previewGraphics.lineTo(this.strokePoints[i].x, this.strokePoints[i].y);
      }
      this.previewGraphics.stroke({
        width: radius * 2,
        color: 0x228b22,
        alpha: 0.2,
        cap: 'round',
        join: 'round',
      });
    }
  }
}
```

---

## 7.6 River Spline Tool

### 7.6.1 src/core/tools/features/RiverSplineTool.ts

**Instruction for Claude Code:**
> Create the river spline tool at `src/core/tools/features/RiverSplineTool.ts`. This draws rivers using bezier curves with control points.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { RiverSplineSettings, SplinePoint, ActiveSpline } from './types';
import type { River } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Default river spline settings
 */
export const DEFAULT_RIVER_SPLINE_SETTINGS: RiverSplineSettings = {
  startWidth: 2,
  endWidth: 8,
  smooth: true,
  tension: 0.5,
  autoTributaries: false,
  erode: true,
  erosionDepth: 0.05,
};

/**
 * River name components for generation
 */
const RIVER_ADJECTIVES = ['Silver', 'Golden', 'Winding', 'Swift', 'Gentle', 'Ancient'];
const RIVER_NOUNS = ['River', 'Stream', 'Creek', 'Waters', 'Run'];

/**
 * Tool for drawing rivers using spline curves
 */
export class RiverSplineTool extends FeatureTool {
  private settings: RiverSplineSettings;
  private activeSpline: ActiveSpline | null = null;
  private hoveredPointIndex: number | null = null;
  private draggingPointIndex: number | null = null;
  private onRiverCreated: ((river: River) => void) | null = null;

  constructor(parentContainer: Container) {
    super('river-spline', 'River', 'waves', parentContainer);
    this.settings = { ...DEFAULT_RIVER_SPLINE_SETTINGS };
  }

  /**
   * Set callback for when river is created
   */
  setOnRiverCreated(callback: (river: River) => void): void {
    this.onRiverCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): RiverSplineSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<RiverSplineSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    if (this.hoveredPointIndex !== null) {
      return { type: 'move' };
    }
    return { type: 'crosshair' };
  }

  /**
   * Handle pointer down
   */
  onPointerDown(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    // Check if clicking on existing point
    if (this.activeSpline) {
      const pointIndex = this.findPointAt(worldPosition);
      if (pointIndex !== null) {
        this.draggingPointIndex = pointIndex;
        this.activeSpline.selectedPoint = pointIndex;
        return;
      }
    }

    // Start new spline or add point
    if (!this.activeSpline) {
      this.activeSpline = {
        points: [],
        closed: false,
        selectedPoint: null,
        draggingHandle: null,
      };
    }

    // Add new point
    const newPoint: SplinePoint = {
      position: { ...worldPosition },
      width: this.calculateWidthAtIndex(this.activeSpline.points.length),
    };

    this.activeSpline.points.push(newPoint);
    this.activeSpline.selectedPoint = this.activeSpline.points.length - 1;

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer move
   */
  onPointerMove(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    // Dragging a point
    if (this.draggingPointIndex !== null && this.activeSpline) {
      this.activeSpline.points[this.draggingPointIndex].position = { ...worldPosition };
      this.updatePreview(ctx);
      return;
    }

    // Check for hover
    this.hoveredPointIndex = this.findPointAt(worldPosition);

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up
   */
  onPointerUp(ctx: ToolContext): void {
    this.draggingPointIndex = null;
  }

  /**
   * Handle double click - finish river
   */
  onDoubleClick(ctx: ToolContext): void {
    if (!this.activeSpline || this.activeSpline.points.length < 2) {
      return;
    }

    // Create river from spline
    const river = this.createRiverFromSpline();

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'river',
      featureId: river.id,
      previousState: null,
      newState: river,
    });

    // Notify listeners
    this.onRiverCreated?.(river);

    // Reset
    this.activeSpline = null;
    this.clearPreview();
  }

  /**
   * Handle key press
   */
  onKeyDown(ctx: ToolContext, key: string): void {
    if (key === 'Escape') {
      // Cancel current spline
      this.activeSpline = null;
      this.clearPreview();
    } else if (key === 'Enter') {
      // Finish river
      this.onDoubleClick(ctx);
    } else if (key === 'Backspace' || key === 'Delete') {
      // Remove last point
      if (this.activeSpline && this.activeSpline.points.length > 0) {
        this.activeSpline.points.pop();
        if (this.activeSpline.points.length === 0) {
          this.activeSpline = null;
        }
        this.updatePreview(ctx);
      }
    }
  }

  /**
   * Find point near position
   */
  private findPointAt(position: Vector2): number | null {
    if (!this.activeSpline) return null;

    const tolerance = 10;
    for (let i = 0; i < this.activeSpline.points.length; i++) {
      const point = this.activeSpline.points[i];
      const dist = this.distance(position, point.position);
      if (dist <= tolerance) {
        return i;
      }
    }

    return null;
  }

  /**
   * Calculate river width at given index
   */
  private calculateWidthAtIndex(index: number): number {
    if (!this.activeSpline || this.activeSpline.points.length === 0) {
      return this.settings.startWidth;
    }

    const t = index / Math.max(1, this.activeSpline.points.length);
    return this.settings.startWidth + (this.settings.endWidth - this.settings.startWidth) * t;
  }

  /**
   * Create river from active spline
   */
  private createRiverFromSpline(): River {
    if (!this.activeSpline || this.activeSpline.points.length < 2) {
      throw new Error('Not enough points for river');
    }

    const id = this.generateId('river');
    const points = this.activeSpline.points;

    // Generate path (interpolate for smooth curves)
    let path: Vector2[];
    let widths: number[];

    if (this.settings.smooth && points.length >= 3) {
      const interpolated = this.interpolateSpline(points);
      path = interpolated.path;
      widths = interpolated.widths;
    } else {
      path = points.map((p) => ({ ...p.position }));
      widths = points.map((p) => p.width || this.settings.startWidth);
    }

    // Calculate length
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      length += this.distance(path[i], path[i - 1]);
    }

    return {
      id,
      name: this.generateRiverName(),
      path,
      widths,
      source: path[0],
      mouth: path[path.length - 1],
      length,
      maxFlow: widths[widths.length - 1] * 10,
      tributaries: [],
    };
  }

  /**
   * Interpolate spline for smooth curve
   */
  private interpolateSpline(points: SplinePoint[]): { path: Vector2[]; widths: number[] } {
    const path: Vector2[] = [];
    const widths: number[] = [];
    const tension = this.settings.tension;
    const segments = 10; // Points per segment

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      for (let t = 0; t < 1; t += 1 / segments) {
        const x = this.catmullRom(
          p0.position.x, p1.position.x, p2.position.x, p3.position.x, t, tension
        );
        const y = this.catmullRom(
          p0.position.y, p1.position.y, p2.position.y, p3.position.y, t, tension
        );
        const width = this.lerp(p1.width || 2, p2.width || 2, t);

        path.push({ x, y });
        widths.push(width);
      }
    }

    // Add last point
    const last = points[points.length - 1];
    path.push({ ...last.position });
    widths.push(last.width || this.settings.endWidth);

    return { path, widths };
  }

  /**
   * Catmull-Rom interpolation
   */
  private catmullRom(
    p0: number, p1: number, p2: number, p3: number, t: number, tension: number
  ): number {
    const t2 = t * t;
    const t3 = t2 * t;
    const s = (1 - tension) / 2;

    return (
      s * (-t3 + 2 * t2 - t) * p0 +
      (s * (-t3 + t2) + (2 * t3 - 3 * t2 + 1)) * p1 +
      (s * (t3 - 2 * t2 + t) + (-2 * t3 + 3 * t2)) * p2 +
      s * (t3 - t2) * p3
    );
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Generate random river name
   */
  private generateRiverName(): string {
    const adj = RIVER_ADJECTIVES[Math.floor(Math.random() * RIVER_ADJECTIVES.length)];
    const noun = RIVER_NOUNS[Math.floor(Math.random() * RIVER_NOUNS.length)];
    return `${adj} ${noun}`;
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;

    if (this.activeSpline && this.activeSpline.points.length > 0) {
      const points = this.activeSpline.points;

      // Draw river path
      if (points.length >= 2) {
        // Draw filled river
        this.previewGraphics.moveTo(points[0].position.x, points[0].position.y);

        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];

          this.previewGraphics.lineTo(curr.position.x, curr.position.y);
        }

        // Line to cursor
        this.previewGraphics.lineTo(worldPosition.x, worldPosition.y);

        this.previewGraphics.stroke({
          width: this.settings.endWidth,
          color: 0x4a90d9,
          alpha: 0.5,
          cap: 'round',
          join: 'round',
        });
      }

      // Draw control points
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const isSelected = i === this.activeSpline.selectedPoint;
        const isHovered = i === this.hoveredPointIndex;

        this.previewGraphics
          .circle(point.position.x, point.position.y, isSelected ? 8 : 6)
          .fill({ color: isHovered ? 0x00ff00 : 0xffffff, alpha: 0.9 })
          .stroke({ width: 2, color: 0x4a90d9 });

        // Width indicator
        const width = point.width || this.settings.startWidth;
        this.previewGraphics
          .circle(point.position.x, point.position.y, width)
          .stroke({ width: 1, color: 0x4a90d9, alpha: 0.3 });
      }

      // Draw line to cursor for next point
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        this.previewGraphics
          .moveTo(lastPoint.position.x, lastPoint.position.y)
          .lineTo(worldPosition.x, worldPosition.y)
          .stroke({ width: 1, color: 0x4a90d9, alpha: 0.5 });
      }
    }

    // Cursor indicator
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, 5)
      .fill({ color: 0x4a90d9, alpha: 0.8 });
  }

  /**
   * Cleanup on deactivate
   */
  onDeactivate(): void {
    super.onDeactivate();
    this.activeSpline = null;
    this.hoveredPointIndex = null;
    this.draggingPointIndex = null;
  }
}
```

---

## 7.7 Lake Shape Tool

### 7.7.1 src/core/tools/features/LakeShapeTool.ts

**Instruction for Claude Code:**
> Create the lake shape tool at `src/core/tools/features/LakeShapeTool.ts`. This draws lake shapes using freeform, ellipse, or rectangle modes.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { LakeShapeSettings } from './types';
import type { Lake } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';
import { SimplexNoise } from '@/core/generation/noise';

/**
 * Default lake shape settings
 */
export const DEFAULT_LAKE_SHAPE_SETTINGS: LakeShapeSettings = {
  type: 'freeform',
  smoothEdges: true,
  edgeNoise: 0.2,
  depth: 0.1,
  wavePattern: true,
};

/**
 * Lake name components
 */
const LAKE_ADJECTIVES = ['Crystal', 'Mirror', 'Silent', 'Hidden', 'Moonlit', 'Azure'];
const LAKE_NOUNS = ['Lake', 'Pond', 'Pool', 'Waters', 'Basin'];

/**
 * Tool for drawing lake shapes
 */
export class LakeShapeTool extends FeatureTool {
  private settings: LakeShapeSettings;
  private noise: SimplexNoise;
  private isDrawing: boolean = false;
  private startPoint: Vector2 | null = null;
  private boundaryPoints: Vector2[] = [];
  private onLakeCreated: ((lake: Lake) => void) | null = null;

  constructor(parentContainer: Container) {
    super('lake-shape', 'Lake', 'droplets', parentContainer);
    this.settings = { ...DEFAULT_LAKE_SHAPE_SETTINGS };
    this.noise = new SimplexNoise(Date.now());
  }

  /**
   * Set callback for when lake is created
   */
  setOnLakeCreated(callback: (lake: Lake) => void): void {
    this.onLakeCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): LakeShapeSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<LakeShapeSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  /**
   * Handle pointer down
   */
  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.startPoint = { ...ctx.worldPosition };

    if (this.settings.type === 'freeform') {
      this.boundaryPoints = [{ ...ctx.worldPosition }];
    } else {
      this.boundaryPoints = [];
    }
  }

  /**
   * Handle pointer move
   */
  onPointerMove(ctx: ToolContext): void {
    if (this.isDrawing) {
      if (this.settings.type === 'freeform') {
        // Add point to boundary
        const lastPoint = this.boundaryPoints[this.boundaryPoints.length - 1];
        const dist = this.distance(ctx.worldPosition, lastPoint);

        if (dist > 5) {
          this.boundaryPoints.push({ ...ctx.worldPosition });
        }
      }
    }

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up
   */
  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing || !this.startPoint) {
      this.reset();
      return;
    }

    let boundary: Vector2[];

    switch (this.settings.type) {
      case 'ellipse':
        boundary = this.createEllipseBoundary(this.startPoint, ctx.worldPosition);
        break;
      case 'rectangle':
        boundary = this.createRectangleBoundary(this.startPoint, ctx.worldPosition);
        break;
      case 'freeform':
      default:
        if (this.boundaryPoints.length < 3) {
          this.reset();
          return;
        }
        boundary = this.closeBoundary(this.boundaryPoints);
        break;
    }

    // Apply edge noise if enabled
    if (this.settings.edgeNoise > 0) {
      boundary = this.applyEdgeNoise(boundary);
    }

    // Smooth edges if enabled
    if (this.settings.smoothEdges) {
      boundary = this.smoothBoundary(boundary);
    }

    // Create lake
    const lake = this.createLake(boundary);

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'lake',
      featureId: lake.id,
      previousState: null,
      newState: lake,
    });

    // Notify listeners
    this.onLakeCreated?.(lake);

    // Reset
    this.reset();
  }

  /**
   * Create ellipse boundary
   */
  private createEllipseBoundary(start: Vector2, end: Vector2): Vector2[] {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;

    const points: Vector2[] = [];
    const segments = Math.max(20, Math.floor(Math.max(radiusX, radiusY) / 2));

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    }

    return points;
  }

  /**
   * Create rectangle boundary
   */
  private createRectangleBoundary(start: Vector2, end: Vector2): Vector2[] {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Add points along edges for noise application
    const points: Vector2[] = [];
    const edgePoints = 10;

    // Top edge
    for (let i = 0; i <= edgePoints; i++) {
      points.push({ x: minX + (maxX - minX) * (i / edgePoints), y: minY });
    }
    // Right edge
    for (let i = 1; i <= edgePoints; i++) {
      points.push({ x: maxX, y: minY + (maxY - minY) * (i / edgePoints) });
    }
    // Bottom edge
    for (let i = 1; i <= edgePoints; i++) {
      points.push({ x: maxX - (maxX - minX) * (i / edgePoints), y: maxY });
    }
    // Left edge
    for (let i = 1; i < edgePoints; i++) {
      points.push({ x: minX, y: maxY - (maxY - minY) * (i / edgePoints) });
    }

    return points;
  }

  /**
   * Close freeform boundary
   */
  private closeBoundary(points: Vector2[]): Vector2[] {
    // Ensure boundary is closed
    const first = points[0];
    const last = points[points.length - 1];
    const dist = this.distance(first, last);

    if (dist > 10) {
      // Add closing segment
      const steps = Math.ceil(dist / 10);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push({
          x: last.x + (first.x - last.x) * t,
          y: last.y + (first.y - last.y) * t,
        });
      }
    }

    return points;
  }

  /**
   * Apply noise to boundary edges
   */
  private applyEdgeNoise(points: Vector2[]): Vector2[] {
    const { edgeNoise } = this.settings;
    const center = this.calculateCenter(points);

    return points.map((point, i) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Noise based on angle
      const noiseVal = this.noise.noise2D(Math.cos(angle) * 2, Math.sin(angle) * 2);
      const offset = noiseVal * edgeNoise * dist * 0.3;

      return {
        x: point.x + Math.cos(angle) * offset,
        y: point.y + Math.sin(angle) * offset,
      };
    });
  }

  /**
   * Smooth boundary using averaging
   */
  private smoothBoundary(points: Vector2[]): Vector2[] {
    const smoothed: Vector2[] = [];
    const windowSize = 3;

    for (let i = 0; i < points.length; i++) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (let j = -windowSize; j <= windowSize; j++) {
        const idx = (i + j + points.length) % points.length;
        sumX += points[idx].x;
        sumY += points[idx].y;
        count++;
      }

      smoothed.push({
        x: sumX / count,
        y: sumY / count,
      });
    }

    return smoothed;
  }

  /**
   * Calculate center of points
   */
  private calculateCenter(points: Vector2[]): Vector2 {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  /**
   * Create lake from boundary
   */
  private createLake(boundary: Vector2[]): Lake {
    const id = this.generateId('lake');
    const center = this.calculateCenter(boundary);

    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < boundary.length; i++) {
      const j = (i + 1) % boundary.length;
      area += boundary[i].x * boundary[j].y;
      area -= boundary[j].x * boundary[i].y;
    }
    area = Math.abs(area / 2);

    return {
      id,
      name: this.generateLakeName(),
      center,
      boundary,
      elevation: 0.4, // Default elevation
      area,
      depth: this.settings.depth,
      inflows: [],
      type: 'freshwater',
    };
  }

  /**
   * Generate random lake name
   */
  private generateLakeName(): string {
    const adj = LAKE_ADJECTIVES[Math.floor(Math.random() * LAKE_ADJECTIVES.length)];
    const noun = LAKE_NOUNS[Math.floor(Math.random() * LAKE_NOUNS.length)];
    return `${adj} ${noun}`;
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.boundaryPoints = [];
    this.clearPreview();
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;

    if (this.isDrawing && this.startPoint) {
      let previewBoundary: Vector2[];

      switch (this.settings.type) {
        case 'ellipse':
          previewBoundary = this.createEllipseBoundary(this.startPoint, worldPosition);
          break;
        case 'rectangle':
          previewBoundary = this.createRectangleBoundary(this.startPoint, worldPosition);
          break;
        case 'freeform':
        default:
          previewBoundary = [...this.boundaryPoints, worldPosition];
          break;
      }

      if (previewBoundary.length > 2) {
        // Draw lake fill
        this.previewGraphics.poly(previewBoundary.flatMap((p) => [p.x, p.y]));
        this.previewGraphics.fill({ color: 0x5b9bd5, alpha: 0.3 });
        this.previewGraphics.stroke({ width: 2, color: 0x3a7ab8, alpha: 0.8 });
      }

      // Draw control point
      if (this.settings.type !== 'freeform') {
        this.previewGraphics
          .circle(this.startPoint.x, this.startPoint.y, 5)
          .fill({ color: 0xffffff });
      }
    }

    // Cursor indicator
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, 4)
      .fill({ color: 0x5b9bd5, alpha: 0.8 });
  }

  /**
   * Cleanup
   */
  onDeactivate(): void {
    super.onDeactivate();
    this.reset();
  }
}
```

---

## 7.8 Feature Eraser Tool

### 7.8.1 src/core/tools/features/FeatureEraserTool.ts

**Instruction for Claude Code:**
> Create the feature eraser tool at `src/core/tools/features/FeatureEraserTool.ts`. This removes features within the brush area.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { FeatureEraserSettings } from './types';
import type { Vector2 } from '@/types';

/**
 * Default feature eraser settings
 */
export const DEFAULT_FEATURE_ERASER_SETTINGS: FeatureEraserSettings = {
  radius: 30,
  targets: {
    mountains: true,
    rivers: true,
    lakes: true,
    forests: true,
  },
  soft: false,
};

/**
 * Erased feature info
 */
export interface ErasedFeature {
  type: 'mountain' | 'river' | 'lake' | 'forest';
  id: string;
  feature: any;
}

/**
 * Tool for erasing features
 */
export class FeatureEraserTool extends FeatureTool {
  private settings: FeatureEraserSettings;
  private isErasing: boolean = false;
  private erasedFeatures: ErasedFeature[] = [];
  private onFeaturesErased: ((features: ErasedFeature[]) => void) | null = null;

  constructor(parentContainer: Container) {
    super('feature-eraser', 'Feature Eraser', 'eraser', parentContainer);
    this.settings = { ...DEFAULT_FEATURE_ERASER_SETTINGS };
  }

  /**
   * Set callback for when features are erased
   */
  setOnFeaturesErased(callback: (features: ErasedFeature[]) => void): void {
    this.onFeaturesErased = callback;
  }

  /**
   * Get settings
   */
  getSettings(): FeatureEraserSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<FeatureEraserSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get brush radius for cursor
   */
  protected getBrushRadius(): number {
    return this.settings.radius;
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return {
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.settings.radius,
    };
  }

  /**
   * Handle pointer down - start erasing
   */
  onPointerDown(ctx: ToolContext): void {
    this.isErasing = true;
    this.erasedFeatures = [];
    this.eraseAt(ctx.worldPosition, ctx);
  }

  /**
   * Handle pointer move - continue erasing
   */
  onPointerMove(ctx: ToolContext): void {
    this.updatePreview(ctx);

    if (this.isErasing) {
      this.eraseAt(ctx.worldPosition, ctx);
    }
  }

  /**
   * Handle pointer up - finish erasing
   */
  onPointerUp(ctx: ToolContext): void {
    if (!this.isErasing) return;

    // Record all erased features for undo
    for (const erased of this.erasedFeatures) {
      this.recordEdit({
        type: 'remove',
        featureType: erased.type,
        featureId: erased.id,
        previousState: erased.feature,
        newState: null,
      });
    }

    // Notify listeners
    if (this.erasedFeatures.length > 0) {
      this.onFeaturesErased?.([...this.erasedFeatures]);
    }

    // Reset
    this.isErasing = false;
    this.erasedFeatures = [];
  }

  /**
   * Erase features at position
   */
  private eraseAt(position: Vector2, ctx: ToolContext): void {
    // This will emit an event that the feature manager handles
    this.emit('erase', {
      position,
      radius: this.settings.radius,
      targets: this.settings.targets,
      soft: this.settings.soft,
      onErased: (feature: ErasedFeature) => {
        // Check if not already erased in this stroke
        if (!this.erasedFeatures.find((f) => f.id === feature.id)) {
          this.erasedFeatures.push(feature);
        }
      },
    });
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { radius, targets } = this.settings;

    // Draw eraser circle
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, radius)
      .stroke({ width: 2, color: 0xff4444, alpha: 0.8 });

    // Inner dashed circle for soft erase
    if (this.settings.soft) {
      this.previewGraphics
        .circle(worldPosition.x, worldPosition.y, radius * 0.6)
        .stroke({ width: 1, color: 0xff4444, alpha: 0.4 });
    }

    // Target indicators
    const targetIcons: string[] = [];
    if (targets.mountains) targetIcons.push('M');
    if (targets.rivers) targetIcons.push('R');
    if (targets.lakes) targetIcons.push('L');
    if (targets.forests) targetIcons.push('F');

    // Draw X pattern to indicate erasing
    const xSize = 6;
    this.previewGraphics
      .moveTo(worldPosition.x - xSize, worldPosition.y - xSize)
      .lineTo(worldPosition.x + xSize, worldPosition.y + xSize)
      .moveTo(worldPosition.x + xSize, worldPosition.y - xSize)
      .lineTo(worldPosition.x - xSize, worldPosition.y + xSize)
      .stroke({ width: 2, color: 0xff4444, alpha: 0.8 });
  }
}
```

---

## 7.9 Feature Select Tool

### 7.9.1 src/core/tools/features/FeatureSelectTool.ts

**Instruction for Claude Code:**
> Create the feature select tool at `src/core/tools/features/FeatureSelectTool.ts`. This allows selecting and transforming features.

```typescript
import { Container } from 'pixi.js';
import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { FeatureSelection } from './types';
import type { Vector2 } from '@/types';

/**
 * Handle positions for transform
 */
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

/**
 * Tool for selecting and transforming features
 */
export class FeatureSelectTool extends FeatureTool {
  private selection: FeatureSelection | null = null;
  private isDragging: boolean = false;
  private dragStart: Vector2 | null = null;
  private dragOffset: Vector2 | null = null;
  private activeHandle: HandlePosition | null = null;
  private hoveredHandle: HandlePosition | null = null;
  
  private onSelectionChange: ((selection: FeatureSelection | null) => void) | null = null;
  private onFeatureTransform: ((featureId: string, transform: any) => void) | null = null;

  constructor(parentContainer: Container) {
    super('feature-select', 'Select Feature', 'pointer', parentContainer);
  }

  /**
   * Set selection change callback
   */
  setOnSelectionChange(callback: (selection: FeatureSelection | null) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * Set feature transform callback
   */
  setOnFeatureTransform(callback: (featureId: string, transform: any) => void): void {
    this.onFeatureTransform = callback;
  }

  /**
   * Get current selection
   */
  getSelection(): FeatureSelection | null {
    return this.selection;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selection = null;
    this.onSelectionChange?.(null);
    this.clearPreview();
  }

  /**
   * Get cursor based on hover state
   */
  getCursor(): ToolCursor {
    if (this.hoveredHandle) {
      switch (this.hoveredHandle) {
        case 'nw':
        case 'se':
          return { type: 'custom', image: 'nwse-resize' };
        case 'ne':
        case 'sw':
          return { type: 'custom', image: 'nesw-resize' };
        case 'n':
        case 's':
          return { type: 'custom', image: 'ns-resize' };
        case 'e':
        case 'w':
          return { type: 'custom', image: 'ew-resize' };
        case 'rotate':
          return { type: 'custom', image: 'crosshair' };
      }
    }
    if (this.selection) {
      return { type: 'move' };
    }
    return { type: 'default' };
  }

  /**
   * Handle pointer down
   */
  onPointerDown(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    // Check if clicking on handle
    if (this.selection) {
      const handle = this.findHandleAt(worldPosition);
      if (handle) {
        this.activeHandle = handle;
        this.dragStart = { ...worldPosition };
        this.isDragging = true;
        return;
      }

      // Check if clicking inside selection bounds
      if (this.isPointInSelection(worldPosition)) {
        this.isDragging = true;
        this.dragStart = { ...worldPosition };
        this.dragOffset = {
          x: worldPosition.x - (this.selection.bounds?.x || 0),
          y: worldPosition.y - (this.selection.bounds?.y || 0),
        };
        return;
      }
    }

    // Try to select a feature
    this.trySelectFeature(worldPosition, ctx);
  }

  /**
   * Handle pointer move
   */
  onPointerMove(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    if (this.isDragging && this.selection && this.dragStart) {
      if (this.activeHandle) {
        // Resizing
        this.handleResize(worldPosition);
      } else {
        // Moving
        this.handleMove(worldPosition);
      }
    } else {
      // Update hover state
      this.hoveredHandle = this.findHandleAt(worldPosition);
    }

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up
   */
  onPointerUp(ctx: ToolContext): void {
    if (this.isDragging && this.selection) {
      // Emit transform event
      if (this.selection.id) {
        this.onFeatureTransform?.(this.selection.id, {
          bounds: this.selection.bounds,
        });
      }
    }

    this.isDragging = false;
    this.dragStart = null;
    this.dragOffset = null;
    this.activeHandle = null;
  }

  /**
   * Handle key press
   */
  onKeyDown(ctx: ToolContext, key: string): void {
    if (!this.selection) return;

    if (key === 'Delete' || key === 'Backspace') {
      // Delete selected feature
      if (this.selection.id) {
        this.emit('delete-feature', {
          type: this.selection.type,
          id: this.selection.id,
        });
      }
      this.clearSelection();
    } else if (key === 'Escape') {
      this.clearSelection();
    }
  }

  /**
   * Try to select feature at position
   */
  private trySelectFeature(position: Vector2, ctx: ToolContext): void {
    // Emit event for feature manager to handle
    this.emit('find-feature', {
      position,
      callback: (result: { type: string; id: string; bounds: any } | null) => {
        if (result) {
          this.selection = {
            type: result.type as any,
            id: result.id,
            bounds: result.bounds,
            handles: this.calculateHandles(result.bounds),
          };
          this.onSelectionChange?.(this.selection);
        } else {
          this.clearSelection();
        }
        this.updatePreview(ctx);
      },
    });
  }

  /**
   * Calculate handle positions from bounds
   */
  private calculateHandles(bounds: { x: number; y: number; width: number; height: number }): Vector2[] {
    if (!bounds) return [];

    const { x, y, width, height } = bounds;
    const handleSize = 8;

    return [
      { x, y }, // nw
      { x: x + width / 2, y }, // n
      { x: x + width, y }, // ne
      { x: x + width, y: y + height / 2 }, // e
      { x: x + width, y: y + height }, // se
      { x: x + width / 2, y: y + height }, // s
      { x, y: y + height }, // sw
      { x, y: y + height / 2 }, // w
      { x: x + width / 2, y: y - 20 }, // rotate
    ];
  }

  /**
   * Find handle at position
   */
  private findHandleAt(position: Vector2): HandlePosition | null {
    if (!this.selection?.handles) return null;

    const handlePositions: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];
    const tolerance = 10;

    for (let i = 0; i < this.selection.handles.length; i++) {
      const handle = this.selection.handles[i];
      const dist = this.distance(position, handle);
      if (dist <= tolerance) {
        return handlePositions[i];
      }
    }

    return null;
  }

  /**
   * Check if point is inside selection bounds
   */
  private isPointInSelection(position: Vector2): boolean {
    if (!this.selection?.bounds) return false;

    const { x, y, width, height } = this.selection.bounds;
    return (
      position.x >= x &&
      position.x <= x + width &&
      position.y >= y &&
      position.y <= y + height
    );
  }

  /**
   * Handle feature move
   */
  private handleMove(position: Vector2): void {
    if (!this.selection?.bounds || !this.dragOffset) return;

    this.selection.bounds.x = position.x - this.dragOffset.x;
    this.selection.bounds.y = position.y - this.dragOffset.y;
    this.selection.handles = this.calculateHandles(this.selection.bounds);
  }

  /**
   * Handle feature resize
   */
  private handleResize(position: Vector2): void {
    if (!this.selection?.bounds || !this.dragStart || !this.activeHandle) return;

    const bounds = this.selection.bounds;
    const dx = position.x - this.dragStart.x;
    const dy = position.y - this.dragStart.y;

    switch (this.activeHandle) {
      case 'nw':
        bounds.x += dx;
        bounds.y += dy;
        bounds.width -= dx;
        bounds.height -= dy;
        break;
      case 'n':
        bounds.y += dy;
        bounds.height -= dy;
        break;
      case 'ne':
        bounds.y += dy;
        bounds.width += dx;
        bounds.height -= dy;
        break;
      case 'e':
        bounds.width += dx;
        break;
      case 'se':
        bounds.width += dx;
        bounds.height += dy;
        break;
      case 's':
        bounds.height += dy;
        break;
      case 'sw':
        bounds.x += dx;
        bounds.width -= dx;
        bounds.height += dy;
        break;
      case 'w':
        bounds.x += dx;
        bounds.width -= dx;
        break;
    }

    // Ensure minimum size
    bounds.width = Math.max(10, bounds.width);
    bounds.height = Math.max(10, bounds.height);

    this.selection.handles = this.calculateHandles(bounds);
    this.dragStart = { ...position };
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    if (this.selection?.bounds) {
      const { x, y, width, height } = this.selection.bounds;

      // Draw selection rectangle
      this.previewGraphics
        .rect(x, y, width, height)
        .stroke({ width: 2, color: 0x00aaff, alpha: 0.8 });

      // Draw handles
      const handleSize = 8;
      for (let i = 0; i < this.selection.handles.length; i++) {
        const handle = this.selection.handles[i];
        const isHovered = this.hoveredHandle === (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'][i]);
        const isRotate = i === 8;

        if (isRotate) {
          // Draw rotate handle
          this.previewGraphics
            .circle(handle.x, handle.y, handleSize / 2)
            .fill({ color: isHovered ? 0x00ff00 : 0xffffff })
            .stroke({ width: 2, color: 0x00aaff });

          // Line from top handle to rotate
          this.previewGraphics
            .moveTo(x + width / 2, y)
            .lineTo(handle.x, handle.y)
            .stroke({ width: 1, color: 0x00aaff, alpha: 0.5 });
        } else {
          // Draw resize handle
          this.previewGraphics
            .rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
            .fill({ color: isHovered ? 0x00ff00 : 0xffffff })
            .stroke({ width: 1, color: 0x00aaff });
        }
      }
    }
  }

  /**
   * Cleanup
   */
  onDeactivate(): void {
    super.onDeactivate();
    this.isDragging = false;
    this.dragStart = null;
    this.dragOffset = null;
    this.activeHandle = null;
    this.hoveredHandle = null;
  }
}
```

---

## 7.10 Feature Tool Manager

### 7.10.1 src/core/tools/features/FeatureToolManager.ts

**Instruction for Claude Code:**
> Create the feature tool manager at `src/core/tools/features/FeatureToolManager.ts`. This coordinates all feature tools and connects them to the feature data.

```typescript
import { Container } from 'pixi.js';
import { MountainStampTool } from './MountainStampTool';
import { MountainPathTool } from './MountainPathTool';
import { ForestBrushTool } from './ForestBrushTool';
import { RiverSplineTool } from './RiverSplineTool';
import { LakeShapeTool } from './LakeShapeTool';
import { FeatureEraserTool } from './FeatureEraserTool';
import { FeatureSelectTool } from './FeatureSelectTool';
import type { FeatureTool } from './FeatureTool';
import type { FeatureToolType, FeatureEditOperation } from './types';
import type { 
  MountainPeak, 
  MountainRange, 
  River, 
  Lake,
  FeatureGenerationResult 
} from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Feature tool manager
 * Coordinates all feature editing tools
 */
export class FeatureToolManager {
  private tools: Map<FeatureToolType, FeatureTool>;
  private activeTool: FeatureTool | null = null;
  private activeToolType: FeatureToolType | null = null;
  private parentContainer: Container;
  
  // Feature data references
  private peaks: MountainPeak[] = [];
  private ranges: MountainRange[] = [];
  private rivers: River[] = [];
  private lakes: Lake[] = [];
  
  // Callbacks
  private onFeatureChange: ((type: string, data: any) => void) | null = null;
  private onEditOperation: ((operation: FeatureEditOperation) => void) | null = null;

  constructor(parentContainer: Container) {
    this.parentContainer = parentContainer;
    this.tools = new Map();
    this.initializeTools();
  }

  /**
   * Initialize all feature tools
   */
  private initializeTools(): void {
    // Mountain stamp
    const mountainStamp = new MountainStampTool(this.parentContainer);
    mountainStamp.setOnPeakCreated((peak) => this.handlePeakCreated(peak));
    this.tools.set('mountain-stamp', mountainStamp);

    // Mountain path
    const mountainPath = new MountainPathTool(this.parentContainer);
    mountainPath.setOnRangeCreated((range) => this.handleRangeCreated(range));
    this.tools.set('mountain-path', mountainPath);

    // Forest brush
    const forestBrush = new ForestBrushTool(this.parentContainer);
    forestBrush.setOnForestPainted((stroke) => this.handleForestPainted(stroke));
    this.tools.set('forest-brush', forestBrush);

    // River spline
    const riverSpline = new RiverSplineTool(this.parentContainer);
    riverSpline.setOnRiverCreated((river) => this.handleRiverCreated(river));
    this.tools.set('river-spline', riverSpline);

    // Lake shape
    const lakeShape = new LakeShapeTool(this.parentContainer);
    lakeShape.setOnLakeCreated((lake) => this.handleLakeCreated(lake));
    this.tools.set('lake-shape', lakeShape);

    // Feature eraser
    const featureEraser = new FeatureEraserTool(this.parentContainer);
    featureEraser.setOnFeaturesErased((features) => this.handleFeaturesErased(features));
    featureEraser.on('erase', (data) => this.handleEraseEvent(data));
    this.tools.set('feature-eraser', featureEraser);

    // Feature select
    const featureSelect = new FeatureSelectTool(this.parentContainer);
    featureSelect.setOnSelectionChange((selection) => this.handleSelectionChange(selection));
    featureSelect.setOnFeatureTransform((id, transform) => this.handleFeatureTransform(id, transform));
    featureSelect.on('find-feature', (data) => this.handleFindFeature(data));
    featureSelect.on('delete-feature', (data) => this.handleDeleteFeature(data));
    this.tools.set('feature-select', featureSelect);

    // Listen for edit operations from all tools
    for (const tool of this.tools.values()) {
      tool.on('edit', (operation: FeatureEditOperation) => {
        this.onEditOperation?.(operation);
      });
    }
  }

  /**
   * Set feature change callback
   */
  setOnFeatureChange(callback: (type: string, data: any) => void): void {
    this.onFeatureChange = callback;
  }

  /**
   * Set edit operation callback
   */
  setOnEditOperation(callback: (operation: FeatureEditOperation) => void): void {
    this.onEditOperation = callback;
  }

  /**
   * Set feature data from generation result
   */
  setFeatureData(result: FeatureGenerationResult): void {
    this.peaks = [...result.peaks];
    this.ranges = [...result.mountainRanges];
    this.rivers = [...result.rivers];
    this.lakes = [...result.lakes];
  }

  /**
   * Get active tool
   */
  getActiveTool(): FeatureTool | null {
    return this.activeTool;
  }

  /**
   * Get active tool type
   */
  getActiveToolType(): FeatureToolType | null {
    return this.activeToolType;
  }

  /**
   * Set active tool
   */
  setActiveTool(toolType: FeatureToolType | null): void {
    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate();
    }

    if (toolType === null) {
      this.activeTool = null;
      this.activeToolType = null;
      return;
    }

    const tool = this.tools.get(toolType);
    if (tool) {
      this.activeTool = tool;
      this.activeToolType = toolType;
      tool.onActivate();
    }
  }

  /**
   * Get tool by type
   */
  getTool<T extends FeatureTool>(toolType: FeatureToolType): T | undefined {
    return this.tools.get(toolType) as T | undefined;
  }

  /**
   * Handle peak created
   */
  private handlePeakCreated(peak: MountainPeak): void {
    this.peaks.push(peak);
    this.onFeatureChange?.('mountains', { peaks: this.peaks, ranges: this.ranges });
  }

  /**
   * Handle range created
   */
  private handleRangeCreated(range: MountainRange): void {
    this.ranges.push(range);
    this.peaks.push(...range.peaks);
    this.onFeatureChange?.('mountains', { peaks: this.peaks, ranges: this.ranges });
  }

  /**
   * Handle forest painted
   */
  private handleForestPainted(stroke: any): void {
    this.onFeatureChange?.('forests', { stroke });
  }

  /**
   * Handle river created
   */
  private handleRiverCreated(river: River): void {
    this.rivers.push(river);
    this.onFeatureChange?.('rivers', { rivers: this.rivers });
  }

  /**
   * Handle lake created
   */
  private handleLakeCreated(lake: Lake): void {
    this.lakes.push(lake);
    this.onFeatureChange?.('lakes', { lakes: this.lakes });
  }

  /**
   * Handle features erased
   */
  private handleFeaturesErased(features: any[]): void {
    for (const erased of features) {
      switch (erased.type) {
        case 'mountain':
          this.peaks = this.peaks.filter((p) => p !== erased.feature);
          break;
        case 'river':
          this.rivers = this.rivers.filter((r) => r.id !== erased.id);
          break;
        case 'lake':
          this.lakes = this.lakes.filter((l) => l.id !== erased.id);
          break;
      }
    }
    
    this.onFeatureChange?.('all', {
      peaks: this.peaks,
      ranges: this.ranges,
      rivers: this.rivers,
      lakes: this.lakes,
    });
  }

  /**
   * Handle erase event from eraser tool
   */
  private handleEraseEvent(data: any): void {
    const { position, radius, targets, onErased } = data;

    // Check mountains
    if (targets.mountains) {
      for (const peak of this.peaks) {
        const dist = this.distance(position, peak.position);
        if (dist <= radius + peak.radius) {
          onErased({ type: 'mountain', id: '', feature: peak });
        }
      }
    }

    // Check rivers
    if (targets.rivers) {
      for (const river of this.rivers) {
        for (const point of river.path) {
          const dist = this.distance(position, point);
          if (dist <= radius) {
            onErased({ type: 'river', id: river.id, feature: river });
            break;
          }
        }
      }
    }

    // Check lakes
    if (targets.lakes) {
      for (const lake of this.lakes) {
        const dist = this.distance(position, lake.center);
        if (dist <= radius + Math.sqrt(lake.area)) {
          onErased({ type: 'lake', id: lake.id, feature: lake });
        }
      }
    }
  }

  /**
   * Handle find feature event from select tool
   */
  private handleFindFeature(data: any): void {
    const { position, callback } = data;
    const tolerance = 10;

    // Check mountains
    for (const peak of this.peaks) {
      const dist = this.distance(position, peak.position);
      if (dist <= peak.radius + tolerance) {
        callback({
          type: 'mountain',
          id: peak.rangeId || 'peak',
          bounds: {
            x: peak.position.x - peak.radius,
            y: peak.position.y - peak.radius * 1.5,
            width: peak.radius * 2,
            height: peak.radius * 2,
          },
        });
        return;
      }
    }

    // Check rivers
    for (const river of this.rivers) {
      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths[i] || 2;
        const dist = this.distance(position, point);
        if (dist <= width + tolerance) {
          const bounds = this.calculatePathBounds(river.path);
          callback({
            type: 'river',
            id: river.id,
            bounds,
          });
          return;
        }
      }
    }

    // Check lakes
    for (const lake of this.lakes) {
      if (this.isPointInPolygon(position, lake.boundary)) {
        const bounds = this.calculatePathBounds(lake.boundary);
        callback({
          type: 'lake',
          id: lake.id,
          bounds,
        });
        return;
      }
    }

    // Nothing found
    callback(null);
  }

  /**
   * Handle delete feature event
   */
  private handleDeleteFeature(data: { type: string; id: string }): void {
    switch (data.type) {
      case 'river':
        this.rivers = this.rivers.filter((r) => r.id !== data.id);
        this.onFeatureChange?.('rivers', { rivers: this.rivers });
        break;
      case 'lake':
        this.lakes = this.lakes.filter((l) => l.id !== data.id);
        this.onFeatureChange?.('lakes', { lakes: this.lakes });
        break;
    }
  }

  /**
   * Handle selection change
   */
  private handleSelectionChange(selection: any): void {
    // Could emit event or update UI
  }

  /**
   * Handle feature transform
   */
  private handleFeatureTransform(featureId: string, transform: any): void {
    // Apply transform to feature
    // This would need more complex logic for actual scaling/moving
  }

  /**
   * Calculate bounding box for path
   */
  private calculatePathBounds(path: Vector2[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate distance between points
   */
  private distance(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Check if point is in polygon
   */
  private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Destroy manager and all tools
   */
  destroy(): void {
    for (const tool of this.tools.values()) {
      tool.destroy();
    }
    this.tools.clear();
  }
}
```

---

## 7.11 Feature Tools Store

### 7.11.1 src/stores/useFeatureToolsStore.ts

**Instruction for Claude Code:**
> Create a Zustand store at `src/stores/useFeatureToolsStore.ts` for managing feature tool state.

```typescript
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
import {
  DEFAULT_MOUNTAIN_STAMP_SETTINGS,
} from '@/core/tools/features/MountainStampTool';
import {
  DEFAULT_MOUNTAIN_PATH_SETTINGS,
} from '@/core/tools/features/MountainPathTool';
import {
  DEFAULT_FOREST_BRUSH_SETTINGS,
} from '@/core/tools/features/ForestBrushTool';
import {
  DEFAULT_RIVER_SPLINE_SETTINGS,
} from '@/core/tools/features/RiverSplineTool';
import {
  DEFAULT_LAKE_SHAPE_SETTINGS,
} from '@/core/tools/features/LakeShapeTool';
import {
  DEFAULT_FEATURE_ERASER_SETTINGS,
} from '@/core/tools/features/FeatureEraserTool';

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
      return operation;
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.editHistory.length - 1) return null;

      set((s) => {
        s.historyIndex++;
      });
      return state.editHistory[state.historyIndex + 1];
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
```

---

## 7.12 Feature Tools Panel

### 7.12.1 src/components/panels/FeatureToolsPanel.tsx

**Instruction for Claude Code:**
> Create the feature tools panel UI at `src/components/panels/FeatureToolsPanel.tsx`. This provides controls for feature editing tools.

```typescript
import { useCallback } from 'react';
import {
  Mountain,
  TrendingUp,
  Trees,
  Waves,
  Droplets,
  Eraser,
  MousePointer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Select } from '@/components/ui/Select';
import {
  useFeatureToolsStore,
  useActiveFeatureTool,
  useMountainStampSettings,
  useMountainPathSettings,
  useForestBrushSettings,
  useRiverSplineSettings,
  useLakeShapeSettings,
  useFeatureEraserSettings,
} from '@/stores/useFeatureToolsStore';
import type { FeatureToolType } from '@/core/tools/features/types';

interface ToolButtonProps {
  toolType: FeatureToolType;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ toolType, icon, label, active, onClick }: ToolButtonProps) {
  return (
    <Button
      variant={active ? 'primary' : 'ghost'}
      size="sm"
      className={cn(
        'flex flex-col items-center gap-1 h-auto py-2 px-3',
        active && 'bg-parchment-600 text-ink-950'
      )}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Button>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}

function SliderField({ label, value, onChange, min, max, step = 0.01 }: SliderFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-400">{label}</label>
        <span className="text-xs text-ink-300 tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export function FeatureToolsPanel() {
  const activeTool = useActiveFeatureTool();
  const { setActiveTool } = useFeatureToolsStore();

  const mountainStampSettings = useMountainStampSettings();
  const mountainPathSettings = useMountainPathSettings();
  const forestBrushSettings = useForestBrushSettings();
  const riverSplineSettings = useRiverSplineSettings();
  const lakeShapeSettings = useLakeShapeSettings();
  const featureEraserSettings = useFeatureEraserSettings();

  const {
    setMountainStampSettings,
    setMountainPathSettings,
    setForestBrushSettings,
    setRiverSplineSettings,
    setLakeShapeSettings,
    setFeatureEraserSettings,
  } = useFeatureToolsStore();

  const handleToolClick = useCallback(
    (tool: FeatureToolType) => {
      setActiveTool(activeTool === tool ? null : tool);
    },
    [activeTool, setActiveTool]
  );

  return (
    <div className="flex flex-col h-full bg-ink-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-ink-800">
        <h2 className="text-sm font-semibold text-ink-100">Feature Tools</h2>
      </div>

      {/* Tool Buttons */}
      <div className="grid grid-cols-4 gap-1 p-2 border-b border-ink-800">
        <ToolButton
          toolType="mountain-stamp"
          icon={<Mountain className="w-5 h-5" />}
          label="Peak"
          active={activeTool === 'mountain-stamp'}
          onClick={() => handleToolClick('mountain-stamp')}
        />
        <ToolButton
          toolType="mountain-path"
          icon={<TrendingUp className="w-5 h-5" />}
          label="Range"
          active={activeTool === 'mountain-path'}
          onClick={() => handleToolClick('mountain-path')}
        />
        <ToolButton
          toolType="forest-brush"
          icon={<Trees className="w-5 h-5" />}
          label="Forest"
          active={activeTool === 'forest-brush'}
          onClick={() => handleToolClick('forest-brush')}
        />
        <ToolButton
          toolType="river-spline"
          icon={<Waves className="w-5 h-5" />}
          label="River"
          active={activeTool === 'river-spline'}
          onClick={() => handleToolClick('river-spline')}
        />
        <ToolButton
          toolType="lake-shape"
          icon={<Droplets className="w-5 h-5" />}
          label="Lake"
          active={activeTool === 'lake-shape'}
          onClick={() => handleToolClick('lake-shape')}
        />
        <ToolButton
          toolType="feature-eraser"
          icon={<Eraser className="w-5 h-5" />}
          label="Eraser"
          active={activeTool === 'feature-eraser'}
          onClick={() => handleToolClick('feature-eraser')}
        />
        <ToolButton
          toolType="feature-select"
          icon={<MousePointer className="w-5 h-5" />}
          label="Select"
          active={activeTool === 'feature-select'}
          onClick={() => handleToolClick('feature-select')}
        />
      </div>

      {/* Tool Settings */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Mountain Stamp Settings */}
        {activeTool === 'mountain-stamp' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Mountain Peak Settings
            </h3>
            <SliderField
              label="Elevation"
              value={mountainStampSettings.elevation}
              onChange={(v) => setMountainStampSettings({ elevation: v })}
              min={0.5}
              max={0.98}
            />
            <SliderField
              label="Radius"
              value={mountainStampSettings.radius}
              onChange={(v) => setMountainStampSettings({ radius: v })}
              min={10}
              max={80}
              step={1}
            />
            <SliderField
              label="Sharpness"
              value={mountainStampSettings.sharpness}
              onChange={(v) => setMountainStampSettings({ sharpness: v })}
              min={0}
              max={1}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Snow Cap</label>
              <Switch
                checked={mountainStampSettings.snowCap}
                onCheckedChange={(v) => setMountainStampSettings({ snowCap: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Randomize</label>
              <Switch
                checked={mountainStampSettings.randomize}
                onCheckedChange={(v) => setMountainStampSettings({ randomize: v })}
              />
            </div>
          </div>
        )}

        {/* Mountain Path Settings */}
        {activeTool === 'mountain-path' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Mountain Range Settings
            </h3>
            <SliderField
              label="Width"
              value={mountainPathSettings.width}
              onChange={(v) => setMountainPathSettings({ width: v })}
              min={20}
              max={100}
              step={5}
            />
            <SliderField
              label="Peak Density"
              value={mountainPathSettings.peakDensity}
              onChange={(v) => setMountainPathSettings({ peakDensity: v })}
              min={2}
              max={20}
              step={1}
            />
            <SliderField
              label="Roughness"
              value={mountainPathSettings.roughness}
              onChange={(v) => setMountainPathSettings({ roughness: v })}
              min={0}
              max={1}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Smooth Path</label>
              <Switch
                checked={mountainPathSettings.smoothPath}
                onCheckedChange={(v) => setMountainPathSettings({ smoothPath: v })}
              />
            </div>
          </div>
        )}

        {/* Forest Brush Settings */}
        {activeTool === 'forest-brush' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Forest Brush Settings
            </h3>
            <SliderField
              label="Radius"
              value={forestBrushSettings.radius}
              onChange={(v) => setForestBrushSettings({ radius: v })}
              min={10}
              max={100}
              step={5}
            />
            <SliderField
              label="Density"
              value={forestBrushSettings.density}
              onChange={(v) => setForestBrushSettings({ density: v })}
              min={0.1}
              max={1}
            />
            <SliderField
              label="Variation"
              value={forestBrushSettings.variation}
              onChange={(v) => setForestBrushSettings({ variation: v })}
              min={0}
              max={1}
            />
            <div>
              <label className="block text-xs text-ink-400 mb-1.5">Forest Type</label>
              <Select
                value={forestBrushSettings.forestType}
                onValueChange={(v) => setForestBrushSettings({ forestType: v as any })}
              >
                <Select.Option value="auto">Auto (Climate)</Select.Option>
                <Select.Option value="deciduous">Deciduous</Select.Option>
                <Select.Option value="coniferous">Coniferous</Select.Option>
                <Select.Option value="tropical">Tropical</Select.Option>
                <Select.Option value="mixed">Mixed</Select.Option>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Soft Edge</label>
              <Switch
                checked={forestBrushSettings.softEdge}
                onCheckedChange={(v) => setForestBrushSettings({ softEdge: v })}
              />
            </div>
          </div>
        )}

        {/* River Spline Settings */}
        {activeTool === 'river-spline' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              River Settings
            </h3>
            <p className="text-xs text-ink-500">
              Click to add points. Double-click or press Enter to finish.
            </p>
            <SliderField
              label="Start Width"
              value={riverSplineSettings.startWidth}
              onChange={(v) => setRiverSplineSettings({ startWidth: v })}
              min={1}
              max={10}
              step={0.5}
            />
            <SliderField
              label="End Width"
              value={riverSplineSettings.endWidth}
              onChange={(v) => setRiverSplineSettings({ endWidth: v })}
              min={2}
              max={20}
              step={1}
            />
            <SliderField
              label="Curve Tension"
              value={riverSplineSettings.tension}
              onChange={(v) => setRiverSplineSettings({ tension: v })}
              min={0}
              max={1}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Smooth Curves</label>
              <Switch
                checked={riverSplineSettings.smooth}
                onCheckedChange={(v) => setRiverSplineSettings({ smooth: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Erode Terrain</label>
              <Switch
                checked={riverSplineSettings.erode}
                onCheckedChange={(v) => setRiverSplineSettings({ erode: v })}
              />
            </div>
          </div>
        )}

        {/* Lake Shape Settings */}
        {activeTool === 'lake-shape' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Lake Settings
            </h3>
            <div>
              <label className="block text-xs text-ink-400 mb-1.5">Shape Type</label>
              <Select
                value={lakeShapeSettings.type}
                onValueChange={(v) => setLakeShapeSettings({ type: v as any })}
              >
                <Select.Option value="freeform">Freeform</Select.Option>
                <Select.Option value="ellipse">Ellipse</Select.Option>
                <Select.Option value="rectangle">Rectangle</Select.Option>
              </Select>
            </div>
            <SliderField
              label="Edge Noise"
              value={lakeShapeSettings.edgeNoise}
              onChange={(v) => setLakeShapeSettings({ edgeNoise: v })}
              min={0}
              max={0.5}
            />
            <SliderField
              label="Depth"
              value={lakeShapeSettings.depth}
              onChange={(v) => setLakeShapeSettings({ depth: v })}
              min={0.05}
              max={0.3}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Smooth Edges</label>
              <Switch
                checked={lakeShapeSettings.smoothEdges}
                onCheckedChange={(v) => setLakeShapeSettings({ smoothEdges: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Wave Pattern</label>
              <Switch
                checked={lakeShapeSettings.wavePattern}
                onCheckedChange={(v) => setLakeShapeSettings({ wavePattern: v })}
              />
            </div>
          </div>
        )}

        {/* Feature Eraser Settings */}
        {activeTool === 'feature-eraser' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Eraser Settings
            </h3>
            <SliderField
              label="Radius"
              value={featureEraserSettings.radius}
              onChange={(v) => setFeatureEraserSettings({ radius: v })}
              min={10}
              max={100}
              step={5}
            />
            <div className="space-y-2">
              <label className="text-xs text-ink-400">Erase Targets</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.mountains}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, mountains: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Mountains</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.rivers}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, rivers: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Rivers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.lakes}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, lakes: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Lakes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.forests}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, forests: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Forests</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Select Tool Info */}
        {activeTool === 'feature-select' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Select Tool
            </h3>
            <p className="text-xs text-ink-500">
              Click on a feature to select it. Drag to move, use handles to resize.
              Press Delete to remove selected feature.
            </p>
          </div>
        )}

        {/* No Tool Selected */}
        {!activeTool && (
          <div className="text-center py-8">
            <p className="text-sm text-ink-500">
              Select a tool to start editing features
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 7.13 Index Exports

### 7.13.1 src/core/tools/features/index.ts

**Instruction for Claude Code:**
> Create index file at `src/core/tools/features/index.ts`.

```typescript
export * from './types';
export { FeatureTool } from './FeatureTool';
export { MountainStampTool, DEFAULT_MOUNTAIN_STAMP_SETTINGS } from './MountainStampTool';
export { MountainPathTool, DEFAULT_MOUNTAIN_PATH_SETTINGS } from './MountainPathTool';
export { ForestBrushTool, DEFAULT_FOREST_BRUSH_SETTINGS } from './ForestBrushTool';
export { RiverSplineTool, DEFAULT_RIVER_SPLINE_SETTINGS } from './RiverSplineTool';
export { LakeShapeTool, DEFAULT_LAKE_SHAPE_SETTINGS } from './LakeShapeTool';
export { FeatureEraserTool, DEFAULT_FEATURE_ERASER_SETTINGS } from './FeatureEraserTool';
export { FeatureSelectTool } from './FeatureSelectTool';
export { FeatureToolManager } from './FeatureToolManager';
```

---

## 7.14 Verification Checklist for Phase 7

After implementing Phase 7, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ Feature tools panel appears in UI
□ Tool buttons display correctly
□ Selecting a tool highlights it
□ Clicking same tool again deselects it

Mountain Stamp Tool:
□ Clicking on map creates mountain peak
□ Peak preview shows at cursor
□ Elevation slider changes peak height
□ Radius slider changes peak size
□ Sharpness slider affects peak shape
□ Snow cap toggle adds white top
□ Randomize toggle varies peaks

Mountain Path Tool:
□ Click-drag draws mountain range path
□ Path preview shows while drawing
□ Releasing creates range with peaks
□ Width slider affects range width
□ Peak density changes peak count
□ Roughness affects peak variation
□ Smooth path creates curved ranges

Forest Brush Tool:
□ Click-drag paints forest
□ Brush preview shows at cursor
□ Radius changes brush size
□ Density affects tree count
□ Forest type selector works
□ Soft edge creates gradual falloff
□ Trees appear procedurally varied

River Spline Tool:
□ Clicking adds control points
□ Line preview connects points
□ Double-click finishes river
□ Enter key finishes river
□ Escape cancels drawing
□ Backspace removes last point
□ Start/end width affects river
□ Smooth creates curved rivers

Lake Shape Tool:
□ Freeform mode draws lake boundary
□ Ellipse mode creates oval lakes
□ Rectangle mode creates rectangular lakes
□ Edge noise adds irregularity
□ Smooth edges rounds corners
□ Depth slider works

Feature Eraser Tool:
□ Click-drag erases features
□ Eraser radius shown at cursor
□ Mountains can be erased
□ Rivers can be erased
□ Lakes can be erased
□ Target toggles work

Feature Select Tool:
□ Clicking feature selects it
□ Selection box shows around feature
□ Handles appear for resizing
□ Dragging moves feature
□ Delete key removes feature
□ Escape deselects

General:
□ Undo reverses last action
□ Redo restores undone action
□ Tool settings persist when switching tools
□ Preview toggles work
□ No memory leaks on repeated operations
□ Performance acceptable during drawing
```

---

## Summary

Phase 7 establishes the manual feature editing tools:

1. **Mountain Stamp Tool** - Place individual mountain peaks
2. **Mountain Path Tool** - Draw mountain ranges along paths
3. **Forest Brush Tool** - Paint forests with procedural trees
4. **River Spline Tool** - Draw rivers with bezier curves
5. **Lake Shape Tool** - Create lakes (freeform, ellipse, rectangle)
6. **Feature Eraser Tool** - Remove features selectively
7. **Feature Select Tool** - Select and transform features
8. **Feature Tool Manager** - Coordinate all tools with data
9. **Feature Tools Store** - State management for tools
10. **Feature Tools Panel** - Complete UI for tool settings

---

## Next Steps

**Phase 8: Icons & Stamps (Buildings, POIs)** will cover:
- Icon/stamp library system
- Drag-and-drop icon placement
- Icon scaling and rotation
- Custom icon upload
- Icon categories (cities, landmarks, creatures)
- Icon clustering and distribution tools
- Label/annotation system

Ready to proceed when you are!