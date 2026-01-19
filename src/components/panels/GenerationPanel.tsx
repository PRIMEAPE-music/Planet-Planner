import { useState, useCallback } from 'react';
import {
  Dices,
  Play,
  Square,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { SimpleSelect, SelectItem } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  useGenerationStore,
  useGenerationConfig,
  useIsGenerating,
  useGenerationProgressData,
  useActivePreset,
} from '@/stores/useGenerationStore';
import { GENERATION_PRESETS } from '@/core/generation/presets';
import type { GenerationPreset, NoiseConfig } from '@/core/generation/types';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-ink-800">
      <button
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-ink-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-medium text-ink-200">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-ink-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ink-400" />
        )}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  unit = '',
}: SliderFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-400">{label}</label>
        <span className="text-xs text-ink-300 tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => {
          if (values[0] !== undefined) {
            onChange(values[0]);
          }
        }}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

interface GenerationPanelProps {
  onGenerate?: (seed?: number) => void;
}

export function GenerationPanel({ onGenerate }: GenerationPanelProps) {
  const config = useGenerationConfig();
  const isGenerating = useIsGenerating();
  const progress = useGenerationProgressData();
  const activePreset = useActivePreset();

  const setConfig = useGenerationStore((s) => s.setConfig);
  const setPreset = useGenerationStore((s) => s.setPreset);
  const randomizeSeed = useGenerationStore((s) => s.randomizeSeed);
  const setSeed = useGenerationStore((s) => s.setSeed);
  const cancelGeneration = useGenerationStore((s) => s.cancelGeneration);
  const undo = useGenerationStore((s) => s.undo);
  const redo = useGenerationStore((s) => s.redo);

  const handlePresetChange = useCallback(
    (value: string) => {
      setPreset(value as GenerationPreset);
    },
    [setPreset]
  );

  const handleSeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSeed(e.target.value);
    },
    [setSeed]
  );

  const handleGenerate = useCallback(() => {
    // Use the seed from config to generate terrain
    onGenerate?.(config.seed.value);
  }, [onGenerate, config.seed.value]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-ink-900">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-800">
        <h2 className="text-sm font-semibold text-ink-100">World Generation</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={undo} title="Undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={redo} title="Redo">
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {/* Preset Selection */}
        <div className="px-3 py-3 border-b border-ink-800">
          <label className="block text-xs text-ink-400 mb-1.5">Preset</label>
          <SimpleSelect value={activePreset} onValueChange={handlePresetChange}>
            {GENERATION_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
              </SelectItem>
            ))}
          </SimpleSelect>
          <p className="mt-1.5 text-xs text-ink-500">
            {GENERATION_PRESETS.find((p) => p.id === activePreset)?.description}
          </p>
        </div>

        {/* Seed */}
        <div className="px-3 py-3 border-b border-ink-800">
          <label className="block text-xs text-ink-400 mb-1.5">Seed</label>
          <div className="flex gap-2">
            <Input
              value={config.seed.display}
              onChange={handleSeedChange}
              className="flex-1 font-mono text-sm"
              placeholder="Enter seed..."
            />
            <Button
              variant="outline"
              size="icon"
              onClick={randomizeSeed}
              title="Random Seed"
            >
              <Dices className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Terrain Noise */}
        <CollapsibleSection title="Terrain Noise" defaultOpen>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-ink-400 mb-1.5">
                Noise Type
              </label>
              <SimpleSelect
                value={config.terrainNoise.type}
                onValueChange={(v) =>
                  setConfig({
                    terrainNoise: {
                      ...config.terrainNoise,
                      type: v as NoiseConfig['type'],
                    },
                  })
                }
              >
                <SelectItem value="simplex">Simplex</SelectItem>
                <SelectItem value="perlin">Perlin</SelectItem>
                <SelectItem value="ridged">Ridged</SelectItem>
                <SelectItem value="worley">Worley</SelectItem>
              </SimpleSelect>
            </div>

            <SliderField
              label="Frequency"
              value={config.terrainNoise.frequency}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, frequency: v },
                })
              }
              min={1}
              max={10}
              step={0.1}
            />

            <SliderField
              label="Octaves"
              value={config.terrainNoise.octaves}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, octaves: v },
                })
              }
              min={1}
              max={10}
              step={1}
            />

            <SliderField
              label="Persistence"
              value={config.terrainNoise.persistence}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, persistence: v },
                })
              }
              min={0.1}
              max={0.9}
            />

            <SliderField
              label="Lacunarity"
              value={config.terrainNoise.lacunarity}
              onChange={(v) =>
                setConfig({
                  terrainNoise: { ...config.terrainNoise, lacunarity: v },
                })
              }
              min={1.5}
              max={3}
            />
          </div>
        </CollapsibleSection>

        {/* Continent Shape */}
        <CollapsibleSection title="Continent Shape" defaultOpen>
          <div className="space-y-3">
            <SliderField
              label="Land Coverage"
              value={config.continentShape.landRatio}
              onChange={(v) =>
                setConfig({
                  continentShape: { ...config.continentShape, landRatio: v },
                })
              }
              min={0.1}
              max={0.7}
            />

            <SliderField
              label="Sea Level"
              value={config.continentShape.seaLevel}
              onChange={(v) =>
                setConfig({
                  continentShape: { ...config.continentShape, seaLevel: v },
                })
              }
              min={0.2}
              max={0.6}
            />

            <SliderField
              label="Fragmentation"
              value={config.continentShape.fragmentation}
              onChange={(v) =>
                setConfig({
                  continentShape: { ...config.continentShape, fragmentation: v },
                })
              }
              min={0}
              max={1}
            />

            <div>
              <label className="block text-xs text-ink-400 mb-1.5">
                Edge Falloff
              </label>
              <SimpleSelect
                value={config.continentShape.edgeFalloff}
                onValueChange={(v) =>
                  setConfig({
                    continentShape: {
                      ...config.continentShape,
                      edgeFalloff: v as typeof config.continentShape.edgeFalloff,
                    },
                  })
                }
              >
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SimpleSelect>
            </div>

            {config.continentShape.edgeFalloff !== 'none' && (
              <SliderField
                label="Falloff Strength"
                value={config.continentShape.edgeFalloffStrength}
                onChange={(v) =>
                  setConfig({
                    continentShape: {
                      ...config.continentShape,
                      edgeFalloffStrength: v,
                    },
                  })
                }
                min={-1}
                max={1}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Coastline Detail */}
        <CollapsibleSection title="Coastline Detail">
          <div className="space-y-3">
            <SliderField
              label="Roughness"
              value={config.coastline.roughness}
              onChange={(v) =>
                setConfig({
                  coastline: { ...config.coastline, roughness: v },
                })
              }
              min={0}
              max={1}
            />

            <SliderField
              label="Detail Frequency"
              value={config.coastline.detailFrequency}
              onChange={(v) =>
                setConfig({
                  coastline: { ...config.coastline, detailFrequency: v },
                })
              }
              min={5}
              max={30}
              step={1}
            />

            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Fjords</label>
              <Switch
                checked={config.coastline.fjords}
                onCheckedChange={(v: boolean) =>
                  setConfig({
                    coastline: { ...config.coastline, fjords: v },
                  })
                }
              />
            </div>

            {config.coastline.fjords && (
              <SliderField
                label="Fjord Depth"
                value={config.coastline.fjordDepth}
                onChange={(v) =>
                  setConfig({
                    coastline: { ...config.coastline, fjordDepth: v },
                  })
                }
                min={0.05}
                max={0.3}
              />
            )}

            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Bays</label>
              <Switch
                checked={config.coastline.bays}
                onCheckedChange={(v: boolean) =>
                  setConfig({
                    coastline: { ...config.coastline, bays: v },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Peninsulas</label>
              <Switch
                checked={config.coastline.peninsulas}
                onCheckedChange={(v: boolean) =>
                  setConfig({
                    coastline: { ...config.coastline, peninsulas: v },
                  })
                }
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Islands */}
        <CollapsibleSection title="Islands">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Enable Islands</label>
              <Switch
                checked={config.islands.enabled}
                onCheckedChange={(v: boolean) =>
                  setConfig({
                    islands: { ...config.islands, enabled: v },
                  })
                }
              />
            </div>

            {config.islands.enabled && (
              <>
                <SliderField
                  label="Cluster Count"
                  value={config.islands.clusterCount}
                  onChange={(v) =>
                    setConfig({
                      islands: { ...config.islands, clusterCount: v },
                    })
                  }
                  min={1}
                  max={10}
                  step={1}
                />

                <SliderField
                  label="Max Islands per Cluster"
                  value={config.islands.islandsPerCluster.max}
                  onChange={(v) =>
                    setConfig({
                      islands: {
                        ...config.islands,
                        islandsPerCluster: {
                          ...config.islands.islandsPerCluster,
                          max: v,
                        },
                      },
                    })
                  }
                  min={1}
                  max={20}
                  step={1}
                />

                <SliderField
                  label="Cluster Spread"
                  value={config.islands.clusterSpread}
                  onChange={(v) =>
                    setConfig({
                      islands: { ...config.islands, clusterSpread: v },
                    })
                  }
                  min={20}
                  max={150}
                  step={5}
                />

                <SliderField
                  label="Shape Variation"
                  value={config.islands.shapeVariation}
                  onChange={(v) =>
                    setConfig({
                      islands: { ...config.islands, shapeVariation: v },
                    })
                  }
                  min={0}
                  max={0.5}
                />
              </>
            )}
          </div>
        </CollapsibleSection>

        {/* Tectonics */}
        <CollapsibleSection title="Tectonics">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">
                Enable Tectonic Simulation
              </label>
              <Switch
                checked={config.tectonics.enabled}
                onCheckedChange={(v: boolean) =>
                  setConfig({
                    tectonics: { ...config.tectonics, enabled: v },
                  })
                }
              />
            </div>

            {config.tectonics.enabled && (
              <>
                <SliderField
                  label="Plate Count"
                  value={config.tectonics.plateCount}
                  onChange={(v) =>
                    setConfig({
                      tectonics: { ...config.tectonics, plateCount: v },
                    })
                  }
                  min={3}
                  max={15}
                  step={1}
                />

                <div className="flex items-center justify-between">
                  <label className="text-xs text-ink-400">
                    Convergent Mountains
                  </label>
                  <Switch
                    checked={config.tectonics.convergentMountains}
                    onCheckedChange={(v: boolean) =>
                      setConfig({
                        tectonics: {
                          ...config.tectonics,
                          convergentMountains: v,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-ink-400">Divergent Rifts</label>
                  <Switch
                    checked={config.tectonics.divergentRifts}
                    onCheckedChange={(v: boolean) =>
                      setConfig({
                        tectonics: { ...config.tectonics, divergentRifts: v },
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>
      </ScrollArea>

      {/* Footer - Generation Controls */}
      <div className="shrink-0 border-t border-ink-800 p-3 space-y-3">
        {/* Progress Bar */}
        {isGenerating && progress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-400">{progress.message}</span>
              <span className="text-ink-300 tabular-nums">
                {Math.round(progress.progress * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-parchment-500 transition-all duration-300"
                style={{ width: `${progress.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          className={cn(
            'w-full',
            isGenerating ? 'bg-red-700 hover:bg-red-600' : ''
          )}
          onClick={isGenerating ? cancelGeneration : handleGenerate}
        >
          {isGenerating ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate World
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
