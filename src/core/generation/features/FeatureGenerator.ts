import { MountainGenerator, DEFAULT_MOUNTAIN_CONFIG } from './MountainGenerator';
import { RiverGenerator, DEFAULT_RIVER_CONFIG } from './RiverGenerator';
import { LakeGenerator, DEFAULT_LAKE_CONFIG } from './LakeGenerator';
import { ForestGenerator, DEFAULT_FOREST_CONFIG } from './ForestGenerator';
import { ClimateGenerator, DEFAULT_CLIMATE_CONFIG } from './ClimateGenerator';
import { BiomeAssigner } from './BiomeAssigner';
import type {
  FeatureGenerationConfig,
  FeatureGenerationResult,
  FeatureGenerationProgress,
} from './types';

/**
 * Default feature generation configuration
 */
export const DEFAULT_FEATURE_CONFIG: FeatureGenerationConfig = {
  seed: Date.now(),
  mountains: DEFAULT_MOUNTAIN_CONFIG,
  rivers: DEFAULT_RIVER_CONFIG,
  lakes: DEFAULT_LAKE_CONFIG,
  forests: DEFAULT_FOREST_CONFIG,
  climate: DEFAULT_CLIMATE_CONFIG,
};

/**
 * Main feature generation orchestrator
 */
export class FeatureGenerator {
  private config: FeatureGenerationConfig;
  private onProgress?: (progress: FeatureGenerationProgress) => void;
  private width: number;
  private height: number;

  constructor(
    config: FeatureGenerationConfig,
    width: number,
    height: number,
    onProgress?: (progress: FeatureGenerationProgress) => void
  ) {
    this.config = config;
    this.width = width;
    this.height = height;
    this.onProgress = onProgress;
  }

  /**
   * Report progress
   */
  private report(
    stage: FeatureGenerationProgress['stage'],
    progress: number,
    message: string
  ): void {
    this.onProgress?.({ stage, progress, message });
  }

  /**
   * Generate all features
   */
  async generate(
    landMask: Uint8Array,
    elevationData: Float32Array,
    plateMap?: Uint8Array
  ): Promise<FeatureGenerationResult> {
    const startTime = performance.now();
    const { width, height, config } = this;

    // Work with copies to not modify originals
    const workingElevation = new Float32Array(elevationData);
    const workingLandMask = new Uint8Array(landMask);

    // Step 1: Generate climate
    this.report('climate', 0, 'Simulating climate...');
    const climateGenerator = new ClimateGenerator(
      config.climate,
      width,
      height,
      config.seed
    );
    const climateData = climateGenerator.generate(workingLandMask, workingElevation);
    this.report('climate', 1, 'Climate simulation complete');

    // Step 2: Generate mountains
    let mountainRanges: FeatureGenerationResult['mountainRanges'] = [];
    let peaks: FeatureGenerationResult['peaks'] = [];

    if (config.mountains.enabled) {
      this.report('mountains', 0, 'Generating mountains...');
      const mountainGenerator = new MountainGenerator(
        config.mountains,
        width,
        height,
        config.seed
      );
      const mountainResult = mountainGenerator.generate(
        workingLandMask,
        workingElevation,
        plateMap
      );
      mountainRanges = mountainResult.ranges;
      peaks = mountainResult.peaks;
      this.report('mountains', 1, 'Mountains complete');
    }

    // Step 3: Generate rivers
    let rivers: FeatureGenerationResult['rivers'] = [];

    if (config.rivers.enabled) {
      this.report('rivers', 0, 'Generating rivers...');
      const riverGenerator = new RiverGenerator(
        config.rivers,
        width,
        height,
        config.seed
      );
      const riverResult = riverGenerator.generate(workingLandMask, workingElevation);
      rivers = riverResult.rivers;
      this.report('rivers', 1, 'Rivers complete');
    }

    // Step 4: Generate lakes
    let lakes: FeatureGenerationResult['lakes'] = [];

    if (config.lakes.enabled) {
      this.report('lakes', 0, 'Generating lakes...');
      const lakeGenerator = new LakeGenerator(
        config.lakes,
        width,
        height,
        config.seed
      );
      const lakeResult = lakeGenerator.generate(
        workingLandMask,
        workingElevation,
        rivers
      );
      lakes = lakeResult.lakes;
      // Update land mask with lakes
      workingLandMask.set(lakeResult.updatedLandMask);
      this.report('lakes', 1, 'Lakes complete');
    }

    // Step 5: Generate forests
    let forests: FeatureGenerationResult['forests'] = [];
    let forestDensity = new Float32Array(width * height);

    if (config.forests.enabled) {
      this.report('forests', 0, 'Generating forests...');
      const forestGenerator = new ForestGenerator(
        config.forests,
        width,
        height,
        config.seed
      );
      const forestResult = forestGenerator.generate(
        workingLandMask,
        workingElevation,
        climateData
      );
      forests = forestResult.forests;
      forestDensity = new Float32Array(forestResult.densityMap);
      this.report('forests', 1, 'Forests complete');
    }

    // Step 6: Assign biomes
    this.report('biomes', 0, 'Assigning biomes...');
    const biomeAssigner = new BiomeAssigner(width, height);
    const biomeData = biomeAssigner.assign(
      workingLandMask,
      workingElevation,
      climateData,
      forestDensity
    );
    this.report('biomes', 1, 'Biomes assigned');

    // Finalize
    this.report('finalizing', 0, 'Finalizing...');
    const generationTime = performance.now() - startTime;
    this.report('finalizing', 1, 'Complete');

    return {
      mountainRanges,
      peaks,
      rivers,
      lakes,
      forests,
      climateData,
      elevationData: workingElevation,
      biomeData,
      metadata: {
        mountainCount: peaks.length,
        riverCount: rivers.length,
        lakeCount: lakes.length,
        forestCoverage: this.calculateForestCoverage(forestDensity, workingLandMask),
        generationTime,
      },
    };
  }

  /**
   * Calculate forest coverage percentage
   */
  private calculateForestCoverage(
    forestDensity: Float32Array,
    landMask: Uint8Array
  ): number {
    let landCount = 0;
    let forestCount = 0;

    for (let i = 0; i < landMask.length; i++) {
      if (landMask[i] === 1) {
        landCount++;
        const density = forestDensity[i] ?? 0;
        if (density > 0.5) {
          forestCount++;
        }
      }
    }

    return landCount > 0 ? forestCount / landCount : 0;
  }
}
