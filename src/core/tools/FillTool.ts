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

  getOptions(): BaseToolOptions {
    return { ...this.options };
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
