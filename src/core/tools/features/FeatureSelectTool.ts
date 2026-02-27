import { FeatureTool } from './FeatureTool';
import type { ToolContext, ToolCursor } from '../types';
import type { FeatureSelection } from './types';
import type { Vector2 } from '@/types';

/**
 * Handle positions for transform
 */
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

/**
 * Tool for selecting and transforming features
 */
export class FeatureSelectTool extends FeatureTool {
  readonly id = 'feature-select';
  readonly name = 'Select Feature';
  readonly icon = 'pointer';

  private selection: FeatureSelection | null = null;
  private isDragging: boolean = false;
  private dragStart: Vector2 | null = null;
  private dragOffset: Vector2 | null = null;
  private activeHandle: HandlePosition | null = null;
  private hoveredHandle: HandlePosition | null = null;

  private onSelectionChange: ((selection: FeatureSelection | null) => void) | null = null;
  private onFeatureTransform: ((featureId: string, transform: any) => void) | null = null;

  constructor() {
    super();
  }

  /**
   * Set selection change callback
   */
  setOnSelectionChange(callback: (selection: FeatureSelection | null) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * Set feature transform callback
   */
  setOnFeatureTransform(callback: (featureId: string, transform: any) => void): void {
    this.onFeatureTransform = callback;
  }

  /**
   * Get current selection
   */
  getSelection(): FeatureSelection | null {
    return this.selection;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selection = null;
    this.onSelectionChange?.(null);
    this.clearPreview();
  }

  /**
   * Get cursor based on hover state
   */
  getCursor(): ToolCursor {
    if (this.hoveredHandle) {
      switch (this.hoveredHandle) {
        case 'nw':
        case 'se':
          return { type: 'custom', image: 'nwse-resize' };
        case 'ne':
        case 'sw':
          return { type: 'custom', image: 'nesw-resize' };
        case 'n':
        case 's':
          return { type: 'custom', image: 'ns-resize' };
        case 'e':
        case 'w':
          return { type: 'custom', image: 'ew-resize' };
        case 'rotate':
          return { type: 'crosshair' };
      }
    }
    if (this.selection) {
      return { type: 'move' };
    }
    return { type: 'default' };
  }

  /**
   * Handle pointer down
   */
  onPointerDown(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    // Check if clicking on handle
    if (this.selection) {
      const handle = this.findHandleAt(worldPosition);
      if (handle) {
        this.activeHandle = handle;
        this.dragStart = { ...worldPosition };
        this.isDragging = true;
        return;
      }

      // Check if clicking inside selection bounds
      if (this.isPointInSelection(worldPosition)) {
        this.isDragging = true;
        this.dragStart = { ...worldPosition };
        this.dragOffset = {
          x: worldPosition.x - (this.selection.bounds?.x || 0),
          y: worldPosition.y - (this.selection.bounds?.y || 0),
        };
        return;
      }
    }

    // Try to select a feature
    this.trySelectFeature(worldPosition, ctx);
  }

  /**
   * Handle pointer move
   */
  onPointerMove(ctx: ToolContext): void {
    const { worldPosition } = ctx;

    if (this.isDragging && this.selection && this.dragStart) {
      if (this.activeHandle) {
        // Resizing
        this.handleResize(worldPosition);
      } else {
        // Moving
        this.handleMove(worldPosition);
      }
    } else {
      // Update hover state
      this.hoveredHandle = this.findHandleAt(worldPosition);
    }

    this.updatePreview(ctx);
  }

  /**
   * Handle pointer up
   */
  onPointerUp(_ctx: ToolContext): null {
    if (this.isDragging && this.selection) {
      // Emit transform event
      if (this.selection.id) {
        this.onFeatureTransform?.(this.selection.id, {
          bounds: this.selection.bounds,
        });
      }
    }

    this.isDragging = false;
    this.dragStart = null;
    this.dragOffset = null;
    this.activeHandle = null;

    return null;
  }

  /**
   * Handle key press
   */
  onKeyDown(_ctx: ToolContext, key: string): void {
    if (!this.selection) return;

    if (key === 'Delete' || key === 'Backspace') {
      // Delete selected feature
      if (this.selection.id) {
        this.emit('delete-feature', {
          type: this.selection.type,
          id: this.selection.id,
        });
      }
      this.clearSelection();
    } else if (key === 'Escape') {
      this.clearSelection();
    }
  }

  /**
   * Try to select feature at position
   */
  private trySelectFeature(position: Vector2, ctx: ToolContext): void {
    // Emit event for feature manager to handle
    this.emit('find-feature', {
      position,
      callback: (result: { type: string; id: string; bounds: any } | null) => {
        if (result) {
          this.selection = {
            type: result.type as any,
            id: result.id,
            bounds: result.bounds,
            handles: this.calculateHandles(result.bounds),
          };
          this.onSelectionChange?.(this.selection);
        } else {
          this.clearSelection();
        }
        this.updatePreview(ctx);
      },
    });
  }

  /**
   * Calculate handle positions from bounds
   */
  private calculateHandles(bounds: { x: number; y: number; width: number; height: number }): Vector2[] {
    if (!bounds) return [];

    const { x, y, width, height } = bounds;

    return [
      { x, y }, // nw
      { x: x + width / 2, y }, // n
      { x: x + width, y }, // ne
      { x: x + width, y: y + height / 2 }, // e
      { x: x + width, y: y + height }, // se
      { x: x + width / 2, y: y + height }, // s
      { x, y: y + height }, // sw
      { x, y: y + height / 2 }, // w
      { x: x + width / 2, y: y - 20 }, // rotate
    ];
  }

  /**
   * Find handle at position
   */
  private findHandleAt(position: Vector2): HandlePosition | null {
    if (!this.selection?.handles) return null;

    const handlePositions: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];
    const tolerance = 10;

    for (let i = 0; i < this.selection.handles.length; i++) {
      const handle = this.selection.handles[i];
      if (!handle) continue;
      const dist = this.distance(position, handle);
      if (dist <= tolerance) {
        return handlePositions[i] ?? null;
      }
    }

    return null;
  }

  /**
   * Check if point is inside selection bounds
   */
  private isPointInSelection(position: Vector2): boolean {
    if (!this.selection?.bounds) return false;

    const { x, y, width, height } = this.selection.bounds;
    return (
      position.x >= x &&
      position.x <= x + width &&
      position.y >= y &&
      position.y <= y + height
    );
  }

  /**
   * Handle feature move
   */
  private handleMove(position: Vector2): void {
    if (!this.selection?.bounds || !this.dragOffset) return;

    this.selection.bounds.x = position.x - this.dragOffset.x;
    this.selection.bounds.y = position.y - this.dragOffset.y;
    this.selection.handles = this.calculateHandles(this.selection.bounds);
  }

  /**
   * Handle feature resize
   */
  private handleResize(position: Vector2): void {
    if (!this.selection?.bounds || !this.dragStart || !this.activeHandle) return;

    const bounds = this.selection.bounds;
    const dx = position.x - this.dragStart.x;
    const dy = position.y - this.dragStart.y;

    switch (this.activeHandle) {
      case 'nw':
        bounds.x += dx;
        bounds.y += dy;
        bounds.width -= dx;
        bounds.height -= dy;
        break;
      case 'n':
        bounds.y += dy;
        bounds.height -= dy;
        break;
      case 'ne':
        bounds.y += dy;
        bounds.width += dx;
        bounds.height -= dy;
        break;
      case 'e':
        bounds.width += dx;
        break;
      case 'se':
        bounds.width += dx;
        bounds.height += dy;
        break;
      case 's':
        bounds.height += dy;
        break;
      case 'sw':
        bounds.x += dx;
        bounds.width -= dx;
        bounds.height += dy;
        break;
      case 'w':
        bounds.x += dx;
        bounds.width -= dx;
        break;
    }

    // Ensure minimum size
    bounds.width = Math.max(10, bounds.width);
    bounds.height = Math.max(10, bounds.height);

    this.selection.handles = this.calculateHandles(bounds);
    this.dragStart = { ...position };
  }

  /**
   * Update preview graphics
   */
  protected updatePreview(_ctx: ToolContext): void {
    this.clearPreview();
    if (!this.featureContext.previewVisible) return;

    if (this.selection?.bounds) {
      const { x, y, width, height } = this.selection.bounds;

      // Draw selection rectangle
      this.previewGraphics
        .rect(x, y, width, height)
        .stroke({ width: 2, color: 0x00aaff, alpha: 0.8 });

      // Draw handles
      const handleSize = 8;
      const handlePositions: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate'];

      for (let i = 0; i < this.selection.handles.length; i++) {
        const handle = this.selection.handles[i];
        if (!handle) continue;
        const isHovered = this.hoveredHandle === handlePositions[i];
        const isRotate = i === 8;

        if (isRotate) {
          // Draw rotate handle
          this.previewGraphics
            .circle(handle.x, handle.y, handleSize / 2)
            .fill({ color: isHovered ? 0x00ff00 : 0xffffff })
            .stroke({ width: 2, color: 0x00aaff });

          // Line from top handle to rotate
          this.previewGraphics
            .moveTo(x + width / 2, y)
            .lineTo(handle.x, handle.y)
            .stroke({ width: 1, color: 0x00aaff, alpha: 0.5 });
        } else {
          // Draw resize handle
          this.previewGraphics
            .rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
            .fill({ color: isHovered ? 0x00ff00 : 0xffffff })
            .stroke({ width: 1, color: 0x00aaff });
        }
      }
    }
  }

  /**
   * Cleanup
   */
  onDeactivate(ctx: ToolContext): void {
    super.onDeactivate(ctx);
    this.isDragging = false;
    this.dragStart = null;
    this.dragOffset = null;
    this.activeHandle = null;
    this.hoveredHandle = null;
  }
}
