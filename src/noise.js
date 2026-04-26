// Simplex-style noise via a seeded permutation table
const perm = new Uint8Array(512)
const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
]

function buildPerm(seed = 42) {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let s = seed
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]]
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
}

buildPerm()

function dot(g, x, y) { return g[0] * x + g[1] * y }

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
function lerp(a, b, t) { return a + t * (b - a) }

export function perlin(x, y) {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const u = fade(xf)
  const v = fade(yf)
  const aa = perm[perm[X] + Y]
  const ab = perm[perm[X] + Y + 1]
  const ba = perm[perm[X + 1] + Y]
  const bb = perm[perm[X + 1] + Y + 1]
  return lerp(
    lerp(dot(grad3[aa % 12], xf, yf),     dot(grad3[ba % 12], xf - 1, yf),     u),
    lerp(dot(grad3[ab % 12], xf, yf - 1), dot(grad3[bb % 12], xf - 1, yf - 1), u),
    v
  )
}

export function fbm(x, y, octaves = 6, lacunarity = 2.0, gain = 0.5) {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let max = 0
  for (let i = 0; i < octaves; i++) {
    value += perlin(x * frequency, y * frequency) * amplitude
    max += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return value / max
}
