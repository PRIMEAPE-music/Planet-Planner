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

  getOptions(): BrushToolOptions {
    return { ...this.options };
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
    this.strokeGraphics.blendMode = 'erase';
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
