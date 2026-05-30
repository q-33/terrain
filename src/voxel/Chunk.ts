import { BlockId } from "./blocks";

// Minecraft-shape chunk: 16 × 256 × 16 voxels, single byte each. Y is the
// vertical axis. Indexing order is (y * Z * X) + (z * X) + x so columns at
// a given (x, z) live in contiguous memory — the meshing loop walks columns
// the most, so column-contiguous wins a bit of cache.
export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_SIZE_Y = 256;
export const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

const STRIDE_Z = CHUNK_SIZE_X;
const STRIDE_Y = CHUNK_SIZE_X * CHUNK_SIZE_Z;

export const chunkIndex = (x: number, y: number, z: number): number =>
  y * STRIDE_Y + z * STRIDE_Z + x;

export class Chunk {
  // chunk grid coords (not world voxel coords). World voxel = chunkX*16 + x.
  readonly chunkX: number;
  readonly chunkZ: number;
  readonly data: Uint8Array;

  constructor(chunkX: number, chunkZ: number) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.data = new Uint8Array(CHUNK_VOLUME);
  }

  // Caller is responsible for bounds — these are on the hot path of the
  // mesher and we don't want a branch per voxel access. Use `getSafe` if
  // you might be off-bounds.
  get(x: number, y: number, z: number): BlockId {
    return this.data[chunkIndex(x, y, z)] as BlockId;
  }

  set(x: number, y: number, z: number, id: BlockId): void {
    this.data[chunkIndex(x, y, z)] = id;
  }

  // Returns Air for out-of-bounds reads so the mesher can treat the boundary
  // as "show that face." Real chunk neighbors are stitched at a higher level.
  getSafe(x: number, y: number, z: number): BlockId {
    if (
      x < 0 ||
      x >= CHUNK_SIZE_X ||
      y < 0 ||
      y >= CHUNK_SIZE_Y ||
      z < 0 ||
      z >= CHUNK_SIZE_Z
    ) {
      return BlockId.Air;
    }
    return this.data[chunkIndex(x, y, z)] as BlockId;
  }
}
