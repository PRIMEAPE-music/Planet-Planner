import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';

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

  onPointerDown(_ctx: ToolContext): void {
    // In a real implementation, we would sample the pixel color
    // from the rendered canvas. For now, this is a placeholder.

    // This would require access to the renderer's extract functionality
    // const app = ctx.engine.getApp();
    // const pixel = app.renderer.extract.pixels(...)

    // Placeholder: just use a default color
    this.pickedColor = '#5d524a';
    this.onColorPicked?.(this.pickedColor);
  }

  onPointerMove(_ctx: ToolContext): void {
    // Could show color preview while hovering
  }

  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
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
