import { useState, useCallback, useRef, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui';
import { Toolbar, LayerPanel, StatusBar, PropertiesPanel } from '@/components/layout';
import { CanvasContainer } from '@/components/canvas';
import { useLayerStore, useTerrainStore, useFeatureStore } from '@/stores';
import { useGenerationStore } from '@/stores/useGenerationStore';
import { CanvasEngine, TerrainRenderer, LayerManager } from '@/core';
import { FeatureRenderer } from '@/core/terrain/FeatureRenderer';
import type { Vector2 } from '@/types';
import { debug } from '@/utils';

function App() {
  const engineRef = useRef<CanvasEngine | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const initialLayersCreatedRef = useRef<boolean>(false);
  // Map of terrain renderers by layer ID
  const terrainRenderersRef = useRef<Map<string, TerrainRenderer>>(new Map());
  // Feature renderer for displaying generated features
  const featureRendererRef = useRef<FeatureRenderer | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Vector2>({ x: 0, y: 0 });
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  const { createLayer, activeId, layers } = useLayerStore();
  const { setIsGenerating, setLastSeed, setGenerationError } = useTerrainStore();

  // Subscribe to generation store result for LandmassGenerator → TerrainRenderer integration
  const generationResult = useGenerationStore((s) => s.result);
  const generationConfig = useGenerationStore((s) => s.config);

  // Feature store state for rendering features
  const featureResult = useFeatureStore((s) => s.result);
  // Use individual selectors to avoid creating new objects (React 19 compatibility)
  const showMountains = useFeatureStore((s) => s.showMountains);
  const showRivers = useFeatureStore((s) => s.showRivers);
  const showLakes = useFeatureStore((s) => s.showLakes);
  const showForests = useFeatureStore((s) => s.showForests);

  // Create FeatureRenderer when engine is ready
  useEffect(() => {
    if (engineRef.current && !featureRendererRef.current) {
      const worldContainer = engineRef.current.getWorldContainer();
      featureRendererRef.current = new FeatureRenderer(worldContainer);
      debug.log('[App] FeatureRenderer created');
    }
  }, [engine]);

  // Update FeatureRenderer when feature result changes
  useEffect(() => {
    if (featureRendererRef.current && featureResult) {
      debug.log('[App] Updating FeatureRenderer with new feature result');
      featureRendererRef.current.setResult(featureResult);
    }
  }, [featureResult]);

  // Update FeatureRenderer visibility when toggles change
  useEffect(() => {
    if (featureRendererRef.current) {
      featureRendererRef.current.setOptions({
        showMountains,
        showRivers,
        showLakes,
        showForests,
      });
    }
  }, [showMountains, showRivers, showLakes, showForests]);

  const handleEngineReady = useCallback((engineInstance: CanvasEngine, layerManager: LayerManager) => {
    engineRef.current = engineInstance;
    layerManagerRef.current = layerManager;
    setEngine(engineInstance);

    const beforeVP = engineInstance.getViewport();
    debug.log('[App] Before fitToCanvas - viewport:', {
      center: { x: beforeVP.center.x, y: beforeVP.center.y },
      zoom: beforeVP.zoom,
      bounds: { x: beforeVP.bounds.x, y: beforeVP.bounds.y, w: beforeVP.bounds.width, h: beforeVP.bounds.height },
    });

    // CRITICAL: Call fitToCanvas FIRST, before creating any layers
    engineInstance.fitToCanvas();

    const afterVP = engineInstance.getViewport();
    debug.log('[App] After fitToCanvas - viewport:', {
      center: { x: afterVP.center.x, y: afterVP.center.y },
      zoom: afterVP.zoom,
      bounds: { x: afterVP.bounds.x, y: afterVP.bounds.y, w: afterVP.bounds.width, h: afterVP.bounds.height },
    });

    // NOW create initial layer AFTER fitToCanvas (but only once!)
    if (!initialLayersCreatedRef.current) {
      debug.log('[App] Creating initial background layer AFTER fitToCanvas');
      createLayer({ type: 'terrain', name: 'background' });
      initialLayersCreatedRef.current = true;

      // Retry to allow layers to be added to LayerManager
      setTimeout(() => handleEngineReady(engineInstance, layerManager), 10);
      return;
    }

    debug.log('[App] Engine and LayerManager ready!');
  }, [createLayer]);

  const handleCursorMove = useCallback((position: Vector2) => {
    setCursorPosition(position);
  }, []);

  // Helper: get or create a terrain renderer for the given layer
  const getOrCreateTerrainRenderer = useCallback((layerId: string): TerrainRenderer | null => {
    if (!layerManagerRef.current) return null;

    let renderer = terrainRenderersRef.current.get(layerId);
    if (!renderer) {
      const layerContainer = layerManagerRef.current.getLayer(layerId);
      if (!layerContainer) return null;

      renderer = new TerrainRenderer(layerContainer.contentContainer, {
        width: 64,
        height: 64,
        cellSize: 8,
      });
      terrainRenderersRef.current.set(layerId, renderer);
    }
    return renderer;
  }, []);

  // Render LandmassGenerator result to terrain when it becomes available
  useEffect(() => {
    if (!generationResult || !layerManagerRef.current || !activeId) return;

    const layer = layers[activeId];
    if (!layer || layer.type !== 'terrain') return;

    const terrainRenderer = getOrCreateTerrainRenderer(activeId);
    if (!terrainRenderer) return;

    setIsGenerating(true);
    setGenerationError(null);

    terrainRenderer.generateFromResult(
      generationResult,
      generationConfig.width,
      generationConfig.height,
      generationConfig.continentShape.seaLevel
    ).then(() => {
      debug.log('[App] Generation result rendered to terrain');
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to render generation result';
      console.error('[App] Generation render error:', error);
      setGenerationError(message);
    }).finally(() => {
      setIsGenerating(false);
    });
  }, [generationResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTerrainGenerate = useCallback(async (seed?: number) => {
    debug.log('[App] handleTerrainGenerate called, seed:', seed);

    if (!layerManagerRef.current || !activeId) {
      console.error('[App] No layer manager or active layer!');
      return;
    }

    const activeLayer = layers[activeId];
    if (!activeLayer || activeLayer.type !== 'terrain') {
      console.error('[App] Active layer is not a terrain layer');
      return;
    }

    const terrainRenderer = getOrCreateTerrainRenderer(activeId);
    if (!terrainRenderer) {
      console.error('[App] Could not create terrain renderer for layer:', activeId);
      return;
    }

    const useSeed = seed ?? Date.now();
    setIsGenerating(true);
    setLastSeed(useSeed);
    setGenerationError(null);

    try {
      debug.log('[App] Starting terrain generation on layer:', activeId);
      await terrainRenderer.generate(useSeed);
      debug.log('[App] Terrain generation complete!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during terrain generation';
      console.error('[App] Terrain generation error:', error);
      setGenerationError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [activeId, layers, setIsGenerating, setLastSeed, setGenerationError, getOrCreateTerrainRenderer]);

  const handleTerrainStyleChange = useCallback(async () => {
    if (!activeId) return;

    // Get the terrain renderer for the active layer
    const terrainRenderer = terrainRenderersRef.current.get(activeId);
    if (!terrainRenderer) return;

    terrainRenderer.setStyle(useTerrainStore.getState().style);
    await terrainRenderer.render();
  }, [activeId]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full h-screen bg-ink-950 flex flex-col overflow-hidden">
        {/* Skip navigation for keyboard/screen reader users */}
        <a
          href="#main-canvas"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-parchment-500 focus:text-ink-950 focus:rounded"
        >
          Skip to canvas
        </a>

        {/* Toolbar */}
        <Toolbar engine={engine} />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Properties panel (left) */}
          <PropertiesPanel
            onTerrainGenerate={handleTerrainGenerate}
            onTerrainStyleChange={handleTerrainStyleChange}
          />

          {/* Canvas area */}
          <div id="main-canvas" className="flex-1 relative overflow-hidden">
            <CanvasContainer
              onEngineReady={handleEngineReady}
              onCursorMove={handleCursorMove}
            />
          </div>

          {/* Layer panel (right) */}
          <LayerPanel />
        </div>

        {/* Status bar */}
        <StatusBar cursorPosition={cursorPosition} />
      </div>
    </TooltipProvider>
  );
}

export default App;
