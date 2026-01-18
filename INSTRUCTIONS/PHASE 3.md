# PHASE 3: Core Drawing Tools

---

## Overview

Phase 3 implements the complete tool system for Planet Planner:
- Tool architecture with base class and state machine
- Brush tool for terrain painting with stroke smoothing
- Shape tool for landmass/coastlines with bezier curves
- Eraser tool
- Selection & transform tools
- Pressure sensitivity support
- Tool cursor rendering

---

### 3.1 Tool System Architecture

#### 3.1.1 src/core/tools/types.ts

```typescript
import type { Vector2, InputState } from '@/types';
import type { LayerContainer } from '../layers/Layer';
import type { CanvasEngine } from '../canvas/CanvasEngine';

/**
 * Tool event types
 */
export type ToolEventType =
  | 'activate'
  | 'deactivate'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'keydown'
  | 'keyup';

/**
 * Context passed to tool event handlers
 */
export interface ToolContext {
  /** Canvas engine reference */
  engine: CanvasEngine;
  /** Current input state */
  input: InputState;
  /** Active layer (if any) */
  activeLayer: LayerContainer | null;
  /** Current position in world coordinates */
  worldPosition: Vector2;
  /** Current position in screen coordinates */
  screenPosition: Vector2;
  /** Position where current stroke started */
  strokeStart: Vector2 | null;
  /** All positions in current stroke */
  strokePath: Vector2[];
  /** Time elapsed since stroke started (ms) */
  strokeTime: number;
  /** Is currently in a stroke/drag operation */
  isStroking: boolean;
  /** Delta time since last frame (seconds) */
  deltaTime: number;
}

/**
 * Tool cursor configuration
 */
export interface ToolCursor {
  /** CSS cursor type or 'custom' */
  type: 'default' | 'crosshair' | 'move' | 'pointer' | 'grab' | 'grabbing' | 'custom' | 'none';
  /** Custom cursor image URL (if type is 'custom') */
  image?: string;
  /** Cursor hotspot offset */
  hotspot?: Vector2;
  /** Show size indicator circle */
  showSizeIndicator?: boolean;
  /** Size indicator radius */
  sizeRadius?: number;
}

/**
 * Result of a tool operation (for undo/redo)
 */
export interface ToolOperationResult {
  /** Operation type identifier */
  type: string;
  /** Layer ID affected */
  layerId: string;
  /** Data needed to undo this operation */
  undoData: unknown;
  /** Data needed to redo this operation */
  redoData: unknown;
}

/**
 * Base tool interface
 */
export interface ITool {
  /** Unique tool identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Tool icon name (for UI) */
  readonly icon: string;
  /** Keyboard shortcut */
  readonly shortcut?: string;
  /** Current cursor configuration */
  getCursor(): ToolCursor;
  /** Called when tool is activated */
  onActivate(ctx: ToolContext): void;
  /** Called when tool is deactivated */
  onDeactivate(ctx: ToolContext): void;
  /** Called on pointer down */
  onPointerDown(ctx: ToolContext): void;
  /** Called on pointer move */
  onPointerMove(ctx: ToolContext): void;
  /** Called on pointer up */
  onPointerUp(ctx: ToolContext): ToolOperationResult | null;
  /** Called on key down */
  onKeyDown(ctx: ToolContext, key: string): void;
  /** Called on key up */
  onKeyUp(ctx: ToolContext, key: string): void;
  /** Called each frame during active stroke */
  onUpdate(ctx: ToolContext): void;
  /** Render tool preview/guides */
  renderPreview(ctx: ToolContext): void;
  /** Cleanup any preview graphics */
  clearPreview(): void;
}
```

#### 3.1.2 src/core/tools/BaseTool.ts

```typescript
import { Graphics, Container } from 'pixi.js';
import type { ITool, ToolContext, ToolCursor, ToolOperationResult } from './types';

/**
 * Abstract base class for all tools
 * Provides common functionality and default implementations
 */
export abstract class BaseTool implements ITool {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly icon: string;
  readonly shortcut?: string;

  /** Preview graphics container */
  protected previewContainer: Container;
  protected previewGraphics: Graphics;

  /** Is tool currently active */
  protected isActive: boolean = false;

  constructor() {
    this.previewContainer = new Container();
    this.previewContainer.label = 'tool-preview';
    this.previewGraphics = new Graphics();
    this.previewContainer.addChild(this.previewGraphics);
  }

  /**
   * Get the preview container (to be added to the scene)
   */
  getPreviewContainer(): Container {
    return this.previewContainer;
  }

  /**
   * Default cursor
   */
  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  /**
   * Called when tool is activated
   */
  onActivate(ctx: ToolContext): void {
    this.isActive = true;
    // Add preview container to world
    const worldContainer = ctx.engine.getWorldContainer();
    if (worldContainer && !this.previewContainer.parent) {
      worldContainer.addChild(this.previewContainer);
    }
  }

  /**
   * Called when tool is deactivated
   */
  onDeactivate(ctx: ToolContext): void {
    this.isActive = false;
    this.clearPreview();
    // Remove preview container from world
    if (this.previewContainer.parent) {
      this.previewContainer.parent.removeChild(this.previewContainer);
    }
  }

  /**
   * Default pointer down handler
   */
  onPointerDown(ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Default pointer move handler
   */
  onPointerMove(ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Default pointer up handler
   */
  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    // Override in subclass
    return null;
  }

  /**
   * Default key down handler
   */
  onKeyDown(ctx: ToolContext, key: string): void {
    // Override in subclass
  }

  /**
   * Default key up handler
   */
  onKeyUp(ctx: ToolContext, key: string): void {
    // Override in subclass
  }

  /**
   * Default update handler (called each frame during stroke)
   */
  onUpdate(ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Default preview renderer
   */
  renderPreview(ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Clear preview graphics
   */
  clearPreview(): void {
    this.previewGraphics.clear();
  }

  /**
   * Utility: Get options from tool store
   */
  protected getOptions<T>(ctx: ToolContext): T {
    // This will be connected to the store in ToolManager
    return {} as T;
  }
}
```

#### 3.1.3 src/core/tools/ToolManager.ts

```typescript
import { Container } from 'pixi.js';
import type { ITool, ToolContext, ToolOperationResult } from './types';
import type { CanvasEngine } from '../canvas/CanvasEngine';
import type { LayerManager } from '../layers/LayerManager';
import type { Vector2, InputState, ToolType } from '@/types';

// Import tools
import { SelectTool } from './SelectTool';
import { PanTool } from './PanTool';
import { BrushTool } from './BrushTool';
import { EraserTool } from './EraserTool';
import { ShapeTool } from './ShapeTool';
import { PathTool } from './PathTool';
import { FillTool } from './FillTool';
import { StampTool } from './StampTool';
import { TextTool } from './TextTool';
import { EyedropperTool } from './EyedropperTool';

export interface ToolManagerConfig {
  /** Callback when tool changes */
  onToolChange?: (toolId: string) => void;
  /** Callback when operation completes (for undo/redo) */
  onOperationComplete?: (result: ToolOperationResult) => void;
  /** Get tool options from store */
  getToolOptions?: (toolId: string) => unknown;
  /** Get active layer ID from store */
  getActiveLayerId?: () => string | null;
}

/**
 * Manages all tools and routes input events
 */
export class ToolManager {
  private engine: CanvasEngine;
  private layerManager: LayerManager;
  private tools: Map<string, ITool> = new Map();
  private activeTool: ITool | null = null;
  private config: ToolManagerConfig;

  // Stroke state
  private isStroking: boolean = false;
  private strokeStart: Vector2 | null = null;
  private strokePath: Vector2[] = [];
  private strokeStartTime: number = 0;

  // Input state
  private currentInput: InputState | null = null;
  private currentWorldPosition: Vector2 = { x: 0, y: 0 };
  private currentScreenPosition: Vector2 = { x: 0, y: 0 };

  // Cursor container
  private cursorContainer: Container;

  constructor(
    engine: CanvasEngine,
    layerManager: LayerManager,
    config: ToolManagerConfig = {}
  ) {
    this.engine = engine;
    this.layerManager = layerManager;
    this.config = config;

    this.cursorContainer = new Container();
    this.cursorContainer.label = 'cursor';

    this.registerDefaultTools();
  }

  /**
   * Register all default tools
   */
  private registerDefaultTools(): void {
    this.registerTool(new SelectTool());
    this.registerTool(new PanTool());
    this.registerTool(new BrushTool());
    this.registerTool(new EraserTool());
    this.registerTool(new ShapeTool());
    this.registerTool(new PathTool());
    this.registerTool(new FillTool());
    this.registerTool(new StampTool());
    this.registerTool(new TextTool());
    this.registerTool(new EyedropperTool());
  }

  /**
   * Register a tool
   */
  registerTool(tool: ITool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Get a tool by ID
   */
  getTool(id: string): ITool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Set the active tool
   */
  setActiveTool(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (!tool) {
      console.warn(`Tool '${toolId}' not found`);
      return;
    }

    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate(this.createContext());
    }

    // Activate new tool
    this.activeTool = tool;
    this.activeTool.onActivate(this.createContext());

    this.config.onToolChange?.(toolId);
  }

  /**
   * Get the active tool
   */
  getActiveTool(): ITool | null {
    return this.activeTool;
  }

  /**
   * Get cursor container (for rendering custom cursors)
   */
  getCursorContainer(): Container {
    return this.cursorContainer;
  }

  /**
   * Create tool context from current state
   */
  private createContext(): ToolContext {
    const activeLayerId = this.config.getActiveLayerId?.() ?? null;
    const activeLayer = activeLayerId
      ? this.layerManager.getLayer(activeLayerId) ?? null
      : null;

    return {
      engine: this.engine,
      input: this.currentInput ?? {
        screenPosition: { x: 0, y: 0 },
        worldPosition: { x: 0, y: 0 },
        isPrimaryDown: false,
        isSecondaryDown: false,
        isMiddleDown: false,
        modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        pressure: 0,
      },
      activeLayer,
      worldPosition: this.currentWorldPosition,
      screenPosition: this.currentScreenPosition,
      strokeStart: this.strokeStart,
      strokePath: [...this.strokePath],
      strokeTime: this.strokeStartTime > 0 ? Date.now() - this.strokeStartTime : 0,
      isStroking: this.isStroking,
      deltaTime: 1 / 60, // Will be updated by animation frame
    };
  }

  /**
   * Handle pointer down event
   */
  handlePointerDown(screenPos: Vector2, worldPos: Vector2, input: InputState): void {
    this.currentInput = input;
    this.currentScreenPosition = screenPos;
    this.currentWorldPosition = worldPos;

    // Start stroke
    this.isStroking = true;
    this.strokeStart = { ...worldPos };
    this.strokePath = [{ ...worldPos }];
    this.strokeStartTime = Date.now();

    if (this.activeTool) {
      this.activeTool.onPointerDown(this.createContext());
    }
  }

  /**
   * Handle pointer move event
   */
  handlePointerMove(screenPos: Vector2, worldPos: Vector2, input: InputState): void {
    this.currentInput = input;
    this.currentScreenPosition = screenPos;
    this.currentWorldPosition = worldPos;

    // Add to stroke path if stroking
    if (this.isStroking) {
      this.strokePath.push({ ...worldPos });
    }

    if (this.activeTool) {
      this.activeTool.onPointerMove(this.createContext());
      this.activeTool.renderPreview(this.createContext());
    }
  }

  /**
   * Handle pointer up event
   */
  handlePointerUp(screenPos: Vector2, worldPos: Vector2, input: InputState): void {
    this.currentInput = input;
    this.currentScreenPosition = screenPos;
    this.currentWorldPosition = worldPos;

    if (this.activeTool) {
      const result = this.activeTool.onPointerUp(this.createContext());
      if (result) {
        this.config.onOperationComplete?.(result);
      }
    }

    // End stroke
    this.isStroking = false;
    this.strokeStart = null;
    this.strokePath = [];
    this.strokeStartTime = 0;
  }

  /**
   * Handle key down event
   */
  handleKeyDown(key: string): void {
    if (this.activeTool) {
      this.activeTool.onKeyDown(this.createContext(), key);
    }
  }

  /**
   * Handle key up event
   */
  handleKeyUp(key: string): void {
    if (this.activeTool) {
      this.activeTool.onKeyUp(this.createContext(), key);
    }
  }

  /**
   * Update (called each frame)
   */
  update(deltaTime: number): void {
    if (this.activeTool && this.isStroking) {
      const ctx = this.createContext();
      (ctx as any).deltaTime = deltaTime;
      this.activeTool.onUpdate(ctx);
    }
  }

  /**
   * Destroy the tool manager
   */
  destroy(): void {
    if (this.activeTool) {
      this.activeTool.onDeactivate(this.createContext());
    }
    this.tools.clear();
    this.cursorContainer.destroy({ children: true });
  }
}
```

#### 3.1.4 src/core/tools/index.ts

```typescript
export * from './types';
export { BaseTool } from './BaseTool';
export { ToolManager } from './ToolManager';
export type { ToolManagerConfig } from './ToolManager';

// Export individual tools
export { SelectTool } from './SelectTool';
export { PanTool } from './PanTool';
export { BrushTool } from './BrushTool';
export { EraserTool } from './EraserTool';
export { ShapeTool } from './ShapeTool';
export { PathTool } from './PathTool';
export { FillTool } from './FillTool';
export { StampTool } from './StampTool';
export { TextTool } from './TextTool';
export { EyedropperTool } from './EyedropperTool';
```

---

### 3.2 Stroke Smoothing Utility

#### 3.2.1 src/core/tools/StrokeSmoothing.ts

```typescript
import type { Vector2 } from '@/types';
import { vec2, vec2Add, vec2Sub, vec2Scale, vec2Length, vec2Lerp } from '@/utils';

/**
 * Configuration for stroke smoothing
 */
export interface SmoothingConfig {
  /** Enable smoothing */
  enabled: boolean;
  /** Smoothing factor (0-1, higher = smoother) */
  smoothing: number;
  /** Minimum distance between points */
  minDistance: number;
  /** Enable pressure smoothing */
  smoothPressure: boolean;
  /** Pressure smoothing factor */
  pressureSmoothing: number;
}

const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  enabled: true,
  smoothing: 0.5,
  minDistance: 2,
  smoothPressure: true,
  pressureSmoothing: 0.3,
};

/**
 * Point with pressure information
 */
export interface StrokePoint {
  position: Vector2;
  pressure: number;
  timestamp: number;
}

/**
 * Stroke smoothing processor
 * Uses exponential moving average and Catmull-Rom interpolation
 */
export class StrokeSmoother {
  private config: SmoothingConfig;
  private points: StrokePoint[] = [];
  private smoothedPosition: Vector2 = { x: 0, y: 0 };
  private smoothedPressure: number = 1;
  private isFirstPoint: boolean = true;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config };
  }

  /**
   * Reset the smoother for a new stroke
   */
  reset(): void {
    this.points = [];
    this.smoothedPosition = { x: 0, y: 0 };
    this.smoothedPressure = 1;
    this.isFirstPoint = true;
  }

  /**
   * Add a new point and get smoothed result
   */
  addPoint(position: Vector2, pressure: number = 1): StrokePoint | null {
    const timestamp = Date.now();

    if (this.isFirstPoint) {
      this.smoothedPosition = { ...position };
      this.smoothedPressure = pressure;
      this.isFirstPoint = false;

      const point: StrokePoint = {
        position: { ...position },
        pressure,
        timestamp,
      };
      this.points.push(point);
      return point;
    }

    // Check minimum distance
    const lastPoint = this.points[this.points.length - 1];
    const distance = vec2Length(vec2Sub(position, lastPoint.position));

    if (distance < this.config.minDistance) {
      return null;
    }

    // Apply exponential moving average smoothing
    if (this.config.enabled) {
      const alpha = 1 - this.config.smoothing;
      this.smoothedPosition = vec2Lerp(this.smoothedPosition, position, alpha);

      if (this.config.smoothPressure) {
        const pressureAlpha = 1 - this.config.pressureSmoothing;
        this.smoothedPressure =
          this.smoothedPressure + (pressure - this.smoothedPressure) * pressureAlpha;
      } else {
        this.smoothedPressure = pressure;
      }
    } else {
      this.smoothedPosition = { ...position };
      this.smoothedPressure = pressure;
    }

    const point: StrokePoint = {
      position: { ...this.smoothedPosition },
      pressure: this.smoothedPressure,
      timestamp,
    };

    this.points.push(point);
    return point;
  }

  /**
   * Get all recorded points
   */
  getPoints(): StrokePoint[] {
    return [...this.points];
  }

  /**
   * Get current smoothed position
   */
  getSmoothedPosition(): Vector2 {
    return { ...this.smoothedPosition };
  }

  /**
   * Get current smoothed pressure
   */
  getSmoothedPressure(): number {
    return this.smoothedPressure;
  }

  /**
   * Interpolate points using Catmull-Rom spline
   */
  static interpolateCatmullRom(
    points: Vector2[],
    segments: number = 10
  ): Vector2[] {
    if (points.length < 2) return [...points];
    if (points.length === 2) {
      return StrokeSmoother.interpolateLinear(points[0], points[1], segments);
    }

    const result: Vector2[] = [];

    // Add first point
    result.push({ ...points[0] });

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const point = StrokeSmoother.catmullRomPoint(p0, p1, p2, p3, t);
        result.push(point);
      }
    }

    return result;
  }

  /**
   * Calculate a point on Catmull-Rom spline
   */
  private static catmullRomPoint(
    p0: Vector2,
    p1: Vector2,
    p2: Vector2,
    p3: Vector2,
    t: number
  ): Vector2 {
    const t2 = t * t;
    const t3 = t2 * t;

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

    return { x, y };
  }

  /**
   * Linear interpolation between two points
   */
  private static interpolateLinear(
    p1: Vector2,
    p2: Vector2,
    segments: number
  ): Vector2[] {
    const result: Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      result.push(vec2Lerp(p1, p2, t));
    }
    return result;
  }

  /**
   * Simplify a path using Ramer-Douglas-Peucker algorithm
   */
  static simplifyPath(points: Vector2[], tolerance: number = 1): Vector2[] {
    if (points.length <= 2) return [...points];

    // Find point with maximum distance
    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = StrokeSmoother.pointLineDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = StrokeSmoother.simplifyPath(
        points.slice(0, maxIndex + 1),
        tolerance
      );
      const right = StrokeSmoother.simplifyPath(
        points.slice(maxIndex),
        tolerance
      );

      return [...left.slice(0, -1), ...right];
    }

    return [start, end];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private static pointLineDistance(
    point: Vector2,
    lineStart: Vector2,
    lineEnd: Vector2
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return vec2Length(vec2Sub(point, lineStart));
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
          lengthSquared
      )
    );

    const projection = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };

    return vec2Length(vec2Sub(point, projection));
  }
}
```

---

### 3.3 Brush Tool Implementation

#### 3.3.1 src/core/tools/BrushTool.ts

```typescript
import { Graphics, RenderTexture, Sprite, Container, BlurFilter } from 'pixi.js';
import { BaseTool } from './BaseTool';
import { StrokeSmoother, StrokePoint } from './StrokeSmoothing';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BrushToolOptions, Vector2 } from '@/types';
import { hexToNumber, vec2Length, vec2Sub, vec2Lerp, vec2Normalize, vec2Scale, vec2Add } from '@/utils';

/**
 * Brush tool for terrain painting
 * Supports pressure sensitivity, smoothing, and various brush shapes
 */
export class BrushTool extends BaseTool {
  readonly id = 'brush';
  readonly name = 'Brush';
  readonly icon = 'Brush';
  readonly shortcut = 'B';

  private smoother: StrokeSmoother;
  private strokeGraphics: Graphics | null = null;
  private lastDrawnPoint: Vector2 | null = null;
  private lastPressure: number = 1;

  // Brush options (will be synced from store)
  private options: BrushToolOptions = {
    size: 20,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    hardness: 0.8,
    spacing: 0.25,
    pressureSensitivity: true,
    pressureAffectsSize: true,
    pressureAffectsOpacity: false,
  };

  constructor() {
    super();
    this.smoother = new StrokeSmoother({
      enabled: true,
      smoothing: 0.4,
      minDistance: 1,
      smoothPressure: true,
      pressureSmoothing: 0.2,
    });
  }

  /**
   * Set brush options
   */
  setOptions(options: Partial<BrushToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get cursor configuration
   */
  getCursor(): ToolCursor {
    return {
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.options.size / 2,
    };
  }

  /**
   * Handle pointer down - start stroke
   */
  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    // Reset smoother for new stroke
    this.smoother.reset();

    // Create graphics for this stroke
    this.strokeGraphics = new Graphics();
    ctx.activeLayer.addContent(this.strokeGraphics);

    // Get pressure
    const pressure = this.options.pressureSensitivity ? ctx.input.pressure || 1 : 1;

    // Add first point
    const point = this.smoother.addPoint(ctx.worldPosition, pressure);
    if (point) {
      this.drawBrushDab(point.position, point.pressure);
      this.lastDrawnPoint = point.position;
      this.lastPressure = point.pressure;
    }
  }

  /**
   * Handle pointer move - continue stroke
   */
  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || !this.strokeGraphics) return;

    // Get pressure
    const pressure = this.options.pressureSensitivity ? ctx.input.pressure || 1 : 1;

    // Add point with smoothing
    const point = this.smoother.addPoint(ctx.worldPosition, pressure);

    if (point && this.lastDrawnPoint) {
      // Interpolate between last point and new point based on spacing
      this.drawStrokeSegment(
        this.lastDrawnPoint,
        point.position,
        this.lastPressure,
        point.pressure
      );
      this.lastDrawnPoint = point.position;
      this.lastPressure = point.pressure;
    }
  }

  /**
   * Handle pointer up - end stroke
   */
  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    if (!this.strokeGraphics) return null;

    // Store reference for undo
    const layerId = ctx.activeLayer?.id ?? '';
    const strokeRef = this.strokeGraphics;

    // Reset state
    this.strokeGraphics = null;
    this.lastDrawnPoint = null;
    this.lastPressure = 1;

    // Mark layer as dirty
    ctx.activeLayer?.markDirty();

    return {
      type: 'brush-stroke',
      layerId,
      undoData: { graphics: strokeRef },
      redoData: { graphics: strokeRef },
    };
  }

  /**
   * Draw a single brush dab
   */
  private drawBrushDab(position: Vector2, pressure: number): void {
    if (!this.strokeGraphics) return;

    const size = this.options.pressureAffectsSize
      ? this.options.size * pressure
      : this.options.size;

    const opacity = this.options.pressureAffectsOpacity
      ? this.options.opacity * pressure
      : this.options.opacity;

    const color = hexToNumber(this.options.primaryColor);

    // Draw circular dab
    this.strokeGraphics.circle(position.x, position.y, size / 2);
    this.strokeGraphics.fill({ color, alpha: opacity * this.calculateHardnessAlpha() });
  }

  /**
   * Draw stroke segment with interpolation
   */
  private drawStrokeSegment(
    start: Vector2,
    end: Vector2,
    startPressure: number,
    endPressure: number
  ): void {
    if (!this.strokeGraphics) return;

    const distance = vec2Length(vec2Sub(end, start));
    const spacing = Math.max(1, this.options.size * this.options.spacing);
    const steps = Math.ceil(distance / spacing);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 1 : i / steps;
      const position = vec2Lerp(start, end, t);
      const pressure = startPressure + (endPressure - startPressure) * t;

      this.drawBrushDab(position, pressure);
    }
  }

  /**
   * Calculate alpha based on hardness
   */
  private calculateHardnessAlpha(): number {
    // Hardness affects the opacity falloff
    // Higher hardness = more opaque edges
    return 0.3 + this.options.hardness * 0.7;
  }

  /**
   * Render brush preview (cursor)
   */
  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const size = this.options.size;
    const color = hexToNumber(this.options.primaryColor);

    // Draw brush size circle
    this.previewGraphics.setStrokeStyle({
      width: 1 / (ctx.engine.getViewport()?.zoom ?? 1),
      color: 0xffffff,
      alpha: 0.8,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, size / 2);
    this.previewGraphics.stroke();

    // Draw center crosshair
    const crossSize = 4 / (ctx.engine.getViewport()?.zoom ?? 1);
    this.previewGraphics.moveTo(ctx.worldPosition.x - crossSize, ctx.worldPosition.y);
    this.previewGraphics.lineTo(ctx.worldPosition.x + crossSize, ctx.worldPosition.y);
    this.previewGraphics.moveTo(ctx.worldPosition.x, ctx.worldPosition.y - crossSize);
    this.previewGraphics.lineTo(ctx.worldPosition.x, ctx.worldPosition.y + crossSize);
    this.previewGraphics.stroke();

    // Draw color preview in corner
    this.previewGraphics.circle(
      ctx.worldPosition.x + size / 2 + 5,
      ctx.worldPosition.y - size / 2 - 5,
      5
    );
    this.previewGraphics.fill({ color, alpha: this.options.opacity });
  }
}
```

---

### 3.4 Eraser Tool Implementation

#### 3.4.1 src/core/tools/EraserTool.ts

```typescript
import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import { StrokeSmoother } from './StrokeSmoothing';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BrushToolOptions, Vector2 } from '@/types';
import { vec2Length, vec2Sub, vec2Lerp } from '@/utils';

/**
 * Eraser tool - erases content by drawing with destination-out blend mode
 */
export class EraserTool extends BaseTool {
  readonly id = 'eraser';
  readonly name = 'Eraser';
  readonly icon = 'Eraser';
  readonly shortcut = 'E';

  private smoother: StrokeSmoother;
  private strokeGraphics: Graphics | null = null;
  private lastDrawnPoint: Vector2 | null = null;
  private lastPressure: number = 1;

  private options: BrushToolOptions = {
    size: 30,
    opacity: 1,
    primaryColor: '#ffffff',
    secondaryColor: '#000000',
    hardness: 1,
    spacing: 0.2,
    pressureSensitivity: true,
    pressureAffectsSize: true,
    pressureAffectsOpacity: false,
  };

  constructor() {
    super();
    this.smoother = new StrokeSmoother({
      enabled: true,
      smoothing: 0.3,
      minDistance: 1,
    });
  }

  setOptions(options: Partial<BrushToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getCursor(): ToolCursor {
    return {
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.options.size / 2,
    };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    this.smoother.reset();

    // Create eraser graphics with destination-out blend
    this.strokeGraphics = new Graphics();
    this.strokeGraphics.blendMode = 'erase' as any; // Pixi.js erase blend mode
    ctx.activeLayer.addContent(this.strokeGraphics);

    const pressure = this.options.pressureSensitivity ? ctx.input.pressure || 1 : 1;
    const point = this.smoother.addPoint(ctx.worldPosition, pressure);

    if (point) {
      this.drawEraserDab(point.position, point.pressure);
      this.lastDrawnPoint = point.position;
      this.lastPressure = point.pressure;
    }
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || !this.strokeGraphics) return;

    const pressure = this.options.pressureSensitivity ? ctx.input.pressure || 1 : 1;
    const point = this.smoother.addPoint(ctx.worldPosition, pressure);

    if (point && this.lastDrawnPoint) {
      this.drawStrokeSegment(
        this.lastDrawnPoint,
        point.position,
        this.lastPressure,
        point.pressure
      );
      this.lastDrawnPoint = point.position;
      this.lastPressure = point.pressure;
    }
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    if (!this.strokeGraphics) return null;

    const layerId = ctx.activeLayer?.id ?? '';
    const strokeRef = this.strokeGraphics;

    this.strokeGraphics = null;
    this.lastDrawnPoint = null;
    this.lastPressure = 1;

    ctx.activeLayer?.markDirty();

    return {
      type: 'eraser-stroke',
      layerId,
      undoData: { graphics: strokeRef },
      redoData: { graphics: strokeRef },
    };
  }

  private drawEraserDab(position: Vector2, pressure: number): void {
    if (!this.strokeGraphics) return;

    const size = this.options.pressureAffectsSize
      ? this.options.size * pressure
      : this.options.size;

    // Draw white circle (which will erase due to blend mode)
    this.strokeGraphics.circle(position.x, position.y, size / 2);
    this.strokeGraphics.fill({ color: 0xffffff, alpha: this.options.opacity });
  }

  private drawStrokeSegment(
    start: Vector2,
    end: Vector2,
    startPressure: number,
    endPressure: number
  ): void {
    if (!this.strokeGraphics) return;

    const distance = vec2Length(vec2Sub(end, start));
    const spacing = Math.max(1, this.options.size * this.options.spacing);
    const steps = Math.ceil(distance / spacing);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 1 : i / steps;
      const position = vec2Lerp(start, end, t);
      const pressure = startPressure + (endPressure - startPressure) * t;
      this.drawEraserDab(position, pressure);
    }
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const size = this.options.size;
    const zoom = ctx.engine.getViewport()?.zoom ?? 1;

    // Draw eraser circle outline
    this.previewGraphics.setStrokeStyle({
      width: 2 / zoom,
      color: 0xffffff,
      alpha: 0.8,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, size / 2);
    this.previewGraphics.stroke();

    // Draw inner circle
    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0x000000,
      alpha: 0.5,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, size / 2 - 1 / zoom);
    this.previewGraphics.stroke();
  }
}
```

---

### 3.5 Shape Tool Implementation

#### 3.5.1 src/core/tools/ShapeTool.ts

```typescript
import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { ShapeToolOptions, Vector2 } from '@/types';
import { hexToNumber, vec2Sub, vec2Length } from '@/utils';

/**
 * Shape tool for drawing rectangles, ellipses, polygons, and freeform shapes
 */
export class ShapeTool extends BaseTool {
  readonly id = 'shape';
  readonly name = 'Shape';
  readonly icon = 'Square';
  readonly shortcut = 'U';

  private shapeGraphics: Graphics | null = null;
  private startPosition: Vector2 | null = null;

  // Freeform path points
  private freeformPoints: Vector2[] = [];

  private options: ShapeToolOptions = {
    size: 20,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    shapeType: 'rectangle',
    fill: true,
    stroke: true,
    strokeWidth: 2,
    cornerRadius: 0,
    polygonSides: 6,
  };

  setOptions(options: Partial<ShapeToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    this.startPosition = { ...ctx.worldPosition };

    if (this.options.shapeType === 'freeform') {
      this.freeformPoints = [{ ...ctx.worldPosition }];
    }

    // Create shape graphics
    this.shapeGraphics = new Graphics();
    ctx.activeLayer.addContent(this.shapeGraphics);
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || !this.shapeGraphics || !this.startPosition) return;

    if (this.options.shapeType === 'freeform') {
      // Add point to freeform path
      this.freeformPoints.push({ ...ctx.worldPosition });
    }

    // Redraw preview
    this.drawShape(this.shapeGraphics, this.startPosition, ctx.worldPosition, false);
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    if (!this.shapeGraphics || !this.startPosition) return null;

    // Final draw
    this.drawShape(this.shapeGraphics, this.startPosition, ctx.worldPosition, true);

    const layerId = ctx.activeLayer?.id ?? '';
    const shapeRef = this.shapeGraphics;

    this.shapeGraphics = null;
    this.startPosition = null;
    this.freeformPoints = [];

    ctx.activeLayer?.markDirty();

    return {
      type: 'shape',
      layerId,
      undoData: { graphics: shapeRef },
      redoData: { graphics: shapeRef },
    };
  }

  /**
   * Draw shape based on current settings
   */
  private drawShape(
    graphics: Graphics,
    start: Vector2,
    end: Vector2,
    isFinal: boolean
  ): void {
    graphics.clear();

    const fillColor = hexToNumber(this.options.primaryColor);
    const strokeColor = hexToNumber(this.options.secondaryColor);

    // Set stroke style
    if (this.options.stroke) {
      graphics.setStrokeStyle({
        width: this.options.strokeWidth,
        color: strokeColor,
        alpha: this.options.opacity,
      });
    }

    switch (this.options.shapeType) {
      case 'rectangle':
        this.drawRectangle(graphics, start, end);
        break;
      case 'ellipse':
        this.drawEllipse(graphics, start, end);
        break;
      case 'polygon':
        this.drawPolygon(graphics, start, end);
        break;
      case 'freeform':
        this.drawFreeform(graphics, isFinal);
        break;
    }

    // Apply fill
    if (this.options.fill) {
      graphics.fill({ color: fillColor, alpha: this.options.opacity });
    }

    // Apply stroke
    if (this.options.stroke) {
      graphics.stroke();
    }
  }

  /**
   * Draw rectangle (with optional rounded corners)
   */
  private drawRectangle(graphics: Graphics, start: Vector2, end: Vector2): void {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    if (this.options.cornerRadius > 0) {
      graphics.roundRect(x, y, width, height, this.options.cornerRadius);
    } else {
      graphics.rect(x, y, width, height);
    }
  }

  /**
   * Draw ellipse
   */
  private drawEllipse(graphics: Graphics, start: Vector2, end: Vector2): void {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;

    graphics.ellipse(centerX, centerY, radiusX, radiusY);
  }

  /**
   * Draw regular polygon
   */
  private drawPolygon(graphics: Graphics, start: Vector2, end: Vector2): void {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radius = vec2Length(vec2Sub(end, start)) / 2;
    const sides = this.options.polygonSides;

    const points: number[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      points.push(centerX + Math.cos(angle) * radius);
      points.push(centerY + Math.sin(angle) * radius);
    }

    graphics.poly(points, true);
  }

  /**
   * Draw freeform shape
   */
  private drawFreeform(graphics: Graphics, isFinal: boolean): void {
    if (this.freeformPoints.length < 2) return;

    // Simplify path if final
    let points = this.freeformPoints;
    if (isFinal && points.length > 3) {
      // Use Catmull-Rom interpolation for smooth curves
      points = this.smoothFreeformPath(points);
    }

    // Draw path
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i].x, points[i].y);
    }

    // Close path if near start
    const distToStart = vec2Length(vec2Sub(points[points.length - 1], points[0]));
    if (distToStart < 20 || isFinal) {
      graphics.closePath();
    }
  }

  /**
   * Smooth freeform path using bezier curves
   */
  private smoothFreeformPath(points: Vector2[]): Vector2[] {
    // Simple implementation - could be improved with proper curve fitting
    const result: Vector2[] = [points[0]];

    for (let i = 1; i < points.length - 1; i += 2) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[Math.min(i + 1, points.length - 1)];

      // Add intermediate points
      for (let t = 0; t <= 1; t += 0.25) {
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        result.push({ x, y });
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    if (!ctx.isStroking) {
      // Just show crosshair when not drawing
      const zoom = ctx.engine.getViewport()?.zoom ?? 1;
      const size = 10 / zoom;

      this.previewGraphics.setStrokeStyle({
        width: 1 / zoom,
        color: 0xffffff,
        alpha: 0.8,
      });

      this.previewGraphics.moveTo(ctx.worldPosition.x - size, ctx.worldPosition.y);
      this.previewGraphics.lineTo(ctx.worldPosition.x + size, ctx.worldPosition.y);
      this.previewGraphics.moveTo(ctx.worldPosition.x, ctx.worldPosition.y - size);
      this.previewGraphics.lineTo(ctx.worldPosition.x, ctx.worldPosition.y + size);
      this.previewGraphics.stroke();
    }
  }
}
```

---

### 3.6 Path Tool Implementation (Bezier Curves)

#### 3.6.1 src/core/tools/PathTool.ts

```typescript
import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { PathToolOptions, Vector2 } from '@/types';
import { hexToNumber, vec2Length, vec2Sub, vec2Add, vec2Scale, vec2Normalize } from '@/utils';

interface PathNode {
  position: Vector2;
  controlIn: Vector2;  // Control point coming into this node
  controlOut: Vector2; // Control point going out of this node
}

/**
 * Path tool for drawing smooth bezier curves
 * Used for rivers, roads, borders, coastlines
 */
export class PathTool extends BaseTool {
  readonly id = 'path';
  readonly name = 'Path';
  readonly icon = 'Spline';
  readonly shortcut = 'P';

  private pathGraphics: Graphics | null = null;
  private nodes: PathNode[] = [];
  private isDrawing: boolean = false;
  private selectedNodeIndex: number = -1;
  private dragMode: 'node' | 'controlIn' | 'controlOut' | null = null;

  private options: PathToolOptions = {
    size: 4,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    strokeWidth: 4,
    smoothing: 0.3,
    closePath: false,
  };

  setOptions(options: Partial<PathToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    // Check if clicking near existing node
    const clickedNodeIndex = this.findNodeAtPosition(ctx.worldPosition);

    if (clickedNodeIndex >= 0) {
      // Select existing node for editing
      this.selectedNodeIndex = clickedNodeIndex;
      this.dragMode = 'node';

      // Check if clicking on control points
      const node = this.nodes[clickedNodeIndex];
      if (this.isNearPoint(ctx.worldPosition, node.controlIn, 10)) {
        this.dragMode = 'controlIn';
      } else if (this.isNearPoint(ctx.worldPosition, node.controlOut, 10)) {
        this.dragMode = 'controlOut';
      }
    } else {
      // Add new node
      if (!this.isDrawing) {
        // Start new path
        this.isDrawing = true;
        this.pathGraphics = new Graphics();
        ctx.activeLayer.addContent(this.pathGraphics);
        this.nodes = [];
      }

      // Create new node with auto-smoothed control points
      const newNode = this.createNode(ctx.worldPosition);
      this.nodes.push(newNode);
      this.selectedNodeIndex = this.nodes.length - 1;

      // Auto-smooth control points based on neighboring nodes
      this.smoothControlPoints();

      // Redraw path
      this.redrawPath();
    }
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || this.selectedNodeIndex < 0) return;

    const node = this.nodes[this.selectedNodeIndex];

    switch (this.dragMode) {
      case 'node':
        // Move entire node
        const delta = vec2Sub(ctx.worldPosition, node.position);
        node.position = ctx.worldPosition;
        node.controlIn = vec2Add(node.controlIn, delta);
        node.controlOut = vec2Add(node.controlOut, delta);
        break;

      case 'controlIn':
        node.controlIn = ctx.worldPosition;
        // Mirror control out for smooth curves (optional)
        if (!ctx.input.modifiers.alt) {
          const dist = vec2Length(vec2Sub(node.controlOut, node.position));
          const dir = vec2Normalize(vec2Sub(node.position, node.controlIn));
          node.controlOut = vec2Add(node.position, vec2Scale(dir, dist));
        }
        break;

      case 'controlOut':
        node.controlOut = ctx.worldPosition;
        // Mirror control in for smooth curves (optional)
        if (!ctx.input.modifiers.alt) {
          const dist = vec2Length(vec2Sub(node.controlIn, node.position));
          const dir = vec2Normalize(vec2Sub(node.position, node.controlOut));
          node.controlIn = vec2Add(node.position, vec2Scale(dir, dist));
        }
        break;
    }

    this.redrawPath();
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    this.dragMode = null;
    return null; // Don't complete operation yet - path is still being built
  }

  onKeyDown(ctx: ToolContext, key: string): void {
    switch (key) {
      case 'Enter':
      case 'Escape':
        // Complete path
        this.completePath(ctx);
        break;

      case 'Backspace':
      case 'Delete':
        // Remove last node
        if (this.nodes.length > 0) {
          this.nodes.pop();
          this.selectedNodeIndex = this.nodes.length - 1;
          this.redrawPath();
        }
        break;

      case 'c':
        // Toggle close path
        this.options.closePath = !this.options.closePath;
        this.redrawPath();
        break;
    }
  }

  /**
   * Complete the path and finalize
   */
  private completePath(ctx: ToolContext): ToolOperationResult | null {
    if (!this.pathGraphics || this.nodes.length < 2) {
      // Cancel if not enough nodes
      this.cancelPath();
      return null;
    }

    const layerId = ctx.activeLayer?.id ?? '';
    const pathRef = this.pathGraphics;

    // Reset state
    this.isDrawing = false;
    this.pathGraphics = null;
    this.nodes = [];
    this.selectedNodeIndex = -1;

    ctx.activeLayer?.markDirty();

    return {
      type: 'path',
      layerId,
      undoData: { graphics: pathRef },
      redoData: { graphics: pathRef },
    };
  }

  /**
   * Cancel current path
   */
  private cancelPath(): void {
    if (this.pathGraphics?.parent) {
      this.pathGraphics.parent.removeChild(this.pathGraphics);
      this.pathGraphics.destroy();
    }
    this.isDrawing = false;
    this.pathGraphics = null;
    this.nodes = [];
    this.selectedNodeIndex = -1;
  }

  /**
   * Create a new node at position
   */
  private createNode(position: Vector2): PathNode {
    return {
      position: { ...position },
      controlIn: { ...position },
      controlOut: { ...position },
    };
  }

  /**
   * Auto-smooth control points based on neighboring nodes
   */
  private smoothControlPoints(): void {
    const smoothFactor = this.options.smoothing;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const prev = this.nodes[i - 1];
      const next = this.nodes[i + 1];

      if (prev && next) {
        // Middle node - smooth based on neighbors
        const direction = vec2Normalize(vec2Sub(next.position, prev.position));
        const distPrev = vec2Length(vec2Sub(node.position, prev.position)) * smoothFactor;
        const distNext = vec2Length(vec2Sub(next.position, node.position)) * smoothFactor;

        node.controlIn = vec2Sub(node.position, vec2Scale(direction, distPrev));
        node.controlOut = vec2Add(node.position, vec2Scale(direction, distNext));
      } else if (prev) {
        // Last node
        const direction = vec2Normalize(vec2Sub(node.position, prev.position));
        const dist = vec2Length(vec2Sub(node.position, prev.position)) * smoothFactor;
        node.controlIn = vec2Sub(node.position, vec2Scale(direction, dist));
        node.controlOut = vec2Add(node.position, vec2Scale(direction, dist * 0.5));
      } else if (next) {
        // First node
        const direction = vec2Normalize(vec2Sub(next.position, node.position));
        const dist = vec2Length(vec2Sub(next.position, node.position)) * smoothFactor;
        node.controlIn = vec2Sub(node.position, vec2Scale(direction, dist * 0.5));
        node.controlOut = vec2Add(node.position, vec2Scale(direction, dist));
      }
    }
  }

  /**
   * Redraw the entire path
   */
  private redrawPath(): void {
    if (!this.pathGraphics) return;

    this.pathGraphics.clear();

    if (this.nodes.length < 1) return;

    const strokeColor = hexToNumber(this.options.primaryColor);

    this.pathGraphics.setStrokeStyle({
      width: this.options.strokeWidth,
      color: strokeColor,
      alpha: this.options.opacity,
      cap: 'round',
      join: 'round',
    });

    // Draw bezier path
    this.pathGraphics.moveTo(this.nodes[0].position.x, this.nodes[0].position.y);

    for (let i = 1; i < this.nodes.length; i++) {
      const prev = this.nodes[i - 1];
      const curr = this.nodes[i];

      this.pathGraphics.bezierCurveTo(
        prev.controlOut.x,
        prev.controlOut.y,
        curr.controlIn.x,
        curr.controlIn.y,
        curr.position.x,
        curr.position.y
      );
    }

    // Close path if needed
    if (this.options.closePath && this.nodes.length > 2) {
      const last = this.nodes[this.nodes.length - 1];
      const first = this.nodes[0];
      this.pathGraphics.bezierCurveTo(
        last.controlOut.x,
        last.controlOut.y,
        first.controlIn.x,
        first.controlIn.y,
        first.position.x,
        first.position.y
      );
    }

    this.pathGraphics.stroke();
  }

  /**
   * Find node at position
   */
  private findNodeAtPosition(position: Vector2, threshold: number = 15): number {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.isNearPoint(position, this.nodes[i].position, threshold)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if position is near a point
   */
  private isNearPoint(position: Vector2, point: Vector2, threshold: number): boolean {
    return vec2Length(vec2Sub(position, point)) < threshold;
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;

    // Draw node handles when editing
    if (this.isDrawing && this.nodes.length > 0) {
      // Draw control point handles
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        const isSelected = i === this.selectedNodeIndex;

        // Control point lines
        this.previewGraphics.setStrokeStyle({
          width: 1 / zoom,
          color: 0x888888,
          alpha: 0.6,
        });
        this.previewGraphics.moveTo(node.controlIn.x, node.controlIn.y);
        this.previewGraphics.lineTo(node.position.x, node.position.y);
        this.previewGraphics.lineTo(node.controlOut.x, node.controlOut.y);
        this.previewGraphics.stroke();

        // Node point
        this.previewGraphics.circle(node.position.x, node.position.y, 5 / zoom);
        this.previewGraphics.fill({ color: isSelected ? 0x00ff00 : 0xffffff });

        // Control points
        this.previewGraphics.circle(node.controlIn.x, node.controlIn.y, 3 / zoom);
        this.previewGraphics.fill({ color: 0x0088ff });
        this.previewGraphics.circle(node.controlOut.x, node.controlOut.y, 3 / zoom);
        this.previewGraphics.fill({ color: 0xff8800 });
      }

      // Instructions
      // (In a real app, this would be shown in the UI, not on canvas)
    }

    // Cursor crosshair
    if (!ctx.isStroking) {
      const size = 8 / zoom;
      this.previewGraphics.setStrokeStyle({
        width: 1 / zoom,
        color: 0xffffff,
        alpha: 0.8,
      });
      this.previewGraphics.moveTo(ctx.worldPosition.x - size, ctx.worldPosition.y);
      this.previewGraphics.lineTo(ctx.worldPosition.x + size, ctx.worldPosition.y);
      this.previewGraphics.moveTo(ctx.worldPosition.x, ctx.worldPosition.y - size);
      this.previewGraphics.lineTo(ctx.worldPosition.x, ctx.worldPosition.y + size);
      this.previewGraphics.stroke();
    }
  }
}
```

---

### 3.7 Select Tool Implementation

#### 3.7.1 src/core/tools/SelectTool.ts

```typescript
import { Graphics, Container, Rectangle } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { Vector2, Bounds } from '@/types';
import { vec2Sub, vec2Add, vec2Scale } from '@/utils';

type SelectMode = 'none' | 'selecting' | 'moving' | 'resizing';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Selection tool for selecting and transforming content
 */
export class SelectTool extends BaseTool {
  readonly id = 'select';
  readonly name = 'Select';
  readonly icon = 'MousePointer2';
  readonly shortcut = 'V';

  private selectionBounds: Bounds | null = null;
  private selectionGraphics: Graphics;
  private mode: SelectMode = 'none';
  private activeHandle: ResizeHandle | null = null;
  private startPosition: Vector2 | null = null;
  private startBounds: Bounds | null = null;

  constructor() {
    super();
    this.selectionGraphics = new Graphics();
    this.previewContainer.addChild(this.selectionGraphics);
  }

  getCursor(): ToolCursor {
    if (this.mode === 'moving') {
      return { type: 'move' };
    }
    if (this.activeHandle) {
      return { type: 'move' }; // Could be more specific resize cursors
    }
    return { type: 'default' };
  }

  onPointerDown(ctx: ToolContext): void {
    this.startPosition = { ...ctx.worldPosition };

    // Check if clicking on resize handle
    if (this.selectionBounds) {
      const handle = this.getHandleAtPosition(ctx.worldPosition);
      if (handle) {
        this.mode = 'resizing';
        this.activeHandle = handle;
        this.startBounds = { ...this.selectionBounds };
        return;
      }

      // Check if clicking inside selection
      if (this.isInsideBounds(ctx.worldPosition, this.selectionBounds)) {
        this.mode = 'moving';
        this.startBounds = { ...this.selectionBounds };
        return;
      }
    }

    // Start new selection
    this.mode = 'selecting';
    this.selectionBounds = null;
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || !this.startPosition) return;

    switch (this.mode) {
      case 'selecting':
        // Update selection rectangle
        this.selectionBounds = this.createBoundsFromPoints(
          this.startPosition,
          ctx.worldPosition
        );
        break;

      case 'moving':
        if (this.startBounds) {
          const delta = vec2Sub(ctx.worldPosition, this.startPosition);
          this.selectionBounds = {
            x: this.startBounds.x + delta.x,
            y: this.startBounds.y + delta.y,
            width: this.startBounds.width,
            height: this.startBounds.height,
          };
        }
        break;

      case 'resizing':
        if (this.startBounds && this.activeHandle) {
          this.selectionBounds = this.resizeBounds(
            this.startBounds,
            this.activeHandle,
            this.startPosition,
            ctx.worldPosition
          );
        }
        break;
    }

    this.drawSelection(ctx);
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    const previousMode = this.mode;
    this.mode = 'none';
    this.activeHandle = null;
    this.startPosition = null;
    this.startBounds = null;

    // If selection is too small, clear it
    if (
      this.selectionBounds &&
      (this.selectionBounds.width < 5 || this.selectionBounds.height < 5)
    ) {
      this.selectionBounds = null;
    }

    this.drawSelection(ctx);

    // Return transform operation if we moved/resized
    if (previousMode === 'moving' || previousMode === 'resizing') {
      return {
        type: 'transform',
        layerId: ctx.activeLayer?.id ?? '',
        undoData: { bounds: this.startBounds },
        redoData: { bounds: this.selectionBounds },
      };
    }

    return null;
  }

  onKeyDown(ctx: ToolContext, key: string): void {
    if (key === 'Escape') {
      this.selectionBounds = null;
      this.drawSelection(ctx);
    }

    // Arrow key nudging
    if (this.selectionBounds) {
      const nudge = ctx.input.modifiers.shift ? 10 : 1;
      switch (key) {
        case 'ArrowUp':
          this.selectionBounds.y -= nudge;
          break;
        case 'ArrowDown':
          this.selectionBounds.y += nudge;
          break;
        case 'ArrowLeft':
          this.selectionBounds.x -= nudge;
          break;
        case 'ArrowRight':
          this.selectionBounds.x += nudge;
          break;
      }
      this.drawSelection(ctx);
    }
  }

  /**
   * Draw selection rectangle and handles
   */
  private drawSelection(ctx: ToolContext): void {
    this.selectionGraphics.clear();

    if (!this.selectionBounds) return;

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;
    const { x, y, width, height } = this.selectionBounds;

    // Selection rectangle
    this.selectionGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0x00aaff,
      alpha: 1,
    });
    this.selectionGraphics.rect(x, y, width, height);
    this.selectionGraphics.stroke();

    // Dashed line effect (simplified - just solid for now)
    this.selectionGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0xffffff,
      alpha: 0.5,
    });
    this.selectionGraphics.rect(x, y, width, height);
    this.selectionGraphics.stroke();

    // Draw resize handles
    const handleSize = 8 / zoom;
    const handles = this.getHandlePositions(this.selectionBounds);

    for (const pos of Object.values(handles)) {
      this.selectionGraphics.rect(
        pos.x - handleSize / 2,
        pos.y - handleSize / 2,
        handleSize,
        handleSize
      );
      this.selectionGraphics.fill({ color: 0xffffff });
      this.selectionGraphics.setStrokeStyle({
        width: 1 / zoom,
        color: 0x00aaff,
      });
      this.selectionGraphics.stroke();
    }
  }

  /**
   * Get positions of all resize handles
   */
  private getHandlePositions(bounds: Bounds): Record<ResizeHandle, Vector2> {
    const { x, y, width, height } = bounds;
    return {
      nw: { x, y },
      n: { x: x + width / 2, y },
      ne: { x: x + width, y },
      e: { x: x + width, y: y + height / 2 },
      se: { x: x + width, y: y + height },
      s: { x: x + width / 2, y: y + height },
      sw: { x, y: y + height },
      w: { x, y: y + height / 2 },
    };
  }

  /**
   * Find handle at position
   */
  private getHandleAtPosition(position: Vector2): ResizeHandle | null {
    if (!this.selectionBounds) return null;

    const handles = this.getHandlePositions(this.selectionBounds);
    const threshold = 10;

    for (const [handle, pos] of Object.entries(handles)) {
      const dx = Math.abs(position.x - pos.x);
      const dy = Math.abs(position.y - pos.y);
      if (dx < threshold && dy < threshold) {
        return handle as ResizeHandle;
      }
    }

    return null;
  }

  /**
   * Check if position is inside bounds
   */
  private isInsideBounds(position: Vector2, bounds: Bounds): boolean {
    return (
      position.x >= bounds.x &&
      position.x <= bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y <= bounds.y + bounds.height
    );
  }

  /**
   * Create bounds from two points
   */
  private createBoundsFromPoints(p1: Vector2, p2: Vector2): Bounds {
    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.abs(p2.x - p1.x),
      height: Math.abs(p2.y - p1.y),
    };
  }

  /**
   * Resize bounds based on handle drag
   */
  private resizeBounds(
    original: Bounds,
    handle: ResizeHandle,
    startPos: Vector2,
    currentPos: Vector2
  ): Bounds {
    const delta = vec2Sub(currentPos, startPos);
    const result = { ...original };

    // Handle horizontal resize
    if (handle.includes('w')) {
      result.x = original.x + delta.x;
      result.width = original.width - delta.x;
    } else if (handle.includes('e')) {
      result.width = original.width + delta.x;
    }

    // Handle vertical resize
    if (handle.includes('n')) {
      result.y = original.y + delta.y;
      result.height = original.height - delta.y;
    } else if (handle.includes('s')) {
      result.height = original.height + delta.y;
    }

    // Ensure positive dimensions
    if (result.width < 0) {
      result.x += result.width;
      result.width = Math.abs(result.width);
    }
    if (result.height < 0) {
      result.y += result.height;
      result.height = Math.abs(result.height);
    }

    return result;
  }

  renderPreview(ctx: ToolContext): void {
    // Selection is drawn in drawSelection, called from onPointerMove
    if (!ctx.isStroking) {
      this.drawSelection(ctx);
    }
  }
}
```

---

### 3.8 Remaining Tool Stubs

#### 3.8.1 src/core/tools/PanTool.ts

```typescript
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';

/**
 * Pan tool - handled by canvas engine directly, this is mostly a placeholder
 */
export class PanTool extends BaseTool {
  readonly id = 'pan';
  readonly name = 'Pan';
  readonly icon = 'Hand';
  readonly shortcut = 'H';

  getCursor(): ToolCursor {
    return { type: 'grab' };
  }

  onPointerDown(ctx: ToolContext): void {
    // Panning is handled by CanvasEngine
  }

  onPointerMove(ctx: ToolContext): void {
    // Panning is handled by CanvasEngine
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    return null;
  }
}
```

#### 3.8.2 src/core/tools/FillTool.ts

```typescript
import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BaseToolOptions } from '@/types';
import { hexToNumber } from '@/utils';

/**
 * Fill tool - flood fills enclosed areas
 * Note: Full implementation would require pixel-based flood fill
 */
export class FillTool extends BaseTool {
  readonly id = 'fill';
  readonly name = 'Fill';
  readonly icon = 'PaintBucket';
  readonly shortcut = 'G';

  private options: BaseToolOptions = {
    size: 20,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
  };

  setOptions(options: Partial<BaseToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    // For now, just draw a filled circle at click position
    // Full flood fill would require pixel manipulation
    const fillGraphics = new Graphics();
    fillGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 50);
    fillGraphics.fill({
      color: hexToNumber(this.options.primaryColor),
      alpha: this.options.opacity,
    });

    ctx.activeLayer.addContent(fillGraphics);
    ctx.activeLayer.markDirty();
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    return {
      type: 'fill',
      layerId: ctx.activeLayer?.id ?? '',
      undoData: {},
      redoData: {},
    };
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;
    const color = hexToNumber(this.options.primaryColor);

    // Paint bucket cursor
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 3 / zoom);
    this.previewGraphics.fill({ color, alpha: this.options.opacity });

    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0xffffff,
      alpha: 0.8,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 3 / zoom);
    this.previewGraphics.stroke();
  }
}
```

#### 3.8.3 src/core/tools/StampTool.ts

```typescript
import { Sprite, Texture, Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BaseToolOptions } from '@/types';

/**
 * Stamp tool for placing icons and symbols
 */
export class StampTool extends BaseTool {
  readonly id = 'stamp';
  readonly name = 'Stamp';
  readonly icon = 'Stamp';
  readonly shortcut = 'S';

  private currentTexture: Texture | null = null;
  private previewSprite: Sprite | null = null;

  private options: BaseToolOptions & { rotation: number; scale: number } = {
    size: 48,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    rotation: 0,
    scale: 1,
  };

  setOptions(options: Partial<typeof this.options>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Set the stamp texture
   */
  setTexture(texture: Texture): void {
    this.currentTexture = texture;
    if (this.previewSprite) {
      this.previewSprite.texture = texture;
    }
  }

  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  onActivate(ctx: ToolContext): void {
    super.onActivate(ctx);

    // Create preview sprite
    if (this.currentTexture) {
      this.previewSprite = new Sprite(this.currentTexture);
      this.previewSprite.anchor.set(0.5);
      this.previewSprite.alpha = 0.5;
      this.previewContainer.addChild(this.previewSprite);
    }
  }

  onDeactivate(ctx: ToolContext): void {
    if (this.previewSprite) {
      this.previewContainer.removeChild(this.previewSprite);
      this.previewSprite.destroy();
      this.previewSprite = null;
    }
    super.onDeactivate(ctx);
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer || !this.currentTexture) return;

    // Create stamp sprite
    const stamp = new Sprite(this.currentTexture);
    stamp.anchor.set(0.5);
    stamp.position.set(ctx.worldPosition.x, ctx.worldPosition.y);
    stamp.rotation = this.options.rotation;
    stamp.scale.set(this.options.scale);
    stamp.alpha = this.options.opacity;

    ctx.activeLayer.addContent(stamp);
    ctx.activeLayer.markDirty();
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    return {
      type: 'stamp',
      layerId: ctx.activeLayer?.id ?? '',
      undoData: {},
      redoData: {},
    };
  }

  renderPreview(ctx: ToolContext): void {
    if (this.previewSprite) {
      this.previewSprite.position.set(ctx.worldPosition.x, ctx.worldPosition.y);
      this.previewSprite.rotation = this.options.rotation;
      this.previewSprite.scale.set(this.options.scale);
    } else {
      // Fallback: draw placeholder
      this.previewGraphics.clear();
      const zoom = ctx.engine.getViewport()?.zoom ?? 1;

      this.previewGraphics.setStrokeStyle({
        width: 1 / zoom,
        color: 0xffffff,
        alpha: 0.5,
      });
      this.previewGraphics.rect(
        ctx.worldPosition.x - this.options.size / 2,
        ctx.worldPosition.y - this.options.size / 2,
        this.options.size,
        this.options.size
      );
      this.previewGraphics.stroke();
    }
  }
}
```

#### 3.8.4 src/core/tools/TextTool.ts

```typescript
import { Text, TextStyle, Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { TextToolOptions } from '@/types';
import { hexToNumber } from '@/utils';

/**
 * Text tool for adding labels and annotations
 */
export class TextTool extends BaseTool {
  readonly id = 'text';
  readonly name = 'Text';
  readonly icon = 'Type';
  readonly shortcut = 'T';

  private isEditing: boolean = false;
  private currentText: Text | null = null;
  private inputElement: HTMLInputElement | null = null;

  private options: TextToolOptions = {
    size: 24,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    fontFamily: 'IM Fell English',
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    textAlign: 'left',
  };

  setOptions(options: Partial<TextToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getCursor(): ToolCursor {
    return { type: 'default' };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    if (this.isEditing) {
      // Finish current text
      this.finishEditing(ctx);
    }

    // Start new text input
    this.startEditing(ctx);
  }

  onKeyDown(ctx: ToolContext, key: string): void {
    if (key === 'Escape' && this.isEditing) {
      this.cancelEditing();
    } else if (key === 'Enter' && this.isEditing) {
      this.finishEditing(ctx);
    }
  }

  /**
   * Start text editing at position
   */
  private startEditing(ctx: ToolContext): void {
    this.isEditing = true;

    // Create text object with placeholder
    const style = new TextStyle({
      fontFamily: this.options.fontFamily,
      fontSize: this.options.fontSize,
      fontWeight: this.options.fontWeight.toString() as any,
      fontStyle: this.options.fontStyle,
      fill: this.options.primaryColor,
      align: this.options.textAlign,
    });

    this.currentText = new Text({ text: '|', style });
    this.currentText.position.set(ctx.worldPosition.x, ctx.worldPosition.y);
    this.currentText.alpha = this.options.opacity;

    ctx.activeLayer?.addContent(this.currentText);

    // Create hidden input for text entry
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.style.position = 'absolute';
    this.inputElement.style.opacity = '0';
    this.inputElement.style.pointerEvents = 'none';
    document.body.appendChild(this.inputElement);
    this.inputElement.focus();

    this.inputElement.addEventListener('input', () => {
      if (this.currentText && this.inputElement) {
        this.currentText.text = this.inputElement.value || '|';
      }
    });
  }

  /**
   * Finish editing and commit text
   */
  private finishEditing(ctx: ToolContext): void {
    if (this.currentText && this.inputElement) {
      const text = this.inputElement.value.trim();
      if (text) {
        this.currentText.text = text;
      } else {
        // Remove empty text
        if (this.currentText.parent) {
          this.currentText.parent.removeChild(this.currentText);
        }
        this.currentText.destroy();
      }
    }

    this.cleanup();
    ctx.activeLayer?.markDirty();
  }

  /**
   * Cancel editing
   */
  private cancelEditing(): void {
    if (this.currentText?.parent) {
      this.currentText.parent.removeChild(this.currentText);
      this.currentText.destroy();
    }
    this.cleanup();
  }

  /**
   * Cleanup editing state
   */
  private cleanup(): void {
    this.isEditing = false;
    this.currentText = null;
    if (this.inputElement) {
      document.body.removeChild(this.inputElement);
      this.inputElement = null;
    }
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    if (!this.isEditing) return null;

    return {
      type: 'text',
      layerId: ctx.activeLayer?.id ?? '',
      undoData: {},
      redoData: {},
    };
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    if (!this.isEditing) {
      const zoom = ctx.engine.getViewport()?.zoom ?? 1;

      // Text cursor
      this.previewGraphics.setStrokeStyle({
        width: 2 / zoom,
        color: hexToNumber(this.options.primaryColor),
        alpha: 0.8,
      });
      this.previewGraphics.moveTo(ctx.worldPosition.x, ctx.worldPosition.y);
      this.previewGraphics.lineTo(ctx.worldPosition.x, ctx.worldPosition.y + this.options.fontSize);
      this.previewGraphics.stroke();
    }
  }

  onDeactivate(ctx: ToolContext): void {
    if (this.isEditing) {
      this.finishEditing(ctx);
    }
    super.onDeactivate(ctx);
  }
}
```

#### 3.8.5 src/core/tools/EyedropperTool.ts

```typescript
import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import { numberToHex } from '@/utils';

/**
 * Eyedropper tool for picking colors from the canvas
 */
export class EyedropperTool extends BaseTool {
  readonly id = 'eyedropper';
  readonly name = 'Eyedropper';
  readonly icon = 'Pipette';
  readonly shortcut = 'I';

  private pickedColor: string = '#000000';
  private onColorPicked?: (color: string) => void;

  /**
   * Set callback for when color is picked
   */
  setOnColorPicked(callback: (color: string) => void): void {
    this.onColorPicked = callback;
  }

  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  onPointerDown(ctx: ToolContext): void {
    // In a real implementation, we would sample the pixel color
    // from the rendered canvas. For now, this is a placeholder.
    
    // This would require access to the renderer's extract functionality
    // const app = ctx.engine.getApp();
    // const pixel = app.renderer.extract.pixels(...)
    
    // Placeholder: just use a default color
    this.pickedColor = '#5d524a';
    this.onColorPicked?.(this.pickedColor);
  }

  onPointerMove(ctx: ToolContext): void {
    // Could show color preview while hovering
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    return null;
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;

    // Eyedropper cursor with color preview
    this.previewGraphics.setStrokeStyle({
      width: 2 / zoom,
      color: 0xffffff,
      alpha: 1,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 10 / zoom);
    this.previewGraphics.stroke();

    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0x000000,
      alpha: 1,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 11 / zoom);
    this.previewGraphics.stroke();

    // Inner color preview
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 8 / zoom);
    this.previewGraphics.fill({ color: parseInt(this.pickedColor.replace('#', ''), 16) });
  }
}
```

---

### 3.9 Update Core Index

#### 3.9.1 src/core/index.ts (Updated)

```typescript
export * from './canvas';
export * from './layers';
export * from './rendering';
export * from './tools';
```

---

### 3.10 Hook Up Tools to Canvas Engine

#### 3.10.1 src/hooks/useCanvasEngine.ts

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEngine, ToolManager } from '@/core';
import { useCanvasStore, useToolStore, useLayerStore } from '@/stores';
import type { Vector2 } from '@/types';

export interface UseCanvasEngineOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  onReady?: (engine: CanvasEngine) => void;
}

export function useCanvasEngine({ containerRef, onReady }: UseCanvasEngineOptions) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Store hooks
  const { setViewport, grid, setGrid } = useCanvasStore();
  const { activeTool, options: toolOptions } = useToolStore();
  const layerState = useLayerStore();
  const activeLayerId = useLayerStore((s) => s.activeId);

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
          onViewportChange: setViewport,
          onGridChange: setGrid,
          onPointerDown: (screen, world) => {
            toolManagerRef.current?.handlePointerDown(screen, world, {
              screenPosition: screen,
              worldPosition: world,
              isPrimaryDown: true,
              isSecondaryDown: false,
              isMiddleDown: false,
              modifiers: { shift: false, ctrl: false, alt: false, meta: false },
              pressure: 1,
            });
          },
          onPointerMove: (screen, world, isDragging) => {
            toolManagerRef.current?.handlePointerMove(screen, world, {
              screenPosition: screen,
              worldPosition: world,
              isPrimaryDown: isDragging,
              isSecondaryDown: false,
              isMiddleDown: false,
              modifiers: { shift: false, ctrl: false, alt: false, meta: false },
              pressure: 1,
            });
          },
          onPointerUp: (screen, world) => {
            toolManagerRef.current?.handlePointerUp(screen, world, {
              screenPosition: screen,
              worldPosition: world,
              isPrimaryDown: false,
              isSecondaryDown: false,
              isMiddleDown: false,
              modifiers: { shift: false, ctrl: false, alt: false, meta: false },
              pressure: 0,
            });
          },
        }
      )
      .then(() => {
        // Initialize tool manager
        const layerManager = engine.getLayerManager();
        if (layerManager) {
          toolManagerRef.current = new ToolManager(engine, layerManager, {
            getActiveLayerId: () => useLayerStore.getState().activeId,
            getToolOptions: (id) => useToolStore.getState().options[id as keyof typeof toolOptions],
            onOperationComplete: (result) => {
              console.log('Operation complete:', result);
              // Here we would add to history for undo/redo
            },
          });

          // Set initial tool
          toolManagerRef.current.setActiveTool(activeTool);
        }

        setIsReady(true);
        onReady?.(engine);
      });

    return () => {
      toolManagerRef.current?.destroy();
      engine.destroy();
      engineRef.current = null;
      toolManagerRef.current = null;
    };
  }, []);

  // Sync active tool
  useEffect(() => {
    if (isReady && toolManagerRef.current) {
      toolManagerRef.current.setActiveTool(activeTool);

      // Update tool options
      const tool = toolManagerRef.current.getTool(activeTool);
      if (tool && 'setOptions' in tool) {
        (tool as any).setOptions(toolOptions[activeTool as keyof typeof toolOptions]);
      }
    }
  }, [isReady, activeTool, toolOptions]);

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

  return {
    engine: engineRef.current,
    toolManager: toolManagerRef.current,
    isReady,
  };
}
```

#### 3.10.2 src/hooks/useKeyboardShortcuts.ts

```typescript
import { useEffect } from 'react';
import { useToolStore, useCanvasStore } from '@/stores';
import type { ToolType } from '@/types';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  v: 'select',
  h: 'pan',
  b: 'brush',
  e: 'eraser',
  u: 'shape',
  p: 'path',
  g: 'fill',
  s: 'stamp',
  t: 'text',
  i: 'eyedropper',
};

export interface UseKeyboardShortcutsOptions {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitToCanvas?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { setActiveTool, swapColors } = useToolStore();
  const { toggleGrid, toggleSnapToGrid } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = TOOL_SHORTCUTS[key];
        if (tool) {
          e.preventDefault();
          setActiveTool(tool);
          return;
        }

        // Other shortcuts
        switch (key) {
          case 'x':
            e.preventDefault();
            swapColors();
            break;
          case "'":
          case 'g':
            if (e.shiftKey) {
              e.preventDefault();
              toggleGrid();
            }
            break;
          case '=':
          case '+':
            e.preventDefault();
            options.onZoomIn?.();
            break;
          case '-':
            e.preventDefault();
            options.onZoomOut?.();
            break;
          case '0':
            e.preventDefault();
            options.onFitToCanvas?.();
            break;
        }
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              options.onRedo?.();
            } else {
              options.onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            options.onRedo?.();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, swapColors, toggleGrid, toggleSnapToGrid, options]);
}
```

#### 3.10.3 src/hooks/index.ts

```typescript
export { useCanvasEngine } from './useCanvasEngine';
export type { UseCanvasEngineOptions } from './useCanvasEngine';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export type { UseKeyboardShortcutsOptions } from './useKeyboardShortcuts';
```

---

### 3.11 Updated Canvas Container with Tools

#### 3.11.1 src/components/canvas/CanvasContainer.tsx (Updated)

```typescript
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasEngine, useKeyboardShortcuts } from '@/hooks';
import type { Vector2 } from '@/types';

interface CanvasContainerProps {
  onCursorMove?: (position: Vector2) => void;
}

export function CanvasContainer({ onCursorMove }: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState<Vector2>({ x: 0, y: 0 });

  const { engine, isReady } = useCanvasEngine({
    containerRef,
    onReady: (eng) => {
      eng.fitToCanvas();
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onZoomIn: () => {
      const viewport = engine?.getViewport();
      if (viewport) {
        engine?.setZoom(viewport.zoom * 1.25);
      }
    },
    onZoomOut: () => {
      const viewport = engine?.getViewport();
      if (viewport) {
        engine?.setZoom(viewport.zoom * 0.8);
      }
    },
    onFitToCanvas: () => {
      engine?.fitToCanvas();
    },
    onUndo: () => {
      console.log('Undo'); // Will implement in Phase 10
    },
    onRedo: () => {
      console.log('Redo'); // Will implement in Phase 10
    },
  });

  // Track cursor position for status bar
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!engine) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const screenPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const worldPos = engine.screenToWorld(screenPos);
      setCursorPos(worldPos);
      onCursorMove?.(worldPos);
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [engine, onCursorMove]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-ink-950 outline-none"
      tabIndex={0}
      style={{ touchAction: 'none' }}
    />
  );
}
```

---

### 3.12 Updated App Component

#### 3.12.1 src/App.tsx (Updated)

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
import { useLayerStore } from '@/stores';
import type { Vector2 } from '@/types';

export default function App() {
  const [cursorPosition, setCursorPosition] = useState<Vector2>({ x: 0, y: 0 });
  const [leftPanelOpen] = useState(true);
  const [rightPanelOpen] = useState(true);

  const { createLayer, rootOrder } = useLayerStore();

  // Create default layer on first render
  React.useEffect(() => {
    if (rootOrder.length === 0) {
      createLayer({ type: 'terrain', name: 'Background' });
    }
  }, []);

  const handleCursorMove = useCallback((position: Vector2) => {
    setCursorPosition(position);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell
        toolbar={<Toolbar />}
        leftPanel={<PropertiesPanel />}
        rightPanel={<LayerPanel />}
        statusBar={<StatusBar cursorPosition={cursorPosition} />}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
      >
        <CanvasContainer onCursorMove={handleCursorMove} />
      </AppShell>
    </TooltipProvider>
  );
}
```

---

### 3.13 Updated Toolbar with Engine Controls

#### 3.13.1 src/components/layout/Toolbar.tsx (Updated)

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
  Undo,
  Redo,
} from 'lucide-react';
import { useToolStore, useCanvasStore } from '@/stores';
import {
  Button,
  Toggle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui';
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

export function Toolbar() {
  const { activeTool, setActiveTool } = useToolStore();
  const { grid, toggleGrid, toggleSnapToGrid } = useCanvasStore();

  return (
    <div className="h-full flex items-center justify-between px-2 bg-ink-900">
      {/* Left: History */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled>
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" disabled>
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-ink-700 mx-2" />

        {/* Tools */}
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
          <TooltipContent>Toggle Grid</TooltipContent>
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
            <Button variant="ghost" size="icon-sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out (-)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In (+)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Canvas (0)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset View</TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-ink-700 mx-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm">
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

---

### 3.14 Verification Checklist for Phase 3

After implementing Phase 3, verify the following:

```
□ Project builds without errors (npm run build)
□ Development server starts (npm run dev)
□ All tools are selectable from toolbar
□ Keyboard shortcuts work for tool selection (V, B, E, etc.)
□ Brush tool:
  □ Draws on canvas when clicking/dragging
  □ Stroke is smooth (not jagged)
  □ Size slider affects brush size
  □ Opacity slider affects stroke opacity
  □ Color picker changes brush color
  □ Brush preview circle follows cursor
□ Eraser tool:
  □ Removes content where dragged
  □ Size slider works
□ Shape tool:
  □ Can draw rectangles by click-drag
  □ Can draw ellipses
  □ Can draw polygons
  □ Fill and stroke options work
□ Path tool:
  □ Click to add nodes
  □ Curves are smooth between nodes
  □ Can drag nodes to adjust
  □ Enter/Escape completes/cancels path
□ Select tool:
  □ Can draw selection rectangle
  □ Can move selection
  □ Can resize using handles
  □ Escape clears selection
□ Pan tool or Alt+drag pans canvas
□ X key swaps primary/secondary colors
□ Ctrl+Z/Ctrl+Y logged to console (undo/redo placeholder)
□ Layer must be selected to draw (shows on correct layer)
□ Tool cursor preview renders correctly
```

---

## Summary

Phase 3 establishes the complete tool system:

1. **Tool Architecture** - Base class, interfaces, manager with state machine
2. **Stroke Smoothing** - Exponential moving average, Catmull-Rom interpolation
3. **Brush Tool** - Terrain painting with pressure sensitivity
4. **Eraser Tool** - Content removal with erase blend mode
5. **Shape Tool** - Rectangle, ellipse, polygon, freeform shapes
6. **Path Tool** - Bezier curves for rivers, roads, coastlines
7. **Select Tool** - Selection rectangle with move/resize handles
8. **Keyboard Shortcuts** - Tool selection, zoom, grid toggle

