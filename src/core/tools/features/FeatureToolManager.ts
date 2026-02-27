import { MountainStampTool } from './MountainStampTool';
import { MountainPathTool } from './MountainPathTool';
import { ForestBrushTool, type ForestStroke } from './ForestBrushTool';
import { RiverSplineTool } from './RiverSplineTool';
import { LakeShapeTool } from './LakeShapeTool';
import { FeatureEraserTool, type ErasedFeature } from './FeatureEraserTool';
import { FeatureSelectTool } from './FeatureSelectTool';
import type { FeatureTool } from './FeatureTool';
import type { FeatureToolType, FeatureEditOperation } from './types';
import type { ToolContext } from '../types';
import type {
  MountainPeak,
  MountainRange,
  River,
  Lake,
  FeatureGenerationResult,
} from '@/core/generation/features/types';
import type { Vector2 } from '@/types';

/**
 * Feature tool manager
 * Coordinates all feature editing tools
 */
export class FeatureToolManager {
  private tools: Map<FeatureToolType, FeatureTool>;
  private activeTool: FeatureTool | null = null;
  private activeToolType: FeatureToolType | null = null;

  // Feature data references
  private peaks: MountainPeak[] = [];
  private ranges: MountainRange[] = [];
  private rivers: River[] = [];
  private lakes: Lake[] = [];

  // Callbacks
  private onFeatureChange: ((type: string, data: any) => void) | null = null;
  private onEditOperation: ((operation: FeatureEditOperation) => void) | null = null;

  constructor() {
    this.tools = new Map();
    this.initializeTools();
  }

  /**
   * Initialize all feature tools
   */
  private initializeTools(): void {
    // Mountain stamp
    const mountainStamp = new MountainStampTool();
    mountainStamp.setOnPeakCreated((peak) => this.handlePeakCreated(peak));
    this.tools.set('mountain-stamp', mountainStamp);

    // Mountain path
    const mountainPath = new MountainPathTool();
    mountainPath.setOnRangeCreated((range) => this.handleRangeCreated(range));
    this.tools.set('mountain-path', mountainPath);

    // Forest brush
    const forestBrush = new ForestBrushTool();
    forestBrush.setOnForestPainted((stroke) => this.handleForestPainted(stroke));
    this.tools.set('forest-brush', forestBrush);

    // River spline
    const riverSpline = new RiverSplineTool();
    riverSpline.setOnRiverCreated((river) => this.handleRiverCreated(river));
    this.tools.set('river-spline', riverSpline);

    // Lake shape
    const lakeShape = new LakeShapeTool();
    lakeShape.setOnLakeCreated((lake) => this.handleLakeCreated(lake));
    this.tools.set('lake-shape', lakeShape);

    // Feature eraser
    const featureEraser = new FeatureEraserTool();
    featureEraser.setOnFeaturesErased((features) => this.handleFeaturesErased(features));
    featureEraser.on('erase', (data) => this.handleEraseEvent(data));
    this.tools.set('feature-eraser', featureEraser);

    // Feature select
    const featureSelect = new FeatureSelectTool();
    featureSelect.setOnSelectionChange((selection) => this.handleSelectionChange(selection));
    featureSelect.setOnFeatureTransform((id, transform) => this.handleFeatureTransform(id, transform));
    featureSelect.on('find-feature', (data) => this.handleFindFeature(data));
    featureSelect.on('delete-feature', (data) => this.handleDeleteFeature(data));
    this.tools.set('feature-select', featureSelect);

    // Listen for edit operations from all tools
    for (const tool of this.tools.values()) {
      tool.on('edit', (operation: FeatureEditOperation) => {
        this.onEditOperation?.(operation);
      });
    }
  }

  /**
   * Set feature change callback
   */
  setOnFeatureChange(callback: (type: string, data: any) => void): void {
    this.onFeatureChange = callback;
  }

  /**
   * Set edit operation callback
   */
  setOnEditOperation(callback: (operation: FeatureEditOperation) => void): void {
    this.onEditOperation = callback;
  }

  /**
   * Set feature data from generation result
   */
  setFeatureData(result: FeatureGenerationResult): void {
    this.peaks = [...result.peaks];
    this.ranges = [...result.mountainRanges];
    this.rivers = [...result.rivers];
    this.lakes = [...result.lakes];
  }

  /**
   * Get active tool
   */
  getActiveTool(): FeatureTool | null {
    return this.activeTool;
  }

  /**
   * Get active tool type
   */
  getActiveToolType(): FeatureToolType | null {
    return this.activeToolType;
  }

  /**
   * Set active tool
   */
  setActiveTool(toolType: FeatureToolType | null, ctx?: ToolContext): void {
    // Deactivate current tool
    if (this.activeTool && ctx) {
      this.activeTool.onDeactivate(ctx);
    }

    if (toolType === null) {
      this.activeTool = null;
      this.activeToolType = null;
      return;
    }

    const tool = this.tools.get(toolType);
    if (tool) {
      this.activeTool = tool;
      this.activeToolType = toolType;
      if (ctx) {
        tool.onActivate(ctx);
      }
    }
  }

  /**
   * Get tool by type
   */
  getTool<T extends FeatureTool>(toolType: FeatureToolType): T | undefined {
    return this.tools.get(toolType) as T | undefined;
  }

  /**
   * Get all tools
   */
  getAllTools(): Map<FeatureToolType, FeatureTool> {
    return this.tools;
  }

  /**
   * Handle peak created
   */
  private handlePeakCreated(peak: MountainPeak): void {
    this.peaks.push(peak);
    this.onFeatureChange?.('mountains', { peaks: this.peaks, ranges: this.ranges });
  }

  /**
   * Handle range created
   */
  private handleRangeCreated(range: MountainRange): void {
    this.ranges.push(range);
    this.peaks.push(...range.peaks);
    this.onFeatureChange?.('mountains', { peaks: this.peaks, ranges: this.ranges });
  }

  /**
   * Handle forest painted
   */
  private handleForestPainted(stroke: ForestStroke): void {
    this.onFeatureChange?.('forests', { stroke });
  }

  /**
   * Handle river created
   */
  private handleRiverCreated(river: River): void {
    this.rivers.push(river);
    this.onFeatureChange?.('rivers', { rivers: this.rivers });
  }

  /**
   * Handle lake created
   */
  private handleLakeCreated(lake: Lake): void {
    this.lakes.push(lake);
    this.onFeatureChange?.('lakes', { lakes: this.lakes });
  }

  /**
   * Handle features erased
   */
  private handleFeaturesErased(features: ErasedFeature[]): void {
    for (const erased of features) {
      switch (erased.type) {
        case 'mountain':
          this.peaks = this.peaks.filter((p) => p !== erased.feature);
          break;
        case 'river':
          this.rivers = this.rivers.filter((r) => r.id !== erased.id);
          break;
        case 'lake':
          this.lakes = this.lakes.filter((l) => l.id !== erased.id);
          break;
      }
    }

    this.onFeatureChange?.('all', {
      peaks: this.peaks,
      ranges: this.ranges,
      rivers: this.rivers,
      lakes: this.lakes,
    });
  }

  /**
   * Handle erase event from eraser tool
   */
  private handleEraseEvent(data: any): void {
    const { position, radius, targets, onErased } = data;

    // Check mountains
    if (targets.mountains) {
      for (const peak of this.peaks) {
        const dist = this.distance(position, peak.position);
        if (dist <= radius + peak.radius) {
          onErased({ type: 'mountain', id: '', feature: peak });
        }
      }
    }

    // Check rivers
    if (targets.rivers) {
      for (const river of this.rivers) {
        for (const point of river.path) {
          const dist = this.distance(position, point);
          if (dist <= radius) {
            onErased({ type: 'river', id: river.id, feature: river });
            break;
          }
        }
      }
    }

    // Check lakes
    if (targets.lakes) {
      for (const lake of this.lakes) {
        const dist = this.distance(position, lake.center);
        if (dist <= radius + Math.sqrt(lake.area)) {
          onErased({ type: 'lake', id: lake.id, feature: lake });
        }
      }
    }
  }

  /**
   * Handle find feature event from select tool
   */
  private handleFindFeature(data: any): void {
    const { position, callback } = data;
    const tolerance = 10;

    // Check mountains
    for (const peak of this.peaks) {
      const dist = this.distance(position, peak.position);
      if (dist <= peak.radius + tolerance) {
        callback({
          type: 'mountain',
          id: peak.rangeId || 'peak',
          bounds: {
            x: peak.position.x - peak.radius,
            y: peak.position.y - peak.radius * 1.5,
            width: peak.radius * 2,
            height: peak.radius * 2,
          },
        });
        return;
      }
    }

    // Check rivers
    for (const river of this.rivers) {
      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        if (!point) continue;
        const width = river.widths[i] || 2;
        const dist = this.distance(position, point);
        if (dist <= width + tolerance) {
          const bounds = this.calculatePathBounds(river.path);
          callback({
            type: 'river',
            id: river.id,
            bounds,
          });
          return;
        }
      }
    }

    // Check lakes
    for (const lake of this.lakes) {
      if (this.isPointInPolygon(position, lake.boundary)) {
        const bounds = this.calculatePathBounds(lake.boundary);
        callback({
          type: 'lake',
          id: lake.id,
          bounds,
        });
        return;
      }
    }

    // Nothing found
    callback(null);
  }

  /**
   * Handle delete feature event
   */
  private handleDeleteFeature(data: { type: string; id: string }): void {
    switch (data.type) {
      case 'river':
        this.rivers = this.rivers.filter((r) => r.id !== data.id);
        this.onFeatureChange?.('rivers', { rivers: this.rivers });
        break;
      case 'lake':
        this.lakes = this.lakes.filter((l) => l.id !== data.id);
        this.onFeatureChange?.('lakes', { lakes: this.lakes });
        break;
    }
  }

  /**
   * Handle selection change
   */
  private handleSelectionChange(_selection: any): void {
    // Could emit event or update UI
  }

  /**
   * Handle feature transform
   */
  private handleFeatureTransform(_featureId: string, _transform: any): void {
    // Apply transform to feature
    // This would need more complex logic for actual scaling/moving
  }

  /**
   * Calculate bounding box for path
   */
  private calculatePathBounds(path: Vector2[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const point of path) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate distance between points
   */
  private distance(p1: Vector2, p2: Vector2): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  /**
   * Check if point is in polygon
   */
  private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
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
   * Destroy manager and all tools
   */
  destroy(): void {
    for (const tool of this.tools.values()) {
      tool.destroy();
    }
    this.tools.clear();
  }
}
