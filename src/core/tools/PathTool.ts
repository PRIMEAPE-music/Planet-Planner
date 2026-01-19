import { Graphics } from 'pixi.js';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';
import type { PathToolOptions, Vector2 } from '@/types';
import { hexToNumber, vec2Length, vec2Sub, vec2Add, vec2Scale, vec2Normalize } from '@/utils';

interface PathNode {
  position: Vector2;
  controlIn: Vector2;  // Control point coming into this node
  controlOut: Vector2; // Control point going out of this node
}

/**
 * Path tool for drawing smooth bezier curves
 * Used for rivers, roads, borders, coastlines
 */
export class PathTool extends BaseTool {
  readonly id = 'path';
  readonly name = 'Path';
  readonly icon = 'Spline';
  readonly shortcut = 'P';

  private pathGraphics: Graphics | null = null;
  private nodes: PathNode[] = [];
  private isDrawing: boolean = false;
  private selectedNodeIndex: number = -1;
  private dragMode: 'node' | 'controlIn' | 'controlOut' | null = null;

  private options: PathToolOptions = {
    size: 4,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    strokeWidth: 4,
    smoothing: 0.3,
    closePath: false,
  };

  setOptions(options: Partial<PathToolOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): PathToolOptions {
    return { ...this.options };
  }

  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  onPointerDown(ctx: ToolContext): void {
    if (!ctx.activeLayer) return;

    // Check if clicking near existing node
    const clickedNodeIndex = this.findNodeAtPosition(ctx.worldPosition);

    if (clickedNodeIndex >= 0) {
      // Select existing node for editing
      this.selectedNodeIndex = clickedNodeIndex;
      this.dragMode = 'node';

      // Check if clicking on control points
      const node = this.nodes[clickedNodeIndex]!;
      if (this.isNearPoint(ctx.worldPosition, node.controlIn, 10)) {
        this.dragMode = 'controlIn';
      } else if (this.isNearPoint(ctx.worldPosition, node.controlOut, 10)) {
        this.dragMode = 'controlOut';
      }
    } else {
      // Add new node
      if (!this.isDrawing) {
        // Start new path
        this.isDrawing = true;
        this.pathGraphics = new Graphics();
        ctx.activeLayer.addContent(this.pathGraphics);
        this.nodes = [];
      }

      // Create new node with auto-smoothed control points
      const newNode = this.createNode(ctx.worldPosition);
      this.nodes.push(newNode);
      this.selectedNodeIndex = this.nodes.length - 1;

      // Auto-smooth control points based on neighboring nodes
      this.smoothControlPoints();

      // Redraw path
      this.redrawPath();
    }
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isStroking || this.selectedNodeIndex < 0) return;

    const node = this.nodes[this.selectedNodeIndex];
    if (!node) return;

    switch (this.dragMode) {
      case 'node':
        // Move entire node
        const delta = vec2Sub(ctx.worldPosition, node.position);
        node.position = ctx.worldPosition;
        node.controlIn = vec2Add(node.controlIn, delta);
        node.controlOut = vec2Add(node.controlOut, delta);
        break;

      case 'controlIn':
        node.controlIn = ctx.worldPosition;
        // Mirror control out for smooth curves (optional)
        if (!ctx.input.modifiers.alt) {
          const dist = vec2Length(vec2Sub(node.controlOut, node.position));
          const dir = vec2Normalize(vec2Sub(node.position, node.controlIn));
          node.controlOut = vec2Add(node.position, vec2Scale(dir, dist));
        }
        break;

      case 'controlOut':
        node.controlOut = ctx.worldPosition;
        // Mirror control in for smooth curves (optional)
        if (!ctx.input.modifiers.alt) {
          const dist = vec2Length(vec2Sub(node.controlIn, node.position));
          const dir = vec2Normalize(vec2Sub(node.position, node.controlOut));
          node.controlIn = vec2Add(node.position, vec2Scale(dir, dist));
        }
        break;
    }

    this.redrawPath();
  }

  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
    this.dragMode = null;
    return null; // Don't complete operation yet - path is still being built
  }

  onKeyDown(ctx: ToolContext, key: string): void {
    switch (key) {
      case 'Enter':
      case 'Escape':
        // Complete path
        this.completePath(ctx);
        break;

      case 'Backspace':
      case 'Delete':
        // Remove last node
        if (this.nodes.length > 0) {
          this.nodes.pop();
          this.selectedNodeIndex = this.nodes.length - 1;
          this.redrawPath();
        }
        break;

      case 'c':
        // Toggle close path
        this.options.closePath = !this.options.closePath;
        this.redrawPath();
        break;
    }
  }

  /**
   * Complete the path and finalize
   */
  private completePath(ctx: ToolContext): ToolOperationResult | null {
    if (!this.pathGraphics || this.nodes.length < 2) {
      // Cancel if not enough nodes
      this.cancelPath();
      return null;
    }

    const layerId = ctx.activeLayer?.id ?? '';
    const pathRef = this.pathGraphics;

    // Reset state
    this.isDrawing = false;
    this.pathGraphics = null;
    this.nodes = [];
    this.selectedNodeIndex = -1;

    ctx.activeLayer?.markDirty();

    return {
      type: 'path',
      layerId,
      undoData: { graphics: pathRef },
      redoData: { graphics: pathRef },
    };
  }

  /**
   * Cancel current path
   */
  private cancelPath(): void {
    if (this.pathGraphics?.parent) {
      this.pathGraphics.parent.removeChild(this.pathGraphics);
      this.pathGraphics.destroy();
    }
    this.isDrawing = false;
    this.pathGraphics = null;
    this.nodes = [];
    this.selectedNodeIndex = -1;
  }

  /**
   * Create a new node at position
   */
  private createNode(position: Vector2): PathNode {
    return {
      position: { ...position },
      controlIn: { ...position },
      controlOut: { ...position },
    };
  }

  /**
   * Auto-smooth control points based on neighboring nodes
   */
  private smoothControlPoints(): void {
    const smoothFactor = this.options.smoothing;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]!;
      const prev = this.nodes[i - 1];
      const next = this.nodes[i + 1];

      if (prev && next) {
        // Middle node - smooth based on neighbors
        const direction = vec2Normalize(vec2Sub(next.position, prev.position));
        const distPrev = vec2Length(vec2Sub(node.position, prev.position)) * smoothFactor;
        const distNext = vec2Length(vec2Sub(next.position, node.position)) * smoothFactor;

        node.controlIn = vec2Sub(node.position, vec2Scale(direction, distPrev));
        node.controlOut = vec2Add(node.position, vec2Scale(direction, distNext));
      } else if (prev) {
        // Last node
        const direction = vec2Normalize(vec2Sub(node.position, prev.position));
        const dist = vec2Length(vec2Sub(node.position, prev.position)) * smoothFactor;
        node.controlIn = vec2Sub(node.position, vec2Scale(direction, dist));
        node.controlOut = vec2Add(node.position, vec2Scale(direction, dist * 0.5));
      } else if (next) {
        // First node
        const direction = vec2Normalize(vec2Sub(next.position, node.position));
        const dist = vec2Length(vec2Sub(next.position, node.position)) * smoothFactor;
        node.controlIn = vec2Sub(node.position, vec2Scale(direction, dist * 0.5));
        node.controlOut = vec2Add(node.position, vec2Scale(direction, dist));
      }
    }
  }

  /**
   * Redraw the entire path
   */
  private redrawPath(): void {
    if (!this.pathGraphics) return;

    this.pathGraphics.clear();

    if (this.nodes.length < 1) return;

    const strokeColor = hexToNumber(this.options.primaryColor);

    this.pathGraphics.setStrokeStyle({
      width: this.options.strokeWidth,
      color: strokeColor,
      alpha: this.options.opacity,
      cap: 'round',
      join: 'round',
    });

    // Draw bezier path
    this.pathGraphics.moveTo(this.nodes[0]!.position.x, this.nodes[0]!.position.y);

    for (let i = 1; i < this.nodes.length; i++) {
      const prev = this.nodes[i - 1]!;
      const curr = this.nodes[i]!;

      this.pathGraphics.bezierCurveTo(
        prev.controlOut.x,
        prev.controlOut.y,
        curr.controlIn.x,
        curr.controlIn.y,
        curr.position.x,
        curr.position.y
      );
    }

    // Close path if needed
    if (this.options.closePath && this.nodes.length > 2) {
      const last = this.nodes[this.nodes.length - 1]!;
      const first = this.nodes[0]!;
      this.pathGraphics.bezierCurveTo(
        last.controlOut.x,
        last.controlOut.y,
        first.controlIn.x,
        first.controlIn.y,
        first.position.x,
        first.position.y
      );
    }

    this.pathGraphics.stroke();
  }

  /**
   * Find node at position
   */
  private findNodeAtPosition(position: Vector2, threshold: number = 15): number {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.isNearPoint(position, this.nodes[i]!.position, threshold)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Check if position is near a point
   */
  private isNearPoint(position: Vector2, point: Vector2, threshold: number): boolean {
    return vec2Length(vec2Sub(position, point)) < threshold;
  }

  renderPreview(ctx: ToolContext): void {
    this.previewGraphics.clear();

    const zoom = ctx.engine.getViewport()?.zoom ?? 1;

    // Draw node handles when editing
    if (this.isDrawing && this.nodes.length > 0) {
      // Draw control point handles
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i]!;
        const isSelected = i === this.selectedNodeIndex;

        // Control point lines
        this.previewGraphics.setStrokeStyle({
          width: 1 / zoom,
          color: 0x888888,
          alpha: 0.6,
        });
        this.previewGraphics.moveTo(node.controlIn.x, node.controlIn.y);
        this.previewGraphics.lineTo(node.position.x, node.position.y);
        this.previewGraphics.lineTo(node.controlOut.x, node.controlOut.y);
        this.previewGraphics.stroke();

        // Node point
        this.previewGraphics.circle(node.position.x, node.position.y, 5 / zoom);
        this.previewGraphics.fill({ color: isSelected ? 0x00ff00 : 0xffffff });

        // Control points
        this.previewGraphics.circle(node.controlIn.x, node.controlIn.y, 3 / zoom);
        this.previewGraphics.fill({ color: 0x0088ff });
        this.previewGraphics.circle(node.controlOut.x, node.controlOut.y, 3 / zoom);
        this.previewGraphics.fill({ color: 0xff8800 });
      }
    }

    // Cursor crosshair
    if (!ctx.isStroking) {
      const size = 8 / zoom;
      this.previewGraphics.setStrokeStyle({
        width: 1 / zoom,
        color: 0xffffff,
        alpha: 0.8,
      });
      this.previewGraphics.moveTo(ctx.worldPosition.x - size, ctx.worldPosition.y);
      this.previewGraphics.lineTo(ctx.worldPosition.x + size, ctx.worldPosition.y);
      this.previewGraphics.moveTo(ctx.worldPosition.x, ctx.worldPosition.y - size);
      this.previewGraphics.lineTo(ctx.worldPosition.x, ctx.worldPosition.y + size);
      this.previewGraphics.stroke();
    }
  }
}
