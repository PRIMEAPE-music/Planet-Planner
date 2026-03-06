/// <reference lib="webworker" />

import {
  FeatureGenerator,
} from '@/core/generation/features/FeatureGenerator';
import type {
  FeatureGenerationConfig,
  FeatureGenerationResult,
} from '@/core/generation/features/types';
import type { WorkerInputMessage, WorkerOutputMessage } from './createWorkerTask';

declare const self: DedicatedWorkerGlobalScope;

/**
 * Input payload for the feature worker.
 */
export interface FeatureWorkerInput {
  config: FeatureGenerationConfig;
  width: number;
  height: number;
  landMask: Uint8Array;
  elevationData: Float32Array;
  plateMap?: Uint8Array;
}

/**
 * Feature generation Web Worker.
 *
 * Listens for a `generate` message, runs the FeatureGenerator with progress
 * reporting, and posts the result back — transferring TypedArray buffers for
 * zero-copy performance.
 */
self.addEventListener(
  'message',
  (e: MessageEvent<WorkerInputMessage<FeatureWorkerInput>>) => {
    const msg = e.data;

    if (msg.type !== 'generate') return;

    const { config, width, height, landMask, elevationData, plateMap } = msg.payload;

    try {
      const generator = new FeatureGenerator(config, width, height, (progress) => {
        const progressMsg: WorkerOutputMessage<never> = {
          type: 'progress',
          progress: progress.progress,
          stage: progress.stage,
        };
        self.postMessage(progressMsg);
      });

      generator
        .generate(landMask, elevationData, plateMap)
        .then((result: FeatureGenerationResult) => {
          const resultMsg: WorkerOutputMessage<FeatureGenerationResult> = {
            type: 'result',
            data: result,
          };

          // Collect transferable buffers for zero-copy transfer
          const transferables: Transferable[] = [
            result.elevationData.buffer,
            result.biomeData.buffer,
          ];

          // Transfer densityMap buffers from forest regions
          for (const forest of result.forests) {
            transferables.push(forest.densityMap.buffer);
          }

          self.postMessage(resultMsg, transferables);
        })
        .catch((err: unknown) => {
          const errorMsg: WorkerOutputMessage<never> = {
            type: 'error',
            message: err instanceof Error ? err.message : 'Feature generation failed',
          };
          self.postMessage(errorMsg);
        });
    } catch (err: unknown) {
      const errorMsg: WorkerOutputMessage<never> = {
        type: 'error',
        message: err instanceof Error ? err.message : 'Feature generation failed',
      };
      self.postMessage(errorMsg);
    }
  },
);
