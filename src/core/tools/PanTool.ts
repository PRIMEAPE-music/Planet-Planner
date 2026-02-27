import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';

/**
 * Pan tool - enables panning on primary click
 */
export class PanTool extends BaseTool {
  readonly id = 'pan';
  readonly name = 'Pan';
  readonly icon = 'Hand';
  readonly shortcut = 'H';

  getCursor(): ToolCursor {
    return { type: 'grab' };
  }

  onActivate(ctx: ToolContext): void {
    super.onActivate(ctx);
    // Enable pan mode in the engine
    ctx.engine.setPanMode(true);
  }

  onDeactivate(ctx: ToolContext): void {
    // Disable pan mode in the engine
    ctx.engine.setPanMode(false);
    super.onDeactivate(ctx);
  }

  onPointerDown(_ctx: ToolContext): void {
    // Panning is handled by CanvasEngine
  }

  onPointerMove(_ctx: ToolContext): void {
    // Panning is handled by CanvasEngine
  }

  onPointerUp(_ctx: ToolContext): ToolOperationResult | null {
    return null;
  }
}
