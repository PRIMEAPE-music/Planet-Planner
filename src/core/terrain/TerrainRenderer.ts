import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { ElevationMap } from './ElevationMap';
import { biomeRegistry, BiomeRegistry } from './BiomeRegistry';
import { fbm, initNoise } from '../rendering/noise';
import type {
  BiomeType,
  TerrainMapConfig,
  TerrainStyleSettings,
  TerrainCell,
} from './types';
import type { GenerationResult } from '@/core/generation/types';
import { hexToRgb, debug } from '@/utils';
import { DEFAULT_CANVAS_DIMENSIONS } from '@/constants';

/**
 * Default terrain style settings
 */
const DEFAULT_STYLE: TerrainStyleSettings = {
  styleBlend: 0.7, // 70% toward parchment
  coastlineIntensity: 0.8,
  hillshadeIntensity: 0.6,
  saturation: 1.0,
  brightness: 1.0,
  showPatterns: true,
};

/**
 * Renders terrain with biomes, elevation, and stylistic effects
 */
export class TerrainRenderer {
  private container: Container;
  private elevationMap: ElevationMap;
  private registry: BiomeRegistry;
  private config: TerrainMapConfig;
  private style: TerrainStyleSettings;

  // Render targets
  private terrainSprite: Sprite | null = null;
  private terrainCanvas: HTMLCanvasElement | null = null;
  private debugGraphics: Graphics | null = null;

  // Cached terrain data
  private cells: TerrainCell[] = [];
  private moistureMap: Float32Array | null = null;
  private temperatureMap: Float32Array | null = null;

  constructor(
    container: Container,
    config: Partial<TerrainMapConfig> = {}
  ) {
    this.container = container;
    this.elevationMap = new ElevationMap();
    this.registry = biomeRegistry;

    this.config = {
      width: config.width ?? 256,
      height: config.height ?? 256,
      cellSize: config.cellSize ?? 16,
      seaLevel: config.seaLevel ?? 0.45,
      seed: config.seed ?? Date.now(),
    };

    this.style = { ...DEFAULT_STYLE };
  }

  /**
   * Set style settings
   */
  setStyle(style: Partial<TerrainStyleSettings>): void {
    this.style = { ...this.style, ...style };
  }

  /**
   * Get current style settings
   */
  getStyle(): TerrainStyleSettings {
    return { ...this.style };
  }

  /**
   * Generate terrain
   */
  async generate(seed?: number): Promise<void> {
    const useSeed = seed ?? this.config.seed;
    this.config.seed = useSeed;

    debug.log('[TerrainRenderer] Starting generation with seed:', useSeed);
    debug.log('[TerrainRenderer] Config:', this.config);

    initNoise(useSeed);

    // Generate elevation
    debug.log('[TerrainRenderer] Generating elevation map...');
    this.elevationMap.generate(this.config.width, this.config.height, useSeed);

    // Generate moisture map
    debug.log('[TerrainRenderer] Generating moisture map...');
    this.generateMoistureMap(useSeed + 1000);

    // Generate temperature map
    debug.log('[TerrainRenderer] Generating temperature map...');
    this.generateTemperatureMap(useSeed + 2000);

    // Assign biomes to cells
    debug.log('[TerrainRenderer] Assigning biomes...');
    this.assignBiomes();

    // Render terrain
    debug.log('[TerrainRenderer] Rendering terrain...');
    await this.render();
    debug.log('[TerrainRenderer] Generation complete!');
  }

  /**
   * Generate terrain from a LandmassGenerator result.
   * Uses the result's heightmap and landMask instead of generating new elevation.
   */
  async generateFromResult(
    result: GenerationResult,
    width: number,
    height: number,
    seaLevel?: number
  ): Promise<void> {
    // Update config to match the generation result dimensions
    this.config.width = width;
    this.config.height = height;
    if (seaLevel !== undefined) {
      this.config.seaLevel = seaLevel;
    }

    const seed = result.metadata.seed;
    this.config.seed = seed;

    debug.log('[TerrainRenderer] Starting generation from result, seed:', seed);
    debug.log('[TerrainRenderer] Dimensions:', width, 'x', height);

    initNoise(seed);

    // Load elevation from the generation result heightmap
    this.elevationMap.setData(result.heightmap, width, height);

    // Generate derived maps from the elevation data
    this.generateMoistureMap(seed + 1000);
    this.generateTemperatureMap(seed + 2000);

    // Assign biomes using the land mask from the generation result
    this.assignBiomesWithLandMask(result.landMask);

    // Render terrain to canvas
    await this.render();
    debug.log('[TerrainRenderer] Generation from result complete!');
  }

  /**
   * Assign biomes using an explicit land mask (from LandmassGenerator).
   */
  private assignBiomesWithLandMask(landMask: Uint8Array): void {
    const { width, height } = this.config;
    this.cells = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        const elevation = this.elevationMap.getElevationAt(x, y);
        const moisture = this.moistureMap?.[idx] ?? 0.5;
        const temperature = this.temperatureMap?.[idx] ?? 0.5;
        const isLand = (landMask[idx] ?? 0) === 1;

        let biome: BiomeType;
        if (!isLand) {
          // Use elevation to distinguish shallow water from ocean
          biome = elevation > this.config.seaLevel * 0.8 ? 'shallowWater' : 'ocean';
        } else {
          biome = this.registry.determineBiome(
            elevation,
            moisture,
            temperature,
            this.config.seaLevel
          );
        }

        const normal = this.elevationMap.getNormalAt(x, y, 1);

        this.cells.push({
          position: { x, y },
          elevation,
          moisture,
          temperature,
          biome,
          isLand,
          coastDistance: elevation - this.config.seaLevel,
          normal,
        });
      }
    }
  }

  /**
   * Generate moisture map
   */
  private generateMoistureMap(seed: number): void {
    initNoise(seed);

    const { width, height } = this.config;
    this.moistureMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Base moisture from noise
        let moisture = fbm(x * 0.01, y * 0.01, 4, 2.0, 0.5);
        moisture = (moisture + 1) / 2;

        // Increase moisture near water
        const elevation = this.elevationMap.getElevationAt(x, y);
        if (elevation < this.config.seaLevel) {
          moisture = 1;
        } else {
          // Distance-based moisture from coastline
          const coastDist = (elevation - this.config.seaLevel) / (1 - this.config.seaLevel);
          moisture = moisture * 0.7 + (1 - coastDist) * 0.3;
        }

        this.moistureMap[y * width + x] = Math.max(0, Math.min(1, moisture));
      }
    }
  }

  /**
   * Generate temperature map (based on latitude + elevation)
   */
  private generateTemperatureMap(seed: number): void {
    initNoise(seed);

    const { width, height } = this.config;
    this.temperatureMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Latitude-based temperature (cooler at top and bottom)
        const latitudeNorm = y / height;
        const latitudeTemp = 1 - Math.abs(latitudeNorm - 0.5) * 2;

        // Elevation cooling
        const elevation = this.elevationMap.getElevationAt(x, y);
        const elevationCooling = Math.max(0, elevation - this.config.seaLevel) * 0.8;

        // Add some noise variation
        const noise = fbm(x * 0.02, y * 0.02, 2, 2.0, 0.5) * 0.1;

        let temperature = latitudeTemp - elevationCooling + noise;
        temperature = Math.max(0, Math.min(1, temperature));

        this.temperatureMap[y * width + x] = temperature;
      }
    }
  }

  /**
   * Assign biomes to all cells
   */
  private assignBiomes(): void {
    const { width, height } = this.config;
    this.cells = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        const elevation = this.elevationMap.getElevationAt(x, y);
        const moisture = this.moistureMap?.[idx] ?? 0.5;
        const temperature = this.temperatureMap?.[idx] ?? 0.5;

        const biome = this.registry.determineBiome(
          elevation,
          moisture,
          temperature,
          this.config.seaLevel
        );

        const isLand = elevation >= this.config.seaLevel;
        const normal = this.elevationMap.getNormalAt(x, y, 1);

        this.cells.push({
          position: { x, y },
          elevation,
          moisture,
          temperature,
          biome,
          isLand,
          coastDistance: isLand ? elevation - this.config.seaLevel : elevation - this.config.seaLevel,
          normal,
        });
      }
    }
  }

  /**
   * Render terrain to texture
   */
  async render(): Promise<void> {
    const { width, height, cellSize } = this.config;
    const pixelWidth = width * cellSize;
    const pixelHeight = height * cellSize;

    debug.log(`[TerrainRenderer] Rendering ${pixelWidth}x${pixelHeight} pixels...`);
    const startTime = performance.now();

    // Create canvas for pixel manipulation
    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('[TerrainRenderer] Failed to get 2D canvas context');
    }
    const imageData = ctx.createImageData(pixelWidth, pixelHeight);
    const data = imageData.data;

    // ── Pre-compute biome color table (avoids per-pixel hexToRgb + getBlendedColor) ──
    const biomeColorCache = new Map<string, {
      base: { r: number; g: number; b: number };
      dark: { r: number; g: number; b: number };
      light: { r: number; g: number; b: number };
      shadow: { r: number; g: number; b: number };
      noiseScale: number;
      octaves: number;
      pattern: string;
      patternDensity: number;
    }>();

    const uniqueBiomes = new Set(this.cells.map(c => c.biome));
    for (const biomeId of uniqueBiomes) {
      const biomeDef = this.registry.get(biomeId);
      if (!biomeDef) continue;
      biomeColorCache.set(biomeId, {
        base: hexToRgb(this.registry.getBlendedColor(biomeDef, 'base', this.style.styleBlend))!,
        dark: hexToRgb(this.registry.getBlendedColor(biomeDef, 'dark', this.style.styleBlend))!,
        light: hexToRgb(this.registry.getBlendedColor(biomeDef, 'light', this.style.styleBlend))!,
        shadow: hexToRgb(this.registry.getBlendedColor(biomeDef, 'shadow', this.style.styleBlend))!,
        noiseScale: biomeDef.texture.noiseScale,
        octaves: biomeDef.texture.octaves,
        pattern: biomeDef.texture.pattern,
        patternDensity: biomeDef.texture.patternDensity,
      });
    }

    // Cache style values to avoid repeated property access in tight loop
    const showPatterns = this.style.showPatterns;
    const saturation = this.style.saturation;
    const brightness = this.style.brightness;
    const hillshadeIntensity = this.style.hillshadeIntensity;
    const lightDir = { x: -0.7, y: -0.7 };

    // Render each pixel in chunks to allow browser breathing room
    const CHUNK_SIZE = 50000;
    let pixelCount = 0;

    for (let py = 0; py < pixelHeight; py++) {
      for (let px = 0; px < pixelWidth; px++) {
        const cellX = Math.floor(px / cellSize);
        const cellY = Math.floor(py / cellSize);
        const cellIdx = cellY * width + cellX;

        const cell = this.cells[cellIdx];
        if (!cell) continue;

        const colors = biomeColorCache.get(cell.biome);
        if (!colors) continue;

        // ── Inlined getPixelColor (no function call overhead per pixel) ──
        const baseColor = colors.base;
        const noiseVal = fbm(px * colors.noiseScale, py * colors.noiseScale, colors.octaves);
        const t = (noiseVal + 1) / 2;

        let r: number, g: number, b: number;
        if (t < 0.5) {
          const blend = t * 2;
          r = colors.dark.r + (baseColor.r - colors.dark.r) * blend;
          g = colors.dark.g + (baseColor.g - colors.dark.g) * blend;
          b = colors.dark.b + (baseColor.b - colors.dark.b) * blend;
        } else {
          const blend = (t - 0.5) * 2;
          r = baseColor.r + (colors.light.r - baseColor.r) * blend;
          g = baseColor.g + (colors.light.g - baseColor.g) * blend;
          b = baseColor.b + (colors.light.b - baseColor.b) * blend;
        }

        if (showPatterns && colors.pattern !== 'none') {
          const pattern = this.getPatternValue(px, py, colors.pattern, colors.patternDensity);
          const s = colors.shadow;
          r = r * (1 - pattern * 0.3) + s.r * pattern * 0.3;
          g = g * (1 - pattern * 0.3) + s.g * pattern * 0.3;
          b = b * (1 - pattern * 0.3) + s.b * pattern * 0.3;
        }

        if (saturation !== 1) {
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          r = gray + (r - gray) * saturation;
          g = gray + (g - gray) * saturation;
          b = gray + (b - gray) * saturation;
        }

        // Clamp to [0, 255]
        r = r < 0 ? 0 : r > 255 ? 255 : r;
        g = g < 0 ? 0 : g > 255 ? 255 : g;
        b = b < 0 ? 0 : b > 255 ? 255 : b;

        // Apply hillshading
        const hillshade = this.elevationMap.getHillshadeAt(
          px / cellSize, py / cellSize, lightDir, hillshadeIntensity
        );

        // Write pixel
        const pixelIdx = (py * pixelWidth + px) * 4;
        data[pixelIdx]     = (r * hillshade * brightness + 0.5) | 0;
        data[pixelIdx + 1] = (g * hillshade * brightness + 0.5) | 0;
        data[pixelIdx + 2] = (b * hillshade * brightness + 0.5) | 0;
        data[pixelIdx + 3] = 255;

        pixelCount++;
        if (pixelCount % CHUNK_SIZE === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    debug.log(`[TerrainRenderer] Pixel rendering took ${(performance.now() - startTime).toFixed(0)}ms`);

    // Draw coastlines
    debug.log('[TerrainRenderer] Drawing coastlines...');
    this.drawCoastlines(data, pixelWidth, pixelHeight);

    ctx.putImageData(imageData, 0, 0);

    debug.log('[TerrainRenderer] Creating texture and sprite...');
    debug.log(`[TerrainRenderer] Canvas size: ${canvas.width}x${canvas.height}`);

    // Debug: Check if canvas has pixel data
    const testPixel = ctx.getImageData(pixelWidth / 2, pixelHeight / 2, 1, 1).data;
    debug.log(`[TerrainRenderer] Sample pixel at center: rgba(${testPixel[0]}, ${testPixel[1]}, ${testPixel[2]}, ${testPixel[3]})`);

    // Clean up previous sprite, texture, and canvas
    if (this.terrainSprite) {
      debug.log('[TerrainRenderer] Destroying previous sprite');
      this.container.removeChild(this.terrainSprite);
      this.terrainSprite.destroy({ texture: true, textureSource: true });
      this.terrainSprite = null;
    }
    if (this.terrainCanvas) {
      this.terrainCanvas.width = 0;
      this.terrainCanvas.height = 0;
      this.terrainCanvas = null;
    }

    // Store canvas reference for cleanup on next render
    this.terrainCanvas = canvas;

    try {
      // Create texture directly from canvas (simpler and more reliable for Pixi v8)
      const texture = Texture.from(canvas);

      // Force texture update to ensure it's uploaded to GPU
      texture.source.update();

      debug.log('[TerrainRenderer] Texture created:', {
        width: texture.width,
        height: texture.height,
        sourceWidth: texture.source?.width,
        sourceHeight: texture.source?.height,
        pixelWidth: texture.source?.pixelWidth,
        pixelHeight: texture.source?.pixelHeight,
        resource: texture.source?.resource?.constructor.name,
      });

      this.terrainSprite = new Sprite(texture);
      this.terrainSprite.x = 0;
      this.terrainSprite.y = 0;
      this.terrainSprite.alpha = 1;
      this.terrainSprite.visible = true;
      this.terrainSprite.eventMode = 'none'; // Don't block pointer events
      this.terrainSprite.zIndex = 1;

      // Scale sprite to fill canvas dimensions
      const scaleX = DEFAULT_CANVAS_DIMENSIONS.width / pixelWidth;
      const scaleY = DEFAULT_CANVAS_DIMENSIONS.height / pixelHeight;
      this.terrainSprite.scale.set(scaleX, scaleY);
      debug.log(`[TerrainRenderer] Sprite scaled by ${scaleX}x${scaleY} to fill ${DEFAULT_CANVAS_DIMENSIONS.width}x${DEFAULT_CANVAS_DIMENSIONS.height}`);

      // Add terrain sprite to container (layer's content container)
      this.container.addChild(this.terrainSprite);
      debug.log('[TerrainRenderer] Added terrain sprite to layer container');
      debug.log(`[TerrainRenderer] Container position:`, { x: this.container.x, y: this.container.y });
      debug.log(`[TerrainRenderer] Container visible:`, this.container.visible);
      debug.log(`[TerrainRenderer] Container parent:`, this.container.parent?.constructor.name);
      debug.log(`[TerrainRenderer] Container children count:`, this.container.children.length);
      debug.log(`[TerrainRenderer] Container sortableChildren:`, this.container.sortableChildren);
      debug.log(`[TerrainRenderer] Sprite bounds:`, {
        x: this.terrainSprite.x,
        y: this.terrainSprite.y,
        width: this.terrainSprite.width,
        height: this.terrainSprite.height,
        scaleX: this.terrainSprite.scale.x,
        scaleY: this.terrainSprite.scale.y,
        visible: this.terrainSprite.visible,
        alpha: this.terrainSprite.alpha,
        zIndex: this.terrainSprite.zIndex,
        tint: this.terrainSprite.tint,
        parent: this.terrainSprite.parent?.constructor.name,
      });
      debug.log(`[TerrainRenderer] Texture info after sprite creation:`, {
        width: this.terrainSprite.texture.width,
        height: this.terrainSprite.texture.height,
        uploaded: (this.terrainSprite.texture.source as any)?._touched,
      });
      debug.log(`[TerrainRenderer] Total render time: ${(performance.now() - startTime).toFixed(0)}ms`);
    } catch (err) {
      console.error('[TerrainRenderer] Texture creation error:', err);
      throw err;
    }
  }

  /**
   * Get pattern value for stylistic rendering
   */
  private getPatternValue(
    x: number,
    y: number,
    pattern: string,
    density: number
  ): number {
    switch (pattern) {
      case 'stipple': {
        // Random dots
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const rand = hash - Math.floor(hash);
        return rand < density * 0.1 ? 1 : 0;
      }

      case 'crosshatch': {
        // Diagonal lines
        const line1 = ((x + y) % 8) < 1 ? 1 : 0;
        const line2 = ((x - y + 1000) % 8) < 1 ? 1 : 0;
        return Math.min(1, (line1 + line2) * density);
      }

      case 'waves': {
        // Wavy horizontal lines
        const wave = Math.sin(x * 0.1 + Math.sin(y * 0.05) * 2);
        return wave > 0.8 ? density : 0;
      }

      case 'noise':
      default: {
        // Perlin noise pattern
        const n = fbm(x * 0.05, y * 0.05, 2);
        return n > 0.5 ? density * (n - 0.5) * 2 : 0;
      }
    }
  }

  /**
   * Draw ink-style coastlines
   */
  private drawCoastlines(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    if (this.style.coastlineIntensity <= 0) return;

    const { cellSize } = this.config;
    const intensity = this.style.coastlineIntensity;

    // Ink color (darker for realistic, softer for parchment)
    const inkColor = {
      r: Math.round(38 + (90 - 38) * this.style.styleBlend),
      g: Math.round(33 + (75 - 33) * this.style.styleBlend),
      b: Math.round(30 + (65 - 30) * this.style.styleBlend),
    };

    // Find coastline pixels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        const cellIdx = cellY * this.config.width + cellX;

        const cell = this.cells[cellIdx];
        if (!cell) continue;

        // Check if this is near a coastline
        if (Math.abs(cell.coastDistance) < 0.05) {
          // Check neighboring cells for land/water transition
          let isCoastline = false;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;

              const nx = cellX + dx;
              const ny = cellY + dy;

              if (nx < 0 || nx >= this.config.width || ny < 0 || ny >= this.config.height) continue;

              const neighborIdx = ny * this.config.width + nx;
              const neighbor = this.cells[neighborIdx];
              if (!neighbor) continue;

              if (cell.isLand !== neighbor.isLand) {
                isCoastline = true;
                break;
              }
            }
            if (isCoastline) break;
          }

          if (isCoastline) {
            // Draw coastline pixel with some variation
            const variation = Math.random() * 0.3;
            const alpha = intensity * (0.7 + variation);

            const pixelIdx = (y * width + x) * 4;
            const r = data[pixelIdx] ?? 0;
            const g = data[pixelIdx + 1] ?? 0;
            const b = data[pixelIdx + 2] ?? 0;
            data[pixelIdx] = Math.round(r * (1 - alpha) + inkColor.r * alpha);
            data[pixelIdx + 1] = Math.round(g * (1 - alpha) + inkColor.g * alpha);
            data[pixelIdx + 2] = Math.round(b * (1 - alpha) + inkColor.b * alpha);
          }
        }
      }
    }
  }

  /**
   * Get cell at position
   */
  getCellAt(worldX: number, worldY: number): TerrainCell | null {
    const { cellSize, width, height } = this.config;
    const cellX = Math.floor(worldX / cellSize);
    const cellY = Math.floor(worldY / cellSize);

    if (cellX < 0 || cellX >= width || cellY < 0 || cellY >= height) {
      return null;
    }

    return this.cells[cellY * width + cellX] ?? null;
  }

  /**
   * Get biome at position
   */
  getBiomeAt(worldX: number, worldY: number): BiomeType | null {
    const cell = this.getCellAt(worldX, worldY);
    return cell?.biome ?? null;
  }

  /**
   * Get elevation at position
   */
  getElevationAt(worldX: number, worldY: number): number {
    const { cellSize } = this.config;
    return this.elevationMap.getElevationAt(worldX / cellSize, worldY / cellSize);
  }

  /**
   * Paint biome at position
   */
  paintBiome(
    worldX: number,
    worldY: number,
    biome: BiomeType,
    radius: number = 1
  ): void {
    const { cellSize, width, height } = this.config;
    const centerX = Math.floor(worldX / cellSize);
    const centerY = Math.floor(worldY / cellSize);
    const cellRadius = Math.ceil(radius / cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        // Check if within circular radius
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cellRadius) continue;

        const idx = y * width + x;
        const cell = this.cells[idx];
        if (cell) {
          cell.biome = biome;
        }
      }
    }
  }

  /**
   * Modify elevation at position
   */
  modifyElevation(
    worldX: number,
    worldY: number,
    delta: number,
    radius: number = 1
  ): void {
    const data = this.elevationMap.getData();
    if (!data) return;

    const { cellSize, width, height } = this.config;
    const centerX = Math.floor(worldX / cellSize);
    const centerY = Math.floor(worldY / cellSize);
    const cellRadius = Math.ceil(radius / cellSize);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        // Falloff based on distance
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cellRadius) continue;

        const falloff = 1 - dist / cellRadius;
        const idx = y * width + x;
        const currentVal = data.values[idx] ?? 0;
        const newVal = Math.max(0, Math.min(1, currentVal + delta * falloff));
        data.values[idx] = newVal;

        // Update cell
        const cell = this.cells[idx];
        if (cell) {
          cell.elevation = newVal;
          cell.isLand = newVal >= this.config.seaLevel;

          // Reassign biome based on new elevation
          const moisture = this.moistureMap?.[idx] ?? 0.5;
          const temperature = this.temperatureMap?.[idx] ?? 0.5;
          cell.biome = this.registry.determineBiome(
            newVal,
            moisture,
            temperature,
            this.config.seaLevel
          );
        }
      }
    }
  }

  /**
   * Get terrain sprite
   */
  getSprite(): Sprite | null {
    return this.terrainSprite;
  }

  /**
   * Get configuration
   */
  getConfig(): TerrainMapConfig {
    return { ...this.config };
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    if (this.terrainSprite) {
      this.terrainSprite.destroy({ texture: true, textureSource: true });
      this.terrainSprite = null;
    }
    if (this.terrainCanvas) {
      this.terrainCanvas.width = 0;
      this.terrainCanvas.height = 0;
      this.terrainCanvas = null;
    }
    this.debugGraphics?.destroy();
    this.debugGraphics = null;
    this.cells = [];
    this.moistureMap = null;
    this.temperatureMap = null;
  }
}
