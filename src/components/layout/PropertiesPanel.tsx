import { useState } from 'react';
import { Mountain, Brush, Globe, Sparkles } from 'lucide-react';
import { useToolStore } from '@/stores';
import { Slider, ScrollArea, Switch } from '@/components/ui';
import { TerrainPanel } from './TerrainPanel';
import { GenerationPanel } from '@/components/panels/GenerationPanel';
import { FeaturePanel } from '@/components/panels/FeaturePanel';
import { cn } from '@/utils';
import type { BrushToolOptions, ShapeToolOptions, StampToolOptions, ShapeType } from '@/types';

type PanelTab = 'tool' | 'terrain' | 'generate' | 'features';

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
  const toolOptions = options[activeTool as keyof typeof options] ?? {
    size: 10,
    opacity: 1,
    primaryColor: '#5d524a',
    secondaryColor: '#f4e4c1',
    hardness: 0.8,
  };

  // Type-safe accessors for tool-specific options (only valid when corresponding tool is active)
  const shapeOptions = activeTool === 'shape' ? (toolOptions as ShapeToolOptions) : null;
  const stampOptions = activeTool === 'stamp' ? (toolOptions as StampToolOptions) : null;
  const brushOptions = 'hardness' in toolOptions ? (toolOptions as BrushToolOptions) : null;

  return (
    <div className="flex flex-col h-full w-48 lg:w-64 bg-ink-900 border-r border-ink-700 shrink-0">
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
          World
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors',
            activeTab === 'features'
              ? 'bg-ink-800 text-parchment-200'
              : 'text-ink-400 hover:text-parchment-300'
          )}
          onClick={() => setActiveTab('features')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Features
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
            {brushOptions && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400">Hardness</span>
                  <span className="text-xs text-parchment-300">
                    {Math.round(brushOptions.hardness * 100)}%
                  </span>
                </div>
                <Slider
                  value={[brushOptions.hardness * 100]}
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
                <label className="relative cursor-pointer">
                  <span className="sr-only">Primary color</span>
                  <input
                    type="color"
                    value={toolOptions.primaryColor}
                    onChange={(e) =>
                      setToolOptions(activeTool, { primaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                    aria-label="Primary color"
                  />
                  <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500" aria-hidden="true">
                    Primary
                  </span>
                </label>
                <label className="relative cursor-pointer">
                  <span className="sr-only">Secondary color</span>
                  <input
                    type="color"
                    value={toolOptions.secondaryColor}
                    onChange={(e) =>
                      setToolOptions(activeTool, { secondaryColor: e.target.value })
                    }
                    className="w-10 h-10 rounded border border-ink-600 cursor-pointer"
                    aria-label="Secondary color"
                  />
                  <span className="absolute -bottom-4 left-0 text-[10px] text-ink-500" aria-hidden="true">
                    Secondary
                  </span>
                </label>
              </div>
            </div>

            {/* Shape Tool Options */}
            {shapeOptions && (
              <>
                <div className="border-t border-ink-700 pt-4 mt-6">
                  <span className="text-xs text-ink-400 font-medium">Shape Options</span>
                </div>

                {/* Shape Type */}
                <div className="space-y-2">
                  <span className="text-xs text-ink-400">Shape Type</span>
                  <div className="grid grid-cols-2 gap-1">
                    {(['rectangle', 'ellipse', 'polygon', 'freeform'] as ShapeType[]).map((type) => (
                      <button
                        key={type}
                        className={cn(
                          'px-2 py-1.5 text-xs rounded transition-colors capitalize',
                          shapeOptions.shapeType === type
                            ? 'bg-parchment-600 text-ink-950'
                            : 'bg-ink-800 text-ink-300 hover:bg-ink-700'
                        )}
                        onClick={() => setToolOptions(activeTool, { shapeType: type })}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fill & Stroke */}
                <div className="space-y-2">
                  <span className="text-xs text-ink-400">Fill & Stroke</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-ink-300 cursor-pointer">
                      <Switch
                        checked={shapeOptions.fill ?? true}
                        onCheckedChange={(checked) => setToolOptions(activeTool, { fill: checked })}
                      />
                      Fill
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink-300 cursor-pointer">
                      <Switch
                        checked={shapeOptions.stroke ?? true}
                        onCheckedChange={(checked) => setToolOptions(activeTool, { stroke: checked })}
                      />
                      Stroke
                    </label>
                  </div>
                </div>

                {/* Stroke Width */}
                {shapeOptions.stroke && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-400">Stroke Width</span>
                      <span className="text-xs text-parchment-300">
                        {shapeOptions.strokeWidth ?? 2}px
                      </span>
                    </div>
                    <Slider
                      value={[shapeOptions.strokeWidth ?? 2]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={(values) => {
                        if (values[0] !== undefined) {
                          setToolOptions(activeTool, { strokeWidth: values[0] });
                        }
                      }}
                    />
                  </div>
                )}

                {/* Corner Radius (for rectangle) */}
                {shapeOptions.shapeType === 'rectangle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-400">Corner Radius</span>
                      <span className="text-xs text-parchment-300">
                        {shapeOptions.cornerRadius ?? 0}px
                      </span>
                    </div>
                    <Slider
                      value={[shapeOptions.cornerRadius ?? 0]}
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={(values) => {
                        if (values[0] !== undefined) {
                          setToolOptions(activeTool, { cornerRadius: values[0] });
                        }
                      }}
                    />
                  </div>
                )}

                {/* Polygon Sides (for polygon) */}
                {shapeOptions.shapeType === 'polygon' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-400">Sides</span>
                      <span className="text-xs text-parchment-300">
                        {shapeOptions.polygonSides ?? 6}
                      </span>
                    </div>
                    <Slider
                      value={[shapeOptions.polygonSides ?? 6]}
                      min={3}
                      max={12}
                      step={1}
                      onValueChange={(values) => {
                        if (values[0] !== undefined) {
                          setToolOptions(activeTool, { polygonSides: values[0] });
                        }
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {/* Stamp Tool Options */}
            {stampOptions && (
              <>
                <div className="border-t border-ink-700 pt-4 mt-6">
                  <span className="text-xs text-ink-400 font-medium">Stamp Options</span>
                </div>

                {/* Rotation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-400">Rotation</span>
                    <span className="text-xs text-parchment-300">
                      {stampOptions.rotation ?? 0}°
                    </span>
                  </div>
                  <Slider
                    value={[stampOptions.rotation ?? 0]}
                    min={0}
                    max={360}
                    step={5}
                    onValueChange={(values) => {
                      if (values[0] !== undefined) {
                        setToolOptions(activeTool, { rotation: values[0] });
                      }
                    }}
                  />
                </div>

                {/* Scale */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-400">Scale</span>
                    <span className="text-xs text-parchment-300">
                      {(stampOptions.scale ?? 1).toFixed(1)}x
                    </span>
                  </div>
                  <Slider
                    value={[(stampOptions.scale ?? 1) * 10]}
                    min={1}
                    max={30}
                    step={1}
                    onValueChange={(values) => {
                      if (values[0] !== undefined) {
                        setToolOptions(activeTool, { scale: values[0] / 10 });
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      ) : activeTab === 'terrain' ? (
        <TerrainPanel
          onGenerate={onTerrainGenerate}
          onStyleChange={onTerrainStyleChange}
        />
      ) : activeTab === 'generate' ? (
        <GenerationPanel onGenerate={onTerrainGenerate} />
      ) : (
        <FeaturePanel />
      )}
    </div>
  );
}
