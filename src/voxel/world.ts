import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "./Chunk";
import { BlockId, blockOf } from "./blocks";
import { generateChunk } from "./worldGen";

// Single source of truth for the loaded chunks and their dirty state.
// Mutations (setBlock, ensureChunk) bump a version counter and notify
// subscribers so React (via useSyncExternalStore) re-renders dependents.
//
// The mesher reads through getBlock, which crosses chunk boundaries
// transparently — so boundary faces emit only when the actual neighbor
// block is non-occluding, not "always" as a naive in-chunk lookup would.
export class World {
  private chunks = new Map<string, Chunk>();
  private dirty = new Set<string>();
  private listeners = new Set<() => void>();
  private versionCounter = 0;

  private chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  // useSyncExternalStore subscription. Returns the unsubscribe function.
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getVersion = (): number => this.versionCounter;

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.chunkKey(cx, cz));
  }

  // Lazily creates a chunk if not yet loaded. Generated chunks are marked
  // dirty so the renderer meshes them on its next pass.
  ensureChunk(cx: number, cz: number): Chunk {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = generateChunk(cx, cz);
      this.chunks.set(key, chunk);
      this.dirty.add(key);
    }
    return chunk;
  }

  // World-coordinate read. Out-of-bounds Y returns Air; un-generated chunks
  // also return Air so the edge of the loaded world reads as open sky.
  getBlock(worldX: number, worldY: number, worldZ: number): BlockId {
    if (worldY < 0 || worldY >= CHUNK_SIZE_Y) {
      return BlockId.Air;
    }
    const cx = Math.floor(worldX / CHUNK_SIZE_X);
    const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) {
      return BlockId.Air;
    }
    const lx = worldX - cx * CHUNK_SIZE_X;
    const lz = worldZ - cz * CHUNK_SIZE_Z;
    return chunk.get(lx, worldY, lz);
  }

  // World-coordinate write. Dirties the chunk and any neighbors whose
  // boundary faces depend on the edited block. Notifies subscribers so
  // the renderer re-meshes the affected chunks.
  setBlock(worldX: number, worldY: number, worldZ: number, id: BlockId): void {
    if (worldY < 0 || worldY >= CHUNK_SIZE_Y) {
      return;
    }
    const cx = Math.floor(worldX / CHUNK_SIZE_X);
    const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
    const chunk = this.ensureChunk(cx, cz);
    const lx = worldX - cx * CHUNK_SIZE_X;
    const lz = worldZ - cz * CHUNK_SIZE_Z;
    chunk.set(lx, worldY, lz, id);
    this.dirty.add(this.chunkKey(cx, cz));

    if (lx === 0) {
      this.dirty.add(this.chunkKey(cx - 1, cz));
    }
    if (lx === CHUNK_SIZE_X - 1) {
      this.dirty.add(this.chunkKey(cx + 1, cz));
    }
    if (lz === 0) {
      this.dirty.add(this.chunkKey(cx, cz - 1));
    }
    if (lz === CHUNK_SIZE_Z - 1) {
      this.dirty.add(this.chunkKey(cx, cz + 1));
    }

    this.notify();
  }

  // Atomically take and clear the dirty set. The renderer consumes this to
  // know which chunks need re-meshing — clean chunks keep their cached geo.
  takeDirty(): string[] {
    const out = Array.from(this.dirty);
    this.dirty.clear();
    return out;
  }

  forEachChunk(cb: (chunk: Chunk, cx: number, cz: number) => void): void {
    this.chunks.forEach((chunk) => {
      cb(chunk, chunk.chunkX, chunk.chunkZ);
    });
  }

  // Topmost truly-solid block in a column, or -1 if none. "Solid" here uses
  // blocks.solid (not "not air") so water and other non-solids don't hold
  // the player up — important once the player can dig the block under them.
  topSolidY(worldX: number, worldZ: number): number {
    const cx = Math.floor(worldX / CHUNK_SIZE_X);
    const cz = Math.floor(worldZ / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) {
      return -1;
    }
    const lx = worldX - cx * CHUNK_SIZE_X;
    const lz = worldZ - cz * CHUNK_SIZE_Z;
    for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
      if (blockOf(chunk.get(lx, y, lz)).solid) {
        return y;
      }
    }
    return -1;
  }

  private notify(): void {
    this.versionCounter++;
    this.listeners.forEach((cb) => cb());
  }
}

// Helper to populate a fresh world with the initial loaded area. Same 7x7
// grid as Phase A2; chunk streaming comes later.
export const populateInitialChunks = (world: World, radius = 3): void => {
  for (let cz = -radius; cz <= radius; cz++) {
    for (let cx = -radius; cx <= radius; cx++) {
      world.ensureChunk(cx, cz);
    }
  }
};
