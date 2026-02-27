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
  readonly id = 'forest-brush';
  readonly name = 'Forest Brush';
  readonly icon = 'trees';

  private settings: ForestBrushSettings;
  private isDrawing: boolean = false;
  private strokePoints: Vector2[] = [];
  private onForestPainted: ((stroke: ForestStroke) => void) | null = null;

  constructor() {
    super();
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

    if (this.isDrawing && this.strokePoints.length > 0) {
      const lastPoint = this.strokePoints[this.strokePoints.length - 1];
      if (lastPoint) {
        const dist = this.distance(ctx.worldPosition, lastPoint);

        // Add point if moved enough (spacing based on radius)
        const spacing = this.settings.radius * 0.3;
        if (dist >= spacing) {
          this.strokePoints.push({ ...ctx.worldPosition });
          this.applyBrush(ctx.worldPosition);
        }
      }
    }
  }

  /**
   * Handle pointer up - finish stroke
   */
  onPointerUp(_ctx: ToolContext): null {
    if (!this.isDrawing) return null;

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

    return null;
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
      const firstPt = this.strokePoints[0];
      if (firstPt) {
        this.previewGraphics.moveTo(firstPt.x, firstPt.y);
        for (let i = 1; i < this.strokePoints.length; i++) {
          const pt = this.strokePoints[i];
          if (pt) {
            this.previewGraphics.lineTo(pt.x, pt.y);
          }
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
}
