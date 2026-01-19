import { BaseTool } from './BaseTool';
import { StrokeSmoother } from './StrokeSmoothing';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BiomeType } from '../terrain/types';
import type { Vector2 } from '@/types';
import { vec2Length, vec2Sub, vec2Lerp } from '@/utils';

export interface TerrainBrushOptions {
  size: number;
  strength: number;
  mode: 'paint' | 'raise' | 'lower' | 'smooth';
  activeBiome: BiomeType;
}

/**
 * Specialized brush tool for terrain editing
 */
export class TerrainBrushTool extends BaseTool {
  readonly id = 'terrainBrush';
  readonly name = 'Terrain Brush';
  readonly icon = 'Mountain';
  readonly shortcut = 'M';

  private smoother: StrokeSmoother;
  private lastDrawnPoint: Vector2 | null = null;

  private options: TerrainBrushOptions = {
    size: 50,
    strength: 0.1,
    mode: 'paint',
    activeBiome: 'grassland',
  };

  // Callback to get terrain layer
  private getTerrainLayer?: () => any;

  constructor() {
    super();
    this.smoother = new StrokeSmoother({
      enabled: true,
      smoothing: 0.3,
      minDistance: 5,
    });
  }

  setOptions(options: Partial<TerrainBrushOptions>): void {
    this.options = { ...this.options, ...options };
  }

  setTerrainLayerGetter(getter: () => any): void {
    this.getTerrainLayer = getter;
  }

  getCursor(): ToolCursor {
    return {
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.options.size / 2,
    };
  }

  onPointerDown(ctx: ToolContext): void {
    this.smoother.reset();
    const point = this.smoother.addPoint(ctx.worldPosition, 1);

    if (point) {
      this.applyBrush(ctx, point.position);
      this.lastDrawnPoint = point.position;
    }
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking) return;

    const point = this.smoother.addPoint(ctx.worldPosition, 1);

    if (point && this.lastDrawnPoint) {
      // Interpolate between points
      const distance = vec2Length(vec2Sub(point.position, this.lastDrawnPoint));
      const spacing = this.options.size * 0.25;
      const steps = Math.ceil(distance / spacing);

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pos = vec2Lerp(this.lastDrawnPoint, point.position, t);
        this.applyBrush(ctx, pos);
      }

      this.lastDrawnPoint = point.position;
    }
  }

  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
    this.lastDrawnPoint = null;

    // Trigger re-render of terrain
    const terrainLayer = this.getTerrainLayer?.();
    if (terrainLayer) {
      terrainLayer.rerender();
    }

    return {
      type: 'terrain-edit',
      layerId: terrainLayer?.id ?? '',
      undoData: {},
      redoData: {},
    };
  }

  /**
   * Apply brush effect at position
   */
  private applyBrush(_ctx: ToolContext, position: Vector2): void {
    const terrainLayer = this.getTerrainLayer?.();
    if (!terrainLayer) return;

    const renderer = terrainLayer.getRenderer?.();
    if (!renderer) return;

    switch (this.options.mode) {
      case 'paint':
        renderer.paintBiome(
          position.x,
          position.y,
          this.options.activeBiome,
          this.options.size
        );
        break;

      case 'raise':
        renderer.modifyElevation(
          position.x,
          position.y,
          this.options.strength,
          this.options.size
        );
        break;

      case 'lower':
        renderer.modifyElevation(
          position.x,
          position.y,
          -this.options.strength,
          this.options.size
        );
        break;

      case 'smooth':
        // Smooth would require more complex implementation
        break;
    }
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;
    const size = this.options.size;

    // Outer circle
    this.previewGraphics.setStrokeStyle({
      width: 2 / zoom,
      color: 0xffffff,
      alpha: 0.8,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, size / 2);
    this.previewGraphics.stroke();

    // Inner circle (strength indicator)
    const innerSize = size * 0.3;
    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0xffffff,
      alpha: 0.4,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, innerSize / 2);
    this.previewGraphics.stroke();

    // Mode indicator
    let modeColor = 0x00ff00; // Paint
    if (this.options.mode === 'raise') modeColor = 0xff8800;
    if (this.options.mode === 'lower') modeColor = 0x0088ff;
    if (this.options.mode === 'smooth') modeColor = 0xff00ff;

    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 3 / zoom);
    this.previewGraphics.fill({ color: modeColor, alpha: 0.8 });
  }
}
