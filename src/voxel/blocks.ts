import { AtlasTile, TILES } from "./textures";

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

// Per-face atlas tiles so blocks like grass can have a green top, dirt
// bottom, and grass-edged sides. Face order matches the mesher: 0=+x,
// 1=-x, 2=+y (top), 3=-y (bottom), 4=+z, 5=-z.
export type BlockFaceTiles = readonly [
  AtlasTile,
  AtlasTile,
  AtlasTile,
  AtlasTile,
  AtlasTile,
  AtlasTile,
];

export type BlockType = {
  id: BlockId;
  name: string;
  // Solid blocks occlude neighbor faces and block movement. Air and water
  // are non-solid; leaves are solid but transparent.
  solid: boolean;
  // Transparent blocks still emit faces against other transparent blocks of
  // a different type (so leaves render against air, water against air).
  transparent: boolean;
  faceTiles: BlockFaceTiles;
};

const allFaces = (t: AtlasTile): BlockFaceTiles => [t, t, t, t, t, t];

// Grass: green top, dirt bottom, mixed sides (grass strip over dirt).
const grassFaces: BlockFaceTiles = [
  TILES.grassSide, // +x
  TILES.grassSide, // -x
  TILES.grassTop, // +y
  TILES.dirt, // -y
  TILES.grassSide, // +z
  TILES.grassSide, // -z
];

// Wood log: end-grain rings on top + bottom, vertical bark on sides.
const woodFaces: BlockFaceTiles = [
  TILES.woodSide,
  TILES.woodSide,
  TILES.woodTop,
  TILES.woodTop,
  TILES.woodSide,
  TILES.woodSide,
];

export const BLOCKS: readonly BlockType[] = [
  {
    id: BlockId.Air,
    name: "air",
    solid: false,
    transparent: true,
    faceTiles: allFaces(TILES.stone), // never sampled
  },
  {
    id: BlockId.Grass,
    name: "grass",
    solid: true,
    transparent: false,
    faceTiles: grassFaces,
  },
  {
    id: BlockId.Dirt,
    name: "dirt",
    solid: true,
    transparent: false,
    faceTiles: allFaces(TILES.dirt),
  },
  {
    id: BlockId.Stone,
    name: "stone",
    solid: true,
    transparent: false,
    faceTiles: allFaces(TILES.stone),
  },
  {
    id: BlockId.Sand,
    name: "sand",
    solid: true,
    transparent: false,
    faceTiles: allFaces(TILES.sand),
  },
  {
    id: BlockId.Water,
    name: "water",
    solid: false,
    transparent: true,
    faceTiles: allFaces(TILES.water),
  },
  {
    id: BlockId.Wood,
    name: "wood",
    solid: true,
    transparent: false,
    faceTiles: woodFaces,
  },
  {
    id: BlockId.Leaves,
    name: "leaves",
    solid: true,
    transparent: true,
    faceTiles: allFaces(TILES.leaves),
  },
  {
    id: BlockId.Snow,
    name: "snow",
    solid: true,
    transparent: false,
    faceTiles: allFaces(TILES.snow),
  },
];

// Direct lookup — id is the array index.
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
  const neighborBlock = BLOCKS[neighbor];
  if (!neighborBlock.solid) {
    return here !== neighbor;
  }
  if (neighborBlock.transparent && here !== neighbor) {
    return true;
  }
  return false;
};
