import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "./Chunk";
import { BlockId } from "./blocks";
import { fractalNoise } from "../noise";

// Voxel world's vertical scale. Sea level sits at 64; mountains can reach
// up to ~110, oceans down to ~50. Snow caps appear above ~100.
const SEA_LEVEL = 64;
const SAND_HEIGHT = 66;
const SNOW_HEIGHT = 100;

// Surface noise tuned for chunk-sized features. The frequency here is
// independent of the smooth-terrain settings because voxels read at a
// different scale — each voxel is 1 unit.
const NOISE_FREQUENCY = 0.012;
const NOISE_OCTAVES = 5;
const NOISE_LACUNARITY = 2.1;
const NOISE_GAIN = 0.5;
const HEIGHT_AMPLITUDE = 40;
const HEIGHT_BASE = 60;

// Map FBM noise sampled at world (x, z) to a column's surface height.
// Heights are integers in [1, CHUNK_SIZE_Y-1] so blocks always have a floor
// below and air above (no edge cases at top/bottom of the world).
const surfaceHeightAt = (worldX: number, worldZ: number): number => {
  const n = fractalNoise(
    worldX * NOISE_FREQUENCY,
    worldZ * NOISE_FREQUENCY,
    NOISE_OCTAVES,
    NOISE_LACUNARITY,
    NOISE_GAIN,
  );
  const h = Math.round(HEIGHT_BASE + n * HEIGHT_AMPLITUDE);
  if (h < 1) {
    return 1;
  }
  if (h >= CHUNK_SIZE_Y - 1) {
    return CHUNK_SIZE_Y - 2;
  }
  return h;
};

// Pick the surface block for a column based on its terrain height.
// Beaches at the water edge, snow at the peaks, grass elsewhere.
const surfaceBlockFor = (h: number): BlockId => {
  if (h >= SNOW_HEIGHT) {
    return BlockId.Snow;
  }
  if (h <= SAND_HEIGHT) {
    return BlockId.Sand;
  }
  return BlockId.Grass;
};

// Generate a fully populated chunk. Stone fills the bulk, three layers of
// dirt sit beneath the surface (or sand under beaches), and water fills any
// column whose surface is below sea level.
export const generateChunk = (chunkX: number, chunkZ: number): Chunk => {
  const chunk = new Chunk(chunkX, chunkZ);

  for (let z = 0; z < CHUNK_SIZE_Z; z++) {
    const worldZ = chunkZ * CHUNK_SIZE_Z + z;
    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      const worldX = chunkX * CHUNK_SIZE_X + x;
      const h = surfaceHeightAt(worldX, worldZ);
      const surface = surfaceBlockFor(h);
      const subsurface = surface === BlockId.Sand ? BlockId.Sand : BlockId.Dirt;

      // Stone column up to a few blocks below the surface.
      for (let y = 0; y < h - 3; y++) {
        chunk.set(x, y, z, BlockId.Stone);
      }
      // Subsurface (dirt or sand) just below the cap.
      for (let y = Math.max(0, h - 3); y < h; y++) {
        chunk.set(x, y, z, subsurface);
      }
      // Cap block.
      chunk.set(x, h, z, surface);

      // Fill with water from the surface up to sea level for submerged columns.
      if (h < SEA_LEVEL) {
        for (let y = h + 1; y <= SEA_LEVEL; y++) {
          chunk.set(x, y, z, BlockId.Water);
        }
      }
    }
  }

  return chunk;
};

// World-coord helper for the (eventual) player physics + grounding. Same
// surface formula as the generator — kept in sync by sharing this function
// rather than duplicating constants.
export const worldSurfaceHeight = (worldX: number, worldZ: number): number =>
  surfaceHeightAt(worldX, worldZ);
