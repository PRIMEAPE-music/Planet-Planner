import type { Container } from 'pixi.js';
import type { Layer, CreateLayerOptions } from '@/types';

// --- State commands (pure data, no PixiJS refs) ---

export interface LayerCreateCommand {
  kind: 'layer:create';
  layerId: string;
  options: CreateLayerOptions;
  insertIndex: number;
  previousActiveId: string | null;
  previousSelectedIds: string[];
}

export interface LayerDeleteCommand {
  kind: 'layer:delete';
  layerId: string;
  layerSnapshot: Layer;
  rootOrderIndex: number;
  previousActiveId: string | null;
  previousSelectedIds: string[];
  /** Saved PixiJS children so graphics survive the round-trip */
  displayChildren: Container[];
}

export interface LayerDuplicateCommand {
  kind: 'layer:duplicate';
  sourceLayerId: string;
  newLayerId: string;
  insertIndex: number;
  previousActiveId: string | null;
  previousSelectedIds: string[];
}

export interface LayerReorderCommand {
  kind: 'layer:reorder';
  previousOrder: string[];
  newOrder: string[];
}

export interface LayerPropertyCommand {
  kind: 'layer:property';
  layerId: string;
  property: keyof Layer;
  previousValue: unknown;
  newValue: unknown;
}

// --- Graphics commands (hold PixiJS Container refs) ---

export interface GraphicsAddCommand {
  kind: 'graphics:add';
  operationType: string;
  layerId: string;
  graphics: Container;
}

export interface GraphicsRemoveCommand {
  kind: 'graphics:remove';
  operationType: string;
  layerId: string;
  graphics: Container;
}

// --- Union ---

export type HistoryCommand =
  | LayerCreateCommand
  | LayerDeleteCommand
  | LayerDuplicateCommand
  | LayerReorderCommand
  | LayerPropertyCommand
  | GraphicsAddCommand
  | GraphicsRemoveCommand;

// --- Label helper ---

export function getCommandLabel(cmd: HistoryCommand): string {
  switch (cmd.kind) {
    case 'layer:create':
      return 'Create Layer';
    case 'layer:delete':
      return 'Delete Layer';
    case 'layer:duplicate':
      return 'Duplicate Layer';
    case 'layer:reorder':
      return 'Reorder Layers';
    case 'layer:property':
      return `Change ${String(cmd.property)}`;
    case 'graphics:add':
      return cmd.operationType;
    case 'graphics:remove':
      return `Remove ${cmd.operationType}`;
  }
}
