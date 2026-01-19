import { useEffect } from 'react';
import { useToolStore, useCanvasStore } from '@/stores';
import type { ToolType } from '@/types';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  v: 'select',
  h: 'pan',
  b: 'brush',
  e: 'eraser',
  u: 'shape',
  p: 'path',
  g: 'fill',
  s: 'stamp',
  t: 'text',
  i: 'eyedropper',
};

export interface UseKeyboardShortcutsOptions {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitToCanvas?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { setActiveTool, swapColors } = useToolStore();
  const { toggleGrid, toggleSnapToGrid } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Tool shortcuts (no modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = TOOL_SHORTCUTS[key];
        if (tool) {
          e.preventDefault();
          setActiveTool(tool);
          return;
        }

        // Other shortcuts
        switch (key) {
          case 'x':
            e.preventDefault();
            swapColors();
            break;
          case "'":
            if (e.shiftKey) {
              e.preventDefault();
              toggleGrid();
            }
            break;
          case '=':
          case '+':
            e.preventDefault();
            options.onZoomIn?.();
            break;
          case '-':
            e.preventDefault();
            options.onZoomOut?.();
            break;
          case '0':
            e.preventDefault();
            options.onFitToCanvas?.();
            break;
        }
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              options.onRedo?.();
            } else {
              options.onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            options.onRedo?.();
            break;
          case 'g':
            if (e.shiftKey) {
              e.preventDefault();
              toggleGrid();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, swapColors, toggleGrid, toggleSnapToGrid, options]);
}
