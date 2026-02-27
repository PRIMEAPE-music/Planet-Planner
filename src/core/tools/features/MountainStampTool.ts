import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { MountainStampSettings } from './types';
import type { MountainPeak } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Default mountain stamp settings
 */
export const DEFAULT_MOUNTAIN_STAMP_SETTINGS: MountainStampSettings = {
  elevation: 0.8,
  radius: 30,
  sharpness: 0.5,
  snowCap: true,
  randomize: true,
  randomAmount: 0.2,
};

/**
 * Tool for stamping individual mountain peaks
 */
export class MountainStampTool extends FeatureTool {
  readonly id = 'mountain-stamp';
  readonly name = 'Mountain Stamp';
  readonly icon = 'mountain';

  private settings: MountainStampSettings;
  private onPeakCreated: ((peak: MountainPeak) => void) | null = null;

  constructor() {
    super();
    this.settings = { ...DEFAULT_MOUNTAIN_STAMP_SETTINGS };
  }

  /**
   * Set callback for when peak is created
   */
  setOnPeakCreated(callback: (peak: MountainPeak) => void): void {
    this.onPeakCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): MountainStampSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<MountainStampSettings>): void {
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
      type: 'crosshair',
      showSizeIndicator: true,
      sizeRadius: this.settings.radius,
    };
  }

  /**
   * Handle pointer down - stamp a peak
   */
  onPointerDown(ctx: ToolContext): void {
    const peak = this.createPeak(ctx.worldPosition);

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'mountain',
      featureId: peak.rangeId || this.generateId('peak'),
      previousState: null,
      newState: peak,
    });

    // Notify listeners
    this.onPeakCreated?.(peak);
  }

  /**
   * Handle pointer move - update preview
   */
  onPointerMove(ctx: ToolContext): void {
    this.updatePreview(ctx);
  }

  /**
   * Create a mountain peak at position
   */
  private createPeak(position: Vector2): MountainPeak {
    const { elevation, radius, sharpness, randomize, randomAmount } = this.settings;

    // Apply randomization if enabled
    let finalElevation = elevation;
    let finalRadius = radius;
    let finalSharpness = sharpness;

    if (randomize) {
      const randOffset = () => (Math.random() - 0.5) * 2 * randomAmount;
      finalElevation = Math.max(0.5, Math.min(0.98, elevation + randOffset() * 0.2));
      finalRadius = Math.max(10, radius + randOffset() * radius);
      finalSharpness = Math.max(0, Math.min(1, sharpness + randOffset() * 0.3));
    }

    return {
      position: { ...position },
      elevation: finalElevation,
      radius: finalRadius,
      sharpness: finalSharpness,
    };
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { radius, elevation } = this.settings;

    // Draw mountain preview
    const height = radius * elevation * 1.5;
    const baseWidth = radius * 0.6;

    // Filled triangle
    this.previewGraphics
      .moveTo(worldPosition.x, worldPosition.y - height)
      .lineTo(worldPosition.x - baseWidth, worldPosition.y + radius * 0.3)
      .lineTo(worldPosition.x + baseWidth, worldPosition.y + radius * 0.3)
      .closePath()
      .fill({ color: 0x8b7355, alpha: 0.3 })
      .stroke({ width: 2, color: 0x5c4d3d, alpha: 0.8 });

    // Snow cap preview if enabled
    if (this.settings.snowCap && elevation > 0.7) {
      const snowHeight = height * 0.25;
      this.previewGraphics
        .moveTo(worldPosition.x, worldPosition.y - height)
        .lineTo(worldPosition.x - baseWidth * 0.3, worldPosition.y - height + snowHeight)
        .lineTo(worldPosition.x + baseWidth * 0.3, worldPosition.y - height + snowHeight)
        .closePath()
        .fill({ color: 0xffffff, alpha: 0.5 });
    }

    // Radius indicator
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, radius)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  }
}
