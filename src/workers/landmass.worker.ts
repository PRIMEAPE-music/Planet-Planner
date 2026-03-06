/// <reference lib="webworker" />

import { LandmassGenerator } from '@/core/generation/LandmassGenerator';
import type { LandmassGenerationConfig, GenerationResult } from '@/core/generation/types';
import type { WorkerInputMessage, WorkerOutputMessage } from './createWorkerTask';

declare const self: DedicatedWorkerGlobalScope;

/**
 * Input payload for the landmass worker.
 */
export interface LandmassWorkerInput {
  config: LandmassGenerationConfig;
}

/**
 * Landmass generation Web Worker.
 *
 * Listens for a `generate` message, runs the LandmassGenerator with progress
 * reporting, and posts the result back — transferring TypedArray buffers for
 * zero-copy performance.
 */
self.addEventListener(
  'message',
  (e: MessageEvent<WorkerInputMessage<LandmassWorkerInput>>) => {
    const msg = e.data;

    if (msg.type !== 'generate') return;

    const { config } = msg.payload;

    try {
      const generator = new LandmassGenerator(config, (progress) => {
        const progressMsg: WorkerOutputMessage<never> = {
          type: 'progress',
          progress: progress.progress,
          stage: progress.stage,
        };
        self.postMessage(progressMsg);
      });

      // LandmassGenerator.generate() returns a Promise (it is async)
      generator
        .generate()
        .then((result: GenerationResult) => {
          const resultMsg: WorkerOutputMessage<GenerationResult> = {
            type: 'result',
            data: result,
          };

          // Collect transferable buffers for zero-copy transfer
          const transferables: Transferable[] = [
            result.heightmap.buffer,
            result.landMask.buffer,
          ];
          if (result.plateMap) {
            transferables.push(result.plateMap.buffer);
          }

          self.postMessage(resultMsg, transferables);
        })
        .catch((err: unknown) => {
          const errorMsg: WorkerOutputMessage<never> = {
            type: 'error',
            message: err instanceof Error ? err.message : 'Landmass generation failed',
          };
          self.postMessage(errorMsg);
        });
    } catch (err: unknown) {
      const errorMsg: WorkerOutputMessage<never> = {
        type: 'error',
        message: err instanceof Error ? err.message : 'Landmass generation failed',
      };
      self.postMessage(errorMsg);
    }
  },
);
