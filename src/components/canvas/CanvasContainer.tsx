import { useEffect, useRef } from 'react';
import { useCanvasEngine, useKeyboardShortcuts } from '@/hooks';
import { CanvasEngine, LayerManager } from '@/core';
import { useHistoryStore } from '@/stores';
import type { Vector2 } from '@/types';

interface CanvasContainerProps {
  onEngineReady?: (engine: CanvasEngine, layerManager: LayerManager) => void;
  onCursorMove?: (position: Vector2) => void;
}

export function CanvasContainer({ onEngineReady, onCursorMove }: CanvasContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { engine } = useCanvasEngine({
    containerRef,
    onReady: (eng, lm) => {
      onEngineReady?.(eng, lm);
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onZoomIn: () => {
      const viewport = engine?.getViewport();
      if (viewport) {
        engine?.setZoom(viewport.zoom * 1.25);
      }
    },
    onZoomOut: () => {
      const viewport = engine?.getViewport();
      if (viewport) {
        engine?.setZoom(viewport.zoom * 0.8);
      }
    },
    onFitToCanvas: () => {
      engine?.fitToCanvas();
    },
    onUndo: () => useHistoryStore.getState().undo(),
    onRedo: () => useHistoryStore.getState().redo(),
  });

  // Track cursor position for status bar
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!engine) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const screenPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      const worldPos = engine.screenToWorld(screenPos);
      onCursorMove?.(worldPos);
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    return () => {
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [engine, onCursorMove]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-ink-950 outline-none"
      tabIndex={0}
      style={{ touchAction: 'none' }}
    />
  );
}
