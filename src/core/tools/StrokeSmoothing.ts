import type { Vector2 } from '@/types';
import { vec2Sub, vec2Length, vec2Lerp } from '@/utils';

/**
 * Configuration for stroke smoothing
 */
export interface SmoothingConfig {
  /** Enable smoothing */
  enabled: boolean;
  /** Smoothing factor (0-1, higher = smoother) */
  smoothing: number;
  /** Minimum distance between points */
  minDistance: number;
  /** Enable pressure smoothing */
  smoothPressure: boolean;
  /** Pressure smoothing factor */
  pressureSmoothing: number;
}

const DEFAULT_SMOOTHING_CONFIG: SmoothingConfig = {
  enabled: true,
  smoothing: 0.5,
  minDistance: 2,
  smoothPressure: true,
  pressureSmoothing: 0.3,
};

/**
 * Point with pressure information
 */
export interface StrokePoint {
  position: Vector2;
  pressure: number;
  timestamp: number;
}

/**
 * Stroke smoothing processor
 * Uses exponential moving average and Catmull-Rom interpolation
 */
export class StrokeSmoother {
  private config: SmoothingConfig;
  private points: StrokePoint[] = [];
  private smoothedPosition: Vector2 = { x: 0, y: 0 };
  private smoothedPressure: number = 1;
  private isFirstPoint: boolean = true;

  constructor(config: Partial<SmoothingConfig> = {}) {
    this.config = { ...DEFAULT_SMOOTHING_CONFIG, ...config };
  }

  /**
   * Reset the smoother for a new stroke
   */
  reset(): void {
    this.points = [];
    this.smoothedPosition = { x: 0, y: 0 };
    this.smoothedPressure = 1;
    this.isFirstPoint = true;
  }

  /**
   * Add a new point and get smoothed result
   */
  addPoint(position: Vector2, pressure: number = 1): StrokePoint | null {
    const timestamp = Date.now();

    if (this.isFirstPoint) {
      this.smoothedPosition = { ...position };
      this.smoothedPressure = pressure;
      this.isFirstPoint = false;

      const point: StrokePoint = {
        position: { ...position },
        pressure,
        timestamp,
      };
      this.points.push(point);
      return point;
    }

    // Check minimum distance
    const lastPoint = this.points[this.points.length - 1];
    if (!lastPoint) return null;

    const distance = vec2Length(vec2Sub(position, lastPoint.position));

    if (distance < this.config.minDistance) {
      return null;
    }

    // Apply exponential moving average smoothing
    if (this.config.enabled) {
      const alpha = 1 - this.config.smoothing;
      this.smoothedPosition = vec2Lerp(this.smoothedPosition, position, alpha);

      if (this.config.smoothPressure) {
        const pressureAlpha = 1 - this.config.pressureSmoothing;
        this.smoothedPressure =
          this.smoothedPressure + (pressure - this.smoothedPressure) * pressureAlpha;
      } else {
        this.smoothedPressure = pressure;
      }
    } else {
      this.smoothedPosition = { ...position };
      this.smoothedPressure = pressure;
    }

    const point: StrokePoint = {
      position: { ...this.smoothedPosition },
      pressure: this.smoothedPressure,
      timestamp,
    };

    this.points.push(point);
    return point;
  }

  /**
   * Get all recorded points
   */
  getPoints(): StrokePoint[] {
    return [...this.points];
  }

  /**
   * Get current smoothed position
   */
  getSmoothedPosition(): Vector2 {
    return { ...this.smoothedPosition };
  }

  /**
   * Get current smoothed pressure
   */
  getSmoothedPressure(): number {
    return this.smoothedPressure;
  }

  /**
   * Interpolate points using Catmull-Rom spline
   */
  static interpolateCatmullRom(
    points: Vector2[],
    segments: number = 10
  ): Vector2[] {
    if (points.length < 2) return [...points];
    if (points.length === 2) {
      return StrokeSmoother.interpolateLinear(points[0]!, points[1]!, segments);
    }

    const result: Vector2[] = [];

    // Add first point
    result.push({ ...points[0]! });

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[Math.min(points.length - 1, i + 1)]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;

      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const point = StrokeSmoother.catmullRomPoint(p0, p1, p2, p3, t);
        result.push(point);
      }
    }

    return result;
  }

  /**
   * Calculate a point on Catmull-Rom spline
   */
  private static catmullRomPoint(
    p0: Vector2,
    p1: Vector2,
    p2: Vector2,
    p3: Vector2,
    t: number
  ): Vector2 {
    const t2 = t * t;
    const t3 = t2 * t;

    const x =
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

    return { x, y };
  }

  /**
   * Linear interpolation between two points
   */
  private static interpolateLinear(
    p1: Vector2,
    p2: Vector2,
    segments: number
  ): Vector2[] {
    const result: Vector2[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      result.push(vec2Lerp(p1, p2, t));
    }
    return result;
  }

  /**
   * Simplify a path using Ramer-Douglas-Peucker algorithm
   */
  static simplifyPath(points: Vector2[], tolerance: number = 1): Vector2[] {
    if (points.length <= 2) return [...points];

    // Find point with maximum distance
    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0]!;
    const end = points[points.length - 1]!;

    for (let i = 1; i < points.length - 1; i++) {
      const distance = StrokeSmoother.pointLineDistance(points[i]!, start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = StrokeSmoother.simplifyPath(
        points.slice(0, maxIndex + 1),
        tolerance
      );
      const right = StrokeSmoother.simplifyPath(
        points.slice(maxIndex),
        tolerance
      );

      return [...left.slice(0, -1), ...right];
    }

    return [start, end];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private static pointLineDistance(
    point: Vector2,
    lineStart: Vector2,
    lineEnd: Vector2
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;

    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return vec2Length(vec2Sub(point, lineStart));
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
          lengthSquared
      )
    );

    const projection = {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy,
    };

    return vec2Length(vec2Sub(point, projection));
  }
}
