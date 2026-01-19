import { useCanvasStore, useToolStore } from '@/stores';
import type { Vector2 } from '@/types';

interface StatusBarProps {
  cursorPosition?: Vector2;
}

export function StatusBar({ cursorPosition }: StatusBarProps) {
  const viewport = useCanvasStore(state => state.viewport);
  const activeTool = useToolStore(state => state.activeTool);
  const grid = useCanvasStore(state => state.grid);

  return (
    <div className="h-7 bg-ink-950 border-t border-ink-700 flex items-center justify-between px-4 text-xs text-parchment-400">
      <div className="flex gap-4">
        <span className="capitalize">{activeTool}</span>
        {cursorPosition && (
          <>
            <span>X: {Math.round(cursorPosition.x)}</span>
            <span>Y: {Math.round(cursorPosition.y)}</span>
          </>
        )}
      </div>
      <div className="flex gap-4">
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
        {grid.visible && <span>Grid: {grid.cellSize}px</span>}
        {grid.snapToGrid && <span>Snap</span>}
      </div>
    </div>
  );
}
