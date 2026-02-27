import { Container } from 'pixi.js';
import type { ITool, ToolContext, ToolOperationResult } from './types';
import type { CanvasEngine } from '../canvas/CanvasEngine';
import type { LayerManager } from '../layers/LayerManager';
import type { Vector2, InputState } from '@/types';
import { debug } from '@/utils';

// Import tools
import { SelectTool } from './SelectTool';
import { PanTool } from './PanTool';
import { BrushTool } from './BrushTool';
import { EraserTool } from './EraserTool';
import { ShapeTool } from './ShapeTool';
import { PathTool } from './PathTool';
import { FillTool } from './FillTool';
import { StampTool } from './StampTool';
import { TextTool } from './TextTool';
import { EyedropperTool } from './EyedropperTool';

export interface ToolManagerConfig {
  /** Callback when tool changes */
  onToolChange?: (toolId: string) => void;
  /** Callback when operation completes (for undo/redo) */
  onOperationComplete?: (result: ToolOperationResult) => void;
  /** Callback when eyedropper picks a color */
  onColorPicked?: (color: string) => void;
  /** Get tool options from store */
  getToolOptions?: (toolId: string) => unknown;
  /** Get active layer ID from store */
  getActiveLayerId?: () => string | null;
}

/**
 * Manages all tools and routes input events
 */
export class ToolManager {
  private engine: CanvasEngine;
  private layerManager: LayerManager;
  private tools: Map<string, ITool> = new Map();
  private activeTool: ITool | null = null;
  private config: ToolManagerConfig;

  // Stroke state
  private isStroking: boolean = false;
  private strokeStart: Vector2 | null = null;
  private strokePath: Vector2[] = [];
  private strokeStartTime: number = 0;

  // Input state
  private currentInput: InputState | null = null;
  private currentWorldPosition: Vector2 = { x: 0, y: 0 };
  private currentScreenPosition: Vector2 = { x: 0, y: 0 };

  // Cursor container
  private cursorContainer: Container;

  constructor(
    engine: CanvasEngine,
    layerManager: LayerManager,
    config: ToolManagerConfig = {}
  ) {
    this.engine = engine;
    this.layerManager = layerManager;
    this.config = config;

    this.cursorContainer = new Container();
    this.cursorContainer.label = 'cursor';

    this.registerDefaultTools();
  }

  /**
   * Register all default tools
   */
  private registerDefaultTools(): void {
    this.registerTool(new SelectTool());
    this.registerTool(new PanTool());
    this.registerTool(new BrushTool());
    this.registerTool(new EraserTool());
    this.registerTool(new ShapeTool());
    this.registerTool(new PathTool());
    this.registerTool(new FillTool());
    this.registerTool(new StampTool());
    this.registerTool(new TextTool());

    const eyedropper = new EyedropperTool();
    eyedropper.setOnColorPicked((color: string) => {
      this.config.onColorPicked?.(color);
    });
    this.registerTool(eyedropper);
  }

  /**
   * Register a tool
   */
  registerTool(tool: ITool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Get a tool by ID
   */
  getTool(id: string): ITool | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Set the active tool
   */
  setActiveTool(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (!tool) {
      debug.warn(`Tool '${toolId}' not found`);
      return;
    }

    // Deactivate current tool
    if (this.activeTool) {
      this.activeTool.onDeactivate(this.createContext());
    }

    // Activate new tool
    this.activeTool = tool;
    this.activeTool.onActivate(this.createContext());

    this.config.onToolChange?.(toolId);
  }

  /**
   * Get the active tool
   */
  getActiveTool(): ITool | null {
    return this.activeTool;
  }

  /**
   * Get cursor container (for rendering custom cursors)
   */
  getCursorContainer(): Container {
    return this.cursorContainer;
  }

  /**
   * Create tool context from current state
   */
  private createContext(deltaTime?: number): ToolContext {
    const activeLayerId = this.config.getActiveLayerId?.() ?? null;
    const activeLayer = activeLayerId
      ? this.layerManager.getLayer(activeLayerId) ?? null
      : null;

    return {
      engine: this.engine,
      input: this.currentInput ?? {
        screenPosition: { x: 0, y: 0 },
        worldPosition: { x: 0, y: 0 },
        isPrimaryDown: false,
        isSecondaryDown: false,
        isMiddleDown: false,
        modifiers: { shift: false, ctrl: false, alt: false, meta: false },
        pressure: 0,
      },
      activeLayer,
      worldPosition: this.currentWorldPosition,
      screenPosition: this.currentScreenPosition,
      strokeStart: this.strokeStart,
      strokePath: [...this.strokePath],
      strokeTime: this.strokeStartTime > 0 ? Date.now() - this.strokeStartTime : 0,
      isStroking: this.isStroking,
      deltaTime: deltaTime ?? 1 / 60,
    };
  }

  /**
   * Handle pointer down event
   */
  handlePointerDown(screenPos: Vector2, worldPos: Vector2, input: InputState): void {
    debug.log('[ToolManager] handlePointerDown', { screenPos, worldPos, activeTool: this.activeTool?.id });
    this.currentInput = input;
    this.currentScreenPosition = screenPos;
    this.currentWorldPosition = worldPos;

    // Start stroke
    this.isStroking = true;
    this.strokeStart = { ...worldPos };
    this.strokePath = [{ ...worldPos }];
    this.strokeStartTime = Date.now();

    if (this.activeTool) {
      const ctx = this.createContext();
      debug.log('[ToolManager] Calling tool onPointerDown, activeLayer:', ctx.activeLayer?.id);
      this.activeTool.onPointerDown(ctx);
    }
  }

  /**
   * Handle pointer move event
   */
  handlePointerMove(screenPos: Vector2, worldPos: Vector2, input: InputState): void {
    this.currentInput = input;
    this.currentScreenPosition = screenPos;
    this.currentWorldPosition = worldPos;

    // Add to stroke path if stroking
    if (this.isStroking) {
      this.strokePath.push({ ...worldPos });
    }

    if (this.activeTool) {
      this.activeTool.onPointerMove(this.createContext());
      this.activeTool.renderPreview(this.createContext());
    }
  }

  /**
   * Handle pointer up event
   */
  handlePointerUp(screenPos: Vector2, worldPos: Vector2, input: InputState): void {
    this.currentInput = input;
    this.currentScreenPosition = screenPos;
    this.currentWorldPosition = worldPos;

    if (this.activeTool) {
      const result = this.activeTool.onPointerUp(this.createContext());
      if (result) {
        this.config.onOperationComplete?.(result);
      }
    }

    // End stroke
    this.isStroking = false;
    this.strokeStart = null;
    this.strokePath = [];
    this.strokeStartTime = 0;
  }

  /**
   * Handle key down event
   */
  handleKeyDown(key: string): void {
    if (this.activeTool) {
      this.activeTool.onKeyDown(this.createContext(), key);
    }
  }

  /**
   * Handle key up event
   */
  handleKeyUp(key: string): void {
    if (this.activeTool) {
      this.activeTool.onKeyUp(this.createContext(), key);
    }
  }

  /**
   * Update (called each frame)
   */
  update(deltaTime: number): void {
    if (this.activeTool && this.isStroking) {
      this.activeTool.onUpdate(this.createContext(deltaTime));
    }
  }

  /**
   * Destroy the tool manager
   */
  destroy(): void {
    if (this.activeTool) {
      this.activeTool.onDeactivate(this.createContext());
    }
    this.tools.clear();
    this.cursorContainer.destroy({ children: true });
  }
}
