import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import { StrokeSmoother } from './StrokeSmoothing';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BrushToolOptions, Vector2 } from '@/types';
import { hexToNumber, vec2Length, vec2Sub, vec2Lerp, debug } from '@/utils';

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
   * Get current options
   */
  getOptions(): BrushToolOptions {
    return { ...this.options };
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
    if (!ctx.activeLayer) {
      console.error('[BrushTool] No active layer!');
      return;
    }

    // Reset smoother for new stroke
    this.smoother.reset();

    // Create graphics for this stroke
    this.strokeGraphics = new Graphics();
    this.strokeGraphics.zIndex = 100; // Render on top of terrain
    ctx.activeLayer.addContent(this.strokeGraphics);

    debug.log('[BrushTool] Created stroke graphics:', {
      layerId: ctx.activeLayer.id,
      layerName: ctx.activeLayer.data.name,
      position: ctx.worldPosition,
      options: this.options,
      graphicsVisible: this.strokeGraphics.visible,
      graphicsAlpha: this.strokeGraphics.alpha,
      graphicsPosition: { x: this.strokeGraphics.x, y: this.strokeGraphics.y },
      parent: this.strokeGraphics.parent?.constructor.name,
    });

    // Get pressure
    const pressure = this.options.pressureSensitivity ? ctx.input.pressure || 1 : 1;

    // Add first point
    const point = this.smoother.addPoint(ctx.worldPosition, pressure);
    if (point) {
      this.drawBrushDab(point.position, point.pressure);
      this.lastDrawnPoint = point.position;
      this.lastPressure = point.pressure;

      debug.log('[BrushTool] Drew first dab at:', point.position, 'pressure:', point.pressure);
      debug.log('[BrushTool] Graphics bounds after draw:', {
        x: this.strokeGraphics.bounds.x,
        y: this.strokeGraphics.bounds.y,
        width: this.strokeGraphics.bounds.width,
        height: this.strokeGraphics.bounds.height,
      });
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

    // Draw circular dab using Pixi v8 API
    // Each circle needs its own fill call to render properly
    this.strokeGraphics
      .circle(position.x, position.y, size / 2)
      .fill({ color, alpha: opacity * this.calculateHardnessAlpha() });
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
    const zoom = ctx.engine.getViewport()?.zoom ?? 1;

    // Draw brush size circle
    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0xffffff,
      alpha: 0.8,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, size / 2);
    this.previewGraphics.stroke();

    // Draw center crosshair
    const crossSize = 4 / zoom;
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
