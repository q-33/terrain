import { RGB } from "../types";

// Single byte per voxel. Keep ids dense and small — block lookups are on the
// hot path of the mesher and we want them to fit in L1 with room to spare.
export const enum BlockId {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Water = 5,
  Wood = 6,
  Leaves = 7,
  Snow = 8,
}

// Per-face colors so blocks like grass can have a green top, dirt sides, and
// dirt bottom. Faces share a single color for plain blocks — the mesher just
// indexes by face direction (0=+x, 1=-x, 2=+y, 3=-y, 4=+z, 5=-z).
export type BlockFaceColors = readonly [RGB, RGB, RGB, RGB, RGB, RGB];

export type BlockType = {
  id: BlockId;
  name: string;
  // Solid blocks occlude neighbor faces and block movement. Air and water
  // are non-solid; leaves are solid but transparent.
  solid: boolean;
  // Transparent blocks still emit faces against other transparent blocks of
  // a different type (so leaves render against air, water against air).
  transparent: boolean;
  faceColors: BlockFaceColors;
};

const uniformFace = (c: RGB): BlockFaceColors => [c, c, c, c, c, c];

const grassFaces: BlockFaceColors = [
  [0.4, 0.32, 0.22], // +x side (dirt with grass overhang)
  [0.4, 0.32, 0.22], // -x side
  [0.32, 0.58, 0.22], // +y top (grass)
  [0.36, 0.28, 0.2], // -y bottom (dirt)
  [0.4, 0.32, 0.22], // +z side
  [0.4, 0.32, 0.22], // -z side
];

export const BLOCKS: readonly BlockType[] = [
  {
    id: BlockId.Air,
    name: "air",
    solid: false,
    transparent: true,
    faceColors: uniformFace([0, 0, 0]),
  },
  {
    id: BlockId.Grass,
    name: "grass",
    solid: true,
    transparent: false,
    faceColors: grassFaces,
  },
  {
    id: BlockId.Dirt,
    name: "dirt",
    solid: true,
    transparent: false,
    faceColors: uniformFace([0.4, 0.3, 0.2]),
  },
  {
    id: BlockId.Stone,
    name: "stone",
    solid: true,
    transparent: false,
    faceColors: uniformFace([0.5, 0.5, 0.52]),
  },
  {
    id: BlockId.Sand,
    name: "sand",
    solid: true,
    transparent: false,
    faceColors: uniformFace([0.83, 0.76, 0.55]),
  },
  {
    id: BlockId.Water,
    name: "water",
    solid: false,
    transparent: true,
    faceColors: uniformFace([0.15, 0.38, 0.62]),
  },
  {
    id: BlockId.Wood,
    name: "wood",
    solid: true,
    transparent: false,
    faceColors: uniformFace([0.42, 0.3, 0.18]),
  },
  {
    id: BlockId.Leaves,
    name: "leaves",
    solid: true,
    transparent: true,
    faceColors: uniformFace([0.25, 0.45, 0.18]),
  },
  {
    id: BlockId.Snow,
    name: "snow",
    solid: true,
    transparent: false,
    faceColors: uniformFace([0.92, 0.95, 0.96]),
  },
];

// Direct lookup — id is the array index. Const-asserted so a stray missing
// entry surfaces at type-check time, not as `undefined` at the hot path.
export const blockOf = (id: BlockId): BlockType => BLOCKS[id];

// True if a face between `here` and `neighbor` should emit. We render `here`'s
// face when `here` is non-air and `neighbor` is non-occluding for `here`.
// Two different transparent blocks (water/leaves boundary) also produce a
// face so the interior of each is visible.
export const faceVisible = (here: BlockId, neighbor: BlockId): boolean => {
  if (here === BlockId.Air) {
    return false;
  }
  if (neighbor === BlockId.Air) {
    return true;
  }
  const hereBlock = BLOCKS[here];
  const neighborBlock = BLOCKS[neighbor];
  if (!neighborBlock.solid) {
    // Air handled above; remaining non-solids (water) reveal neighboring
    // solid faces and reveal other transparent block faces of a different id.
    return here !== neighbor;
  }
  if (neighborBlock.transparent && here !== neighbor) {
    return true;
  }
  return false;
};
