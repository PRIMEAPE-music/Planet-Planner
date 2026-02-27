import { BaseTool } from '../BaseTool';
import type { ToolContext, ToolCursor } from '../types';
import type { FeatureToolContext, FeatureEditOperation } from './types';
import type { Vector2 } from '@/types';

type EventCallback<T = any> = (data: T) => void;

/**
 * Base class for feature editing tools
 */
export abstract class FeatureTool extends BaseTool {
  protected featureContext: FeatureToolContext;
  protected editHistory: FeatureEditOperation[] = [];
  protected historyIndex: number = -1;

  // Event listeners
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    super();

    this.featureContext = {
      settings: {},
      activeSpline: null,
      selection: {
        type: null,
        id: null,
        bounds: null,
        handles: [],
      },
      previewVisible: true,
    };
  }

  /**
   * Get default cursor for feature tools
   */
  getCursor(): ToolCursor {
    return {
      type: 'crosshair',
      showSizeIndicator: true,
      sizeRadius: this.getBrushRadius(),
    };
  }

  /**
   * Get current brush/tool radius (override in subclasses)
   */
  protected getBrushRadius(): number {
    return 20;
  }

  /**
   * Update preview graphics (override in subclasses)
   */
  protected abstract updatePreview(ctx: ToolContext): void;

  /**
   * Show/hide preview
   */
  setPreviewVisible(visible: boolean): void {
    this.featureContext.previewVisible = visible;
    this.previewContainer.visible = visible;
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event
   */
  protected emit(event: string, data?: any): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(data));
  }

  /**
   * Record edit operation for undo/redo
   */
  protected recordEdit(operation: Omit<FeatureEditOperation, 'timestamp'>): void {
    const fullOperation: FeatureEditOperation = {
      ...operation,
      timestamp: Date.now(),
    };

    // Remove any operations after current index (branching history)
    this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);
    this.editHistory.push(fullOperation);
    this.historyIndex = this.editHistory.length - 1;

    // Emit edit event
    this.emit('edit', fullOperation);
  }

  /**
   * Undo last operation
   */
  undo(): FeatureEditOperation | null {
    if (this.historyIndex < 0) return null;

    const operation = this.editHistory[this.historyIndex];
    this.historyIndex--;

    return operation ?? null;
  }

  /**
   * Redo last undone operation
   */
  redo(): FeatureEditOperation | null {
    if (this.historyIndex >= this.editHistory.length - 1) return null;

    this.historyIndex++;
    return this.editHistory[this.historyIndex] ?? null;
  }

  /**
   * Check if point is near a feature
   */
  protected findFeatureAt(
    position: Vector2,
    features: { mountains: any[]; rivers: any[]; lakes: any[]; forests: any[] },
    tolerance: number = 10
  ): { type: string; id: string; feature: any } | null {
    // Check mountains
    for (const peak of features.mountains || []) {
      const dist = this.distance(position, peak.position);
      if (dist <= peak.radius + tolerance) {
        return { type: 'mountain', id: peak.id || '', feature: peak };
      }
    }

    // Check rivers
    for (const river of features.rivers || []) {
      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths?.[i] || 2;
        const dist = this.distance(position, point);
        if (dist <= width + tolerance) {
          return { type: 'river', id: river.id, feature: river };
        }
      }
    }

    // Check lakes
    for (const lake of features.lakes || []) {
      if (this.isPointInPolygon(position, lake.boundary)) {
        return { type: 'lake', id: lake.id, feature: lake };
      }
    }

    // Check forests
    for (const forest of features.forests || []) {
      if (this.isPointInPolygon(position, forest.boundary)) {
        return { type: 'forest', id: forest.id, feature: forest };
      }
    }

    return null;
  }

  /**
   * Calculate distance between two points
   */
  protected distance(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Check if point is inside polygon
   */
  protected isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    if (polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const pi = polygon[i];
      const pj = polygon[j];
      if (!pi || !pj) continue;
      const xi = pi.x, yi = pi.y;
      const xj = pj.x, yj = pj.y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Generate unique ID
   */
  protected generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Cleanup on deactivate
   */
  onDeactivate(ctx: ToolContext): void {
    super.onDeactivate(ctx);
    this.featureContext.activeSpline = null;
    this.featureContext.selection = {
      type: null,
      id: null,
      bounds: null,
      handles: [],
    };
  }

  /**
   * Destroy tool and clean up resources
   */
  destroy(): void {
    this.previewGraphics.destroy();
    this.previewContainer.destroy();
    this.eventListeners.clear();
  }
}
