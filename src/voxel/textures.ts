import * as THREE from "three";

// Single 256×256 atlas of 16×16 pixel tiles arranged as a 16×16 grid.
// Tiles are addressed by (col, row); the mesher reads these and emits the
// matching UV bounds per face.
const TILE_PX = 16;
const ATLAS_COLS = 16;
const ATLAS_PX = TILE_PX * ATLAS_COLS;

export type AtlasTile = readonly [number, number];

// Layout — keep these dense and contiguous. Add new tiles by extending the
// next free column; later rows are reserved for variant/animated tiles.
export const TILES = {
  stone: [0, 0] as AtlasTile,
  dirt: [1, 0] as AtlasTile,
  grassTop: [2, 0] as AtlasTile,
  grassSide: [3, 0] as AtlasTile,
  sand: [4, 0] as AtlasTile,
  water: [5, 0] as AtlasTile,
  woodTop: [6, 0] as AtlasTile,
  woodSide: [7, 0] as AtlasTile,
  leaves: [8, 0] as AtlasTile,
  snow: [9, 0] as AtlasTile,
} as const;

// UV bounds for a tile (col, row) as [uMin, vMin, uMax, vMax]. Texture's
// default flipY=true means canvas row 0 (top) becomes the high-v end of UV
// space, so we invert v here.
export const tileUVBounds = (
  tile: AtlasTile,
): readonly [number, number, number, number] => {
  const [col, row] = tile;
  const uMin = (col * TILE_PX) / ATLAS_PX;
  const uMax = ((col + 1) * TILE_PX) / ATLAS_PX;
  const vMax = 1 - (row * TILE_PX) / ATLAS_PX;
  const vMin = 1 - ((row + 1) * TILE_PX) / ATLAS_PX;
  return [uMin, vMin, uMax, vMax];
};

// Deterministic 2D hash → float in [0, 1). Cheap integer mixer good enough
// for textural noise (not crypto-grade; we just want stable pixel speckle).
const hash01 = (x: number, y: number, seed: number): number => {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
};

const clamp255 = (v: number): number =>
  v < 0 ? 0 : v > 255 ? 255 : Math.round(v);

type Painter = (x: number, y: number) => [number, number, number];

const paintTileAt = (
  ctx: CanvasRenderingContext2D,
  tile: AtlasTile,
  paint: Painter,
): void => {
  const [col, row] = tile;
  const img = ctx.createImageData(TILE_PX, TILE_PX);
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * TILE_PX + x) * 4;
      img.data[i] = clamp255(r);
      img.data[i + 1] = clamp255(g);
      img.data[i + 2] = clamp255(b);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, col * TILE_PX, row * TILE_PX);
};

// --- Per-tile painters. Each takes a (x, y) ∈ [0, 16) pixel coord within
// the tile and returns an [r, g, b] color in 0–255. Hash-based variation
// keeps them looking like noisy minecraft textures rather than flat blocks.

const stone: Painter = (x, y) => {
  const n = (hash01(x, y, 7) - 0.5) * 38;
  const v = 132 + n;
  return [v, v + 1, v + 3];
};

const dirt: Painter = (x, y) => {
  const n = (hash01(x, y, 11) - 0.5) * 34;
  return [108 + n, 78 + n * 0.85, 52 + n * 0.7];
};

const grassTop: Painter = (x, y) => {
  const n = (hash01(x, y, 23) - 0.5) * 36;
  // A handful of darker pixels to read as blades, not flat felt.
  const blade = hash01(x, y, 41) > 0.88 ? -28 : 0;
  return [70 + n * 0.6 + blade, 142 + n + blade, 56 + n * 0.6 + blade];
};

const grassSide: Painter = (x, y) => {
  // Top 4 px = grass; ragged transition at row 4–5; rest = dirt.
  const grassEdge =
    y < 4 ? true : y < 6 ? hash01(x, y, 53) > (y - 4) / 2.0 : false;
  if (grassEdge) {
    return grassTop(x, y);
  }
  return dirt(x, y);
};

const sand: Painter = (x, y) => {
  const n = (hash01(x, y, 31) - 0.5) * 24;
  // Occasional darker grains.
  const grain = hash01(x, y, 67) > 0.92 ? -22 : 0;
  return [212 + n + grain, 192 + n + grain, 134 + n * 0.8 + grain];
};

const water: Painter = (x, y) => {
  // Horizontal banding suggests gentle ripple without animation.
  const band = Math.sin((y + x * 0.3) * 0.9) * 10;
  const n = (hash01(x, y, 13) - 0.5) * 12;
  return [40 + n, 92 + n + band, 158 + n + band * 1.4];
};

const woodTop: Painter = (x, y) => {
  // Concentric rings around tile center.
  const cx = 7.5;
  const cy = 7.5;
  const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const ring = Math.sin(d * 1.6) * 20;
  const n = (hash01(x, y, 17) - 0.5) * 14;
  return [120 + ring + n, 88 + ring * 0.8 + n, 56 + ring * 0.6 + n];
};

const woodSide: Painter = (x, y) => {
  // Vertical grain — column-based dark stripes.
  const col = (Math.sin(x * 2.3) + Math.sin(x * 0.9 + y * 0.05)) * 12;
  const n = (hash01(x, y, 19) - 0.5) * 14;
  return [110 + col + n, 76 + col * 0.8 + n, 48 + col * 0.6 + n];
};

const leaves: Painter = (x, y) => {
  // Dense cross-hatched darks for a leafy mass.
  const dark =
    hash01(x, y, 29) > 0.55 ? -22 : hash01(x, y, 37) > 0.78 ? -38 : 0;
  const n = (hash01(x, y, 5) - 0.5) * 16;
  return [54 + n * 0.6 + dark, 104 + n + dark, 44 + n * 0.6 + dark];
};

const snow: Painter = (x, y) => {
  const n = (hash01(x, y, 47) - 0.5) * 10;
  // Very faint cool tint.
  return [232 + n, 238 + n, 244 + n];
};

// Build the atlas once at startup. Procedural so we ship no PNG assets —
// the look is "noisy minecraft" without any external download or licensing.
export const buildAtlasTexture = (): THREE.Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_PX;
  canvas.height = ATLAS_PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("textures: 2d canvas context unavailable");
  }
  // Fill unused tiles with magenta so missing-tile bugs surface visually.
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(0, 0, ATLAS_PX, ATLAS_PX);

  paintTileAt(ctx, TILES.stone, stone);
  paintTileAt(ctx, TILES.dirt, dirt);
  paintTileAt(ctx, TILES.grassTop, grassTop);
  paintTileAt(ctx, TILES.grassSide, grassSide);
  paintTileAt(ctx, TILES.sand, sand);
  paintTileAt(ctx, TILES.water, water);
  paintTileAt(ctx, TILES.woodTop, woodTop);
  paintTileAt(ctx, TILES.woodSide, woodSide);
  paintTileAt(ctx, TILES.leaves, leaves);
  paintTileAt(ctx, TILES.snow, snow);

  const tex = new THREE.CanvasTexture(canvas);
  // NearestFilter + no mipmaps = crisp Minecraft pixels, no blurring or
  // texture bleed between neighboring atlas tiles.
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
};
