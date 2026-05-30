import { sampleBaseHeight, sampleTerrainHeight } from "./terrainHeight";
import { BUILDING_PAD_CELL_SIZE, BUILDING_PAD_PROBABILITY } from "./constants";

type Pad = {
  centerX: number;
  centerZ: number;
  halfW: number;
  halfD: number;
  height: number;
};

const uint32Hash = (a: number, b: number): number => {
  let h = ((a * 1234567) ^ (b * 7654321)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
};

const padCache = new Map<string, Pad | null>();

const getPadForCell = (cellX: number, cellZ: number): Pad | null => {
  const key = `${cellX}:${cellZ}`;
  if (padCache.has(key)) {
    return padCache.get(key) ?? null;
  }
  const h0 = uint32Hash(cellX, cellZ);
  if ((h0 & 0xffff) / 0xffff > BUILDING_PAD_PROBABILITY) {
    padCache.set(key, null);
    return null;
  }
  const h1 = uint32Hash(cellX ^ 0xabcd, cellZ ^ 0x1234);
  const h2 = uint32Hash(cellX ^ 0x5678, cellZ ^ 0xef01);
  const margin = 30;
  const range = BUILDING_PAD_CELL_SIZE - 2 * margin;
  const offsetX = margin + ((h1 >>> 16) / 0xffff) * range;
  const offsetZ = margin + ((h1 & 0xffff) / 0xffff) * range;
  const centerX = cellX * BUILDING_PAD_CELL_SIZE + offsetX;
  const centerZ = cellZ * BUILDING_PAD_CELL_SIZE + offsetZ;
  const halfW = 20 + ((h2 >>> 24) / 255) * 35;
  const halfD = 15 + (((h2 >>> 16) & 0xff) / 255) * 25;
  const height = sampleBaseHeight(centerX, centerZ);
  const pad: Pad = { centerX, centerZ, halfW, halfD, height };
  padCache.set(key, pad);
  return pad;
};

export const getPadAtPoint = (worldX: number, worldZ: number): Pad | null => {
  const cellX = Math.floor(worldX / BUILDING_PAD_CELL_SIZE);
  const cellZ = Math.floor(worldZ / BUILDING_PAD_CELL_SIZE);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const pad = getPadForCell(cellX + dx, cellZ + dz);
      if (
        pad &&
        Math.abs(worldX - pad.centerX) <= pad.halfW &&
        Math.abs(worldZ - pad.centerZ) <= pad.halfD
      ) {
        return pad;
      }
    }
  }
  return null;
};

export const sampleGroundHeight = (worldX: number, worldZ: number): number => {
  const pad = getPadAtPoint(worldX, worldZ);
  return pad ? pad.height : sampleTerrainHeight(worldX, worldZ);
};
