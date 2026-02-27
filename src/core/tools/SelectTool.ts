import { Graphics, Container } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { Vector2, Bounds } from '@/types';
import { vec2Sub, debug } from '@/utils';

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
  private selectedObjects: Container[] = [];
  private objectStartPositions: Map<Container, Vector2> = new Map();

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

    debug.log('[SelectTool] Pointer down:', {
      hasSelection: !!this.selectionBounds,
      selectedCount: this.selectedObjects.length,
      clickPos: ctx.worldPosition
    });

    // Check if clicking on resize handle
    if (this.selectionBounds) {
      const handle = this.getHandleAtPosition(ctx.worldPosition);
      if (handle) {
        debug.log('[SelectTool] Clicked on resize handle:', handle);
        this.mode = 'resizing';
        this.activeHandle = handle;
        this.startBounds = { ...this.selectionBounds };
        return;
      }

      // Check if clicking inside selection
      const isInside = this.isInsideBounds(ctx.worldPosition, this.selectionBounds);
      debug.log('[SelectTool] Click inside selection?', isInside, 'bounds:', this.selectionBounds);

      if (isInside) {
        debug.log('[SelectTool] Starting move mode with', this.selectedObjects.length, 'objects');
        this.mode = 'moving';
        this.startBounds = { ...this.selectionBounds };

        // Store starting positions of selected objects
        this.objectStartPositions.clear();
        for (const obj of this.selectedObjects) {
          this.objectStartPositions.set(obj, { x: obj.x, y: obj.y });
        }
        return;
      }
    }

    // Start new selection
    debug.log('[SelectTool] Starting new selection');
    this.mode = 'selecting';
    this.selectionBounds = null;
    this.selectedObjects = [];
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
        if (this.startBounds && this.selectedObjects.length > 0) {
          const delta = vec2Sub(ctx.worldPosition, this.startPosition);
          debug.log('[SelectTool] Moving objects, delta:', delta);

          // Move all selected objects
          for (const obj of this.selectedObjects) {
            const startPos = this.objectStartPositions.get(obj);
            if (startPos) {
              obj.position.set(startPos.x + delta.x, startPos.y + delta.y);
              debug.log('[SelectTool] Moved object to:', { x: obj.x, y: obj.y });
            }
          }

          // Update selection bounds
          this.selectionBounds = {
            x: this.startBounds.x + delta.x,
            y: this.startBounds.y + delta.y,
            width: this.startBounds.width,
            height: this.startBounds.height,
          };
        } else {
          debug.log('[SelectTool] Cannot move - startBounds:', this.startBounds, 'selectedObjects:', this.selectedObjects.length);
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
    this.objectStartPositions.clear();

    // If we just finished selecting, find objects within bounds
    if (previousMode === 'selecting' && this.selectionBounds) {
      // If selection is too small, clear it
      if (this.selectionBounds.width < 5 || this.selectionBounds.height < 5) {
        this.selectionBounds = null;
        this.selectedObjects = [];
      } else {
        // Find objects within selection
        this.selectedObjects = this.findObjectsInBounds(ctx, this.selectionBounds);
        debug.log(`[SelectTool] Selected ${this.selectedObjects.length} objects`);
      }
    }

    this.drawSelection(ctx);

    // Return transform operation if we moved/resized
    if (previousMode === 'moving' || previousMode === 'resizing') {
      ctx.activeLayer?.markDirty();
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
      this.selectedObjects = [];
      this.drawSelection(ctx);
      return;
    }

    // Delete selected objects
    if ((key === 'Delete' || key === 'Backspace') && this.selectedObjects.length > 0) {
      for (const obj of this.selectedObjects) {
        if (obj.parent) {
          obj.parent.removeChild(obj);
          obj.destroy();
        }
      }
      this.selectedObjects = [];
      this.selectionBounds = null;
      ctx.activeLayer?.markDirty();
      this.drawSelection(ctx);
      return;
    }

    // Arrow key nudging
    if (this.selectionBounds && this.selectedObjects.length > 0) {
      const nudge = ctx.input.modifiers.shift ? 10 : 1;
      let deltaX = 0;
      let deltaY = 0;

      switch (key) {
        case 'ArrowUp':
          deltaY = -nudge;
          break;
        case 'ArrowDown':
          deltaY = nudge;
          break;
        case 'ArrowLeft':
          deltaX = -nudge;
          break;
        case 'ArrowRight':
          deltaX = nudge;
          break;
      }

      if (deltaX !== 0 || deltaY !== 0) {
        // Move objects
        for (const obj of this.selectedObjects) {
          obj.x += deltaX;
          obj.y += deltaY;
        }

        // Update bounds
        this.selectionBounds.x += deltaX;
        this.selectionBounds.y += deltaY;

        ctx.activeLayer?.markDirty();
        this.drawSelection(ctx);
      }
    }
  }

  /**
   * Find objects within selection bounds
   */
  private findObjectsInBounds(ctx: ToolContext, bounds: Bounds): Container[] {
    if (!ctx.activeLayer) {
      debug.log('[SelectTool] No active layer for object detection');
      return [];
    }

    const selected: Container[] = [];
    const layerContainer = ctx.activeLayer.contentContainer;

    debug.log('[SelectTool] Finding objects in bounds:', bounds);
    debug.log('[SelectTool] Layer has', layerContainer.children.length, 'children');

    // Iterate through all children in the layer
    for (let i = 0; i < layerContainer.children.length; i++) {
      const child = layerContainer.children[i];
      if (child && child instanceof Container) {
        // Get the local bounds (without parent transforms) since Graphics are drawn in world coordinates
        const localBounds = child.getLocalBounds();

        const childBoundsObj = {
          x: localBounds.x,
          y: localBounds.y,
          width: localBounds.width,
          height: localBounds.height,
        };

        debug.log(`[SelectTool] Child ${i}:`, child.constructor.name);
        debug.log(`[SelectTool] Child ${i} local bounds:`, childBoundsObj);
        debug.log(`[SelectTool] Child ${i} position:`, { x: child.x, y: child.y });

        // Check if child bounds intersect with selection bounds
        const intersects = this.boundsIntersect(bounds, childBoundsObj);

        debug.log(`[SelectTool] Intersection check:`, {
          selectionBounds: bounds,
          childBounds: childBoundsObj,
          intersects: intersects
        });

        if (intersects) {
          selected.push(child);
        }
      }
    }

    debug.log('[SelectTool] Found', selected.length, 'objects in selection');
    return selected;
  }

  /**
   * Check if two bounds intersect
   */
  private boundsIntersect(a: Bounds, b: Bounds): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
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
    this.selectionGraphics
      .rect(x, y, width, height)
      .stroke({
        width: 2 / zoom,
        color: 0x00aaff,
        alpha: 1,
      });

    // Draw dashed inner line for better visibility
    this.selectionGraphics
      .rect(x + 1 / zoom, y + 1 / zoom, width - 2 / zoom, height - 2 / zoom)
      .stroke({
        width: 1 / zoom,
        color: 0xffffff,
        alpha: 0.5,
      });

    // Draw resize handles if we have selected objects
    if (this.selectedObjects.length > 0) {
      const handleSize = 8 / zoom;
      const handles = this.getHandlePositions(this.selectionBounds);

      for (const pos of Object.values(handles)) {
        this.selectionGraphics
          .rect(
            pos.x - handleSize / 2,
            pos.y - handleSize / 2,
            handleSize,
            handleSize
          )
          .fill({ color: 0xffffff })
          .stroke({
            width: 1 / zoom,
            color: 0x00aaff,
          });
      }
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

  onDeactivate(ctx: ToolContext): void {
    // Clear selection when switching tools
    this.selectionBounds = null;
    this.selectedObjects = [];
    this.objectStartPositions.clear();
    this.mode = 'none';
    this.selectionGraphics.clear();
    super.onDeactivate(ctx);
  }
}
