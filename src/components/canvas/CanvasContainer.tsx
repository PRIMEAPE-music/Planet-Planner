import { useEffect, useRef } from 'react';
import { CanvasEngine } from '@/core';
import { RenderPipeline } from '@/core';
import { useCanvasStore, useLayerStore } from '@/stores';

export function CanvasContainer() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const pipelineRef = useRef<RenderPipeline | null>(null);

  const setViewport = useCanvasStore(state => state.setViewport);
  const setGrid = useCanvasStore(state => state.setGrid);
  const layerState = useLayerStore();

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CanvasEngine();
    engineRef.current = engine;

    engine.init(canvasRef.current, {
      backgroundColor: '#1a1a2e',
      width: 4096,
      height: 4096,
    }, {
      onViewportChange: (viewport) => {
        setViewport(viewport);
      },
      onGridChange: (config) => {
        setGrid(config);
      },
    }).then(async () => {
      // Initialize render pipeline
      const pipeline = new RenderPipeline(
        engine['app'],
        engine.getWorldContainer()
      );

      await pipeline.init(4096, 4096);
      pipelineRef.current = pipeline;

      // Sync initial layer state
      pipeline.getLayerManager().syncWithState(layerState);
    });

    return () => {
      pipelineRef.current?.destroy();
      engineRef.current?.destroy();
    };
  }, []);

  // Sync layer state changes
  useEffect(() => {
    if (pipelineRef.current) {
      pipelineRef.current.getLayerManager().syncWithState(layerState);
    }
  }, [layerState.layers, layerState.rootOrder]);

  return <div ref={canvasRef} className="w-full h-full canvas-container" />;
}
