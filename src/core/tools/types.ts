import type { Vector2, InputState } from '@/types';
import type { LayerContainer } from '../layers/Layer';
import type { CanvasEngine } from '../canvas/CanvasEngine';

/**
 * Tool event types
 */
export type ToolEventType =
  | 'activate'
  | 'deactivate'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'keydown'
  | 'keyup';

/**
 * Context passed to tool event handlers
 */
export interface ToolContext {
  /** Canvas engine reference */
  engine: CanvasEngine;
  /** Current input state */
  input: InputState;
  /** Active layer (if any) */
  activeLayer: LayerContainer | null;
  /** Current position in world coordinates */
  worldPosition: Vector2;
  /** Current position in screen coordinates */
  screenPosition: Vector2;
  /** Position where current stroke started */
  strokeStart: Vector2 | null;
  /** All positions in current stroke */
  strokePath: Vector2[];
  /** Time elapsed since stroke started (ms) */
  strokeTime: number;
  /** Is currently in a stroke/drag operation */
  isStroking: boolean;
  /** Delta time since last frame (seconds) */
  deltaTime: number;
}

/**
 * Tool cursor configuration
 */
export interface ToolCursor {
  /** CSS cursor type or 'custom' */
  type: 'default' | 'crosshair' | 'move' | 'pointer' | 'grab' | 'grabbing' | 'custom' | 'none';
  /** Custom cursor image URL (if type is 'custom') */
  image?: string;
  /** Cursor hotspot offset */
  hotspot?: Vector2;
  /** Show size indicator circle */
  showSizeIndicator?: boolean;
  /** Size indicator radius */
  sizeRadius?: number;
}

/**
 * Result of a tool operation (for undo/redo)
 */
export interface ToolOperationResult {
  /** Operation type identifier */
  type: string;
  /** Layer ID affected */
  layerId: string;
  /** Data needed to undo this operation */
  undoData: unknown;
  /** Data needed to redo this operation */
  redoData: unknown;
}

/**
 * Base tool interface
 */
export interface ITool {
  /** Unique tool identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Tool icon name (for UI) */
  readonly icon: string;
  /** Keyboard shortcut */
  readonly shortcut?: string;
  /** Current cursor configuration */
  getCursor(): ToolCursor;
  /** Called when tool is activated */
  onActivate(ctx: ToolContext): void;
  /** Called when tool is deactivated */
  onDeactivate(ctx: ToolContext): void;
  /** Called on pointer down */
  onPointerDown(ctx: ToolContext): void;
  /** Called on pointer move */
  onPointerMove(ctx: ToolContext): void;
  /** Called on pointer up */
  onPointerUp(ctx: ToolContext): ToolOperationResult | null;
  /** Called on key down */
  onKeyDown(ctx: ToolContext, key: string): void;
  /** Called on key up */
  onKeyUp(ctx: ToolContext, key: string): void;
  /** Called each frame during active stroke */
  onUpdate(ctx: ToolContext): void;
  /** Render tool preview/guides */
  renderPreview(ctx: ToolContext): void;
  /** Cleanup any preview graphics */
  clearPreview(): void;
}
