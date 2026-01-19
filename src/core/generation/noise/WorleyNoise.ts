import type { Vector2 } from '@/types';

/**
 * Seeded Worley (Cellular) Noise implementation
 * Creates organic cell-like patterns
 */
export class WorleyNoise {
  private seed: number;

  constructor(seed: number = 0) {
    this.seed = seed;
  }

  /**
   * Seeded pseudo-random number generator
   */
  private random(x: number, y: number, seed: number = 0): number {
    // Hash function
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  }

  /**
   * Generate random point in cell
   */
  private cellPoint(cellX: number, cellY: number): Vector2 {
    const r1 = this.random(cellX, cellY, this.seed);
    const r2 = this.random(cellX, cellY, this.seed + 1);
    return {
      x: cellX + r1,
      y: cellY + r2,
    };
  }

  /**
   * Calculate Worley noise at point
   * @param x X coordinate
   * @param y Y coordinate
   * @param distanceType Distance metric to use
   * @returns Value in range [0, 1]
   */
  noise2D(
    x: number,
    y: number,
    distanceType: 'euclidean' | 'manhattan' | 'chebyshev' = 'euclidean'
  ): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    let minDist = Infinity;

    // Check surrounding cells (3x3 grid)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = this.cellPoint(cellX + dx, cellY + dy);

        let dist: number;
        switch (distanceType) {
          case 'manhattan':
            dist = Math.abs(x - neighbor.x) + Math.abs(y - neighbor.y);
            break;
          case 'chebyshev':
            dist = Math.max(Math.abs(x - neighbor.x), Math.abs(y - neighbor.y));
            break;
          case 'euclidean':
          default: {
            const dx2 = x - neighbor.x;
            const dy2 = y - neighbor.y;
            dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          }
        }

        minDist = Math.min(minDist, dist);
      }
    }

    // Normalize to [0, 1] (approximate)
    return Math.min(1, minDist);
  }

  /**
   * Get F1-F2 difference (creates cell boundaries)
   */
  noise2D_F1F2(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    let dist1 = Infinity;
    let dist2 = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = this.cellPoint(cellX + dx, cellY + dy);
        const ddx = x - neighbor.x;
        const ddy = y - neighbor.y;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);

        if (dist < dist1) {
          dist2 = dist1;
          dist1 = dist;
        } else if (dist < dist2) {
          dist2 = dist;
        }
      }
    }

    return dist2 - dist1;
  }

  /**
   * Get cell ID at point (for plate assignments)
   */
  getCellId(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);

    let minDist = Infinity;
    let closestCell = { x: 0, y: 0 };

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighbor = this.cellPoint(cellX + dx, cellY + dy);
        const ddx = x - neighbor.x;
        const ddy = y - neighbor.y;
        const dist = ddx * ddx + ddy * ddy;

        if (dist < minDist) {
          minDist = dist;
          closestCell = { x: cellX + dx, y: cellY + dy };
        }
      }
    }

    // Return unique ID for cell
    return (closestCell.x * 73856093) ^ (closestCell.y * 19349663);
  }

  /**
   * Update seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }
}
