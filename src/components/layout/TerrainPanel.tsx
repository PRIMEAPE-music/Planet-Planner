import { useCallback } from 'react';
import {
  Mountain,
  Palette,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Waves,
} from 'lucide-react';
import { useTerrainStore } from '@/stores';
import { biomeRegistry } from '@/core/terrain';
import {
  Button,
  Slider,
  ScrollArea,
  Toggle,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui';
import { cn } from '@/utils';

interface TerrainPanelProps {
  onGenerate?: (seed?: number) => void;
  onStyleChange?: () => void;
}

export function TerrainPanel({ onGenerate, onStyleChange }: TerrainPanelProps) {
  // Use individual selectors to avoid re-renders
  const style = useTerrainStore((s) => s.style);
  const activeBiome = useTerrainStore((s) => s.activeBiome);
  const terrainBrush = useTerrainStore((s) => s.terrainBrush);
  const isGenerating = useTerrainStore((s) => s.isGenerating);
  const lastSeed = useTerrainStore((s) => s.lastSeed);

  // Get actions from store
  const setStyle = useTerrainStore((s) => s.setStyle);
  const setStyleBlend = useTerrainStore((s) => s.setStyleBlend);
  const setActiveBiome = useTerrainStore((s) => s.setActiveBiome);
  const setTerrainBrush = useTerrainStore((s) => s.setTerrainBrush);

  const biomes = biomeRegistry.getAll();
  const landBiomes = biomes.filter((b) => !b.isWater);
  const waterBiomes = biomes.filter((b) => b.isWater);

  const handleGenerate = useCallback(() => {
    const newSeed = Date.now();
    onGenerate?.(newSeed);
  }, [onGenerate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ink-700">
        <div className="flex items-center gap-2">
          <Mountain className="h-4 w-4 text-parchment-400" />
          <span className="text-sm font-medium text-parchment-200">Terrain</span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate New Terrain</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Style Blend Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Style</span>
              <span className="text-xs text-parchment-300">
                {style.styleBlend < 0.3
                  ? 'Realistic'
                  : style.styleBlend > 0.7
                  ? 'Parchment'
                  : 'Mixed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-500">Real</span>
              <Slider
                value={[style.styleBlend * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) => {
                  if (values[0] !== undefined) {
                    setStyleBlend(values[0] / 100);
                    onStyleChange?.();
                  }
                }}
                className="flex-1"
              />
              <span className="text-[10px] text-ink-500">Map</span>
            </div>
          </div>

          {/* Hillshade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Hillshade</span>
              <span className="text-xs text-parchment-300">
                {Math.round(style.hillshadeIntensity * 100)}%
              </span>
            </div>
            <Slider
              value={[style.hillshadeIntensity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => {
                if (values[0] !== undefined) {
                  setStyle({ hillshadeIntensity: values[0] / 100 });
                  onStyleChange?.();
                }
              }}
            />
          </div>

          {/* Coastline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-400">Coastline Ink</span>
              <span className="text-xs text-parchment-300">
                {Math.round(style.coastlineIntensity * 100)}%
              </span>
            </div>
            <Slider
              value={[style.coastlineIntensity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => {
                if (values[0] !== undefined) {
                  setStyle({ coastlineIntensity: values[0] / 100 });
                  onStyleChange?.();
                }
              }}
            />
          </div>

          {/* Brush Settings */}
          <div className="space-y-2 pt-2 border-t border-ink-700">
            <span className="text-xs text-ink-400 font-medium">Terrain Brush</span>

            {/* Mode toggles */}
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'paint'}
                    onPressedChange={() => setTerrainBrush({ mode: 'paint' })}
                    size="sm"
                    className="flex-1"
                  >
                    <Palette className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Paint Biome</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'raise'}
                    onPressedChange={() => setTerrainBrush({ mode: 'raise' })}
                    size="sm"
                    className="flex-1"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Raise Terrain</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'lower'}
                    onPressedChange={() => setTerrainBrush({ mode: 'lower' })}
                    size="sm"
                    className="flex-1"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Lower Terrain</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={terrainBrush.mode === 'smooth'}
                    onPressedChange={() => setTerrainBrush({ mode: 'smooth' })}
                    size="sm"
                    className="flex-1"
                  >
                    <Waves className="h-3 w-3" />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Smooth Terrain</TooltipContent>
              </Tooltip>
            </div>

            {/* Brush size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Size</span>
                <span className="text-xs text-parchment-300">{terrainBrush.size}px</span>
              </div>
              <Slider
                value={[terrainBrush.size]}
                min={10}
                max={200}
                step={5}
                onValueChange={(values) => {
                  if (values[0] !== undefined) setTerrainBrush({ size: values[0] });
                }}
              />
            </div>

            {/* Brush strength */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-400">Strength</span>
                <span className="text-xs text-parchment-300">
                  {Math.round(terrainBrush.strength * 100)}%
                </span>
              </div>
              <Slider
                value={[terrainBrush.strength * 100]}
                min={1}
                max={50}
                step={1}
                onValueChange={(values) => {
                  if (values[0] !== undefined) setTerrainBrush({ strength: values[0] / 100 });
                }}
              />
            </div>
          </div>

          {/* Biome Palette */}
          <div className="space-y-2 pt-2 border-t border-ink-700">
            <span className="text-xs text-ink-400 font-medium">Biomes</span>

            {/* Land biomes */}
            <div className="space-y-1">
              <span className="text-[10px] text-ink-500">Land</span>
              <div className="grid grid-cols-4 gap-1">
                {landBiomes.map((biome) => (
                  <Tooltip key={biome.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-full aspect-square rounded border-2 transition-all',
                          activeBiome === biome.id
                            ? 'border-parchment-400 scale-110'
                            : 'border-transparent hover:border-ink-500'
                        )}
                        style={{
                          backgroundColor: biome.parchmentColors.base,
                        }}
                        onClick={() => setActiveBiome(biome.id)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{biome.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Water biomes */}
            <div className="space-y-1">
              <span className="text-[10px] text-ink-500">Water</span>
              <div className="grid grid-cols-4 gap-1">
                {waterBiomes.map((biome) => (
                  <Tooltip key={biome.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'w-full aspect-square rounded border-2 transition-all',
                          activeBiome === biome.id
                            ? 'border-parchment-400 scale-110'
                            : 'border-transparent hover:border-ink-500'
                        )}
                        style={{
                          backgroundColor: biome.parchmentColors.base,
                        }}
                        onClick={() => setActiveBiome(biome.id)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{biome.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-ink-700 text-xs text-ink-400">
        Seed: {lastSeed}
      </div>
    </div>
  );
}
