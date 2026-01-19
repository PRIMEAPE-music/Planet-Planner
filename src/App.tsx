import { useState, useCallback, useEffect, useRef } from 'react';
import { TooltipProvider } from '@/components/ui';
import { Toolbar, LayerPanel, StatusBar, PropertiesPanel } from '@/components/layout';
import { CanvasContainer } from '@/components/canvas';
import { useLayerStore, useTerrainStore } from '@/stores';
import { CanvasEngine, TerrainRenderer } from '@/core';
import type { Vector2 } from '@/types';

function App() {
  const engineRef = useRef<CanvasEngine | null>(null);
  const terrainRendererRef = useRef<TerrainRenderer | null>(null);
  const [cursorPosition, setCursorPosition] = useState<Vector2>({ x: 0, y: 0 });

  const { createLayer, rootOrder } = useLayerStore();
  const { setIsGenerating, setLastSeed } = useTerrainStore();

  // Create default layer on first render
  useEffect(() => {
    if (rootOrder.length === 0) {
      createLayer({ type: 'terrain', name: 'Terrain' });
    }
  }, []);

  const handleEngineReady = useCallback((engine: CanvasEngine) => {
    engineRef.current = engine;

    // Initialize terrain renderer on the world container
    const worldContainer = engine.getWorldContainer();

    if (worldContainer) {
      // Use smaller terrain size for better performance and WebGL stability
      // 64x64 cells at 8px = 512x512 pixels (~262K pixels)
      terrainRendererRef.current = new TerrainRenderer(worldContainer, {
        width: 64,
        height: 64,
        cellSize: 8,
      });

      // Don't auto-generate - let user click Generate button
    }

    engine.fitToCanvas();
  }, []);

  const handleCursorMove = useCallback((position: Vector2) => {
    setCursorPosition(position);
  }, []);

  const handleTerrainGenerate = useCallback(async (seed?: number) => {
    console.log('[App] handleTerrainGenerate called, seed:', seed);

    if (!terrainRendererRef.current) {
      console.error('[App] No terrain renderer available!');
      return;
    }

    const useSeed = seed ?? Date.now();
    setIsGenerating(true);
    setLastSeed(useSeed);

    try {
      console.log('[App] Starting terrain generation...');
      await terrainRendererRef.current.generate(useSeed);
      console.log('[App] Terrain generation complete!');
    } catch (error) {
      console.error('[App] Terrain generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [setIsGenerating, setLastSeed]);

  const handleTerrainStyleChange = useCallback(async () => {
    if (!terrainRendererRef.current) return;

    terrainRendererRef.current.setStyle(useTerrainStore.getState().style);
    await terrainRendererRef.current.render();
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full h-screen bg-ink-950 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <Toolbar />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Properties panel (left) */}
          <PropertiesPanel
            onTerrainGenerate={handleTerrainGenerate}
            onTerrainStyleChange={handleTerrainStyleChange}
          />

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden">
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
