import { Sprite, Texture } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BaseToolOptions } from '@/types';
import { hexToNumber, hexToRgb } from '@/utils';
import { debug } from '@/utils';

/** Color tolerance for flood fill matching (0-255 per channel) */
const DEFAULT_TOLERANCE = 32;

/**
 * Fill tool — flood fills contiguous regions of similar color
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

    try {
      const app = ctx.engine.getApp();
      const renderer = app.renderer;

      // Extract the rendered scene to an HTML canvas
      const extractCanvas = renderer.extract.canvas({
        target: app.stage,
      }) as HTMLCanvasElement;

      const extractCtx = extractCanvas.getContext('2d');
      if (!extractCtx) {
        debug.warn('[FillTool] Failed to get 2D context from extracted canvas');
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }

      const resolution = renderer.resolution || 1;
      const sx = Math.round(ctx.screenPosition.x * resolution);
      const sy = Math.round(ctx.screenPosition.y * resolution);
      const w = extractCanvas.width;
      const h = extractCanvas.height;

      if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }

      // Get all pixel data from the scene
      const imageData = extractCtx.getImageData(0, 0, w, h);
      const srcData = imageData.data;

      // Get target color at click point
      const targetIdx = (sy * w + sx) * 4;
      const targetR = srcData[targetIdx] ?? 0;
      const targetG = srcData[targetIdx + 1] ?? 0;
      const targetB = srcData[targetIdx + 2] ?? 0;
      const targetA = srcData[targetIdx + 3] ?? 0;

      // Parse fill color
      const fillRgb = hexToRgb(this.options.primaryColor);
      if (!fillRgb) {
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }
      const fillR = fillRgb.r;
      const fillG = fillRgb.g;
      const fillB = fillRgb.b;
      const fillA = Math.round(this.options.opacity * 255);

      // Don't fill if clicking on same color (within tolerance)
      if (
        Math.abs(targetR - fillR) <= DEFAULT_TOLERANCE &&
        Math.abs(targetG - fillG) <= DEFAULT_TOLERANCE &&
        Math.abs(targetB - fillB) <= DEFAULT_TOLERANCE &&
        Math.abs(targetA - fillA) <= DEFAULT_TOLERANCE
      ) {
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }

      // Create output canvas for filled pixels only
      const fillCanvas = document.createElement('canvas');
      fillCanvas.width = w;
      fillCanvas.height = h;
      const fillCtx = fillCanvas.getContext('2d');
      if (!fillCtx) {
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }
      const fillImageData = fillCtx.createImageData(w, h);
      const fillData = fillImageData.data;

      // Run scanline flood fill
      const pixelCount = this.scanlineFill(
        srcData, fillData, w, h, sx, sy,
        targetR, targetG, targetB, targetA,
        fillR, fillG, fillB, fillA,
        DEFAULT_TOLERANCE
      );

      if (pixelCount === 0) {
        fillCanvas.width = 0;
        fillCanvas.height = 0;
        extractCanvas.width = 0;
        extractCanvas.height = 0;
        return;
      }

      debug.log(`[FillTool] Filled ${pixelCount} pixels`);

      // Write filled pixels to the output canvas
      fillCtx.putImageData(fillImageData, 0, 0);

      // Convert to a world-space sprite and add to the active layer
      const texture = Texture.from(fillCanvas);
      const sprite = new Sprite(texture);

      // Map screen origin (0,0) to world coordinates to position the sprite
      const worldOrigin = ctx.engine.screenToWorld({ x: 0, y: 0 });
      const zoom = ctx.engine.getViewport()?.zoom ?? 1;
      sprite.position.set(worldOrigin.x, worldOrigin.y);
      sprite.scale.set(1 / (zoom * resolution));
      sprite.zIndex = 100;

      ctx.activeLayer.addContent(sprite);
      ctx.activeLayer.markDirty();

      // Clean up the extraction canvas (sprite now owns fillCanvas via texture)
      extractCanvas.width = 0;
      extractCanvas.height = 0;
    } catch (e) {
      debug.warn('[FillTool] Flood fill failed:', e);
    }
  }

  /**
   * Scanline flood fill algorithm.
   * Returns the number of pixels filled.
   */
  private scanlineFill(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number,
    h: number,
    startX: number,
    startY: number,
    tR: number, tG: number, tB: number, tA: number,
    fR: number, fG: number, fB: number, fA: number,
    tolerance: number,
  ): number {
    const visited = new Uint8Array(w * h);
    let filled = 0;

    const matches = (idx: number): boolean => {
      const di = idx * 4;
      return (
        Math.abs((src[di] ?? 0) - tR) <= tolerance &&
        Math.abs((src[di + 1] ?? 0) - tG) <= tolerance &&
        Math.abs((src[di + 2] ?? 0) - tB) <= tolerance &&
        Math.abs((src[di + 3] ?? 0) - tA) <= tolerance
      );
    };

    const setPixel = (idx: number): void => {
      const di = idx * 4;
      dst[di] = fR;
      dst[di + 1] = fG;
      dst[di + 2] = fB;
      dst[di + 3] = fA;
    };

    // Use array with manual index to avoid O(n) shift() cost
    const queue: number[] = [];
    let queueHead = 0;

    // Push start scanline seed: encode as y * w + x
    queue.push(startY * w + startX);

    while (queueHead < queue.length) {
      const seed = queue[queueHead++]!;
      const y = (seed / w) | 0;
      let x = seed % w;

      // Already visited
      if (visited[y * w + x]) continue;

      // Scan left to find the leftmost matching pixel in this row
      while (x > 0 && matches(y * w + x - 1) && !visited[y * w + x - 1]) {
        x--;
      }

      let spanAbove = false;
      let spanBelow = false;

      // Scan right, filling pixels and seeding adjacent rows
      while (x < w && matches(y * w + x) && !visited[y * w + x]) {
        const idx = y * w + x;
        visited[idx] = 1;
        setPixel(idx);
        filled++;

        // Check pixel above
        if (y > 0) {
          const aboveIdx = (y - 1) * w + x;
          if (matches(aboveIdx) && !visited[aboveIdx]) {
            if (!spanAbove) {
              queue.push(aboveIdx);
              spanAbove = true;
            }
          } else {
            spanAbove = false;
          }
        }

        // Check pixel below
        if (y < h - 1) {
          const belowIdx = (y + 1) * w + x;
          if (matches(belowIdx) && !visited[belowIdx]) {
            if (!spanBelow) {
              queue.push(belowIdx);
              spanBelow = true;
            }
          } else {
            spanBelow = false;
          }
        }

        x++;
      }
    }

    return filled;
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

    // Paint bucket cursor indicator
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
