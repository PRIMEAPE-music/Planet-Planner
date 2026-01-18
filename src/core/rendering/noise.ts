/**
 * Simple 2D Perlin-like noise implementation
 * Used for procedural texture generation
 */

// Permutation table
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Initialize permutation table with seed
export function initNoise(seed: number = 0): void {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }

  // Shuffle with seed
  let n = seed;
  for (let i = 255; i > 0; i--) {
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    const j = n % (i + 1);
    [p[i]!, p[j]!] = [p[j]!, p[i]!];
  }

  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255]!;
  }
}

// Initialize with default seed
initNoise(42);

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const g = GRAD[hash & 7]!;
  return g[0]! * x + g[1]! * y;
}

/**
 * 2D Perlin noise
 * @returns value between -1 and 1
 */
export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);

  const u = fade(x);
  const v = fade(y);

  const A = PERM[X]! + Y;
  const B = PERM[X + 1]! + Y;

  return lerp(
    lerp(grad(PERM[A]!, x, y), grad(PERM[B]!, x - 1, y), u),
    lerp(grad(PERM[A + 1]!, x, y - 1), grad(PERM[B + 1]!, x - 1, y - 1), u),
    v
  );
}

/**
 * Fractal Brownian Motion (multi-octave noise)
 */
export function fbm(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Turbulence (absolute value FBM)
 */
export function turbulence(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(noise2D(x * frequency, y * frequency));
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

/**
 * Ridged noise (inverted absolute value)
 */
export function ridgedNoise(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let weight = 1;

  for (let i = 0; i < octaves; i++) {
    let signal = noise2D(x * frequency, y * frequency);
    signal = 1 - Math.abs(signal);
    signal *= signal * weight;
    weight = Math.min(1, Math.max(0, signal * 2));
    value += signal * amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value;
}
