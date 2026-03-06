import { SimplexNoise } from '../noise/SimplexNoise';
import type { Vector2 } from '@/types';
import type {
  RiverGenerationConfig,
  River,
} from './types';

/**
 * Default river generation configuration
 */
export const DEFAULT_RIVER_CONFIG: RiverGenerationConfig = {
  enabled: true,
  flowThreshold: 50,
  minLength: 30,
  maxRivers: 20,
  widthMultiplier: 1.0,
  erosionStrength: 0.1,
  meanderFactor: 0.3,
  generateTributaries: true,
  tributaryThreshold: 0.3,
};

/**
 * River names for generation
 */
const RIVER_PREFIXES = [
  'Silver', 'Golden', 'Crystal', 'Shadow', 'Thunder', 'Whisper',
  'Ancient', 'Misty', 'Frozen', 'Emerald', 'Sapphire', 'Ruby',
];

const RIVER_SUFFIXES = [
  'River', 'Stream', 'Creek', 'Brook', 'Waters', 'Flow',
  'Run', 'Rapids', 'Falls', 'Spring',
];

/**
 * River system generator using flow accumulation
 */
export class RiverGenerator {
  private config: RiverGenerationConfig;
  private noise: SimplexNoise;
  private width: number;
  private height: number;
  private rng: () => number;

  // Flow network data
  private flowDirection: Int32Array;
  private flowAccumulation: Float32Array;

  constructor(
    config: RiverGenerationConfig,
    width: number,
    height: number,
    seed: number
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.noise = new SimplexNoise(seed + 5000);
    this.rng = this.createRng(seed + 5000);

    this.flowDirection = new Int32Array(width * height);
    this.flowAccumulation = new Float32Array(width * height);
  }

  /**
   * Create seeded random number generator
   */
  private createRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Generate river system
   */
  generate(
    landMask: Uint8Array,
    elevationData: Float32Array
  ): { rivers: River[]; erosion: Float32Array } {
    // Step 1: Calculate flow directions
    this.calculateFlowDirections(elevationData, landMask);

    // Step 2: Calculate flow accumulation
    this.calculateFlowAccumulation(landMask);

    // Step 3: Extract river paths
    const rivers = this.extractRivers(landMask, elevationData);

    // Step 4: Apply erosion
    const erosion = this.calculateErosion(rivers, elevationData);

    // Step 5: Add meandering
    this.applyMeandering(rivers);

    return { rivers, erosion };
  }

  /**
   * Calculate flow direction for each cell (D8 algorithm)
   */
  private calculateFlowDirections(
    elevationData: Float32Array,
    landMask: Uint8Array
  ): void {
    const { width, height } = this;

    // D8 neighbor offsets (8 directions)
    const neighbors = [
      { dx: -1, dy: -1, dist: Math.SQRT2 },
      { dx: 0, dy: -1, dist: 1 },
      { dx: 1, dy: -1, dist: Math.SQRT2 },
      { dx: -1, dy: 0, dist: 1 },
      { dx: 1, dy: 0, dist: 1 },
      { dx: -1, dy: 1, dist: Math.SQRT2 },
      { dx: 0, dy: 1, dist: 1 },
      { dx: 1, dy: 1, dist: Math.SQRT2 },
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Skip water cells
        if (landMask[idx] !== 1) {
          this.flowDirection[idx] = -1; // No flow
          continue;
        }

        const currentElevation = elevationData[idx] ?? 0.5;
        let steepestSlope = 0;
        let flowTarget = -1;

        // Find steepest downhill neighbor
        for (const { dx, dy, dist } of neighbors) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const ni = ny * width + nx;
          const neighborElevation = elevationData[ni] ?? 0.5;
          const slope = (currentElevation - neighborElevation) / dist;

          if (slope > steepestSlope) {
            steepestSlope = slope;
            flowTarget = ni;
          }
        }

        // If no downhill, flow to water if adjacent
        if (flowTarget === -1) {
          for (const { dx, dy } of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

            const ni = ny * width + nx;
            if (landMask[ni] === 0) {
              flowTarget = ni;
              break;
            }
          }
        }

        this.flowDirection[idx] = flowTarget;
      }
    }
  }

  /**
   * Calculate flow accumulation using recursive upstream traversal
   */
  private calculateFlowAccumulation(landMask: Uint8Array): void {
    const size = this.width * this.height;

    // Initialize all land cells with base flow of 1
    for (let i = 0; i < size; i++) {
      this.flowAccumulation[i] = landMask[i] === 1 ? 1 : 0;
    }

    // Topological-sort BFS using flat typed arrays (no per-pixel array allocations)
    // Count in-degree: how many cells flow into each cell
    const inDegree = new Uint16Array(size);
    for (let i = 0; i < size; i++) {
      const target = this.flowDirection[i]!;
      if (target >= 0 && target < size && landMask[i] === 1) {
        inDegree[target] = inDegree[target]! + 1;
      }
    }

    // Seed queue with source cells (in-degree 0, land only)
    const queue: number[] = [];
    let queueHead = 0;
    for (let i = 0; i < size; i++) {
      if (landMask[i] === 1 && inDegree[i] === 0) {
        queue.push(i);
      }
    }

    // Process in topological order: propagate flow downstream
    while (queueHead < queue.length) {
      const idx = queue[queueHead++]!;
      const target = this.flowDirection[idx]!;

      if (target >= 0 && target < size) {
        this.flowAccumulation[target] = this.flowAccumulation[target]! + this.flowAccumulation[idx]!;
        inDegree[target] = inDegree[target]! - 1;
        if (inDegree[target]! === 0) {
          queue.push(target);
        }
      }
    }
  }

  /**
   * Extract river paths from flow accumulation
   */
  private extractRivers(
    landMask: Uint8Array,
    _elevationData: Float32Array
  ): River[] {
    const { width, height } = this;
    const { flowThreshold, minLength, maxRivers } = this.config;
    const rivers: River[] = [];

    // Find river mouths (high flow cells adjacent to water)
    const mouths: { idx: number; flow: number }[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (landMask[idx] !== 1) continue;
        const flow = this.flowAccumulation[idx] ?? 0;
        if (flow < flowThreshold) continue;

        // Check if adjacent to water
        let adjacentToWater = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = (y + dy) * width + (x + dx);
            if (landMask[ni] === 0) {
              adjacentToWater = true;
              break;
            }
          }
          if (adjacentToWater) break;
        }

        if (adjacentToWater) {
          mouths.push({ idx, flow });
        }
      }
    }

    // Sort by flow (largest first)
    mouths.sort((a, b) => b.flow - a.flow);

    // Extract rivers from largest mouths
    const usedCells = new Set<number>();
    let riverCount = 0;

    for (const mouth of mouths) {
      if (riverCount >= maxRivers) break;
      if (usedCells.has(mouth.idx)) continue;

      const river = this.traceRiverUpstream(
        mouth.idx,
        landMask,
        usedCells
      );

      if (river && river.path.length >= minLength) {
        rivers.push(river);
        riverCount++;
      }
    }

    return rivers;
  }

  /**
   * Trace river path upstream from mouth
   */
  private traceRiverUpstream(
    mouthIdx: number,
    landMask: Uint8Array,
    usedCells: Set<number>
  ): River | null {
    const { width } = this;
    const path: Vector2[] = [];
    const widths: number[] = [];
    const visited = new Set<number>();

    let currentIdx = mouthIdx;
    let maxFlow = 0;

    while (currentIdx >= 0) {
      if (visited.has(currentIdx)) break;
      visited.add(currentIdx);
      usedCells.add(currentIdx);

      const x = currentIdx % width;
      const y = Math.floor(currentIdx / width);
      const flow = this.flowAccumulation[currentIdx] ?? 0;

      path.push({ x, y });
      widths.push(this.calculateRiverWidth(flow));
      maxFlow = Math.max(maxFlow, flow);

      // Find upstream cell with highest flow
      let bestUpstream = -1;
      let bestFlow = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;

          const ni = ny * width + nx;
          if (visited.has(ni)) continue;
          if (landMask[ni] !== 1) continue;

          // Check if this cell flows to current
          if (this.flowDirection[ni] === currentIdx) {
            const upFlow = this.flowAccumulation[ni] ?? 0;
            if (upFlow > bestFlow) {
              bestFlow = upFlow;
              bestUpstream = ni;
            }
          }
        }
      }

      // Stop if flow is too low
      if (bestFlow < this.config.flowThreshold * 0.5) break;

      currentIdx = bestUpstream;
    }

    if (path.length < 2) return null;

    // Reverse path (source to mouth)
    path.reverse();
    widths.reverse();

    const source = path[0];
    const mouth = path[path.length - 1];

    if (!source || !mouth) return null;

    return {
      id: `river-${this.rng().toString(36).slice(2, 8)}`,
      name: this.generateRiverName(),
      path,
      widths,
      source,
      mouth,
      length: path.length,
      maxFlow,
      tributaries: [],
    };
  }

  /**
   * Calculate river width based on flow
   */
  private calculateRiverWidth(flow: number): number {
    // Logarithmic width scaling
    const baseWidth = Math.log(flow + 1) * 0.5;
    return Math.max(1, baseWidth * this.config.widthMultiplier);
  }

  /**
   * Generate a random river name
   */
  private generateRiverName(): string {
    const prefix = RIVER_PREFIXES[Math.floor(this.rng() * RIVER_PREFIXES.length)];
    const suffix = RIVER_SUFFIXES[Math.floor(this.rng() * RIVER_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
  }

  /**
   * Calculate erosion effect from rivers
   */
  private calculateErosion(
    rivers: River[],
    elevationData: Float32Array
  ): Float32Array {
    const erosion = new Float32Array(this.width * this.height);
    const { erosionStrength } = this.config;

    for (const river of rivers) {
      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths[i] ?? 1;
        if (!point) continue;

        const erosionRadius = width * 2;

        // Erode terrain around river
        const minX = Math.max(0, Math.floor(point.x - erosionRadius));
        const maxX = Math.min(this.width - 1, Math.ceil(point.x + erosionRadius));
        const minY = Math.max(0, Math.floor(point.y - erosionRadius));
        const maxY = Math.min(this.height - 1, Math.ceil(point.y + erosionRadius));

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (dist > erosionRadius) continue;

            const idx = y * this.width + x;
            const falloff = 1 - dist / erosionRadius;
            const erodeAmount = erosionStrength * falloff * (width / 5);

            erosion[idx] = Math.max(erosion[idx] ?? 0, erodeAmount);
          }
        }
      }
    }

    // Apply erosion to elevation
    for (let i = 0; i < elevationData.length; i++) {
      const currentElevation = elevationData[i] ?? 0;
      const erosionAmount = erosion[i] ?? 0;
      elevationData[i] = Math.max(0, currentElevation - erosionAmount);
    }

    return erosion;
  }

  /**
   * Add meandering to river paths
   */
  private applyMeandering(rivers: River[]): void {
    const { meanderFactor } = this.config;
    if (meanderFactor <= 0) return;

    for (const river of rivers) {
      const smoothedPath: Vector2[] = [];
      const smoothedWidths: number[] = [];

      for (let i = 0; i < river.path.length; i++) {
        const point = river.path[i];
        const width = river.widths[i] ?? 1;
        if (!point) continue;

        // Add noise-based offset
        const noiseVal = this.noise.noise2D(
          point.x * 0.05 + i * 0.1,
          point.y * 0.05
        );

        // Perpendicular offset
        let perpX = 0;
        let perpY = 0;

        if (i > 0 && i < river.path.length - 1) {
          const prev = river.path[i - 1];
          const next = river.path[i + 1];
          if (prev && next) {
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              perpX = -dy / len;
              perpY = dx / len;
            }
          }
        }

        const offset = noiseVal * meanderFactor * width * 2;
        smoothedPath.push({
          x: point.x + perpX * offset,
          y: point.y + perpY * offset,
        });
        smoothedWidths.push(width);
      }

      river.path = smoothedPath;
      river.widths = smoothedWidths;
    }
  }

  /**
   * Get flow accumulation data for visualization
   */
  getFlowAccumulation(): Float32Array {
    return this.flowAccumulation;
  }
}
