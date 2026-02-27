import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { LakeShapeSettings } from './types';
import type { Lake } from '@/core/generation/features/types';
import type { Vector2 } from '@/types';
import { SimplexNoise } from '@/core/generation/noise';

/**
 * Default lake shape settings
 */
export const DEFAULT_LAKE_SHAPE_SETTINGS: LakeShapeSettings = {
  type: 'freeform',
  smoothEdges: true,
  edgeNoise: 0.2,
  depth: 0.1,
  wavePattern: true,
};

/**
 * Lake name components
 */
const LAKE_ADJECTIVES = ['Crystal', 'Mirror', 'Silent', 'Hidden', 'Moonlit', 'Azure'];
const LAKE_NOUNS = ['Lake', 'Pond', 'Pool', 'Waters', 'Basin'];

/**
 * Tool for drawing lake shapes
 */
export class LakeShapeTool extends FeatureTool {
  readonly id = 'lake-shape';
  readonly name = 'Lake';
  readonly icon = 'droplets';

  private settings: LakeShapeSettings;
  private noise: SimplexNoise;
  private isDrawing: boolean = false;
  private startPoint: Vector2 | null = null;
  private boundaryPoints: Vector2[] = [];
  private onLakeCreated: ((lake: Lake) => void) | null = null;

  constructor() {
    super();
    this.settings = { ...DEFAULT_LAKE_SHAPE_SETTINGS };
    this.noise = new SimplexNoise(Date.now());
  }

  /**
   * Set callback for when lake is created
   */
  setOnLakeCreated(callback: (lake: Lake) => void): void {
    this.onLakeCreated = callback;
  }

  /**
   * Get settings
   */
  getSettings(): LakeShapeSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  setSettings(settings: Partial<LakeShapeSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get cursor
   */
  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  /**
   * Handle pointer down
   */
  onPointerDown(ctx: ToolContext): void {
    this.isDrawing = true;
    this.startPoint = { ...ctx.worldPosition };

    if (this.settings.type === 'freeform') {
      this.boundaryPoints = [{ ...ctx.worldPosition }];
    } else {
      this.boundaryPoints = [];
    }
  }

  /**
   * Handle pointer move
   */
  onPointerMove(ctx: ToolContext): void {
    if (this.isDrawing) {
      if (this.settings.type === 'freeform' && this.boundaryPoints.length > 0) {
        // Add point to boundary
        const lastPoint = this.boundaryPoints[this.boundaryPoints.length - 1];
        if (lastPoint) {
          const dist = this.distance(ctx.worldPosition, lastPoint);
          if (dist > 5) {
            this.boundaryPoints.push({ ...ctx.worldPosition });
          }
        }
      }
    }

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up
   */
  onPointerUp(ctx: ToolContext): null {
    if (!this.isDrawing || !this.startPoint) {
      this.reset();
      return null;
    }

    let boundary: Vector2[];

    switch (this.settings.type) {
      case 'ellipse':
        boundary = this.createEllipseBoundary(this.startPoint, ctx.worldPosition);
        break;
      case 'rectangle':
        boundary = this.createRectangleBoundary(this.startPoint, ctx.worldPosition);
        break;
      case 'freeform':
      default:
        if (this.boundaryPoints.length < 3) {
          this.reset();
          return null;
        }
        boundary = this.closeBoundary(this.boundaryPoints);
        break;
    }

    // Apply edge noise if enabled
    if (this.settings.edgeNoise > 0) {
      boundary = this.applyEdgeNoise(boundary);
    }

    // Smooth edges if enabled
    if (this.settings.smoothEdges) {
      boundary = this.smoothBoundary(boundary);
    }

    // Create lake
    const lake = this.createLake(boundary);

    // Record for undo
    this.recordEdit({
      type: 'add',
      featureType: 'lake',
      featureId: lake.id,
      previousState: null,
      newState: lake,
    });

    // Notify listeners
    this.onLakeCreated?.(lake);

    // Reset
    this.reset();

    return null;
  }

  /**
   * Create ellipse boundary
   */
  private createEllipseBoundary(start: Vector2, end: Vector2): Vector2[] {
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;

    const points: Vector2[] = [];
    const segments = Math.max(20, Math.floor(Math.max(radiusX, radiusY) / 2));

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    }

    return points;
  }

  /**
   * Create rectangle boundary
   */
  private createRectangleBoundary(start: Vector2, end: Vector2): Vector2[] {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // Add points along edges for noise application
    const points: Vector2[] = [];
    const edgePoints = 10;

    // Top edge
    for (let i = 0; i <= edgePoints; i++) {
      points.push({ x: minX + (maxX - minX) * (i / edgePoints), y: minY });
    }
    // Right edge
    for (let i = 1; i <= edgePoints; i++) {
      points.push({ x: maxX, y: minY + (maxY - minY) * (i / edgePoints) });
    }
    // Bottom edge
    for (let i = 1; i <= edgePoints; i++) {
      points.push({ x: maxX - (maxX - minX) * (i / edgePoints), y: maxY });
    }
    // Left edge
    for (let i = 1; i < edgePoints; i++) {
      points.push({ x: minX, y: maxY - (maxY - minY) * (i / edgePoints) });
    }

    return points;
  }

  /**
   * Close freeform boundary
   */
  private closeBoundary(points: Vector2[]): Vector2[] {
    if (points.length < 2) return points;
    // Ensure boundary is closed
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return points;
    const dist = this.distance(first, last);

    if (dist > 10) {
      // Add closing segment
      const steps = Math.ceil(dist / 10);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        points.push({
          x: last.x + (first.x - last.x) * t,
          y: last.y + (first.y - last.y) * t,
        });
      }
    }

    return points;
  }

  /**
   * Apply noise to boundary edges
   */
  private applyEdgeNoise(points: Vector2[]): Vector2[] {
    const { edgeNoise } = this.settings;
    const center = this.calculateCenter(points);

    return points.map((point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Noise based on angle
      const noiseVal = this.noise.noise2D(Math.cos(angle) * 2, Math.sin(angle) * 2);
      const offset = noiseVal * edgeNoise * dist * 0.3;

      return {
        x: point.x + Math.cos(angle) * offset,
        y: point.y + Math.sin(angle) * offset,
      };
    });
  }

  /**
   * Smooth boundary using averaging
   */
  private smoothBoundary(points: Vector2[]): Vector2[] {
    if (points.length < 3) return points;
    const smoothed: Vector2[] = [];
    const windowSize = 3;

    for (let i = 0; i < points.length; i++) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (let j = -windowSize; j <= windowSize; j++) {
        const idx = (i + j + points.length) % points.length;
        const pt = points[idx];
        if (pt) {
          sumX += pt.x;
          sumY += pt.y;
          count++;
        }
      }

      if (count > 0) {
        smoothed.push({
          x: sumX / count,
          y: sumY / count,
        });
      }
    }

    return smoothed;
  }

  /**
   * Calculate center of points
   */
  private calculateCenter(points: Vector2[]): Vector2 {
    const sum = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  /**
   * Create lake from boundary
   */
  private createLake(boundary: Vector2[]): Lake {
    const id = this.generateId('lake');
    const center = this.calculateCenter(boundary);

    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < boundary.length; i++) {
      const j = (i + 1) % boundary.length;
      const pi = boundary[i];
      const pj = boundary[j];
      if (pi && pj) {
        area += pi.x * pj.y;
        area -= pj.x * pi.y;
      }
    }
    area = Math.abs(area / 2);

    return {
      id,
      name: this.generateLakeName(),
      center,
      boundary,
      elevation: 0.4, // Default elevation
      area,
      depth: this.settings.depth,
      inflows: [],
      type: 'freshwater',
    };
  }

  /**
   * Generate random lake name
   */
  private generateLakeName(): string {
    const adj = LAKE_ADJECTIVES[Math.floor(Math.random() * LAKE_ADJECTIVES.length)];
    const noun = LAKE_NOUNS[Math.floor(Math.random() * LAKE_NOUNS.length)];
    return `${adj} ${noun}`;
  }

  /**
   * Reset tool state
   */
  private reset(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.boundaryPoints = [];
    this.clearPreview();
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    const { worldPosition } = ctx;

    if (this.isDrawing && this.startPoint) {
      let previewBoundary: Vector2[];

      switch (this.settings.type) {
        case 'ellipse':
          previewBoundary = this.createEllipseBoundary(this.startPoint, worldPosition);
          break;
        case 'rectangle':
          previewBoundary = this.createRectangleBoundary(this.startPoint, worldPosition);
          break;
        case 'freeform':
        default:
          previewBoundary = [...this.boundaryPoints, worldPosition];
          break;
      }

      if (previewBoundary.length > 2) {
        // Draw lake fill
        this.previewGraphics.poly(previewBoundary.flatMap((p) => [p.x, p.y]));
        this.previewGraphics.fill({ color: 0x5b9bd5, alpha: 0.3 });
        this.previewGraphics.stroke({ width: 2, color: 0x3a7ab8, alpha: 0.8 });
      }

      // Draw control point
      if (this.settings.type !== 'freeform') {
        this.previewGraphics
          .circle(this.startPoint.x, this.startPoint.y, 5)
          .fill({ color: 0xffffff });
      }
    }

    // Cursor indicator
    this.previewGraphics
      .circle(worldPosition.x, worldPosition.y, 4)
      .fill({ color: 0x5b9bd5, alpha: 0.8 });
  }

  /**
   * Cleanup
   */
  onDeactivate(ctx: ToolContext): void {
    super.onDeactivate(ctx);
    this.reset();
  }
}
