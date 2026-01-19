import { useEffect, useRef, useState, useCallback } from 'react';
import { CanvasEngine, ToolManager, LayerManager } from '@/core';
import { useCanvasStore, useToolStore, useLayerStore } from '@/stores';
import type { InputState } from '@/types';

export interface UseCanvasEngineOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onReady?: (engine: CanvasEngine) => void;
}

export function useCanvasEngine({ containerRef, onReady }: UseCanvasEngineOptions) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Store hooks
  const { setViewport, grid, setGrid } = useCanvasStore();
  const { activeTool, options: toolOptions } = useToolStore();
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

        // Initialize tool manager
        toolManagerRef.current = new ToolManager(engine, lm, {
          getActiveLayerId: () => useLayerStore.getState().activeId,
          getToolOptions: (id) => {
            const state = useToolStore.getState();
            return state.options[id as keyof typeof state.options];
          },
          onOperationComplete: (result) => {
            console.log('Operation complete:', result);
            // Here we would add to history for undo/redo
          },
        });

        // Sync initial layer state
        lm.syncWithState(useLayerStore.getState());

        // Set initial tool
        toolManagerRef.current.setActiveTool(activeTool);

        setIsReady(true);
        onReady?.(engine);
      });

    // Setup keyboard event listeners for modifiers
    const handlePointerEvent = (e: PointerEvent) => {
      updateModifiers(e);
      // Update pressure if available
      if (e.pressure !== undefined) {
        inputStateRef.current.pressure = e.pressure || 1;
      }
    };

    containerRef.current?.addEventListener('pointerdown', handlePointerEvent);
    containerRef.current?.addEventListener('pointermove', handlePointerEvent);
    containerRef.current?.addEventListener('pointerup', handlePointerEvent);

    return () => {
      containerRef.current?.removeEventListener('pointerdown', handlePointerEvent);
      containerRef.current?.removeEventListener('pointermove', handlePointerEvent);
      containerRef.current?.removeEventListener('pointerup', handlePointerEvent);
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
      toolManagerRef.current.setActiveTool(activeTool);

      // Update tool options
      const tool = toolManagerRef.current.getTool(activeTool);
      if (tool && 'setOptions' in tool) {
        const opts = toolOptions[activeTool as keyof typeof toolOptions];
        if (opts) {
          (tool as any).setOptions(opts);
        }
      }
    }
  }, [isReady, activeTool, toolOptions]);

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
