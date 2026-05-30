import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from "./Chunk";
import { BlockId, blockOf, faceVisible } from "./blocks";
import { tileUVBounds } from "./textures";

// World-space block lookup. Lets the mesher consult neighbor chunks when
// testing boundary faces — without this, every chunk's +x/-x/+z/-z border
// would emit ~10-20% wasted faces buried inside the neighbor's terrain.
export type WorldBlockGetter = (
  worldX: number,
  worldY: number,
  worldZ: number,
) => BlockId;

// Face direction index → (normal, four CCW corner offsets relative to the
// block's min corner). Order matches BlockType.faceTiles:
// 0:+x, 1:-x, 2:+y, 3:-y, 4:+z, 5:-z.
const FACE_DEFS: ReadonlyArray<{
  normal: readonly [number, number, number];
  corners: ReadonlyArray<readonly [number, number, number]>;
  dx: number;
  dy: number;
  dz: number;
}> = [
  {
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

// For each (face, corner), the three voxel offsets relative to the source
// block to sample when computing ambient occlusion: two "side" neighbors on
// the perpendicular axes of the corner, and the diagonal "corner" voxel
// touching both sides. All three live one step out along the face normal
// (i.e., on the visible side of the face), so this samples the wedge of
// 3 blocks that would shadow this vertex.
type AOOffset = readonly [number, number, number];
type FaceAOOffsets = readonly [AOOffset, AOOffset, AOOffset];

const computeAOOffsets = (): readonly (readonly FaceAOOffsets[])[] => {
  const result: FaceAOOffsets[][] = [];
  for (let f = 0; f < 6; f++) {
    const def = FACE_DEFS[f];
    const [nx, ny, nz] = def.normal;
    // The two axes orthogonal to the face normal.
    const freeAxes: number[] = [];
    if (nx === 0) {
      freeAxes.push(0);
    }
    if (ny === 0) {
      freeAxes.push(1);
    }
    if (nz === 0) {
      freeAxes.push(2);
    }
    const [a1, a2] = freeAxes;
    const faceArr: FaceAOOffsets[] = [];
    for (let c = 0; c < 4; c++) {
      const corner = def.corners[c];
      // Direction signs along each free axis: +1 toward higher voxel,
      // -1 toward lower, derived from the corner's 0/1 position on that axis.
      const d1 = corner[a1] === 1 ? 1 : -1;
      const d2 = corner[a2] === 1 ? 1 : -1;
      const side1: [number, number, number] = [nx, ny, nz];
      const side2: [number, number, number] = [nx, ny, nz];
      const diag: [number, number, number] = [nx, ny, nz];
      side1[a1] += d1;
      side2[a2] += d2;
      diag[a1] += d1;
      diag[a2] += d2;
      faceArr.push([side1, side2, diag]);
    }
    result.push(faceArr);
  }
  return result;
};

const AO_OFFSETS = computeAOOffsets();

// Per-vertex AO algorithm from the classic Mr. Doob / 0FPS writeup:
//   level 0 (darkest) when both sides are solid (the corner is fully wrapped);
//   otherwise 3 - sum(side1, side2, diag) gives 1..3.
// We map level [0..3] to a brightness multiplier [0.55..1.00] — light enough
// to keep textures readable, dark enough that corners read as inset.
const aoBrightness = (s1: number, s2: number, diag: number): number => {
  const level = s1 && s2 ? 0 : 3 - (s1 + s2 + diag);
  return 0.55 + 0.15 * level;
};

// UV-corner pattern shared by all faces. Vertex i takes (uFrac, vFrac) where
// 0 = tile uMin/vMin, 1 = tile uMax/vMax. The CCW corner order in FACE_DEFS
// puts the +Y end of side faces at vertices 1 and 2, so this pattern lands
// grass-side's top strip on the +Y end of the cube naturally.
const UV_PATTERN: readonly (readonly [number, number])[] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

export type ChunkMesh = {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array; // grayscale AO modulation (multiplies texture)
  uvs: Float32Array;
  vertexCount: number;
};

// Per-face culling with textured UVs and per-vertex ambient occlusion. AO
// is the cheap voxel-game trick that darkens corner pixels by how many of
// the three blocks touching that corner exist — gives the world a sense of
// inset depth without any actual shadow mapping. Anisotropic triangulation
// flip prevents the "X-shaped seam" artifact where bilinear interpolation
// across a quad's diagonal would otherwise look wrong.
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
  const uvs: number[] = [];

  const originX = chunk.chunkX * CHUNK_SIZE_X;
  const originZ = chunk.chunkZ * CHUNK_SIZE_Z;

  const isSolid = (wx: number, wy: number, wz: number): number =>
    blockOf(getBlock(wx, wy, wz)).solid ? 1 : 0;

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

          const [nx, ny, nz] = def.normal;
          const tileBounds = tileUVBounds(block.faceTiles[face]);
          const [uMin, vMin, uMax, vMax] = tileBounds;

          // Compute AO for all four corners.
          const ao: [number, number, number, number] = [0, 0, 0, 0];
          const faceOffsets = AO_OFFSETS[face];
          for (let v = 0; v < 4; v++) {
            const [oS1, oS2, oDg] = faceOffsets[v];
            const s1 = isSolid(
              originX + x + oS1[0],
              y + oS1[1],
              originZ + z + oS1[2],
            );
            const s2 = isSolid(
              originX + x + oS2[0],
              y + oS2[1],
              originZ + z + oS2[2],
            );
            const dg = isSolid(
              originX + x + oDg[0],
              y + oDg[1],
              originZ + z + oDg[2],
            );
            ao[v] = aoBrightness(s1, s2, dg);
          }

          // Anisotropic flip: triangulate along the diagonal whose endpoints
          // are brighter, so the shadow gradient lies along the triangle cut
          // rather than across the bilinear interpolation seam.
          const flipDiag = ao[0] + ao[2] > ao[1] + ao[3];
          const tris = flipDiag
            ? [
                [1, 2, 3],
                [1, 3, 0],
              ]
            : [
                [0, 1, 2],
                [0, 2, 3],
              ];

          for (const tri of tris) {
            for (const vi of tri) {
              const c = def.corners[vi];
              positions.push(x + c[0], y + c[1], z + c[2]);
              normals.push(nx, ny, nz);
              const [uFrac, vFrac] = UV_PATTERN[vi];
              uvs.push(uFrac === 0 ? uMin : uMax, vFrac === 0 ? vMin : vMax);
              const b = ao[vi];
              colors.push(b, b, b);
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
    uvs: new Float32Array(uvs),
    vertexCount: positions.length / 3,
  };
};
