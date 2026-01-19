import { BaseTool } from './BaseTool';
import type { ToolContext, ToolCursor, ToolOperationResult } from './types';

/**
 * Pan tool - handled by canvas engine directly, this is mostly a placeholder
 */
export class PanTool extends BaseTool {
  readonly id = 'pan';
  readonly name = 'Pan';
  readonly icon = 'Hand';
  readonly shortcut = 'H';

  getCursor(): ToolCursor {
    return { type: 'grab' };
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
