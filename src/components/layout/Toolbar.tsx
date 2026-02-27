import React from 'react';
import {
  MousePointer2,
  Hand,
  Brush,
  Eraser,
  Square,
  Spline,
  PaintBucket,
  Stamp,
  Type,
  Pipette,
  Grid3x3,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Undo,
  Redo,
} from 'lucide-react';
import { useToolStore, useCanvasStore, useHistoryStore } from '@/stores';
import {
  Button,
  Toggle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui';
import type { ToolType } from '@/types';
import type { CanvasEngine } from '@/core';
import { debug } from '@/utils';

const TOOLS: { type: ToolType; icon: React.ElementType; label: string; shortcut?: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { type: 'brush', icon: Brush, label: 'Brush', shortcut: 'B' },
  { type: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { type: 'shape', icon: Square, label: 'Shape', shortcut: 'U' },
  { type: 'path', icon: Spline, label: 'Path', shortcut: 'P' },
  { type: 'fill', icon: PaintBucket, label: 'Fill', shortcut: 'G' },
  { type: 'stamp', icon: Stamp, label: 'Stamp', shortcut: 'S' },
  { type: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { type: 'eyedropper', icon: Pipette, label: 'Eyedropper', shortcut: 'I' },
];

interface ToolbarProps {
  engine?: CanvasEngine | null;
}

export function Toolbar({ engine }: ToolbarProps) {
  // Use individual selectors to avoid re-render issues
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const grid = useCanvasStore((s) => s.grid);
  const viewport = useCanvasStore((s) => s.viewport);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const toggleSnapToGrid = useCanvasStore((s) => s.toggleSnapToGrid);

  // History state for enabling/disabling undo/redo buttons
  const undoStack = useHistoryStore((s) => s.undoStack);
  const redoStack = useHistoryStore((s) => s.redoStack);
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const handleZoomIn = () => {
    if (engine) {
      engine.setZoom(viewport.zoom * 1.25);
    }
  };

  const handleZoomOut = () => {
    if (engine) {
      engine.setZoom(viewport.zoom * 0.8);
    }
  };

  const handleFitToCanvas = () => {
    if (engine) {
      engine.fitToCanvas();
    }
  };

  const handleResetView = () => {
    if (engine) {
      engine.resetCamera();
    }
  };

  const handleExport = async () => {
    if (!engine) return;

    try {
      // Get the Pixi application's canvas
      const app = engine.getApp();
      if (!app?.canvas) {
        console.error('No canvas available for export');
        return;
      }

      // Convert canvas to data URL
      const canvas = app.canvas as HTMLCanvasElement;
      const dataUrl = canvas.toDataURL('image/png');

      // Create download link
      const link = document.createElement('a');
      link.download = `planet-map-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      debug.log('Map exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-12 bg-ink-900 border-b border-ink-700 flex items-center justify-between px-2">
        {/* Left: History */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canUndo}
                className="h-8 w-8"
                onClick={() => useHistoryStore.getState().undo()}
                aria-label="Undo (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canRedo}
                className="h-8 w-8"
                onClick={() => useHistoryStore.getState().redo()}
                aria-label="Redo (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-ink-700 mx-2" />

          {/* Tools */}
          {TOOLS.map(({ type, icon: Icon, label, shortcut }) => (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={activeTool === type}
                  onPressedChange={() => setActiveTool(type)}
                  size="sm"
                  className="h-8 w-8"
                  aria-label={`${label}${shortcut ? ` (${shortcut})` : ''}`}
                >
                  <Icon className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {label}
                {shortcut && (
                  <span className="ml-2 text-parchment-500 text-xs">({shortcut})</span>
                )}
              </TooltipContent>
            </Tooltip>
          ))}

          <div className="w-px h-6 bg-ink-700 mx-2" />

          {/* Grid controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={grid.visible}
                onPressedChange={toggleGrid}
                size="sm"
                className="h-8 w-8"
                aria-label="Toggle Grid"
              >
                <Grid3x3 className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={grid.snapToGrid}
                onPressedChange={toggleSnapToGrid}
                size="sm"
                className="h-8 w-8"
                aria-label="Snap to Grid"
              >
                <Magnet className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Snap to Grid</TooltipContent>
          </Tooltip>
        </div>

        {/* Center: Title */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-lg font-display text-parchment-300">
            Planet Planner
          </span>
        </div>

        {/* Right: View controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut} aria-label="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out (-)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn} aria-label="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In (+)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitToCanvas} aria-label="Fit to Canvas">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to Canvas (0)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetView} aria-label="Reset View">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-ink-700 mx-2" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} aria-label="Export Map">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export Map</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
