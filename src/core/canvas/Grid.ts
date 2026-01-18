import { Graphics, Container } from 'pixi.js';
import type { GridConfig, Bounds } from '@/types';
import { DEFAULT_GRID_CONFIG } from '@/constants';
import { hexToNumber } from '@/utils';

/**
 * Grid renderer for the canvas
 * Renders square or hex grids with optional subdivisions
 */
export class Grid {
  private container: Container;
  private graphics: Graphics;
  private config: GridConfig;
  private lastBounds: Bounds | null = null;
  private lastZoom: number = 1;

  constructor(container: Container, config: Partial<GridConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_GRID_CONFIG, ...config };
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  /**
   * Update grid configuration
   */
  setConfig(config: Partial<GridConfig>): void {
    this.config = { ...this.config, ...config };
    this.lastBounds = null; // Force redraw
  }

  /**
   * Get current configuration
   */
  getConfig(): GridConfig {
    return { ...this.config };
  }

  /**
   * Render the grid for the current viewport
   */
  render(bounds: Bounds, zoom: number): void {
    if (!this.config.visible) {
      this.graphics.clear();
      return;
    }

    // Check if we need to redraw
    if (
      this.lastBounds &&
      this.lastZoom === zoom &&
      this.boundsEqual(this.lastBounds, bounds)
    ) {
      return;
    }

    this.lastBounds = { ...bounds };
    this.lastZoom = zoom;

    this.graphics.clear();

    if (this.config.type === 'square') {
      this.renderSquareGrid(bounds, zoom);
    } else {
      this.renderHexGrid(bounds, zoom);
    }
  }

  /**
   * Render square grid
   */
  private renderSquareGrid(bounds: Bounds, zoom: number): void {
    const { cellSize, color, opacity, showSubdivisions, subdivisions } = this.config;

    // Calculate visible grid range
    const startX = Math.floor(bounds.x / cellSize) * cellSize;
    const startY = Math.floor(bounds.y / cellSize) * cellSize;
    const endX = Math.ceil((bounds.x + bounds.width) / cellSize) * cellSize;
    const endY = Math.ceil((bounds.y + bounds.height) / cellSize) * cellSize;

    const colorNum = hexToNumber(color);

    // Draw subdivision lines (if visible at current zoom)
    if (showSubdivisions && zoom > 0.5) {
      const subSize = cellSize / subdivisions;
      const subOpacity = opacity * 0.3 * Math.min(1, (zoom - 0.5) * 2);

      this.graphics.setStrokeStyle({
        width: 1 / zoom,
        color: colorNum,
        alpha: subOpacity,
      });

      for (let x = startX; x <= endX; x += subSize) {
        if (x % cellSize !== 0) {
          this.graphics.moveTo(x, startY);
          this.graphics.lineTo(x, endY);
        }
      }

      for (let y = startY; y <= endY; y += subSize) {
        if (y % cellSize !== 0) {
          this.graphics.moveTo(startX, y);
          this.graphics.lineTo(endX, y);
        }
      }

      this.graphics.stroke();
    }

    // Draw main grid lines
    this.graphics.setStrokeStyle({
      width: 1 / zoom,
      color: colorNum,
      alpha: opacity,
    });

    for (let x = startX; x <= endX; x += cellSize) {
      this.graphics.moveTo(x, startY);
      this.graphics.lineTo(x, endY);
    }

    for (let y = startY; y <= endY; y += cellSize) {
      this.graphics.moveTo(startX, y);
      this.graphics.lineTo(endX, y);
    }

    this.graphics.stroke();
  }

  /**
   * Render hexagonal grid
   */
  private renderHexGrid(bounds: Bounds, zoom: number): void {
    const { cellSize, color, opacity } = this.config;

    const colorNum = hexToNumber(color);
    const hexWidth = cellSize * 2;
    const hexHeight = cellSize * Math.sqrt(3);
    const horizSpacing = hexWidth * 0.75;
    const vertSpacing = hexHeight;

    const startCol = Math.floor(bounds.x / horizSpacing) - 1;
    const endCol = Math.ceil((bounds.x + bounds.width) / horizSpacing) + 1;
    const startRow = Math.floor(bounds.y / vertSpacing) - 1;
    const endRow = Math.ceil((bounds.y + bounds.height) / vertSpacing) + 1;

    this.graphics.setStrokeStyle({
      width: 1 / zoom,
      color: colorNum,
      alpha: opacity,
    });

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const centerX = col * horizSpacing;
        const centerY = row * vertSpacing + (col % 2 === 1 ? vertSpacing / 2 : 0);

        this.drawHexagon(centerX, centerY, cellSize);
      }
    }

    this.graphics.stroke();
  }

  /**
   * Draw a single hexagon
   */
  private drawHexagon(cx: number, cy: number, size: number): void {
    const points: [number, number][] = [];

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      points.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
    }

    this.graphics.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1; i < 6; i++) {
      this.graphics.lineTo(points[i]![0], points[i]![1]);
    }
    this.graphics.lineTo(points[0]![0], points[0]![1]);
  }

  /**
   * Snap a world position to the nearest grid point
   */
  snapToGrid(x: number, y: number): { x: number; y: number } {
    if (!this.config.snapToGrid) {
      return { x, y };
    }

    if (this.config.type === 'square') {
      return {
        x: Math.round(x / this.config.cellSize) * this.config.cellSize,
        y: Math.round(y / this.config.cellSize) * this.config.cellSize,
      };
    } else {
      // Hex grid snapping (approximate)
      const hexWidth = this.config.cellSize * 2;
      const hexHeight = this.config.cellSize * Math.sqrt(3);
      const horizSpacing = hexWidth * 0.75;

      const col = Math.round(x / horizSpacing);
      const row = Math.round((y - (col % 2 === 1 ? hexHeight / 2 : 0)) / hexHeight);

      return {
        x: col * horizSpacing,
        y: row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0),
      };
    }
  }

  /**
   * Compare two bounds for equality
   */
  private boundsEqual(a: Bounds, b: Bounds): boolean {
    return (
      Math.abs(a.x - b.x) < 1 &&
      Math.abs(a.y - b.y) < 1 &&
      Math.abs(a.width - b.width) < 1 &&
      Math.abs(a.height - b.height) < 1
    );
  }

  /**
   * Destroy the grid
   */
  destroy(): void {
    this.graphics.destroy();
  }
}
