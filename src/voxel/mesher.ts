import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "./Chunk";
import { BlockId, blockOf, faceVisible } from "./blocks";

// World-space block lookup. Lets the mesher consult neighbor chunks when
// testing boundary faces — without this, every chunk's +x/-x/+z/-z border
// would emit ~10-20% wasted faces buried inside the neighbor's terrain.
export type WorldBlockGetter = (
  worldX: number,
  worldY: number,
  worldZ: number,
) => BlockId;

// Face direction index → (normal, four CCW corner offsets relative to the
// block's min corner). Order matches BlockType.faceColors:
// 0:+x, 1:-x, 2:+y, 3:-y, 4:+z, 5:-z.
//
// Each corner is a unit-cube vertex (0/1 components). CCW winding from
// outside the face so normals point outward and lighting reads correctly.
const FACE_DEFS: ReadonlyArray<{
  normal: readonly [number, number, number];
  corners: ReadonlyArray<readonly [number, number, number]>;
  // Neighbor offset to test for occlusion.
  dx: number;
  dy: number;
  dz: number;
}> = [
  {
    // +x
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    dx: 1,
    dy: 0,
    dz: 0,
  },
  {
    // -x
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    dx: -1,
    dy: 0,
    dz: 0,
  },
  {
    // +y (top)
    normal: [0, 1, 0],
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1],
    ],
    dx: 0,
    dy: 1,
    dz: 0,
  },
  {
    // -y (bottom)
    normal: [0, -1, 0],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 0, 0],
      [0, 0, 0],
    ],
    dx: 0,
    dy: -1,
    dz: 0,
  },
  {
    // +z
    normal: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    dx: 0,
    dy: 0,
    dz: 1,
  },
  {
    // -z
    normal: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
    dx: 0,
    dy: 0,
    dz: -1,
  },
];

export type ChunkMesh = {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  // Vertex count == positions.length / 3. Stored explicitly so the caller
  // can construct BufferAttributes without recomputing.
  vertexCount: number;
};

// Per-face culling: only emit a face when its neighbor block doesn't occlude
// it. No greedy meshing yet — that's a Phase C optimization. Output is a
// non-indexed triangle soup with flat shading (each face has one normal and
// one color shared by its six vertices).
//
// Geometry is positioned in chunk-local coords (0..CHUNK_SIZE on each axis);
// callers translate by chunk world origin when placing the mesh. Neighbor
// lookups go through `getBlock` (world coords) so chunk-boundary faces see
// the actual neighbor chunk instead of treating the border as open air.
export const meshChunk = (
  chunk: Chunk,
  getBlock: WorldBlockGetter,
): ChunkMesh => {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];

  const originX = chunk.chunkX * CHUNK_SIZE_X;
  const originZ = chunk.chunkZ * CHUNK_SIZE_Z;

  for (let y = 0; y < CHUNK_SIZE_Y; y++) {
    for (let z = 0; z < CHUNK_SIZE_Z; z++) {
      for (let x = 0; x < CHUNK_SIZE_X; x++) {
        const here = chunk.get(x, y, z);
        if (here === BlockId.Air) {
          continue;
        }
        const block = blockOf(here);

        for (let face = 0; face < 6; face++) {
          const def = FACE_DEFS[face];
          const neighbor = getBlock(
            originX + x + def.dx,
            y + def.dy,
            originZ + z + def.dz,
          );
          if (!faceVisible(here, neighbor)) {
            continue;
          }

          const color = block.faceColors[face];
          const [nx, ny, nz] = def.normal;
          const c = def.corners;

          // Two triangles: (0,1,2) and (0,2,3). Each emits 3 verts.
          for (const [vi0, vi1, vi2] of [
            [0, 1, 2],
            [0, 2, 3],
          ] as const) {
            for (const vi of [vi0, vi1, vi2]) {
              positions.push(x + c[vi][0], y + c[vi][1], z + c[vi][2]);
              normals.push(nx, ny, nz);
              colors.push(color[0], color[1], color[2]);
            }
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    vertexCount: positions.length / 3,
  };
};
