import { Application, Container, Graphics, RenderTexture, TilingSprite } from 'pixi.js';
import { LayerManager } from '../layers/LayerManager';
import { ParchmentGenerator, ParchmentConfig } from './ParchmentGenerator';
import type { Viewport } from '@/types';

export interface RenderPipelineConfig {
  /** Enable parchment overlay */
  parchmentEnabled: boolean;
  /** Parchment overlay opacity */
  parchmentOpacity: number;
  /** Parchment blend mode */
  parchmentBlendMode: 'multiply' | 'overlay' | 'soft-light';
  /** Enable viewport culling */
  cullingEnabled: boolean;
  /** Parchment generation config */
  parchmentConfig?: Partial<ParchmentConfig>;
}

const DEFAULT_PIPELINE_CONFIG: RenderPipelineConfig = {
  parchmentEnabled: true,
  parchmentOpacity: 0.3,
  parchmentBlendMode: 'multiply',
  cullingEnabled: true,
};

/**
 * Render pipeline managing the composition of all layers and effects
 */
export class RenderPipeline {
  private app: Application;
  private layerManager: LayerManager;
  private parchmentGenerator: ParchmentGenerator;
  private config: RenderPipelineConfig;

  // Containers
  private rootContainer: Container;
  private backgroundContainer: Container;
  private layerContainer: Container;
  private effectContainer: Container;
  private overlayContainer: Container;

  // Parchment
  private parchmentSprite: TilingSprite | null = null;
  private parchmentTexture: RenderTexture | null = null;

  // Background
  private backgroundGraphics: Graphics;

  // Canvas dimensions
  private canvasWidth: number = 4096;
  private canvasHeight: number = 4096;

  constructor(
    app: Application,
    rootContainer: Container,
    config: Partial<RenderPipelineConfig> = {}
  ) {
    this.app = app;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };

    // Setup container hierarchy
    this.rootContainer = rootContainer;

    this.backgroundContainer = new Container();
    this.backgroundContainer.label = 'background';
    this.rootContainer.addChild(this.backgroundContainer);

    this.layerContainer = new Container();
    this.layerContainer.label = 'layers';
    this.rootContainer.addChild(this.layerContainer);

    this.effectContainer = new Container();
    this.effectContainer.label = 'effects';
    this.rootContainer.addChild(this.effectContainer);

    this.overlayContainer = new Container();
    this.overlayContainer.label = 'overlay';
    this.rootContainer.addChild(this.overlayContainer);

    // Setup background
    this.backgroundGraphics = new Graphics();
    this.backgroundContainer.addChild(this.backgroundGraphics);

    // Setup layer manager
    this.layerManager = new LayerManager(this.layerContainer);

    // Setup parchment generator
    this.parchmentGenerator = new ParchmentGenerator(app, config.parchmentConfig);
  }

  /**
   * Initialize the render pipeline
   */
  async init(canvasWidth: number, canvasHeight: number): Promise<void> {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.drawBackground();

    if (this.config.parchmentEnabled) {
      await this.initParchment();
    }
  }

  /**
   * Draw the canvas background
   */
  private drawBackground(): void {
    this.backgroundGraphics.clear();

    // Ocean/void color outside canvas
    this.backgroundGraphics.rect(
      -10000,
      -10000,
      this.canvasWidth + 20000,
      this.canvasHeight + 20000
    );
    this.backgroundGraphics.fill({ color: 0x0c1929 });

    // Canvas area (parchment base color)
    this.backgroundGraphics.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.backgroundGraphics.fill({ color: 0xf4e4c1 });

    // Subtle canvas border
    this.backgroundGraphics.setStrokeStyle({ width: 4, color: 0x8b7355 });
    this.backgroundGraphics.rect(0, 0, this.canvasWidth, this.canvasHeight);
    this.backgroundGraphics.stroke();
  }

  /**
   * Initialize parchment texture overlay
   */
  private async initParchment(): Promise<void> {
    // Generate tiling parchment texture (256x256 for performance)
    this.parchmentTexture = await this.parchmentGenerator.generateTiling(256, 256, 12345);

    // Create tiling sprite that covers the canvas
    this.parchmentSprite = new TilingSprite({
      texture: this.parchmentTexture,
      width: this.canvasWidth,
      height: this.canvasHeight,
    });

    this.parchmentSprite.alpha = this.config.parchmentOpacity;
    this.parchmentSprite.blendMode = this.config.parchmentBlendMode as any;

    this.overlayContainer.addChild(this.parchmentSprite);
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RenderPipelineConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.parchmentSprite) {
      this.parchmentSprite.alpha = this.config.parchmentOpacity;
      this.parchmentSprite.blendMode = this.config.parchmentBlendMode as any;
      this.parchmentSprite.visible = this.config.parchmentEnabled;
    }
  }

  /**
   * Get the layer manager
   */
  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  /**
   * Get the layer container (for direct access)
   */
  getLayerContainer(): Container {
    return this.layerContainer;
  }

  /**
   * Update render pipeline (called each frame)
   */
  update(viewport: Viewport): void {
    // Perform viewport culling
    if (this.config.cullingEnabled) {
      this.layerManager.cullToViewport(viewport.bounds);
    }
  }

  /**
   * Regenerate parchment texture with new seed
   */
  async regenerateParchment(seed?: number): Promise<void> {
    if (this.parchmentTexture) {
      this.parchmentTexture.destroy(true);
    }

    this.parchmentTexture = await this.parchmentGenerator.generateTiling(
      256,
      256,
      seed ?? Date.now()
    );

    if (this.parchmentSprite) {
      this.parchmentSprite.texture = this.parchmentTexture;
    }
  }

  /**
   * Set parchment configuration
   */
  async setParchmentConfig(config: Partial<ParchmentConfig>): Promise<void> {
    this.parchmentGenerator.setConfig(config);
    await this.regenerateParchment();
  }

  /**
   * Resize canvas dimensions
   */
  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    this.drawBackground();

    if (this.parchmentSprite) {
      this.parchmentSprite.width = width;
      this.parchmentSprite.height = height;
    }
  }

  /**
   * Get canvas dimensions
   */
  getCanvasDimensions(): { width: number; height: number } {
    return { width: this.canvasWidth, height: this.canvasHeight };
  }

  /**
   * Export the current canvas to an image
   */
  async exportToImage(
    format: 'png' | 'jpeg' = 'png',
    quality: number = 1
  ): Promise<Blob> {
    // Disable culling temporarily
    this.layerManager.disableCulling();

    // Create render texture for the entire canvas
    const renderTexture = RenderTexture.create({
      width: this.canvasWidth,
      height: this.canvasHeight,
      resolution: 1,
    });

    // Render to texture
    this.app.renderer.render({
      container: this.rootContainer,
      target: renderTexture,
    });

    // Extract to canvas
    const canvas = this.app.renderer.extract.canvas({
      target: renderTexture,
    }) as HTMLCanvasElement;

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export canvas'));
          }
          renderTexture.destroy(true);
        },
        `image/${format}`,
        quality
      );
    });
  }

  /**
   * Destroy the render pipeline
   */
  destroy(): void {
    this.layerManager.destroy();
    this.parchmentTexture?.destroy(true);
    this.backgroundGraphics.destroy();
    this.backgroundContainer.destroy({ children: true });
    this.layerContainer.destroy({ children: true });
    this.effectContainer.destroy({ children: true });
    this.overlayContainer.destroy({ children: true });
  }
}
