/**
 * Seeded Simplex Noise implementation
 * Based on Stefan Gustavson's implementation
 * Optimized for terrain generation
 */
export class SimplexNoise {
  private perm: Uint8Array;
  private permMod12: Uint8Array;

  // Gradient vectors for 2D
  private static readonly grad2 = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  // Skewing factors for 2D
  private static readonly F2 = 0.5 * (Math.sqrt(3) - 1);
  private static readonly G2 = (3 - Math.sqrt(3)) / 6;

  constructor(seed: number = 0) {
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    this.seed(seed);
  }

  /**
   * Initialize permutation table with seed
   */
  seed(seed: number): void {
    // Create base permutation
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Shuffle using seeded random
    let s = seed;
    for (let i = 255; i > 0; i--) {
      // Simple LCG for seeded random
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j]!, p[i]!];
    }

    // Extend to 512 for wrapping
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]!;
      this.permMod12[i] = this.perm[i]! % 12;
    }
  }

  /**
   * 2D Simplex noise
   * @returns Value in range [-1, 1]
   */
  noise2D(x: number, y: number): number {
    const { F2, G2, grad2 } = SimplexNoise;

    // Skew input space to determine simplex cell
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew back to (x, y) space
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;

    // Distances from cell origin
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex we're in
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    // Offsets for corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hash coordinates
    const ii = i & 255;
    const jj = j & 255;

    // Calculate contributions from corners
    let n0 = 0,
      n1 = 0,
      n2 = 0;

    // Corner 0
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = (this.permMod12[ii + (this.perm[jj] ?? 0)] ?? 0) % 8;
      const g = grad2[gi0];
      t0 *= t0;
      n0 = t0 * t0 * ((g?.[0] ?? 0) * x0 + (g?.[1] ?? 0) * y0);
    }

    // Corner 1
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = (this.permMod12[ii + i1 + (this.perm[jj + j1] ?? 0)] ?? 0) % 8;
      const g = grad2[gi1];
      t1 *= t1;
      n1 = t1 * t1 * ((g?.[0] ?? 0) * x1 + (g?.[1] ?? 0) * y1);
    }

    // Corner 2
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = (this.permMod12[ii + 1 + (this.perm[jj + 1] ?? 0)] ?? 0) % 8;
      const g = grad2[gi2];
      t2 *= t2;
      n2 = t2 * t2 * ((g?.[0] ?? 0) * x2 + (g?.[1] ?? 0) * y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  /**
   * Fractional Brownian Motion (multi-octave noise)
   */
  fbm(
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Ridged multi-fractal noise (good for mountain ridges)
   */
  ridged(
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      // Take absolute value and invert to create ridges
      let signal = this.noise2D(x * frequency, y * frequency);
      signal = 1 - Math.abs(signal);
      signal *= signal; // Square for sharper ridges

      total += signal * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * Turbulence (absolute value noise)
   */
  turbulence(
    x: number,
    y: number,
    octaves: number,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += Math.abs(this.noise2D(x * frequency, y * frequency)) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }
}
