import { useCanvasStore } from '@/stores';

export function StatusBar() {
  const viewport = useCanvasStore(state => state.viewport);

  return (
    <div className="h-7 bg-ink-950 border-t border-ink-700 flex items-center px-4 text-xs text-parchment-400">
      <div className="flex gap-4">
        <span>Zoom: {Math.round(viewport.zoom * 100)}%</span>
        <span>X: {Math.round(viewport.center.x)}</span>
        <span>Y: {Math.round(viewport.center.y)}</span>
      </div>
    </div>
  );
}
