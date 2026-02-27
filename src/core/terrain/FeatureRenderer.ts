import { Container, Graphics } from 'pixi.js';
import type {
  FeatureGenerationResult,
  River,
  Lake,
  MountainPeak,
} from '@/core/generation/features/types';
import type { Vector2 } from '@/types';
import { DEFAULT_CANVAS_DIMENSIONS } from '@/constants';
import { debug } from '@/utils';

/**
 * Feature rendering options
 */
export interface FeatureRenderOptions {
  showMountains: boolean;
  showRivers: boolean;
  showLakes: boolean;
  showForests: boolean;
  riverColor: number;
  lakeColor: number;
  mountainColor: number;
  forestColor: number;
  styleBlend: number; // 0 = realistic, 1 = parchment
}

const DEFAULT_OPTIONS: FeatureRenderOptions = {
  showMountains: true,
  showRivers: true,
  showLakes: true,
  showForests: true,
  riverColor: 0x4a90d9,
  lakeColor: 0x5b9bd5,
  mountainColor: 0x8b7355,
  forestColor: 0x228b22,
  styleBlend: 0.5,
};

/**
 * Renderer for map features (rivers, mountains, lakes, forests)
 */
export class FeatureRenderer {
  private container: Container;
  private riverGraphics: Graphics;
  private lakeGraphics: Graphics;
  private mountainGraphics: Graphics;
  private forestGraphics: Graphics;

  private options: FeatureRenderOptions;
  private result: FeatureGenerationResult | null = null;

  // Scale factor to convert from grid coordinates to world coordinates
  private scale: number = 1;
  // Grid dimensions for calculating scale
  private gridWidth: number = 512;
  private gridHeight: number = 512;

  constructor(parentContainer: Container) {
    this.container = new Container();
    this.container.label = 'features';
    // Set high zIndex to render ABOVE terrain layers
    this.container.zIndex = 1000;
    parentContainer.addChild(this.container);

    // Ensure parent container sorts children by zIndex
    if (!parentContainer.sortableChildren) {
      parentContainer.sortableChildren = true;
    }

    // Create graphics layers (order matters for z-index)
    this.forestGraphics = new Graphics();
    this.forestGraphics.label = 'forests';
    this.container.addChild(this.forestGraphics);

    this.lakeGraphics = new Graphics();
    this.lakeGraphics.label = 'lakes';
    this.container.addChild(this.lakeGraphics);

    this.riverGraphics = new Graphics();
    this.riverGraphics.label = 'rivers';
    this.container.addChild(this.riverGraphics);

    this.mountainGraphics = new Graphics();
    this.mountainGraphics.label = 'mountains';
    this.container.addChild(this.mountainGraphics);

    this.options = { ...DEFAULT_OPTIONS };
  }

  /**
   * Set rendering options
   */
  setOptions(options: Partial<FeatureRenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.updateVisibility();
    if (this.result) {
      this.render();
    }
  }

  /**
   * Update layer visibility
   */
  private updateVisibility(): void {
    this.mountainGraphics.visible = this.options.showMountains;
    this.riverGraphics.visible = this.options.showRivers;
    this.lakeGraphics.visible = this.options.showLakes;
    this.forestGraphics.visible = this.options.showForests;
  }

  /**
   * Set feature generation result and render
   * @param result The generated feature data
   * @param gridWidth Width of the generation grid (defaults to sqrt of elevation data length)
   * @param gridHeight Height of the generation grid (defaults to gridWidth)
   */
  setResult(result: FeatureGenerationResult, gridWidth?: number, gridHeight?: number): void {
    this.result = result;

    // Calculate grid dimensions from elevation data if not provided
    if (gridWidth) {
      this.gridWidth = gridWidth;
      this.gridHeight = gridHeight ?? gridWidth;
    } else if (result.elevationData) {
      this.gridWidth = Math.sqrt(result.elevationData.length);
      this.gridHeight = this.gridWidth;
    }

    // Calculate scale factor to convert from grid space to world space
    // Features are generated in grid coordinates (e.g., 0-512)
    // They need to be scaled to world coordinates (e.g., 0-4096)
    this.scale = DEFAULT_CANVAS_DIMENSIONS.width / this.gridWidth;

    debug.log(`[FeatureRenderer] Grid: ${this.gridWidth}x${this.gridHeight}, Scale: ${this.scale}`);

    this.render();
  }

  /**
   * Clear all features
   */
  clear(): void {
    this.riverGraphics.clear();
    this.lakeGraphics.clear();
    this.mountainGraphics.clear();
    this.forestGraphics.clear();
    this.result = null;
  }

  /**
   * Render all features
   */
  render(): void {
    if (!this.result) return;

    this.renderForests();
    this.renderLakes();
    this.renderRivers();
    this.renderMountains();
  }

  /**
   * Render rivers as curved lines
   */
  private renderRivers(): void {
    this.riverGraphics.clear();
    if (!this.result || !this.options.showRivers) return;

    const { styleBlend } = this.options;
    const s = this.scale;

    // Parchment style: darker, more ink-like
    const realisticColor = 0x4a90d9;
    const parchmentColor = 0x2c5f99;
    const color = this.lerpColor(realisticColor, parchmentColor, styleBlend);

    for (const river of this.result.rivers) {
      if (river.path.length < 2) continue;

      // Draw river with varying width
      for (let i = 1; i < river.path.length; i++) {
        const prev = river.path[i - 1];
        const curr = river.path[i];
        if (!prev || !curr) continue;

        const widthValue = river.widths[i] ?? 1;
        // Scale width by scale factor to maintain visual consistency
        const width = Math.max(0.5 * s, widthValue * s * (1 - styleBlend * 0.3));

        this.riverGraphics
          .moveTo(prev.x * s, prev.y * s)
          .lineTo(curr.x * s, curr.y * s)
          .stroke({ width, color, cap: 'round', join: 'round' });
      }

      // Add parchment-style bank lines
      if (styleBlend > 0.3) {
        this.drawRiverBanks(river, styleBlend);
      }
    }
  }

  /**
   * Draw parchment-style river banks
   */
  private drawRiverBanks(river: River, styleBlend: number): void {
    const bankColor = 0x1a1a1a;
    const alpha = styleBlend * 0.3;
    const s = this.scale;

    for (let i = 1; i < river.path.length; i += 3) {
      const curr = river.path[i];
      const prev = river.path[i - 1];
      if (!curr || !prev) continue;

      const widthValue = river.widths[i] ?? 1;
      const width = widthValue * 1.5 * s;

      // Small perpendicular lines to indicate banks
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const perpX = -dy / len;
      const perpY = dx / len;

      const cx = curr.x * s;
      const cy = curr.y * s;

      this.riverGraphics
        .moveTo(cx + perpX * width, cy + perpY * width)
        .lineTo(cx + perpX * width * 1.5, cy + perpY * width * 1.5)
        .stroke({ width: 0.5 * s, color: bankColor, alpha });
    }
  }

  /**
   * Render lakes
   */
  private renderLakes(): void {
    this.lakeGraphics.clear();
    if (!this.result || !this.options.showLakes) return;

    const { styleBlend } = this.options;
    const s = this.scale;
    const realisticColor = 0x5b9bd5;
    const parchmentColor = 0x8bb8d9;
    const fillColor = this.lerpColor(realisticColor, parchmentColor, styleBlend);

    for (const lake of this.result.lakes) {
      if (lake.boundary.length < 3) continue;

      // Draw lake fill - scale all boundary points
      this.lakeGraphics.poly(lake.boundary.flatMap(p => [p.x * s, p.y * s]));
      this.lakeGraphics.fill({ color: fillColor, alpha: 0.8 });

      // Draw lake outline
      const outlineColor = styleBlend > 0.5 ? 0x1a1a1a : 0x3a7ab8;
      this.lakeGraphics.stroke({
        width: (styleBlend > 0.5 ? 1 : 0.5) * s,
        color: outlineColor,
        alpha: 0.6,
      });

      // Parchment style: add wave patterns
      if (styleBlend > 0.3) {
        this.drawLakeWaves(lake, styleBlend);
      }
    }
  }

  /**
   * Draw parchment-style wave patterns on lakes
   */
  private drawLakeWaves(lake: Lake, styleBlend: number): void {
    const waveColor = 0x1a1a1a;
    const alpha = styleBlend * 0.2;
    const s = this.scale;
    const spacing = 8; // in grid space

    // Draw horizontal wave lines (work in grid space, then scale)
    const minY = Math.min(...lake.boundary.map(p => p.y));
    const maxY = Math.max(...lake.boundary.map(p => p.y));

    for (let y = minY + spacing; y < maxY - spacing; y += spacing) {
      const intersections = this.findLakeIntersections(lake, y);

      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x1 = intersections[i];
        const x2 = intersections[i + 1];
        if (x1 === undefined || x2 === undefined) continue;

        // Draw wavy line - scale all coordinates
        this.lakeGraphics.moveTo((x1 + 2) * s, y * s);
        for (let x = x1 + 4; x < x2 - 2; x += 4) {
          const waveY = y + Math.sin(x * 0.3) * 1;
          this.lakeGraphics.lineTo(x * s, waveY * s);
        }
        this.lakeGraphics.stroke({ width: 0.3 * s, color: waveColor, alpha });
      }
    }
  }

  /**
   * Find x-intersections of lake boundary at given y
   */
  private findLakeIntersections(lake: Lake, y: number): number[] {
    const intersections: number[] = [];
    const boundary = lake.boundary;

    for (let i = 0; i < boundary.length; i++) {
      const p1 = boundary[i];
      const p2 = boundary[(i + 1) % boundary.length];
      if (!p1 || !p2) continue;

      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        const t = (y - p1.y) / (p2.y - p1.y);
        intersections.push(p1.x + t * (p2.x - p1.x));
      }
    }

    return intersections.sort((a, b) => a - b);
  }

  /**
   * Render mountain peaks
   */
  private renderMountains(): void {
    this.mountainGraphics.clear();
    if (!this.result || !this.options.showMountains) return;

    const { styleBlend } = this.options;

    for (const peak of this.result.peaks) {
      if (styleBlend > 0.3) {
        this.drawParchmentMountain(peak, styleBlend);
      } else {
        this.drawRealisticMountain(peak, styleBlend);
      }
    }
  }

  /**
   * Draw realistic mountain shading
   */
  private drawRealisticMountain(peak: MountainPeak, styleBlend: number): void {
    const s = this.scale;
    // Just a subtle highlight for realistic mode
    const color = 0xffffff;
    const alpha = (1 - styleBlend) * 0.15 * peak.elevation;

    this.mountainGraphics.circle(peak.position.x * s, peak.position.y * s, peak.radius * 0.3 * s);
    this.mountainGraphics.fill({ color, alpha });
  }

  /**
   * Draw parchment-style mountain symbol
   */
  private drawParchmentMountain(peak: MountainPeak, styleBlend: number): void {
    const { position, radius, elevation } = peak;
    const s = this.scale;
    const color = 0x1a1a1a;
    const alpha = styleBlend * 0.6;
    const height = radius * elevation * 1.5 * s;

    // Scale position
    const px = position.x * s;
    const py = position.y * s;
    const scaledRadius = radius * s;

    // Draw mountain triangle
    this.mountainGraphics
      .moveTo(px, py - height)
      .lineTo(px - scaledRadius * 0.6, py + scaledRadius * 0.3)
      .lineTo(px + scaledRadius * 0.6, py + scaledRadius * 0.3)
      .closePath()
      .stroke({ width: 1 * s, color, alpha });

    // Snow cap for high peaks
    if (elevation > 0.8) {
      const snowHeight = height * 0.3;
      this.mountainGraphics
        .moveTo(px, py - height)
        .lineTo(px - scaledRadius * 0.2, py - height + snowHeight)
        .lineTo(px + scaledRadius * 0.2, py - height + snowHeight)
        .closePath()
        .fill({ color: 0xffffff, alpha: alpha * 0.8 });
    }
  }

  /**
   * Render forest density
   */
  private renderForests(): void {
    this.forestGraphics.clear();
    if (!this.result || !this.options.showForests) return;

    const { styleBlend } = this.options;

    for (const forest of this.result.forests) {
      if (styleBlend > 0.3) {
        this.drawParchmentForest(forest.boundary, forest.averageDensity, styleBlend);
      }
      // Realistic forest is handled by biome colors
    }
  }

  /**
   * Draw parchment-style forest symbols
   */
  private drawParchmentForest(
    boundary: Vector2[],
    density: number,
    styleBlend: number
  ): void {
    if (boundary.length < 3) return;

    const s = this.scale;
    const color = 0x1a1a1a;
    const alpha = styleBlend * 0.4 * density;

    // Calculate bounding box in grid space
    const minX = Math.min(...boundary.map(p => p.x));
    const maxX = Math.max(...boundary.map(p => p.x));
    const minY = Math.min(...boundary.map(p => p.y));
    const maxY = Math.max(...boundary.map(p => p.y));

    // Draw tree symbols (work in grid space, then scale on render)
    const spacing = 12 / density;

    // Use seeded random for consistent tree placement
    let seed = Math.floor(minX * 1000 + minY * 1000);
    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let y = minY; y < maxY; y += spacing) {
      for (let x = minX; x < maxX; x += spacing) {
        // Check if point is inside boundary (simple ray casting)
        if (!this.isPointInPolygon({ x, y }, boundary)) continue;

        // Draw small tree symbol - scale all coordinates
        const treeHeight = (4 + seededRandom() * 3) * s;
        const sx = x * s;
        const sy = y * s;
        this.forestGraphics
          .moveTo(sx, sy)
          .lineTo(sx - 2 * s, sy + treeHeight)
          .lineTo(sx + 2 * s, sy + treeHeight)
          .closePath()
          .fill({ color, alpha: alpha * 0.6 });
      }
    }
  }

  /**
   * Check if point is inside polygon
   */
  private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const pi = polygon[i];
      const pj = polygon[j];
      if (!pi || !pj) continue;

      const xi = pi.x, yi = pi.y;
      const xj = pj.x, yj = pj.y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Linear interpolation between colors
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get container
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
