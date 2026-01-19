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

  getOptions(): ShapeToolOptions {
    return { ...this.options };
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
    graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      graphics.lineTo(points[i]!.x, points[i]!.y);
    }

    // Close path if near start
    const distToStart = vec2Length(vec2Sub(points[points.length - 1]!, points[0]!));
    if (distToStart < 20 || isFinal) {
      graphics.closePath();
    }
  }

  /**
   * Smooth freeform path using bezier curves
   */
  private smoothFreeformPath(points: Vector2[]): Vector2[] {
    // Simple implementation - could be improved with proper curve fitting
    const result: Vector2[] = [points[0]!];

    for (let i = 1; i < points.length - 1; i += 2) {
      const p0 = points[i - 1]!;
      const p1 = points[i]!;
      const p2 = points[Math.min(i + 1, points.length - 1)]!;

      // Add intermediate points
      for (let t = 0; t <= 1; t += 0.25) {
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        result.push({ x, y });
      }
    }

    result.push(points[points.length - 1]!);
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
