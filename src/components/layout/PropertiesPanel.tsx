import { useState } from 'react';
import { Mountain, Brush, Globe } from 'lucide-react';
import { useToolStore } from '@/stores';
import { Slider, ScrollArea } from '@/components/ui';
import { TerrainPanel } from './TerrainPanel';
import { GenerationPanel } from '@/components/panels/GenerationPanel';
import { cn } from '@/utils';
import type { BrushToolOptions } from '@/types';

type PanelTab = 'tool' | 'terrain' | 'generate';

interface PropertiesPanelProps {
  onTerrainGenerate?: (seed?: number) => void;
  onTerrainStyleChange?: () => void;
}

export function PropertiesPanel({
  onTerrainGenerate,
  onTerrainStyleChange,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('generate');

  // Use individual selectors to avoid re-render issues
  const activeTool = useToolStore((s) => s.activeTool);
  const options = useToolStore((s) => s.options);
  const setToolOptions = useToolStore((s) => s.setToolOptions);
  const toolOptions = (options[activeTool as keyof typeof options] ?? {
    size: 10,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    hardness: 0.8,
  }) as BrushToolOptions;

  return (
    <div className="flex flex-col h-full w-64 bg-ink-900 border-r border-ink-700">
      {/* Tab Header */}
      <div className="flex border-b border-ink-700">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'tool'
              ? 'bg-ink-800 text-parchment-200'
              : 'text-ink-400 hover:text-parchment-300'
          )}
          onClick={() => setActiveTab('tool')}
        >
          <Brush className="h-3.5 w-3.5" />
          Tool
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'terrain'
              ? 'bg-ink-800 text-parchment-200'
              : 'text-ink-400 hover:text-parchment-300'
          )}
          onClick={() => setActiveTab('terrain')}
        >
          <Mountain className="h-3.5 w-3.5" />
          Terrain
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'generate'
              ? 'bg-ink-800 text-parchment-200'
              : 'text-ink-400 hover:text-parchment-300'
          )}
          onClick={() => setActiveTab('generate')}
        >
          <Globe className="h-3.5 w-3.5" />
          Generate
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tool' ? (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Size</span>
                <span className="text-xs text-parchment-300">{toolOptions.size}px</span>
              </div>
              <Slider
                value={[toolOptions.size]}
                min={1}
                max={200}
                step={1}
                onValueChange={(values) => {
                  if (values[0] !== undefined) {
                    setToolOptions(activeTool, { size: values[0] });
                  }
                }}
              />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Opacity</span>
                <span className="text-xs text-parchment-300">
                  {Math.round(toolOptions.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[toolOptions.opacity * 100]}
                min={1}
                max={100}
                step={1}
                onValueChange={(values) => {
                  if (values[0] !== undefined) {
                    setToolOptions(activeTool, { opacity: values[0] / 100 });
                  }
                }}
              />
            </div>

            {/* Hardness (for brush/eraser) */}
            {toolOptions.hardness !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400">Hardness</span>
                  <span className="text-xs text-parchment-300">
                    {Math.round(toolOptions.hardness * 100)}%
                  </span>
                </div>
                <Slider
                  value={[toolOptions.hardness * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(values) => {
                    if (values[0] !== undefined) {
                      setToolOptions(activeTool, { hardness: values[0] / 100 });
                    }
                  }}
                />
              </div>
            )}

            {/* Colors */}
            <div className="space-y-2">
              <span className="text-xs text-ink-400">Colors</span>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={toolOptions.primaryColor}
                    onChange={(e) =>
                      setToolOptions(activeTool, { primaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                  />
                  <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500">
                    Primary
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="color"
                    value={toolOptions.secondaryColor}
                    onChange={(e) =>
                      setToolOptions(activeTool, { secondaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                  />
                  <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500">
                    Secondary
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : activeTab === 'terrain' ? (
        <TerrainPanel
          onGenerate={onTerrainGenerate}
          onStyleChange={onTerrainStyleChange}
        />
      ) : (
        <GenerationPanel onGenerate={onTerrainGenerate} />
      )}
    </div>
  );
}
