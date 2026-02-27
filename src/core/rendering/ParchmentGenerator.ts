import { Application, RenderTexture, Sprite } from 'pixi.js';
import { fbm, turbulence, initNoise } from './noise';
import { PARCHMENT_COLORS } from '@/constants';
import { hexToRgb } from '@/utils';

export interface ParchmentConfig {
  /** Base parchment color */
  baseColor: string;
  /** Secondary color for variation */
  secondaryColor: string;
  /** Noise scale (lower = larger features) */
  noiseScale: number;
  /** Number of noise octaves */
  octaves: number;
  /** Color variation intensity (0-1) */
  colorVariation: number;
  /** Stain intensity (0-1) */
  stainIntensity: number;
  /** Edge darkening intensity (0-1) */
  edgeDarkening: number;
  /** Grain intensity (0-1) */
  grainIntensity: number;
  /** Fiber visibility (0-1) */
  fiberIntensity: number;
}

const DEFAULT_PARCHMENT_CONFIG: ParchmentConfig = {
  baseColor: PARCHMENT_COLORS.base,
  secondaryColor: PARCHMENT_COLORS.medium,
  noiseScale: 0.005,
  octaves: 4,
  colorVariation: 0.15,
  stainIntensity: 0.1,
  edgeDarkening: 0.3,
  grainIntensity: 0.05,
  fiberIntensity: 0.03,
};

/**
 * Generates procedural parchment textures
 */
export class ParchmentGenerator {
  private app: Application;
  private config: ParchmentConfig;

  constructor(app: Application, config: Partial<ParchmentConfig> = {}) {
    this.app = app;
    this.config = { ...DEFAULT_PARCHMENT_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ParchmentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate a parchment texture
   */
  async generate(
    width: number,
    height: number,
    seed: number = Date.now()
  ): Promise<RenderTexture> {
    initNoise(seed);

    const texture = RenderTexture.create({
      width,
      height,
      resolution: 1,
    });

    // Create canvas for pixel manipulation
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[ParchmentGenerator] Failed to get 2D canvas context');
    }
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const baseRgb = hexToRgb(this.config.baseColor)!;
    const secondaryRgb = hexToRgb(this.config.secondaryColor)!;

    // Generate parchment pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Base noise for color variation
        const baseNoise = fbm(
          x * this.config.noiseScale,
          y * this.config.noiseScale,
          this.config.octaves
        );

        // Stain noise (larger scale, irregular)
        const stainNoise = turbulence(
          x * this.config.noiseScale * 0.3,
          y * this.config.noiseScale * 0.3,
          3
        );

        // Fine grain noise
        const grainNoise = fbm(
          x * this.config.noiseScale * 10,
          y * this.config.noiseScale * 10,
          2
        );

        // Fiber noise (directional)
        const fiberNoise = fbm(
          x * this.config.noiseScale * 5,
          y * this.config.noiseScale * 0.5,
          2
        );

        // Edge vignette
        const edgeX = Math.min(x, width - x) / (width * 0.3);
        const edgeY = Math.min(y, height - y) / (height * 0.3);
        const edge = Math.min(1, Math.min(edgeX, edgeY));
        const vignette = 1 - (1 - edge) * this.config.edgeDarkening;

        // Combine color influences
        const colorMix = (baseNoise * 0.5 + 0.5) * this.config.colorVariation;
        const stainMix = stainNoise * this.config.stainIntensity;
        const grainMix = grainNoise * this.config.grainIntensity;
        const fiberMix = fiberNoise * this.config.fiberIntensity;

        // Calculate final color
        let r = baseRgb.r + (secondaryRgb.r - baseRgb.r) * colorMix;
        let g = baseRgb.g + (secondaryRgb.g - baseRgb.g) * colorMix;
        let b = baseRgb.b + (secondaryRgb.b - baseRgb.b) * colorMix;

        // Apply stains (darken)
        const stainDarken = 1 - stainMix * 0.3;
        r *= stainDarken;
        g *= stainDarken;
        b *= stainDarken;

        // Apply grain
        r += grainMix * 30 - 15;
        g += grainMix * 30 - 15;
        b += grainMix * 30 - 15;

        // Apply fibers (slight lightening in horizontal direction)
        r += fiberMix * 20;
        g += fiberMix * 18;
        b += fiberMix * 15;

        // Apply vignette
        r *= vignette;
        g *= vignette;
        b *= vignette;

        // Clamp values
        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Create sprite from canvas and render to texture
    const sprite = Sprite.from(canvas);
    this.app.renderer.render({
      container: sprite,
      target: texture,
    });

    sprite.destroy({ texture: true, textureSource: true });
    // Release the intermediate canvas memory
    canvas.width = 0;
    canvas.height = 0;

    return texture;
  }

  /**
   * Generate a tiling parchment texture
   */
  async generateTiling(
    width: number,
    height: number,
    seed: number = Date.now()
  ): Promise<RenderTexture> {
    initNoise(seed);

    const texture = RenderTexture.create({
      width,
      height,
      resolution: 1,
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[ParchmentGenerator] Failed to get 2D canvas context');
    }
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const baseRgb = hexToRgb(this.config.baseColor)!;
    const secondaryRgb = hexToRgb(this.config.secondaryColor)!;

    // Generate tiling parchment using seamless noise
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Use torus mapping for seamless tiling
        const nx = x / width;
        const ny = y / height;
        const angle1 = nx * Math.PI * 2;
        const angle2 = ny * Math.PI * 2;

        // Map to 4D torus
        const scale = this.config.noiseScale * 100;
        const x1 = Math.cos(angle1) * scale;
        const y1 = Math.sin(angle1) * scale;
        const x2 = Math.cos(angle2) * scale;
        const y2 = Math.sin(angle2) * scale;

        // Simplified noise for tiling (using 2D approximation)
        const baseNoise = fbm(x1 + x2, y1 + y2, this.config.octaves);
        const grainNoise = fbm(x1 * 10 + x2 * 10, y1 * 10 + y2 * 10, 2);

        const colorMix = (baseNoise * 0.5 + 0.5) * this.config.colorVariation;
        const grainMix = grainNoise * this.config.grainIntensity;

        let r = baseRgb.r + (secondaryRgb.r - baseRgb.r) * colorMix;
        let g = baseRgb.g + (secondaryRgb.g - baseRgb.g) * colorMix;
        let b = baseRgb.b + (secondaryRgb.b - baseRgb.b) * colorMix;

        r += grainMix * 30 - 15;
        g += grainMix * 30 - 15;
        b += grainMix * 30 - 15;

        data[idx] = Math.max(0, Math.min(255, Math.round(r)));
        data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const sprite = Sprite.from(canvas);
    this.app.renderer.render({
      container: sprite,
      target: texture,
    });

    sprite.destroy({ texture: true, textureSource: true });
    // Release the intermediate canvas memory
    canvas.width = 0;
    canvas.height = 0;

    return texture;
  }
}
