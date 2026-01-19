import { Sprite, Texture } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { BaseToolOptions } from '@/types';

interface StampToolOptions extends BaseToolOptions {
  rotation: number;
  scale: number;
}

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

  private options: StampToolOptions = {
    size: 48,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    rotation: 0,
    scale: 1,
  };

  setOptions(options: Partial<StampToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): StampToolOptions {
    return { ...this.options };
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
