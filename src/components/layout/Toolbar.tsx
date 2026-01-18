import { ZoomIn, ZoomOut, Grid3x3, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCanvasStore } from '@/stores';

export function Toolbar() {
  const grid = useCanvasStore(state => state.grid);
  const toggleGrid = useCanvasStore(state => state.toggleGrid);

  return (
    <div className="h-12 bg-ink-900 border-b border-ink-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-parchment-200 font-display text-xl">Planet Planner</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <ZoomOut className="h-4 w-4 mr-1" />
          Zoom Out
        </Button>
        <Button variant="ghost" size="sm">
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>
        <Button
          variant={grid.visible ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleGrid}
        >
          <Grid3x3 className="h-4 w-4 mr-1" />
          Grid
        </Button>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
    </div>
  );
}
