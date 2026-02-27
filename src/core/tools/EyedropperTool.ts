import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import { debug } from '@/utils';

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
    try {
      const app = ctx.engine.getApp();
      const renderer = app.renderer;

      // Extract the rendered scene to an HTML canvas
      const extractCanvas = renderer.extract.canvas({
        target: app.stage,
      }) as HTMLCanvasElement;

      const extractCtx = extractCanvas.getContext('2d');
      if (!extractCtx) {
        debug.warn('[EyedropperTool] Failed to get 2D context from extracted canvas');
        return;
      }

      // Account for device pixel ratio / renderer resolution
      const resolution = renderer.resolution || 1;
      const sx = Math.round(ctx.screenPosition.x * resolution);
      const sy = Math.round(ctx.screenPosition.y * resolution);

      if (sx < 0 || sy < 0 || sx >= extractCanvas.width || sy >= extractCanvas.height) {
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }

      // Read the single pixel at the click point
      const pixel = extractCtx.getImageData(sx, sy, 1, 1).data;
      const r = pixel[0] ?? 0;
      const g = pixel[1] ?? 0;
      const b = pixel[2] ?? 0;

      this.pickedColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      this.onColorPicked?.(this.pickedColor);

      debug.log('[EyedropperTool] Picked color:', this.pickedColor);

      // Clean up extracted canvas
      extractCanvas.width = 0;
      extractCanvas.height = 0;
    } catch (e) {
      debug.warn('[EyedropperTool] Failed to extract pixel color:', e);
    }
  }

  onPointerMove(ctx: ToolContext): void {
    // Live preview: pick color under cursor while hovering
    if (!ctx.isStroking) return;

    try {
      const app = ctx.engine.getApp();
      const renderer = app.renderer;

      const extractCanvas = renderer.extract.canvas({
        target: app.stage,
      }) as HTMLCanvasElement;

      const extractCtx = extractCanvas.getContext('2d');
      if (!extractCtx) {
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }

      const resolution = renderer.resolution || 1;
      const sx = Math.round(ctx.screenPosition.x * resolution);
      const sy = Math.round(ctx.screenPosition.y * resolution);

      if (sx >= 0 && sy >= 0 && sx < extractCanvas.width && sy < extractCanvas.height) {
        const pixel = extractCtx.getImageData(sx, sy, 1, 1).data;
        this.pickedColor = `#${(pixel[0] ?? 0).toString(16).padStart(2, '0')}${(pixel[1] ?? 0).toString(16).padStart(2, '0')}${(pixel[2] ?? 0).toString(16).padStart(2, '0')}`;
        this.onColorPicked?.(this.pickedColor);
      }

      extractCanvas.width = 0;
      extractCanvas.height = 0;
    } catch {
      // Silently fail during drag - don't spam warnings
    }
  }

  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
    return null;
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;

    // Outer white ring
    this.previewGraphics.setStrokeStyle({
      width: 2 / zoom,
      color: 0xffffff,
      alpha: 1,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 10 / zoom);
    this.previewGraphics.stroke();

    // Outer black ring
    this.previewGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0x000000,
      alpha: 1,
    });
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 11 / zoom);
    this.previewGraphics.stroke();

    // Inner color preview showing the picked color
    this.previewGraphics.circle(ctx.worldPosition.x, ctx.worldPosition.y, 8 / zoom);
    this.previewGraphics.fill({ color: parseInt(this.pickedColor.replace('#', ''), 16) || 0 });
  }
}
