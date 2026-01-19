import { Graphics, Container } from 'pixi.js';
import type { ITool, ToolContext, ToolCursor, ToolOperationResult } from './types';

/**
 * Abstract base class for all tools
 * Provides common functionality and default implementations
 */
export abstract class BaseTool implements ITool {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly icon: string;
  readonly shortcut?: string;

  /** Preview graphics container */
  protected previewContainer: Container;
  protected previewGraphics: Graphics;

  /** Is tool currently active */
  protected isActive: boolean = false;

  constructor() {
    this.previewContainer = new Container();
    this.previewContainer.label = 'tool-preview';
    this.previewGraphics = new Graphics();
    this.previewContainer.addChild(this.previewGraphics);
  }

  /**
   * Get the preview container (to be added to the scene)
   */
  getPreviewContainer(): Container {
    return this.previewContainer;
  }

  /**
   * Default cursor
   */
  getCursor(): ToolCursor {
    return { type: 'crosshair' };
  }

  /**
   * Called when tool is activated
   */
  onActivate(ctx: ToolContext): void {
    this.isActive = true;
    // Add preview container to world
    const worldContainer = ctx.engine.getWorldContainer();
    if (worldContainer && !this.previewContainer.parent) {
      worldContainer.addChild(this.previewContainer);
    }
  }

  /**
   * Called when tool is deactivated
   */
  onDeactivate(_ctx: ToolContext): void {
    this.isActive = false;
    this.clearPreview();
    // Remove preview container from world
    if (this.previewContainer.parent) {
      this.previewContainer.parent.removeChild(this.previewContainer);
    }
  }

  /**
   * Default pointer down handler
   */
  onPointerDown(_ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Default pointer move handler
   */
  onPointerMove(_ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Default pointer up handler
   */
  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
    // Override in subclass
    return null;
  }

  /**
   * Default key down handler
   */
  onKeyDown(_ctx: ToolContext, _key: string): void {
    // Override in subclass
  }

  /**
   * Default key up handler
   */
  onKeyUp(_ctx: ToolContext, _key: string): void {
    // Override in subclass
  }

  /**
   * Default update handler (called each frame during stroke)
   */
  onUpdate(_ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Default preview renderer
   */
  renderPreview(_ctx: ToolContext): void {
    // Override in subclass
  }

  /**
   * Clear preview graphics
   */
  clearPreview(): void {
    this.previewGraphics.clear();
  }

}
