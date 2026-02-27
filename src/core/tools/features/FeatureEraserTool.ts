import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { FeatureEraserSettings } from './types';
import type { Vector2 } from '@/types';

/**
 * Default feature eraser settings
 */
export const DEFAULT_FEATURE_ERASER_SETTINGS: FeatureEraserSettings = {
  radius: 30,
  targets: {
    mountains: true,
    rivers: true,
    lakes: true,
    forests: true,
  },
  soft: false,
};

/**
 * Erased feature info
 */
export interface ErasedFeature {
  type: 'mountain' | 'river' | 'lake' | 'forest';
  id: string;
  feature: any;
}

/**
 * Tool for erasing features
 */
export class FeatureEraserTool extends FeatureTool {
  readonly id = 'feature-eraser';
  readonly name = 'Feature Eraser';
  readonly icon = 'eraser';

  private settings: FeatureEraserSettings;
  private isErasing: boolean = false;
  private erasedFeatures: ErasedFeature[] = [];
  private onFeaturesErased: ((features: ErasedFeature[]) => void) | null = null;

  constructor() {
    super();
    this.settings = { ...DEFAULT_FEATURE_ERASER_SETTINGS };
  }

  /**
   * Set callback for when features are erased
   */
  setOnFeaturesErased(callback: (features: ErasedFeature[]) => void): void {
    this.onFeaturesErased = callback;
  }

  /**
   * Get settings
   */
  getSettings(): FeatureEraserSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<FeatureEraserSettings>): void {
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
      type: 'none',
      showSizeIndicator: true,
      sizeRadius: this.settings.radius,
    };
  }

  /**
   * Handle pointer down - start erasing
   */
  onPointerDown(ctx: ToolContext): void {
    this.isErasing = true;
    this.erasedFeatures = [];
    this.eraseAt(ctx.worldPosition, ctx);
  }

  /**
   * Handle pointer move - continue erasing
   */
  onPointerMove(ctx: ToolContext): void {
    this.updatePreview(ctx);

    if (this.isErasing) {
      this.eraseAt(ctx.worldPosition, ctx);
    }
  }

  /**
   * Handle pointer up - finish erasing
   */
  onPointerUp(_ctx: ToolContext): null {
    if (!this.isErasing) return null;

    // Record all erased features for undo
    for (const erased of this.erasedFeatures) {
      this.recordEdit({
        type: 'remove',
        featureType: erased.type,
        featureId: erased.id,
        previousState: erased.feature,
        newState: null,
      });
    }

    // Notify listeners
    if (this.erasedFeatures.length > 0) {
      this.onFeaturesErased?.([...this.erasedFeatures]);
    }

    // Reset
    this.isErasing = false;
    this.erasedFeatures = [];

    return null;
  }

  /**
   * Erase features at position
   */
  private eraseAt(position: Vector2, _ctx: ToolContext): void {
    // This will emit an event that the feature manager handles
    this.emit('erase', {
      position,
      radius: this.settings.radius,
      targets: this.settings.targets,
      soft: this.settings.soft,
      onErased: (feature: ErasedFeature) => {
        // Check if not already erased in this stroke
        if (!this.erasedFeatures.find((f) => f.id === feature.id)) {
          this.erasedFeatures.push(feature);
        }
      },
    });
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { radius } = this.settings;

    // Draw eraser circle
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, radius)
      .stroke({ width: 2, color: 0xff4444, alpha: 0.8 });

    // Inner dashed circle for soft erase
    if (this.settings.soft) {
      this.previewGraphics
        .circle(worldPosition.x, worldPosition.y, radius * 0.6)
        .stroke({ width: 1, color: 0xff4444, alpha: 0.4 });
    }

    // Draw X pattern to indicate erasing
    const xSize = 6;
    this.previewGraphics
      .moveTo(worldPosition.x - xSize, worldPosition.y - xSize)
      .lineTo(worldPosition.x + xSize, worldPosition.y + xSize)
      .moveTo(worldPosition.x + xSize, worldPosition.y - xSize)
      .lineTo(worldPosition.x - xSize, worldPosition.y + xSize)
      .stroke({ width: 2, color: 0xff4444, alpha: 0.8 });
  }
}
