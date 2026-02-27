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
    <div className="h-7 bg-ink-950 border-t border-ink-700 flex items-center justify-between px-4 text-xs text-parchment-400 overflow-hidden">
      <div className="flex gap-4 min-w-0 shrink truncate">
        <span className="capitalize shrink-0">{activeTool}</span>
        {cursorPosition && (
          <>
            <span className="tabular-nums shrink-0">X: {Math.round(cursorPosition.x)}</span>
            <span className="tabular-nums shrink-0">Y: {Math.round(cursorPosition.y)}</span>
          </>
        )}
      </div>
      <div className="flex gap-4 shrink-0">
        <span className="tabular-nums">Zoom: {Math.round(viewport.zoom * 100)}%</span>
        {grid.visible && <span>Grid: {grid.cellSize}px</span>}
        {grid.snapToGrid && <span>Snap</span>}
      </div>
    </div>
  );
}
