const perm = new Uint8Array(512);
const grad3: [number, number, number][] = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

const buildPerm = (seed = 42): void => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
  }
};

buildPerm();

const dot = (g: [number, number, number], x: number, y: number): number =>
  g[0] * x + g[1] * y;

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

const lerp = (a: number, b: number, t: number): number => a + t * (b - a);

export const perlin = (x: number, y: number): number => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y];
  const bb = perm[perm[X + 1] + Y + 1];
  return lerp(
    lerp(dot(grad3[aa % 12], xf, yf), dot(grad3[ba % 12], xf - 1, yf), u),
    lerp(
      dot(grad3[ab % 12], xf, yf - 1),
      dot(grad3[bb % 12], xf - 1, yf - 1),
      u,
    ),
    v,
  );
};

export const fractalNoise = (
  x: number,
  y: number,
  octaves = 6,
  lacunarity = 2.0,
  gain = 0.5,
): number => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    value += perlin(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / max;
};
