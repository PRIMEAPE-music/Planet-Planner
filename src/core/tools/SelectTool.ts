import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { Vector2, Bounds } from '@/types';
import { vec2Sub } from '@/utils';

type SelectMode = 'none' | 'selecting' | 'moving' | 'resizing';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Selection tool for selecting and transforming content
 */
export class SelectTool extends BaseTool {
  readonly id = 'select';
  readonly name = 'Select';
  readonly icon = 'MousePointer2';
  readonly shortcut = 'V';

  private selectionBounds: Bounds | null = null;
  private selectionGraphics: Graphics;
  private mode: SelectMode = 'none';
  private activeHandle: ResizeHandle | null = null;
  private startPosition: Vector2 | null = null;
  private startBounds: Bounds | null = null;

  constructor() {
    super();
    this.selectionGraphics = new Graphics();
    this.previewContainer.addChild(this.selectionGraphics);
  }

  getCursor(): ToolCursor {
    if (this.mode === 'moving') {
      return { type: 'move' };
    }
    if (this.activeHandle) {
      return { type: 'move' }; // Could be more specific resize cursors
    }
    return { type: 'default' };
  }

  onPointerDown(ctx: ToolContext): void {
    this.startPosition = { ...ctx.worldPosition };

    // Check if clicking on resize handle
    if (this.selectionBounds) {
      const handle = this.getHandleAtPosition(ctx.worldPosition);
      if (handle) {
        this.mode = 'resizing';
        this.activeHandle = handle;
        this.startBounds = { ...this.selectionBounds };
        return;
      }

      // Check if clicking inside selection
      if (this.isInsideBounds(ctx.worldPosition, this.selectionBounds)) {
        this.mode = 'moving';
        this.startBounds = { ...this.selectionBounds };
        return;
      }
    }

    // Start new selection
    this.mode = 'selecting';
    this.selectionBounds = null;
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || !this.startPosition) return;

    switch (this.mode) {
      case 'selecting':
        // Update selection rectangle
        this.selectionBounds = this.createBoundsFromPoints(
          this.startPosition,
          ctx.worldPosition
        );
        break;

      case 'moving':
        if (this.startBounds) {
          const delta = vec2Sub(ctx.worldPosition, this.startPosition);
          this.selectionBounds = {
            x: this.startBounds.x + delta.x,
            y: this.startBounds.y + delta.y,
            width: this.startBounds.width,
            height: this.startBounds.height,
          };
        }
        break;

      case 'resizing':
        if (this.startBounds && this.activeHandle) {
          this.selectionBounds = this.resizeBounds(
            this.startBounds,
            this.activeHandle,
            this.startPosition,
            ctx.worldPosition
          );
        }
        break;
    }

    this.drawSelection(ctx);
  }

  onPointerUp(ctx: ToolContext): ToolOperationResult | null {
    const previousMode = this.mode;
    this.mode = 'none';
    this.activeHandle = null;
    this.startPosition = null;
    this.startBounds = null;

    // If selection is too small, clear it
    if (
      this.selectionBounds &&
      (this.selectionBounds.width < 5 || this.selectionBounds.height < 5)
    ) {
      this.selectionBounds = null;
    }

    this.drawSelection(ctx);

    // Return transform operation if we moved/resized
    if (previousMode === 'moving' || previousMode === 'resizing') {
      return {
        type: 'transform',
        layerId: ctx.activeLayer?.id ?? '',
        undoData: { bounds: this.startBounds },
        redoData: { bounds: this.selectionBounds },
      };
    }

    return null;
  }

  onKeyDown(ctx: ToolContext, key: string): void {
    if (key === 'Escape') {
      this.selectionBounds = null;
      this.drawSelection(ctx);
    }

    // Arrow key nudging
    if (this.selectionBounds) {
      const nudge = ctx.input.modifiers.shift ? 10 : 1;
      switch (key) {
        case 'ArrowUp':
          this.selectionBounds.y -= nudge;
          break;
        case 'ArrowDown':
          this.selectionBounds.y += nudge;
          break;
        case 'ArrowLeft':
          this.selectionBounds.x -= nudge;
          break;
        case 'ArrowRight':
          this.selectionBounds.x += nudge;
          break;
      }
      this.drawSelection(ctx);
    }
  }

  /**
   * Draw selection rectangle and handles
   */
  private drawSelection(ctx: ToolContext): void {
    this.selectionGraphics.clear();

    if (!this.selectionBounds) return;

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;
    const { x, y, width, height } = this.selectionBounds;

    // Selection rectangle
    this.selectionGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0x00aaff,
      alpha: 1,
    });
    this.selectionGraphics.rect(x, y, width, height);
    this.selectionGraphics.stroke();

    // Dashed line effect (simplified - just solid for now)
    this.selectionGraphics.setStrokeStyle({
      width: 1 / zoom,
      color: 0xffffff,
      alpha: 0.5,
    });
    this.selectionGraphics.rect(x, y, width, height);
    this.selectionGraphics.stroke();

    // Draw resize handles
    const handleSize = 8 / zoom;
    const handles = this.getHandlePositions(this.selectionBounds);

    for (const pos of Object.values(handles)) {
      this.selectionGraphics.rect(
        pos.x - handleSize / 2,
        pos.y - handleSize / 2,
        handleSize,
        handleSize
      );
      this.selectionGraphics.fill({ color: 0xffffff });
      this.selectionGraphics.setStrokeStyle({
        width: 1 / zoom,
        color: 0x00aaff,
      });
      this.selectionGraphics.stroke();
    }
  }

  /**
   * Get positions of all resize handles
   */
  private getHandlePositions(bounds: Bounds): Record<ResizeHandle, Vector2> {
    const { x, y, width, height } = bounds;
    return {
      nw: { x, y },
      n: { x: x + width / 2, y },
      ne: { x: x + width, y },
      e: { x: x + width, y: y + height / 2 },
      se: { x: x + width, y: y + height },
      s: { x: x + width / 2, y: y + height },
      sw: { x, y: y + height },
      w: { x, y: y + height / 2 },
    };
  }

  /**
   * Find handle at position
   */
  private getHandleAtPosition(position: Vector2): ResizeHandle | null {
    if (!this.selectionBounds) return null;

    const handles = this.getHandlePositions(this.selectionBounds);
    const threshold = 10;

    for (const [handle, pos] of Object.entries(handles)) {
      const dx = Math.abs(position.x - pos.x);
      const dy = Math.abs(position.y - pos.y);
      if (dx < threshold && dy < threshold) {
        return handle as ResizeHandle;
      }
    }

    return null;
  }

  /**
   * Check if position is inside bounds
   */
  private isInsideBounds(position: Vector2, bounds: Bounds): boolean {
    return (
      position.x >= bounds.x &&
      position.x <= bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y <= bounds.y + bounds.height
    );
  }

  /**
   * Create bounds from two points
   */
  private createBoundsFromPoints(p1: Vector2, p2: Vector2): Bounds {
    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      width: Math.abs(p2.x - p1.x),
      height: Math.abs(p2.y - p1.y),
    };
  }

  /**
   * Resize bounds based on handle drag
   */
  private resizeBounds(
    original: Bounds,
    handle: ResizeHandle,
    startPos: Vector2,
    currentPos: Vector2
  ): Bounds {
    const delta = vec2Sub(currentPos, startPos);
    const result = { ...original };

    // Handle horizontal resize
    if (handle.includes('w')) {
      result.x = original.x + delta.x;
      result.width = original.width - delta.x;
    } else if (handle.includes('e')) {
      result.width = original.width + delta.x;
    }

    // Handle vertical resize
    if (handle.includes('n')) {
      result.y = original.y + delta.y;
      result.height = original.height - delta.y;
    } else if (handle.includes('s')) {
      result.height = original.height + delta.y;
    }

    // Ensure positive dimensions
    if (result.width < 0) {
      result.x += result.width;
      result.width = Math.abs(result.width);
    }
    if (result.height < 0) {
      result.y += result.height;
      result.height = Math.abs(result.height);
    }

    return result;
  }

  renderPreview(ctx: ToolContext): void {
    // Selection is drawn in drawSelection, called from onPointerMove
    if (!ctx.isStroking) {
      this.drawSelection(ctx);
    }
  }
}
