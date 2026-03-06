/**
 * Worker message protocol — incoming messages to the worker.
 */
export interface WorkerInputMessage<TInput = unknown> {
  type: 'generate';
  payload: TInput;
}

/**
 * Worker message protocol — outgoing messages from the worker.
 */
export type WorkerOutputMessage<TResult = unknown> =
  | { type: 'progress'; progress: number; stage: string }
  | { type: 'result'; data: TResult }
  | { type: 'error'; message: string };

/**
 * Wraps a Web Worker in a Promise-based API with progress callback support.
 *
 * - Sends `{ type: 'generate', payload }` to the worker.
 * - Resolves when the worker posts `{ type: 'result', data }`.
 * - Rejects when the worker posts `{ type: 'error', message }` or the worker
 *   itself fires an `error` event.
 * - Calls `onProgress` for every `{ type: 'progress', ... }` message.
 *
 * The returned promise also exposes a `cancel()` helper that terminates
 * the worker and rejects the promise.
 */
export interface CancellablePromise<T> extends Promise<T> {
  cancel: () => void;
}

export function createWorkerTask<TInput, TResult>(
  worker: Worker,
  input: TInput,
  onProgress?: (progress: number, stage: string) => void,
): CancellablePromise<TResult> {
  let rejectFn: ((reason: Error) => void) | null = null;
  let settled = false;

  const promise = new Promise<TResult>((resolve, reject) => {
    rejectFn = reject;

    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };

    const onMessage = (e: MessageEvent<WorkerOutputMessage<TResult>>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'progress':
          onProgress?.(msg.progress, msg.stage);
          break;

        case 'result':
          settled = true;
          cleanup();
          resolve(msg.data);
          break;

        case 'error':
          settled = true;
          cleanup();
          reject(new Error(msg.message));
          break;
      }
    };

    const onError = (e: ErrorEvent) => {
      settled = true;
      cleanup();
      reject(new Error(e.message || 'Worker error'));
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);

    // Post the input to the worker
    const message: WorkerInputMessage<TInput> = { type: 'generate', payload: input };
    worker.postMessage(message);
  }) as CancellablePromise<TResult>;

  promise.cancel = () => {
    if (!settled) {
      settled = true;
      worker.terminate();
      rejectFn?.(new Error('Worker task cancelled'));
    }
  };

  return promise;
}
