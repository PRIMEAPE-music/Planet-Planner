import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEngine, ToolManager, LayerManager } from '@/core';
import { useCanvasStore, useToolStore, useLayerStore, useHistoryStore } from '@/stores';
import type { InputState } from '@/types';
import type { HistoryCommand } from '@/core/history/commands';
import { debug } from '@/utils';

export interface UseCanvasEngineOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady?: (engine: CanvasEngine, layerManager: LayerManager) => void;
}

export function useCanvasEngine({ containerRef, onReady }: UseCanvasEngineOptions) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Store hooks
  const { setViewport, grid, setGrid } = useCanvasStore();
  const activeTool = useToolStore((s) => s.activeTool);
  // Subscribe to the active tool's options specifically to trigger updates
  const activeToolOptions = useToolStore((s) => s.options[activeTool]);
  const layerState = useLayerStore();

  // Track current input state for tools
  const inputStateRef = useRef<InputState>({
    screenPosition: { x: 0, y: 0 },
    worldPosition: { x: 0, y: 0 },
    isPrimaryDown: false,
    isSecondaryDown: false,
    isMiddleDown: false,
    modifiers: { shift: false, ctrl: false, alt: false, meta: false },
    pressure: 1,
  });

  // Update input state with modifiers
  const updateModifiers = useCallback((event: PointerEvent | MouseEvent) => {
    inputStateRef.current.modifiers = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };
  }, []);

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;

    const engine = new CanvasEngine();
    engineRef.current = engine;

    engine
      .init(
        containerRef.current,
        {
          width: 4096,
          height: 4096,
          gridConfig: grid,
        },
        {
          onViewportChange: setViewport,
          onGridChange: setGrid,
          onPointerDown: (screen, world) => {
            inputStateRef.current.screenPosition = screen;
            inputStateRef.current.worldPosition = world;
            inputStateRef.current.isPrimaryDown = true;

            toolManagerRef.current?.handlePointerDown(screen, world, {
              ...inputStateRef.current,
            });
          },
          onPointerMove: (screen, world) => {
            inputStateRef.current.screenPosition = screen;
            inputStateRef.current.worldPosition = world;

            toolManagerRef.current?.handlePointerMove(screen, world, {
              ...inputStateRef.current,
            });
          },
          onPointerUp: (screen, world) => {
            inputStateRef.current.screenPosition = screen;
            inputStateRef.current.worldPosition = world;
            inputStateRef.current.isPrimaryDown = false;

            toolManagerRef.current?.handlePointerUp(screen, world, {
              ...inputStateRef.current,
            });
          },
        }
      )
      .then(() => {
        // Create layer manager using the world container
        const worldContainer = engine.getWorldContainer();
        const lm = new LayerManager(worldContainer);
        layerManagerRef.current = lm;

        // Register LayerManager with history store for graphics undo/redo
        useHistoryStore.getState().setLayerManager(lm);

        // Initialize tool manager
        toolManagerRef.current = new ToolManager(engine, lm, {
          getActiveLayerId: () => useLayerStore.getState().activeId,
          getToolOptions: (id) => {
            const state = useToolStore.getState();
            return state.options[id as keyof typeof state.options];
          },
          onOperationComplete: (result) => {
            debug.log('Operation complete:', result);
            // Wrap tool result into a graphics:add command
            if (result && result.undoData) {
              const cmd: HistoryCommand = {
                kind: 'graphics:add',
                operationType: result.type,
                layerId: result.layerId,
                graphics: result.redoData as import('pixi.js').Container,
              };
              useHistoryStore.getState().push(cmd);
            }
          },
          onColorPicked: (color) => {
            useToolStore.getState().setPrimaryColor(color);
          },
        });

        // Sync initial layer state
        const layerState = useLayerStore.getState();
        debug.log('[useCanvasEngine] Syncing initial layer state:', {
          layerCount: Object.keys(layerState.layers).length,
          rootOrder: layerState.rootOrder,
          activeId: layerState.activeId,
        });
        lm.syncWithState(layerState);

        // Set initial tool
        debug.log('[useCanvasEngine] Setting initial tool:', activeTool);
        toolManagerRef.current.setActiveTool(activeTool);

        setIsReady(true);
        debug.log('[useCanvasEngine] Engine ready, calling onReady callback');
        onReady?.(engine, lm);
      });

    // Setup keyboard event listeners for modifiers and tool events
    const handlePointerEvent = (e: PointerEvent) => {
      updateModifiers(e);
      // Update pressure if available
      if (e.pressure !== undefined) {
        inputStateRef.current.pressure = e.pressure || 1;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Always route Escape to tools (for path finalization, text cancel, etc.)
      if (e.key === 'Escape') {
        toolManagerRef.current?.handleKeyDown(e.key);
        return;
      }

      // Don't route other keys if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Route to active tool
      toolManagerRef.current?.handleKeyDown(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Don't route to tools if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Route to active tool
      toolManagerRef.current?.handleKeyUp(e.key);
    };

    const container = containerRef.current;
    container?.addEventListener('pointerdown', handlePointerEvent);
    container?.addEventListener('pointermove', handlePointerEvent);
    container?.addEventListener('pointerup', handlePointerEvent);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      container?.removeEventListener('pointerdown', handlePointerEvent);
      container?.removeEventListener('pointermove', handlePointerEvent);
      container?.removeEventListener('pointerup', handlePointerEvent);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      toolManagerRef.current?.destroy();
      layerManagerRef.current?.destroy();
      engine.destroy();
      engineRef.current = null;
      toolManagerRef.current = null;
      layerManagerRef.current = null;
    };
  }, []);

  // Sync active tool
  useEffect(() => {
    if (isReady && toolManagerRef.current) {
      debug.log('[useCanvasEngine] Syncing tool:', activeTool);
      toolManagerRef.current.setActiveTool(activeTool);
    }
  }, [isReady, activeTool]);

  // Sync active tool options (separate effect to trigger on option changes)
  useEffect(() => {
    if (isReady && toolManagerRef.current) {
      const tool = toolManagerRef.current.getTool(activeTool);
      if (tool && 'setOptions' in tool && activeToolOptions) {
        debug.log('[useCanvasEngine] Updating tool options:', activeToolOptions);
        (tool as any).setOptions(activeToolOptions);
      }
    }
  }, [isReady, activeTool, activeToolOptions]);

  // Sync grid config
  useEffect(() => {
    if (isReady && engineRef.current) {
      engineRef.current.setGridConfig(grid);
    }
  }, [isReady, grid]);

  // Sync layer state
  useEffect(() => {
    if (isReady && layerManagerRef.current) {
      layerManagerRef.current.syncWithState(layerState);
    }
  }, [isReady, layerState.layers, layerState.rootOrder]);

  return {
    engine: engineRef.current,
    toolManager: toolManagerRef.current,
    layerManager: layerManagerRef.current,
    isReady,
  };
}
