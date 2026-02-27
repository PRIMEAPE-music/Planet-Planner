import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { MountainPathSettings } from './types';
import type { MountainRange, MountainPeak } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';
import { SimplexNoise } from '@/core/generation/noise';

/**
 * Default mountain path settings
 */
export const DEFAULT_MOUNTAIN_PATH_SETTINGS: MountainPathSettings = {
  width: 40,
  elevationRange: { min: 0.7, max: 0.9 },
  peakDensity: 8,
  roughness: 0.5,
  smoothPath: true,
};

/**
 * Tool for drawing mountain ranges along a path
 */
export class MountainPathTool extends FeatureTool {
  readonly id = 'mountain-path';
  readonly name = 'Mountain Range';
  readonly icon = 'trending-up';

  private settings: MountainPathSettings;
  private noise: SimplexNoise;
  private isDrawing: boolean = false;
  private pathPoints: Vector2[] = [];
  private onRangeCreated: ((range: MountainRange) => void) | null = null;

  constructor() {
    super();
    this.settings = { ...DEFAULT_MOUNTAIN_PATH_SETTINGS };
    this.noise = new SimplexNoise(Date.now());
  }

  /**
   * Set callback for when range is created
   */
  setOnRangeCreated(callback: (range: MountainRange) => void): void {
    this.onRangeCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): MountainPathSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<MountainPathSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get brush radius for cursor
   */
  protected getBrushRadius(): number {
    return this.settings.width / 2;
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return {
      type: 'crosshair',
      showSizeIndicator: true,
      sizeRadius: this.settings.width / 2,
    };
  }

  /**
   * Handle pointer down - start drawing path
   */
  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.pathPoints = [{ ...ctx.worldPosition }];
  }

  /**
   * Handle pointer move - continue path or update preview
   */
  onPointerMove(ctx: ToolContext): void {
    if (this.isDrawing && this.pathPoints.length > 0) {
      // Add point if far enough from last point
      const lastPoint = this.pathPoints[this.pathPoints.length - 1];
      if (lastPoint) {
        const dist = this.distance(ctx.worldPosition, lastPoint);
        if (dist > 5) {
          this.pathPoints.push({ ...ctx.worldPosition });
        }
      }
    }

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up - finish path and create range
   */
  onPointerUp(_ctx: ToolContext): null {
    if (!this.isDrawing || this.pathPoints.length < 2) {
      this.isDrawing = false;
      this.pathPoints = [];
      this.clearPreview();
      return null;
    }

    // Smooth path if enabled
    let finalPath = this.pathPoints;
    if (this.settings.smoothPath) {
      finalPath = this.smoothPath(this.pathPoints);
    }

    // Create mountain range
    const range = this.createRange(finalPath);

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'mountain',
      featureId: range.id,
      previousState: null,
      newState: range,
    });

    // Notify listeners
    this.onRangeCreated?.(range);

    // Reset
    this.isDrawing = false;
    this.pathPoints = [];
    this.clearPreview();

    return null;
  }

  /**
   * Smooth path using Catmull-Rom spline
   */
  private smoothPath(points: Vector2[]): Vector2[] {
    if (points.length < 3) return points;

    const smoothed: Vector2[] = [];
    const tension = 0.5;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[Math.min(points.length - 1, i + 1)]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;

      // Add intermediate points
      for (let t = 0; t < 1; t += 0.2) {
        const x = this.catmullRom(p0.x, p1.x, p2.x, p3.x, t, tension);
        const y = this.catmullRom(p0.y, p1.y, p2.y, p3.y, t, tension);
        smoothed.push({ x, y });
      }
    }

    // Add last point
    const lastPoint = points[points.length - 1];
    if (lastPoint) {
      smoothed.push(lastPoint);
    }

    return smoothed;
  }

  /**
   * Catmull-Rom spline interpolation
   */
  private catmullRom(
    p0: number,
    p1: number,
    p2: number,
    p3: number,
    t: number,
    tension: number
  ): number {
    const t2 = t * t;
    const t3 = t2 * t;

    const s = (1 - tension) / 2;

    const b0 = s * (-t3 + 2 * t2 - t);
    const b1 = s * (-t3 + t2) + (2 * t3 - 3 * t2 + 1);
    const b2 = s * (t3 - 2 * t2 + t) + (-2 * t3 + 3 * t2);
    const b3 = s * (t3 - t2);

    return b0 * p0 + b1 * p1 + b2 * p2 + b3 * p3;
  }

  /**
   * Create mountain range from path
   */
  private createRange(spine: Vector2[]): MountainRange {
    const id = this.generateId('range');
    const { width, elevationRange, peakDensity, roughness } = this.settings;

    // Calculate total path length
    let totalLength = 0;
    for (let i = 1; i < spine.length; i++) {
      const curr = spine[i];
      const prev = spine[i - 1];
      if (curr && prev) {
        totalLength += this.distance(curr, prev);
      }
    }

    // Generate widths along spine (taper at ends)
    const widths: number[] = spine.map((_, i) => {
      const t = i / (spine.length - 1);
      const taper = Math.sin(t * Math.PI);
      return width * (0.3 + taper * 0.7);
    });

    // Generate elevations along spine
    const elevations: number[] = spine.map((_, i) => {
      const t = i / (spine.length - 1);
      const noiseVal = this.noise.noise2D(i * 0.1, 0) * 0.5 + 0.5;
      const taper = Math.sin(t * Math.PI);
      return elevationRange.min + noiseVal * taper * (elevationRange.max - elevationRange.min);
    });

    // Calculate peak count based on path length
    const peakCount = Math.max(2, Math.floor((totalLength / 100) * peakDensity));

    // Generate peaks along spine
    const peaks = this.generatePeaksAlongSpine(spine, widths, elevations, peakCount, id);

    return {
      id,
      spine,
      widths,
      elevations,
      roughness,
      peakCount,
      peaks,
    };
  }

  /**
   * Generate peaks distributed along spine
   */
  private generatePeaksAlongSpine(
    spine: Vector2[],
    widths: number[],
    elevations: number[],
    peakCount: number,
    rangeId: string
  ): MountainPeak[] {
    const peaks: MountainPeak[] = [];

    for (let i = 0; i < peakCount; i++) {
      // Distribute peaks along spine
      const t = (i + 0.5 + (Math.random() - 0.5) * 0.3) / peakCount;
      const spineIndex = Math.min(
        spine.length - 1,
        Math.floor(t * spine.length)
      );

      const spinePoint = spine[spineIndex];
      const spineWidth = widths[spineIndex] ?? this.settings.width;
      const baseElevation = elevations[spineIndex] ?? 0.8;

      if (!spinePoint) continue;

      // Offset from spine
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * spineWidth * 0.3;

      const position = {
        x: spinePoint.x + Math.cos(offsetAngle) * offsetDist,
        y: spinePoint.y + Math.sin(offsetAngle) * offsetDist,
      };

      // Peak properties
      const elevation = Math.min(
        0.98,
        baseElevation + (Math.random() - 0.5) * 0.1
      );
      const radius = spineWidth * (0.3 + Math.random() * 0.4);
      const sharpness = 0.3 + Math.random() * this.settings.roughness * 0.5;

      peaks.push({
        position,
        elevation,
        radius,
        sharpness,
        rangeId,
      });
    }

    return peaks;
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;
    const { width } = this.settings;

    if (this.isDrawing && this.pathPoints.length > 0) {
      // Draw path
      const firstPoint = this.pathPoints[0];
      if (firstPoint) {
        this.previewGraphics.moveTo(firstPoint.x, firstPoint.y);
      }

      for (let i = 1; i < this.pathPoints.length; i++) {
        const pt = this.pathPoints[i];
        if (pt) {
          this.previewGraphics.lineTo(pt.x, pt.y);
        }
      }

      // Line to current position
      this.previewGraphics.lineTo(worldPosition.x, worldPosition.y);

      this.previewGraphics.stroke({
        width: 2,
        color: 0x8b7355,
        alpha: 0.8,
      });

      // Draw width indicators along path
      const displayPoints = [...this.pathPoints, worldPosition];
      for (let i = 0; i < displayPoints.length; i += 5) {
        const point = displayPoints[i];
        if (!point) continue;
        const t = i / displayPoints.length;
        const currentWidth = width * (0.3 + Math.sin(t * Math.PI) * 0.7);

        this.previewGraphics
          .circle(point.x, point.y, currentWidth / 2)
          .stroke({ width: 1, color: 0x8b7355, alpha: 0.3 });
      }
    } else {
      // Just show width indicator at cursor
      this.previewGraphics
        .circle(worldPosition.x, worldPosition.y, width / 2)
        .stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    }
  }
}
