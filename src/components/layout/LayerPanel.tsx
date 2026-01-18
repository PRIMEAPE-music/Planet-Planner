import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import { useLayerStore } from '@/stores';
import { Button } from '@/components/ui';

export function LayerPanel() {
  const layers = useLayerStore(state => state.layers);
  const rootOrder = useLayerStore(state => state.rootOrder);
  const selectedIds = useLayerStore(state => state.selectedIds);
  const createLayer = useLayerStore(state => state.createLayer);
  const deleteLayer = useLayerStore(state => state.deleteLayer);
  const toggleLayerVisibility = useLayerStore(state => state.toggleLayerVisibility);
  const toggleLayerLocked = useLayerStore(state => state.toggleLayerLocked);
  const selectLayer = useLayerStore(state => state.selectLayer);

  return (
    <div className="w-panel bg-ink-900 border-l border-ink-700 flex flex-col h-full">
      <div className="p-4 border-b border-ink-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-parchment-200 font-display text-lg">Layers</h2>
          <Button
            size="sm"
            onClick={() => createLayer({ type: 'terrain' })}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {[...rootOrder].reverse().map(layerId => {
          const layer = layers[layerId];
          if (!layer) return null;

          const isSelected = selectedIds.includes(layerId);

          return (
            <div
              key={layerId}
              className={`
                flex items-center gap-2 p-2 rounded mb-1 cursor-pointer
                ${isSelected ? 'bg-ink-700 ring-1 ring-parchment-500' : 'bg-ink-800 hover:bg-ink-750'}
              `}
              onClick={() => selectLayer(layerId)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layerId);
                }}
                className="p-1 hover:bg-ink-600 rounded"
              >
                {layer.visible ? (
                  <Eye className="h-4 w-4 text-parchment-300" />
                ) : (
                  <EyeOff className="h-4 w-4 text-parchment-600" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerLocked(layerId);
                }}
                className="p-1 hover:bg-ink-600 rounded"
              >
                {layer.locked ? (
                  <Lock className="h-4 w-4 text-parchment-300" />
                ) : (
                  <Unlock className="h-4 w-4 text-parchment-600" />
                )}
              </button>

              <span className="flex-1 text-sm text-parchment-200 truncate">
                {layer.name}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(layerId);
                }}
                className="p-1 hover:bg-red-900 rounded"
              >
                <Trash2 className="h-4 w-4 text-parchment-600 hover:text-red-400" />
              </button>
            </div>
          );
        })}

        {rootOrder.length === 0 && (
          <div className="text-center text-parchment-600 text-sm mt-8">
            No layers yet. Click + to add one.
          </div>
        )}
      </div>
    </div>
  );
}
