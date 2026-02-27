import { useCallback } from 'react';
import {
  Mountain,
  TrendingUp,
  TreePine,
  Waves,
  Droplets,
  Eraser,
  MousePointer,
} from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { SimpleSelect, SelectItem } from '@/components/ui/Select';
import {
  useFeatureToolsStore,
  useActiveFeatureTool,
  useMountainStampSettings,
  useMountainPathSettings,
  useForestBrushSettings,
  useRiverSplineSettings,
  useLakeShapeSettings,
  useFeatureEraserSettings,
} from '@/stores/useFeatureToolsStore';
import type { FeatureToolType, ForestBrushSettings, LakeShapeSettings } from '@/core/tools/features/types';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  return (
    <Button
      variant={active ? 'default' : 'ghost'}
      size="sm"
      className={cn(
        'flex flex-col items-center gap-1 h-auto py-2 px-3',
        active && 'bg-parchment-600 text-ink-950'
      )}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="text-[10px]">{label}</span>
    </Button>
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

function SliderField({ label, value, onChange, min, max, step = 0.01 }: SliderFieldProps) {
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
        onValueChange={(values) => onChange(values[0] ?? value)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export function FeatureToolsPanel() {
  const activeTool = useActiveFeatureTool();
  const { setActiveTool } = useFeatureToolsStore();

  const mountainStampSettings = useMountainStampSettings();
  const mountainPathSettings = useMountainPathSettings();
  const forestBrushSettings = useForestBrushSettings();
  const riverSplineSettings = useRiverSplineSettings();
  const lakeShapeSettings = useLakeShapeSettings();
  const featureEraserSettings = useFeatureEraserSettings();

  const {
    setMountainStampSettings,
    setMountainPathSettings,
    setForestBrushSettings,
    setRiverSplineSettings,
    setLakeShapeSettings,
    setFeatureEraserSettings,
  } = useFeatureToolsStore();

  const handleToolClick = useCallback(
    (tool: FeatureToolType) => {
      setActiveTool(activeTool === tool ? null : tool);
    },
    [activeTool, setActiveTool]
  );

  return (
    <div className="flex flex-col h-full bg-ink-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-ink-800">
        <h2 className="text-sm font-semibold text-ink-100">Feature Tools</h2>
      </div>

      {/* Tool Buttons */}
      <div className="grid grid-cols-4 gap-1 p-2 border-b border-ink-800">
        <ToolButton
                    icon={<Mountain className="w-5 h-5" />}
          label="Peak"
          active={activeTool === 'mountain-stamp'}
          onClick={() => handleToolClick('mountain-stamp')}
        />
        <ToolButton
                    icon={<TrendingUp className="w-5 h-5" />}
          label="Range"
          active={activeTool === 'mountain-path'}
          onClick={() => handleToolClick('mountain-path')}
        />
        <ToolButton
          icon={<TreePine className="w-5 h-5" />}
          label="Forest"
          active={activeTool === 'forest-brush'}
          onClick={() => handleToolClick('forest-brush')}
        />
        <ToolButton
          icon={<Waves className="w-5 h-5" />}
          label="River"
          active={activeTool === 'river-spline'}
          onClick={() => handleToolClick('river-spline')}
        />
        <ToolButton
          icon={<Droplets className="w-5 h-5" />}
          label="Lake"
          active={activeTool === 'lake-shape'}
          onClick={() => handleToolClick('lake-shape')}
        />
        <ToolButton
          icon={<Eraser className="w-5 h-5" />}
          label="Eraser"
          active={activeTool === 'feature-eraser'}
          onClick={() => handleToolClick('feature-eraser')}
        />
        <ToolButton
          icon={<MousePointer className="w-5 h-5" />}
          label="Select"
          active={activeTool === 'feature-select'}
          onClick={() => handleToolClick('feature-select')}
        />
      </div>

      {/* Tool Settings */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Mountain Stamp Settings */}
        {activeTool === 'mountain-stamp' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Mountain Peak Settings
            </h3>
            <SliderField
              label="Elevation"
              value={mountainStampSettings.elevation}
              onChange={(v) => setMountainStampSettings({ elevation: v })}
              min={0.5}
              max={0.98}
            />
            <SliderField
              label="Radius"
              value={mountainStampSettings.radius}
              onChange={(v) => setMountainStampSettings({ radius: v })}
              min={10}
              max={80}
              step={1}
            />
            <SliderField
              label="Sharpness"
              value={mountainStampSettings.sharpness}
              onChange={(v) => setMountainStampSettings({ sharpness: v })}
              min={0}
              max={1}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Snow Cap</label>
              <Switch
                checked={mountainStampSettings.snowCap}
                onCheckedChange={(v) => setMountainStampSettings({ snowCap: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Randomize</label>
              <Switch
                checked={mountainStampSettings.randomize}
                onCheckedChange={(v) => setMountainStampSettings({ randomize: v })}
              />
            </div>
          </div>
        )}

        {/* Mountain Path Settings */}
        {activeTool === 'mountain-path' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Mountain Range Settings
            </h3>
            <SliderField
              label="Width"
              value={mountainPathSettings.width}
              onChange={(v) => setMountainPathSettings({ width: v })}
              min={20}
              max={100}
              step={5}
            />
            <SliderField
              label="Peak Density"
              value={mountainPathSettings.peakDensity}
              onChange={(v) => setMountainPathSettings({ peakDensity: v })}
              min={2}
              max={20}
              step={1}
            />
            <SliderField
              label="Roughness"
              value={mountainPathSettings.roughness}
              onChange={(v) => setMountainPathSettings({ roughness: v })}
              min={0}
              max={1}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Smooth Path</label>
              <Switch
                checked={mountainPathSettings.smoothPath}
                onCheckedChange={(v) => setMountainPathSettings({ smoothPath: v })}
              />
            </div>
          </div>
        )}

        {/* Forest Brush Settings */}
        {activeTool === 'forest-brush' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Forest Brush Settings
            </h3>
            <SliderField
              label="Radius"
              value={forestBrushSettings.radius}
              onChange={(v) => setForestBrushSettings({ radius: v })}
              min={10}
              max={100}
              step={5}
            />
            <SliderField
              label="Density"
              value={forestBrushSettings.density}
              onChange={(v) => setForestBrushSettings({ density: v })}
              min={0.1}
              max={1}
            />
            <SliderField
              label="Variation"
              value={forestBrushSettings.variation}
              onChange={(v) => setForestBrushSettings({ variation: v })}
              min={0}
              max={1}
            />
            <div>
              <label className="block text-xs text-ink-400 mb-1.5">Forest Type</label>
              <SimpleSelect
                value={forestBrushSettings.forestType}
                onValueChange={(v) => setForestBrushSettings({ forestType: v as ForestBrushSettings['forestType'] })}
              >
                <SelectItem value="auto">Auto (Climate)</SelectItem>
                <SelectItem value="deciduous">Deciduous</SelectItem>
                <SelectItem value="coniferous">Coniferous</SelectItem>
                <SelectItem value="tropical">Tropical</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SimpleSelect>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Soft Edge</label>
              <Switch
                checked={forestBrushSettings.softEdge}
                onCheckedChange={(v) => setForestBrushSettings({ softEdge: v })}
              />
            </div>
          </div>
        )}

        {/* River Spline Settings */}
        {activeTool === 'river-spline' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              River Settings
            </h3>
            <p className="text-xs text-ink-500">
              Click to add points. Double-click or press Enter to finish.
            </p>
            <SliderField
              label="Start Width"
              value={riverSplineSettings.startWidth}
              onChange={(v) => setRiverSplineSettings({ startWidth: v })}
              min={1}
              max={10}
              step={0.5}
            />
            <SliderField
              label="End Width"
              value={riverSplineSettings.endWidth}
              onChange={(v) => setRiverSplineSettings({ endWidth: v })}
              min={2}
              max={20}
              step={1}
            />
            <SliderField
              label="Curve Tension"
              value={riverSplineSettings.tension}
              onChange={(v) => setRiverSplineSettings({ tension: v })}
              min={0}
              max={1}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Smooth Curves</label>
              <Switch
                checked={riverSplineSettings.smooth}
                onCheckedChange={(v) => setRiverSplineSettings({ smooth: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Erode Terrain</label>
              <Switch
                checked={riverSplineSettings.erode}
                onCheckedChange={(v) => setRiverSplineSettings({ erode: v })}
              />
            </div>
          </div>
        )}

        {/* Lake Shape Settings */}
        {activeTool === 'lake-shape' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Lake Settings
            </h3>
            <div>
              <label className="block text-xs text-ink-400 mb-1.5">Shape Type</label>
              <SimpleSelect
                value={lakeShapeSettings.type}
                onValueChange={(v) => setLakeShapeSettings({ type: v as LakeShapeSettings['type'] })}
              >
                <SelectItem value="freeform">Freeform</SelectItem>
                <SelectItem value="ellipse">Ellipse</SelectItem>
                <SelectItem value="rectangle">Rectangle</SelectItem>
              </SimpleSelect>
            </div>
            <SliderField
              label="Edge Noise"
              value={lakeShapeSettings.edgeNoise}
              onChange={(v) => setLakeShapeSettings({ edgeNoise: v })}
              min={0}
              max={0.5}
            />
            <SliderField
              label="Depth"
              value={lakeShapeSettings.depth}
              onChange={(v) => setLakeShapeSettings({ depth: v })}
              min={0.05}
              max={0.3}
            />
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Smooth Edges</label>
              <Switch
                checked={lakeShapeSettings.smoothEdges}
                onCheckedChange={(v) => setLakeShapeSettings({ smoothEdges: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-ink-400">Wave Pattern</label>
              <Switch
                checked={lakeShapeSettings.wavePattern}
                onCheckedChange={(v) => setLakeShapeSettings({ wavePattern: v })}
              />
            </div>
          </div>
        )}

        {/* Feature Eraser Settings */}
        {activeTool === 'feature-eraser' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Eraser Settings
            </h3>
            <SliderField
              label="Radius"
              value={featureEraserSettings.radius}
              onChange={(v) => setFeatureEraserSettings({ radius: v })}
              min={10}
              max={100}
              step={5}
            />
            <div className="space-y-2">
              <label className="text-xs text-ink-400">Erase Targets</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.mountains}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, mountains: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Mountains</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.rivers}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, rivers: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Rivers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.lakes}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, lakes: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Lakes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={featureEraserSettings.targets.forests}
                    onCheckedChange={(v) =>
                      setFeatureEraserSettings({
                        targets: { ...featureEraserSettings.targets, forests: v },
                      })
                    }
                  />
                  <span className="text-xs text-ink-300">Forests</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Select Tool Info */}
        {activeTool === 'feature-select' && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-ink-300 uppercase tracking-wide">
              Select Tool
            </h3>
            <p className="text-xs text-ink-500">
              Click on a feature to select it. Drag to move, use handles to resize.
              Press Delete to remove selected feature.
            </p>
          </div>
        )}

        {/* No Tool Selected */}
        {!activeTool && (
          <div className="text-center py-8">
            <p className="text-sm text-ink-500">
              Select a tool to start editing features
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
