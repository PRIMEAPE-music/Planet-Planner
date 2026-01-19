import { Container } from 'pixi.js';
import { TerrainRenderer } from './TerrainRenderer';
import { LayerContainer } from '../layers/Layer';
import type { Layer as LayerData } from '@/types';
import type { BiomeType, TerrainStyleSettings } from './types';

/**
 * Specialized layer for terrain rendering
 */
export class TerrainLayer extends LayerContainer {
  private terrainRenderer: TerrainRenderer | null = null;
  private terrainContainer: Container;

  constructor(data: LayerData) {
    super(data);

    this.terrainContainer = new Container();
    this.terrainContainer.label = 'terrain-render';
    this.contentContainer.addChild(this.terrainContainer);
  }

  /**
   * Initialize terrain renderer
   */
  initRenderer(width: number, height: number, cellSize: number = 16): void {
    this.terrainRenderer = new TerrainRenderer(this.terrainContainer, {
      width: Math.ceil(width / cellSize),
      height: Math.ceil(height / cellSize),
      cellSize,
    });
  }

  /**
   * Generate terrain
   */
  async generateTerrain(seed?: number): Promise<void> {
    if (!this.terrainRenderer) return;
    await this.terrainRenderer.generate(seed);
    this.markDirty();
  }

  /**
   * Set terrain style
   */
  setStyle(style: Partial<TerrainStyleSettings>): void {
    this.terrainRenderer?.setStyle(style);
  }

  /**
   * Get terrain style
   */
  getStyle(): TerrainStyleSettings | null {
    return this.terrainRenderer?.getStyle() ?? null;
  }

  /**
   * Get biome at position
   */
  getBiomeAt(x: number, y: number): BiomeType | null {
    return this.terrainRenderer?.getBiomeAt(x, y) ?? null;
  }

  /**
   * Get elevation at position
   */
  getElevationAt(x: number, y: number): number {
    return this.terrainRenderer?.getElevationAt(x, y) ?? 0;
  }

  /**
   * Paint biome
   */
  paintBiome(x: number, y: number, biome: BiomeType, radius: number): void {
    this.terrainRenderer?.paintBiome(x, y, biome, radius);
    this.markDirty();
  }

  /**
   * Modify elevation
   */
  modifyElevation(x: number, y: number, delta: number, radius: number): void {
    this.terrainRenderer?.modifyElevation(x, y, delta, radius);
    this.markDirty();
  }

  /**
   * Re-render terrain
   */
  async rerender(): Promise<void> {
    await this.terrainRenderer?.render();
  }

  /**
   * Get terrain renderer
   */
  getRenderer(): TerrainRenderer | null {
    return this.terrainRenderer;
  }

  /**
   * Override destroy to cleanup terrain renderer
   */
  destroy(): void {
    this.terrainRenderer?.destroy();
    super.destroy();
  }
}
