import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { RiverSplineSettings, SplinePoint, ActiveSpline } from './types';
import type { River } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Default river spline settings
 */
export const DEFAULT_RIVER_SPLINE_SETTINGS: RiverSplineSettings = {
  startWidth: 2,
  endWidth: 8,
  smooth: true,
  tension: 0.5,
  autoTributaries: false,
  erode: true,
  erosionDepth: 0.05,
};

/**
 * River name components for generation
 */
const RIVER_ADJECTIVES = ['Silver', 'Golden', 'Winding', 'Swift', 'Gentle', 'Ancient'];
const RIVER_NOUNS = ['River', 'Stream', 'Creek', 'Waters', 'Run'];

/**
 * Tool for drawing rivers using spline curves
 */
export class RiverSplineTool extends FeatureTool {
  readonly id = 'river-spline';
  readonly name = 'River';
  readonly icon = 'waves';

  private settings: RiverSplineSettings;
  private activeSpline: ActiveSpline | null = null;
  private hoveredPointIndex: number | null = null;
  private draggingPointIndex: number | null = null;
  private onRiverCreated: ((river: River) => void) | null = null;

  constructor() {
    super();
    this.settings = { ...DEFAULT_RIVER_SPLINE_SETTINGS };
  }

  /**
   * Set callback for when river is created
   */
  setOnRiverCreated(callback: (river: River) => void): void {
    this.onRiverCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): RiverSplineSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<RiverSplineSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    if (this.hoveredPointIndex !== null) {
      return { type: 'move' };
    }
    return { type: 'crosshair' };
  }

  /**
   * Handle pointer down
   */
  onPointerDown(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    // Check if clicking on existing point
    if (this.activeSpline) {
      const pointIndex = this.findPointAt(worldPosition);
      if (pointIndex !== null) {
        this.draggingPointIndex = pointIndex;
        this.activeSpline.selectedPoint = pointIndex;
        return;
      }
    }

    // Start new spline or add point
    if (!this.activeSpline) {
      this.activeSpline = {
        points: [],
        closed: false,
        selectedPoint: null,
        draggingHandle: null,
      };
    }

    // Add new point
    const newPoint: SplinePoint = {
      position: { ...worldPosition },
      width: this.calculateWidthAtIndex(this.activeSpline.points.length),
    };

    this.activeSpline.points.push(newPoint);
    this.activeSpline.selectedPoint = this.activeSpline.points.length - 1;

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer move
   */
  onPointerMove(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    // Dragging a point
    if (this.draggingPointIndex !== null && this.activeSpline) {
      const point = this.activeSpline.points[this.draggingPointIndex];
      if (point) {
        point.position = { ...worldPosition };
      }
      this.updatePreview(ctx);
      return;
    }

    // Check for hover
    this.hoveredPointIndex = this.findPointAt(worldPosition);

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up
   */
  onPointerUp(_ctx: ToolContext): null {
    this.draggingPointIndex = null;
    return null;
  }

  /**
   * Handle double click - finish river
   */
  onDoubleClick(_ctx: ToolContext): void {
    if (!this.activeSpline || this.activeSpline.points.length < 2) {
      return;
    }

    // Create river from spline
    const river = this.createRiverFromSpline();

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'river',
      featureId: river.id,
      previousState: null,
      newState: river,
    });

    // Notify listeners
    this.onRiverCreated?.(river);

    // Reset
    this.activeSpline = null;
    this.clearPreview();
  }

  /**
   * Handle key press
   */
  onKeyDown(ctx: ToolContext, key: string): void {
    if (key === 'Escape') {
      // Cancel current spline
      this.activeSpline = null;
      this.clearPreview();
    } else if (key === 'Enter') {
      // Finish river
      this.onDoubleClick(ctx);
    } else if (key === 'Backspace' || key === 'Delete') {
      // Remove last point
      if (this.activeSpline && this.activeSpline.points.length > 0) {
        this.activeSpline.points.pop();
        if (this.activeSpline.points.length === 0) {
          this.activeSpline = null;
        }
        this.updatePreview(ctx);
      }
    }
  }

  /**
   * Find point near position
   */
  private findPointAt(position: Vector2): number | null {
    if (!this.activeSpline) return null;

    const tolerance = 10;
    for (let i = 0; i < this.activeSpline.points.length; i++) {
      const point = this.activeSpline.points[i];
      if (!point) continue;
      const dist = this.distance(position, point.position);
      if (dist <= tolerance) {
        return i;
      }
    }

    return null;
  }

  /**
   * Calculate river width at given index
   */
  private calculateWidthAtIndex(index: number): number {
    if (!this.activeSpline || this.activeSpline.points.length === 0) {
      return this.settings.startWidth;
    }

    const t = index / Math.max(1, this.activeSpline.points.length);
    return this.settings.startWidth + (this.settings.endWidth - this.settings.startWidth) * t;
  }

  /**
   * Create river from active spline
   */
  private createRiverFromSpline(): River {
    if (!this.activeSpline || this.activeSpline.points.length < 2) {
      throw new Error('Not enough points for river');
    }

    const id = this.generateId('river');
    const points = this.activeSpline.points;

    // Generate path (interpolate for smooth curves)
    let path: Vector2[];
    let widths: number[];

    if (this.settings.smooth && points.length >= 3) {
      const interpolated = this.interpolateSpline(points);
      path = interpolated.path;
      widths = interpolated.widths;
    } else {
      path = points.map((p) => ({ ...p.position }));
      widths = points.map((p) => p.width || this.settings.startWidth);
    }

    // Calculate length
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      const curr = path[i];
      const prev = path[i - 1];
      if (curr && prev) {
        length += this.distance(curr, prev);
      }
    }

    const source = path[0] ?? { x: 0, y: 0 };
    const mouth = path[path.length - 1] ?? { x: 0, y: 0 };
    const maxFlow = (widths[widths.length - 1] ?? this.settings.endWidth) * 10;

    return {
      id,
      name: this.generateRiverName(),
      path,
      widths,
      source,
      mouth,
      length,
      maxFlow,
      tributaries: [],
    };
  }

  /**
   * Interpolate spline for smooth curve
   */
  private interpolateSpline(points: SplinePoint[]): { path: Vector2[]; widths: number[] } {
    const path: Vector2[] = [];
    const widths: number[] = [];
    const tension = this.settings.tension;
    const segments = 10; // Points per segment

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      if (!p0 || !p1 || !p2 || !p3) continue;

      for (let t = 0; t < 1; t += 1 / segments) {
        const x = this.catmullRom(
          p0.position.x, p1.position.x, p2.position.x, p3.position.x, t, tension
        );
        const y = this.catmullRom(
          p0.position.y, p1.position.y, p2.position.y, p3.position.y, t, tension
        );
        const width = this.lerp(p1.width || 2, p2.width || 2, t);

        path.push({ x, y });
        widths.push(width);
      }
    }

    // Add last point
    const last = points[points.length - 1];
    if (last) {
      path.push({ ...last.position });
      widths.push(last.width || this.settings.endWidth);
    }

    return { path, widths };
  }

  /**
   * Catmull-Rom interpolation
   */
  private catmullRom(
    p0: number, p1: number, p2: number, p3: number, t: number, tension: number
  ): number {
    const t2 = t * t;
    const t3 = t2 * t;
    const s = (1 - tension) / 2;

    return (
      s * (-t3 + 2 * t2 - t) * p0 +
      (s * (-t3 + t2) + (2 * t3 - 3 * t2 + 1)) * p1 +
      (s * (t3 - 2 * t2 + t) + (-2 * t3 + 3 * t2)) * p2 +
      s * (t3 - t2) * p3
    );
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Generate random river name
   */
  private generateRiverName(): string {
    const adj = RIVER_ADJECTIVES[Math.floor(Math.random() * RIVER_ADJECTIVES.length)];
    const noun = RIVER_NOUNS[Math.floor(Math.random() * RIVER_NOUNS.length)];
    return `${adj} ${noun}`;
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;

    if (this.activeSpline && this.activeSpline.points.length > 0) {
      const points = this.activeSpline.points;

      // Draw river path
      if (points.length >= 2) {
        // Draw filled river
        const firstPoint = points[0];
        if (firstPoint) {
          this.previewGraphics.moveTo(firstPoint.position.x, firstPoint.position.y);
        }

        for (let i = 1; i < points.length; i++) {
          const curr = points[i];
          if (curr) {
            this.previewGraphics.lineTo(curr.position.x, curr.position.y);
          }
        }

        // Line to cursor
        this.previewGraphics.lineTo(worldPosition.x, worldPosition.y);

        this.previewGraphics.stroke({
          width: this.settings.endWidth,
          color: 0x4a90d9,
          alpha: 0.5,
          cap: 'round',
          join: 'round',
        });
      }

      // Draw control points
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (!point) continue;
        const isSelected = i === this.activeSpline.selectedPoint;
        const isHovered = i === this.hoveredPointIndex;

        this.previewGraphics
          .circle(point.position.x, point.position.y, isSelected ? 8 : 6)
          .fill({ color: isHovered ? 0x00ff00 : 0xffffff, alpha: 0.9 })
          .stroke({ width: 2, color: 0x4a90d9 });

        // Width indicator
        const width = point.width || this.settings.startWidth;
        this.previewGraphics
          .circle(point.position.x, point.position.y, width)
          .stroke({ width: 1, color: 0x4a90d9, alpha: 0.3 });
      }

      // Draw line to cursor for next point
      if (points.length > 0) {
        const lastPoint = points[points.length - 1];
        if (lastPoint) {
          this.previewGraphics
            .moveTo(lastPoint.position.x, lastPoint.position.y)
            .lineTo(worldPosition.x, worldPosition.y)
            .stroke({ width: 1, color: 0x4a90d9, alpha: 0.5 });
        }
      }
    }

    // Cursor indicator
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, 5)
      .fill({ color: 0x4a90d9, alpha: 0.8 });
  }

  /**
   * Cleanup on deactivate
   */
  onDeactivate(ctx: ToolContext): void {
    super.onDeactivate(ctx);
    this.activeSpline = null;
    this.hoveredPointIndex = null;
    this.draggingPointIndex = null;
  }
}
