import { useState, useCallback } from 'react';
import {
  Mountain,
  Waves,
  Droplets,
  Trees,
  Cloud,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  useFeatureStore,
  useFeatureConfig,
  useFeatureProgress,
} from '@/stores/useFeatureStore';
import { useGenerationStore } from '@/stores/useGenerationStore';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  icon,
  enabled,
  onToggle,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-ink-800">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          className="flex items-center gap-2 hover:bg-ink-800/50 transition-colors flex-1 text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-ink-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-ink-400" />
          )}
          <span className="text-ink-400">{icon}</span>
          <span className="text-sm font-medium text-ink-200">{title}</span>
        </button>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {isOpen && enabled && <div className="px-3 pb-3 space-y-3">{children}</div>}
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
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
}: SliderFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-400">{label}</label>
        <span className="text-xs text-ink-300 tabular-nums">
          {value.toFixed(step < 1 ? 2 : 0)}
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

export function FeaturePanel() {
  const config = useFeatureConfig();
  const { isGenerating, progress } = useFeatureProgress();
  const generationResult = useGenerationStore((s) => s.result);

  const {
    setMountainConfig,
    setRiverConfig,
    setLakeConfig,
    setForestConfig,
    setClimateConfig,
    generate,
    showMountains,
    showRivers,
    showLakes,
    showForests,
    setVisibility,
  } = useFeatureStore();

  const handleGenerate = useCallback(async () => {
    if (!generationResult) return;

    await generate(
      generationResult.landMask,
      generationResult.heightmap,
      generationResult.plateMap
    );
  }, [generationResult, generate]);

  const canGenerate = !!generationResult && !isGenerating;

  return (
    <div className="flex flex-col h-full min-h-0 bg-ink-900">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-ink-800">
        <h2 className="text-sm font-semibold text-ink-100">Features</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showMountains', !showMountains)}
            title="Toggle Mountains"
          >
            <Mountain className={cn('w-4 h-4', showMountains ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showRivers', !showRivers)}
            title="Toggle Rivers"
          >
            <Waves className={cn('w-4 h-4', showRivers ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showLakes', !showLakes)}
            title="Toggle Lakes"
          >
            <Droplets className={cn('w-4 h-4', showLakes ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setVisibility('showForests', !showForests)}
            title="Toggle Forests"
          >
            <Trees className={cn('w-4 h-4', showForests ? 'text-ink-100' : 'text-ink-500')} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {/* Mountains */}
        <CollapsibleSection
          title="Mountains"
          icon={<Mountain className="w-4 h-4" />}
          enabled={config.mountains.enabled}
          onToggle={(v) => setMountainConfig({ enabled: v })}
          defaultOpen
        >
          <SliderField
            label="Range Count"
            value={config.mountains.rangeCount}
            onChange={(v) => setMountainConfig({ rangeCount: v })}
            min={1}
            max={10}
            step={1}
          />
          <SliderField
            label="Roughness"
            value={config.mountains.roughness}
            onChange={(v) => setMountainConfig({ roughness: v })}
            min={0}
            max={1}
          />
          <SliderField
            label="Isolated Peaks"
            value={config.mountains.isolatedPeakCount}
            onChange={(v) => setMountainConfig({ isolatedPeakCount: v })}
            min={0}
            max={20}
            step={1}
          />
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-400">Follow Tectonics</label>
            <Switch
              checked={config.mountains.followTectonics}
              onCheckedChange={(v: boolean) => setMountainConfig({ followTectonics: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Rivers */}
        <CollapsibleSection
          title="Rivers"
          icon={<Waves className="w-4 h-4" />}
          enabled={config.rivers.enabled}
          onToggle={(v) => setRiverConfig({ enabled: v })}
        >
          <SliderField
            label="Max Rivers"
            value={config.rivers.maxRivers}
            onChange={(v) => setRiverConfig({ maxRivers: v })}
            min={1}
            max={50}
            step={1}
          />
          <SliderField
            label="Width Multiplier"
            value={config.rivers.widthMultiplier}
            onChange={(v) => setRiverConfig({ widthMultiplier: v })}
            min={0.5}
            max={3}
          />
          <SliderField
            label="Erosion Strength"
            value={config.rivers.erosionStrength}
            onChange={(v) => setRiverConfig({ erosionStrength: v })}
            min={0}
            max={0.5}
          />
          <SliderField
            label="Meander Factor"
            value={config.rivers.meanderFactor}
            onChange={(v) => setRiverConfig({ meanderFactor: v })}
            min={0}
            max={1}
          />
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-400">Tributaries</label>
            <Switch
              checked={config.rivers.generateTributaries}
              onCheckedChange={(v: boolean) => setRiverConfig({ generateTributaries: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Lakes */}
        <CollapsibleSection
          title="Lakes"
          icon={<Droplets className="w-4 h-4" />}
          enabled={config.lakes.enabled}
          onToggle={(v) => setLakeConfig({ enabled: v })}
        >
          <SliderField
            label="Max Lakes"
            value={config.lakes.maxLakes}
            onChange={(v) => setLakeConfig({ maxLakes: v })}
            min={1}
            max={30}
            step={1}
          />
          <SliderField
            label="Min Size"
            value={config.lakes.minSize}
            onChange={(v) => setLakeConfig({ minSize: v })}
            min={10}
            max={100}
            step={5}
          />
          <SliderField
            label="Max Size"
            value={config.lakes.maxSize}
            onChange={(v) => setLakeConfig({ maxSize: v })}
            min={50}
            max={500}
            step={10}
          />
          <div className="flex items-center justify-between">
            <label className="text-xs text-ink-400">Mountain Lakes</label>
            <Switch
              checked={config.lakes.mountainLakes}
              onCheckedChange={(v: boolean) => setLakeConfig({ mountainLakes: v })}
            />
          </div>
        </CollapsibleSection>

        {/* Forests */}
        <CollapsibleSection
          title="Forests"
          icon={<Trees className="w-4 h-4" />}
          enabled={config.forests.enabled}
          onToggle={(v) => setForestConfig({ enabled: v })}
        >
          <SliderField
            label="Coverage Target"
            value={config.forests.coverageTarget}
            onChange={(v) => setForestConfig({ coverageTarget: v })}
            min={0.1}
            max={0.7}
          />
          <SliderField
            label="Moisture Threshold"
            value={config.forests.moistureThreshold}
            onChange={(v) => setForestConfig({ moistureThreshold: v })}
            min={0.2}
            max={0.7}
          />
          <SliderField
            label="Clustering"
            value={config.forests.clustering}
            onChange={(v) => setForestConfig({ clustering: v })}
            min={0}
            max={1}
          />
          <SliderField
            label="Edge Noise"
            value={config.forests.edgeNoise}
            onChange={(v) => setForestConfig({ edgeNoise: v })}
            min={0}
            max={1}
          />
        </CollapsibleSection>

        {/* Climate */}
        <CollapsibleSection
          title="Climate"
          icon={<Cloud className="w-4 h-4" />}
          enabled={config.climate.enabled}
          onToggle={(v) => setClimateConfig({ enabled: v })}
        >
          <SliderField
            label="Equator Position"
            value={config.climate.equatorPosition}
            onChange={(v) => setClimateConfig({ equatorPosition: v })}
            min={0.2}
            max={0.8}
          />
          <SliderField
            label="Temperature Variation"
            value={config.climate.temperatureVariation}
            onChange={(v) => setClimateConfig({ temperatureVariation: v })}
            min={0}
            max={0.5}
          />
          <SliderField
            label="Rain Shadow Strength"
            value={config.climate.rainShadowStrength}
            onChange={(v) => setClimateConfig({ rainShadowStrength: v })}
            min={0}
            max={1}
          />
          <SliderField
            label="Ocean Moisture"
            value={config.climate.oceanMoistureStrength}
            onChange={(v) => setClimateConfig({ oceanMoistureStrength: v })}
            min={0.3}
            max={1}
          />
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
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          {isGenerating ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Generate Features
            </>
          )}
        </Button>

        {!generationResult && (
          <p className="text-xs text-ink-500 text-center">
            Generate a world first in the Generation tab
          </p>
        )}
      </div>
    </div>
  );
}
