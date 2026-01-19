import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { ElevationMap } from './ElevationMap';
import { biomeRegistry, BiomeRegistry } from './BiomeRegistry';
import { fbm, initNoise } from '../rendering/noise';
import type {
  BiomeType,
  BiomeDefinition,
  TerrainMapConfig,
  TerrainStyleSettings,
  TerrainCell,
} from './types';
import { hexToRgb } from '@/utils';
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

    console.log('[TerrainRenderer] Starting generation with seed:', useSeed);
    console.log('[TerrainRenderer] Config:', this.config);

    initNoise(useSeed);

    // Generate elevation
    console.log('[TerrainRenderer] Generating elevation map...');
    this.elevationMap.generate(this.config.width, this.config.height, useSeed);

    // Generate moisture map
    console.log('[TerrainRenderer] Generating moisture map...');
    this.generateMoistureMap(useSeed + 1000);

    // Generate temperature map
    console.log('[TerrainRenderer] Generating temperature map...');
    this.generateTemperatureMap(useSeed + 2000);

    // Assign biomes to cells
    console.log('[TerrainRenderer] Assigning biomes...');
    this.assignBiomes();

    // Render terrain
    console.log('[TerrainRenderer] Rendering terrain...');
    await this.render();
    console.log('[TerrainRenderer] Generation complete!');
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

    console.log(`[TerrainRenderer] Rendering ${pixelWidth}x${pixelHeight} pixels...`);
    const startTime = performance.now();

    // Create canvas for pixel manipulation
    const canvas = document.createElement('canvas');
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(pixelWidth, pixelHeight);
    const data = imageData.data;

    // Render each pixel in chunks to allow browser breathing room
    const CHUNK_SIZE = 10000;
    let pixelCount = 0;

    for (let py = 0; py < pixelHeight; py++) {
      for (let px = 0; px < pixelWidth; px++) {
        const cellX = Math.floor(px / cellSize);
        const cellY = Math.floor(py / cellSize);
        const cellIdx = cellY * width + cellX;

        const cell = this.cells[cellIdx];
        if (!cell) continue;

        const biome = this.registry.get(cell.biome);
        if (!biome) continue;

        // Get base color
        const baseColor = this.getPixelColor(
          px,
          py,
          cell,
          biome
        );

        // Apply hillshading
        const hillshade = this.elevationMap.getHillshadeAt(
          px / cellSize,
          py / cellSize,
          { x: -0.7, y: -0.7 },
          this.style.hillshadeIntensity
        );

        // Apply color adjustments
        const pixelIdx = (py * pixelWidth + px) * 4;
        data[pixelIdx] = Math.round(baseColor.r * hillshade * this.style.brightness);
        data[pixelIdx + 1] = Math.round(baseColor.g * hillshade * this.style.brightness);
        data[pixelIdx + 2] = Math.round(baseColor.b * hillshade * this.style.brightness);
        data[pixelIdx + 3] = 255;

        pixelCount++;
        // Yield to browser every CHUNK_SIZE pixels
        if (pixelCount % CHUNK_SIZE === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    console.log(`[TerrainRenderer] Pixel rendering took ${(performance.now() - startTime).toFixed(0)}ms`);

    // Draw coastlines
    console.log('[TerrainRenderer] Drawing coastlines...');
    this.drawCoastlines(data, pixelWidth, pixelHeight);

    ctx.putImageData(imageData, 0, 0);

    console.log('[TerrainRenderer] Creating texture and sprite...');
    console.log(`[TerrainRenderer] Canvas size: ${canvas.width}x${canvas.height}`);

    // Debug: Check if canvas has pixel data
    const testPixel = ctx.getImageData(pixelWidth / 2, pixelHeight / 2, 1, 1).data;
    console.log(`[TerrainRenderer] Sample pixel at center: rgba(${testPixel[0]}, ${testPixel[1]}, ${testPixel[2]}, ${testPixel[3]})`);

    // Clean up previous sprite
    if (this.terrainSprite) {
      console.log('[TerrainRenderer] Destroying previous sprite');
      this.container.removeChild(this.terrainSprite);
      this.terrainSprite.destroy({ texture: true });
      this.terrainSprite = null;
    }

    try {
      // First, add a debug graphics object to verify rendering works
      if (this.debugGraphics) {
        this.container.removeChild(this.debugGraphics);
        this.debugGraphics.destroy();
      }
      this.debugGraphics = new Graphics();
      // Draw a bright red border around where terrain should be
      this.debugGraphics.rect(0, 0, DEFAULT_CANVAS_DIMENSIONS.width, DEFAULT_CANVAS_DIMENSIONS.height);
      this.debugGraphics.stroke({ color: 0xff0000, width: 20 });
      // Draw corner markers
      this.debugGraphics.circle(100, 100, 50);
      this.debugGraphics.fill({ color: 0x00ff00 });
      this.debugGraphics.circle(DEFAULT_CANVAS_DIMENSIONS.width - 100, 100, 50);
      this.debugGraphics.fill({ color: 0x0000ff });
      console.log('[TerrainRenderer] Debug graphics created');

      // Create texture using ImageBitmap for better WebGL compatibility
      const imageBitmap = await createImageBitmap(canvas);
      const texture = Texture.from(imageBitmap);

      console.log('[TerrainRenderer] Texture created:', {
        width: texture.width,
        height: texture.height,
        valid: texture.source?.valid,
        sourceWidth: texture.source?.width,
        sourceHeight: texture.source?.height,
      });

      this.terrainSprite = new Sprite(texture);
      this.terrainSprite.x = 0;
      this.terrainSprite.y = 0;
      this.terrainSprite.alpha = 1;
      this.terrainSprite.visible = true;

      // Scale sprite to fill canvas dimensions
      const scaleX = DEFAULT_CANVAS_DIMENSIONS.width / pixelWidth;
      const scaleY = DEFAULT_CANVAS_DIMENSIONS.height / pixelHeight;
      this.terrainSprite.scale.set(scaleX, scaleY);
      console.log(`[TerrainRenderer] Sprite scaled by ${scaleX}x${scaleY} to fill ${DEFAULT_CANVAS_DIMENSIONS.width}x${DEFAULT_CANVAS_DIMENSIONS.height}`);

      // Log container state before adding
      console.log(`[TerrainRenderer] Container children before: ${this.container.children.length}`);
      console.log('[TerrainRenderer] Container children types:',
        this.container.children.map((c, i) => `${i}: ${c.constructor.name}`).join(', ')
      );

      // Insert terrain sprite at index 1 (after background, before grid)
      // This ensures it's visible but below the grid overlay
      if (this.container.children.length > 1) {
        this.container.addChildAt(this.terrainSprite, 1);
        console.log('[TerrainRenderer] Added terrain sprite at index 1');
      } else {
        this.container.addChild(this.terrainSprite);
        console.log('[TerrainRenderer] Added terrain sprite at end');
      }

      // Add debug graphics on top
      this.container.addChild(this.debugGraphics);
      console.log('[TerrainRenderer] Added debug graphics on top');

      // Log container state after adding
      console.log(`[TerrainRenderer] Container children after: ${this.container.children.length}`);
      console.log('[TerrainRenderer] Container children types after:',
        this.container.children.map((c, i) => `${i}: ${c.constructor.name}`).join(', ')
      );
      console.log(`[TerrainRenderer] Container position:`, { x: this.container.x, y: this.container.y });
      console.log(`[TerrainRenderer] Container visible:`, this.container.visible);
      console.log(`[TerrainRenderer] Container parent:`, this.container.parent?.constructor.name);
      console.log(`[TerrainRenderer] Sprite bounds:`, {
        x: this.terrainSprite.x,
        y: this.terrainSprite.y,
        width: this.terrainSprite.width,
        height: this.terrainSprite.height,
        scaleX: this.terrainSprite.scale.x,
        scaleY: this.terrainSprite.scale.y,
        visible: this.terrainSprite.visible,
        alpha: this.terrainSprite.alpha,
        parent: this.terrainSprite.parent?.constructor.name,
      });
      console.log(`[TerrainRenderer] Total render time: ${(performance.now() - startTime).toFixed(0)}ms`);
    } catch (err) {
      console.error('[TerrainRenderer] Texture creation error:', err);
      throw err;
    }
  }

  /**
   * Get pixel color with biome blending and patterns
   */
  private getPixelColor(
    px: number,
    py: number,
    _cell: TerrainCell,
    biome: BiomeDefinition
  ): { r: number; g: number; b: number } {
    // Get blended base color
    const baseColorHex = this.registry.getBlendedColor(
      biome,
      'base',
      this.style.styleBlend
    );
    const baseColor = hexToRgb(baseColorHex)!;

    // Add noise variation
    const noiseVal = fbm(
      px * biome.texture.noiseScale,
      py * biome.texture.noiseScale,
      biome.texture.octaves
    );

    // Get variation colors
    const darkColorHex = this.registry.getBlendedColor(biome, 'dark', this.style.styleBlend);
    const lightColorHex = this.registry.getBlendedColor(biome, 'light', this.style.styleBlend);
    const darkColor = hexToRgb(darkColorHex)!;
    const lightColor = hexToRgb(lightColorHex)!;

    // Blend based on noise
    const t = (noiseVal + 1) / 2; // 0-1
    let r, g, b;

    if (t < 0.5) {
      const blend = t * 2;
      r = darkColor.r + (baseColor.r - darkColor.r) * blend;
      g = darkColor.g + (baseColor.g - darkColor.g) * blend;
      b = darkColor.b + (baseColor.b - darkColor.b) * blend;
    } else {
      const blend = (t - 0.5) * 2;
      r = baseColor.r + (lightColor.r - baseColor.r) * blend;
      g = baseColor.g + (lightColor.g - baseColor.g) * blend;
      b = baseColor.b + (lightColor.b - baseColor.b) * blend;
    }

    // Add pattern overlay if enabled
    if (this.style.showPatterns && biome.texture.pattern !== 'none') {
      const pattern = this.getPatternValue(
        px,
        py,
        biome.texture.pattern,
        biome.texture.patternDensity
      );

      const shadowColor = hexToRgb(
        this.registry.getBlendedColor(biome, 'shadow', this.style.styleBlend)
      )!;

      r = r * (1 - pattern * 0.3) + shadowColor.r * pattern * 0.3;
      g = g * (1 - pattern * 0.3) + shadowColor.g * pattern * 0.3;
      b = b * (1 - pattern * 0.3) + shadowColor.b * pattern * 0.3;
    }

    // Apply saturation
    if (this.style.saturation !== 1) {
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = gray + (r - gray) * this.style.saturation;
      g = gray + (g - gray) * this.style.saturation;
      b = gray + (b - gray) * this.style.saturation;
    }

    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    };
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
        return (line1 + line2) * density;
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
    this.terrainSprite?.destroy();
    this.debugGraphics?.destroy();
    this.cells = [];
    this.moistureMap = null;
    this.temperatureMap = null;
  }
}
