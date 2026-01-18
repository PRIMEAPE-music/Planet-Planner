import { Container } from 'pixi.js';
import type { Vector2, Viewport, CameraConfig, Bounds } from '@/types';
import { DEFAULT_CAMERA_CONFIG, DEFAULT_VIEWPORT } from '@/constants';
import { clamp, vec2Lerp, vec2 } from '@/utils';

/**
 * Camera class managing viewport transformations
 * Handles pan, zoom, and coordinate conversions
 */
export class Camera {
  private container: Container;
  private config: CameraConfig;
  private viewport: Viewport;
  private targetCenter: Vector2;
  private targetZoom: number;
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  constructor(container: Container, config: Partial<CameraConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.viewport = { ...DEFAULT_VIEWPORT };
    this.targetCenter = { ...this.viewport.center };
    this.targetZoom = this.viewport.zoom;
  }

  /**
   * Update screen dimensions (call on resize)
   */
  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.updateBounds();
  }

  /**
   * Get current viewport state
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.viewport.zoom;
  }

  /**
   * Get current center position
   */
  getCenter(): Vector2 {
    return { ...this.viewport.center };
  }

  /**
   * Set zoom level (with optional focal point)
   */
  setZoom(zoom: number, focalPoint?: Vector2): void {
    const newZoom = clamp(zoom, this.config.minZoom, this.config.maxZoom);

    if (focalPoint && this.config.smoothZoom) {
      // Zoom toward focal point
      const worldFocal = this.screenToWorld(focalPoint);
      this.targetZoom = newZoom;

      // Adjust center to keep focal point stationary
      const zoomRatio = newZoom / this.viewport.zoom;
      this.targetCenter = {
        x: worldFocal.x - (worldFocal.x - this.viewport.center.x) / zoomRatio,
        y: worldFocal.y - (worldFocal.y - this.viewport.center.y) / zoomRatio,
      };
    } else {
      this.targetZoom = newZoom;
      if (!this.config.smoothZoom) {
        this.viewport.zoom = newZoom;
        this.applyTransform();
      }
    }
  }

  /**
   * Zoom by delta amount (for scroll wheel)
   */
  zoomBy(delta: number, focalPoint?: Vector2): void {
    const newZoom = this.viewport.zoom * (1 - delta * this.config.zoomSpeed * 100);
    this.setZoom(newZoom, focalPoint);
  }

  /**
   * Set center position
   */
  setCenter(center: Vector2): void {
    this.targetCenter = { ...center };
    if (!this.config.smoothPan) {
      this.viewport.center = { ...center };
      this.applyTransform();
    }
  }

  /**
   * Pan by delta amount
   */
  panBy(delta: Vector2): void {
    this.setCenter({
      x: this.viewport.center.x - delta.x / this.viewport.zoom,
      y: this.viewport.center.y - delta.y / this.viewport.zoom,
    });
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screen: Vector2): Vector2 {
    return {
      x: (screen.x - this.screenWidth / 2) / this.viewport.zoom + this.viewport.center.x,
      y: (screen.y - this.screenHeight / 2) / this.viewport.zoom + this.viewport.center.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(world: Vector2): Vector2 {
    return {
      x: (world.x - this.viewport.center.x) * this.viewport.zoom + this.screenWidth / 2,
      y: (world.y - this.viewport.center.y) * this.viewport.zoom + this.screenHeight / 2,
    };
  }

  /**
   * Fit view to show specified bounds
   */
  fitToBounds(bounds: Bounds, padding: number = 0.1): void {
    const paddedWidth = bounds.width * (1 + padding * 2);
    const paddedHeight = bounds.height * (1 + padding * 2);

    const zoomX = this.screenWidth / paddedWidth;
    const zoomY = this.screenHeight / paddedHeight;
    const zoom = Math.min(zoomX, zoomY);

    this.setZoom(zoom);
    this.setCenter({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
  }

  /**
   * Reset to default view
   */
  reset(): void {
    this.setZoom(1);
    this.setCenter(vec2(0, 0));
  }

  /**
   * Update camera (call each frame for smooth movement)
   */
  update(deltaTime: number): boolean {
    let changed = false;
    const damping = 1 - Math.pow(this.config.damping, deltaTime * 60);

    // Smooth zoom
    if (Math.abs(this.viewport.zoom - this.targetZoom) > 0.0001) {
      this.viewport.zoom = this.viewport.zoom + (this.targetZoom - this.viewport.zoom) * damping;
      changed = true;
    } else if (this.viewport.zoom !== this.targetZoom) {
      this.viewport.zoom = this.targetZoom;
      changed = true;
    }

    // Smooth pan
    const centerDist = Math.abs(this.viewport.center.x - this.targetCenter.x) +
                       Math.abs(this.viewport.center.y - this.targetCenter.y);
    if (centerDist > 0.01) {
      this.viewport.center = vec2Lerp(this.viewport.center, this.targetCenter, damping);
      changed = true;
    } else if (
      this.viewport.center.x !== this.targetCenter.x ||
      this.viewport.center.y !== this.targetCenter.y
    ) {
      this.viewport.center = { ...this.targetCenter };
      changed = true;
    }

    if (changed) {
      this.applyTransform();
      this.updateBounds();
    }

    return changed;
  }

  /**
   * Apply current transform to container
   */
  private applyTransform(): void {
    this.container.scale.set(this.viewport.zoom);
    this.container.position.set(
      this.screenWidth / 2 - this.viewport.center.x * this.viewport.zoom,
      this.screenHeight / 2 - this.viewport.center.y * this.viewport.zoom
    );
  }

  /**
   * Update viewport bounds
   */
  private updateBounds(): void {
    const halfWidth = this.screenWidth / 2 / this.viewport.zoom;
    const halfHeight = this.screenHeight / 2 / this.viewport.zoom;

    this.viewport.bounds = {
      x: this.viewport.center.x - halfWidth,
      y: this.viewport.center.y - halfHeight,
      width: halfWidth * 2,
      height: halfHeight * 2,
    };
  }
}
