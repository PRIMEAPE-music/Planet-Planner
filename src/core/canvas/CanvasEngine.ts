import { Application, Container, Graphics } from 'pixi.js';
import { Camera } from './Camera';
import { Grid } from './Grid';
import { InputHandler } from './InputHandler';
import type { Vector2, GridConfig, Viewport, CameraConfig } from '@/types';
import { DEFAULT_CANVAS_DIMENSIONS, CANVAS_CONSTANTS } from '@/constants';

export interface CanvasEngineConfig {
  backgroundColor?: string;
  width?: number;
  height?: number;
  cameraConfig?: Partial<CameraConfig>;
  gridConfig?: Partial<GridConfig>;
}

export interface CanvasEngineCallbacks {
  onViewportChange?: (viewport: Viewport) => void;
  onGridChange?: (config: GridConfig) => void;
  onPointerDown?: (position: Vector2, worldPosition: Vector2) => void;
  onPointerMove?: (position: Vector2, worldPosition: Vector2) => void;
  onPointerUp?: (position: Vector2, worldPosition: Vector2) => void;
}

/**
 * Main canvas engine wrapping Pixi.js
 * Manages rendering, camera, grid, and input
 */
export class CanvasEngine {
  private app: Application;
  private worldContainer: Container;
  private camera: Camera;
  private grid: Grid;
  private inputHandler: InputHandler;
  private callbacks: CanvasEngineCallbacks;
  private isInitialized: boolean = false;
  private isPanning: boolean = false;
  private lastPointerPosition: Vector2 = { x: 0, y: 0 };

  // Background
  private background: Graphics;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor() {
    this.app = new Application();
    this.worldContainer = new Container();
    this.background = new Graphics();
    this.canvasWidth = DEFAULT_CANVAS_DIMENSIONS.width;
    this.canvasHeight = DEFAULT_CANVAS_DIMENSIONS.height;
    this.callbacks = {};

    // These will be properly initialized in init()
    this.camera = null!;
    this.grid = null!;
    this.inputHandler = null!;
  }

  /**
   * Initialize the canvas engine
   */
  async init(
    container: HTMLElement,
    config: CanvasEngineConfig = {},
    callbacks: CanvasEngineCallbacks = {}
  ): Promise<void> {
    if (this.isInitialized) {
      console.warn('CanvasEngine already initialized');
      return;
    }

    this.callbacks = callbacks;
    this.canvasWidth = config.width ?? DEFAULT_CANVAS_DIMENSIONS.width;
    this.canvasHeight = config.height ?? DEFAULT_CANVAS_DIMENSIONS.height;

    // Initialize Pixi Application
    await this.app.init({
      background: config.backgroundColor ?? CANVAS_CONSTANTS.DEFAULT_BACKGROUND_COLOR,
      resizeTo: container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Setup world container
    this.app.stage.addChild(this.worldContainer);

    // Setup background
    this.worldContainer.addChild(this.background);
    this.drawBackground();

    // Setup camera
    this.camera = new Camera(this.worldContainer, config.cameraConfig);
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);

    // Setup grid
    const gridContainer = new Container();
    this.worldContainer.addChild(gridContainer);
    this.grid = new Grid(gridContainer, config.gridConfig);

    // Setup input handler
    this.inputHandler = new InputHandler(
      this.app.canvas as HTMLCanvasElement,
      (screen) => this.camera.screenToWorld(screen)
    );

    this.setupInputHandlers();
    this.setupResizeHandler();

    // Start render loop
    this.app.ticker.add(this.update);

    this.isInitialized = true;

    // Initial viewport update
    this.emitViewportChange();
  }

  /**
   * Draw canvas background
   */
  private drawBackground(): void {
    this.background.clear();
    this.background.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.background.fill({ color: 0x1a1a2e });

    // Draw canvas border
    this.background.setStrokeStyle({ width: 2, color: 0x4a4a6a });
    this.background.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.background.stroke();
  }

  /**
   * Setup input event handlers
   */
  private setupInputHandlers(): void {
    this.inputHandler.on('pointerdown', (state, event) => {
      if (event instanceof PointerEvent) {
        // Middle mouse or space+click for panning
        if (state.isMiddleDown || (state.isPrimaryDown && state.modifiers.shift)) {
          this.isPanning = true;
          this.lastPointerPosition = { ...state.screenPosition };
        } else if (state.isPrimaryDown) {
          this.callbacks.onPointerDown?.(state.screenPosition, state.worldPosition);
        }
      }
    });

    this.inputHandler.on('pointermove', (state) => {
      if (this.isPanning) {
        const delta = {
          x: state.screenPosition.x - this.lastPointerPosition.x,
          y: state.screenPosition.y - this.lastPointerPosition.y,
        };
        this.camera.panBy({ x: -delta.x, y: -delta.y });
        this.lastPointerPosition = { ...state.screenPosition };
      } else {
        this.callbacks.onPointerMove?.(state.screenPosition, state.worldPosition);
      }
    });

    this.inputHandler.on('pointerup', (state) => {
      if (this.isPanning) {
        this.isPanning = false;
      } else {
        this.callbacks.onPointerUp?.(state.screenPosition, state.worldPosition);
      }
    });

    this.inputHandler.on('wheel', (state, event) => {
      if (event instanceof WheelEvent) {
        this.camera.zoomBy(event.deltaY, state.screenPosition);
      }
    });
  }

  /**
   * Setup window resize handler
   */
  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);
      this.emitViewportChange();
    });

    resizeObserver.observe(this.app.canvas);
  }

  /**
   * Main update loop
   */
  private update = (): void => {
    const deltaTime = this.app.ticker.deltaMS / 1000;

    // Update camera (smooth movement)
    const cameraChanged = this.camera.update(deltaTime);

    if (cameraChanged) {
      this.emitViewportChange();
    }

    // Update grid
    const viewport = this.camera.getViewport();
    this.grid.render(viewport.bounds, viewport.zoom);
  };

  /**
   * Emit viewport change to callback
   */
  private emitViewportChange(): void {
    const viewport = this.camera.getViewport();
    this.callbacks.onViewportChange?.(viewport);

    // Update input handler's world transform
    this.inputHandler.setWorldTransform((screen) => this.camera.screenToWorld(screen));
  }

  // Public API

  /**
   * Get the world container for adding content
   */
  getWorldContainer(): Container {
    return this.worldContainer;
  }

  /**
   * Get current viewport
   */
  getViewport(): Viewport {
    return this.camera.getViewport();
  }

  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  /**
   * Set center position
   */
  setCenter(center: Vector2): void {
    this.camera.setCenter(center);
  }

  /**
   * Reset camera to default
   */
  resetCamera(): void {
    this.camera.reset();
  }

  /**
   * Fit camera to canvas bounds
   */
  fitToCanvas(): void {
    this.camera.fitToBounds({
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });
  }

  /**
   * Update grid configuration
   */
  setGridConfig(config: Partial<GridConfig>): void {
    this.grid.setConfig(config);
    this.callbacks.onGridChange?.(this.grid.getConfig());
  }

  /**
   * Get grid configuration
   */
  getGridConfig(): GridConfig {
    return this.grid.getConfig();
  }

  /**
   * Snap position to grid
   */
  snapToGrid(x: number, y: number): Vector2 {
    return this.grid.snapToGrid(x, y);
  }

  /**
   * Convert screen to world coordinates
   */
  screenToWorld(screen: Vector2): Vector2 {
    return this.camera.screenToWorld(screen);
  }

  /**
   * Convert world to screen coordinates
   */
  worldToScreen(world: Vector2): Vector2 {
    return this.camera.worldToScreen(world);
  }

  /**
   * Get canvas dimensions
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Destroy the engine and cleanup
   */
  destroy(): void {
    if (!this.isInitialized) return;

    this.app.ticker.remove(this.update);
    this.inputHandler.destroy();
    this.grid.destroy();
    this.app.destroy(true, { children: true });
    this.isInitialized = false;
  }
}
