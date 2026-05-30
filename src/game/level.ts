import { TILE_PX } from "./textures";

// The one room. 30 tiles wide × 20 tall × 32 px = 960 × 640 stage. Walls
// hug the perimeter (1 tile thick); the door is a 2-tile gap in the bottom
// wall that's walkable but doesn't transition anywhere in C2.
export const LEVEL_TILES_W = 30;
export const LEVEL_TILES_H = 20;
export const LEVEL_W = LEVEL_TILES_W * TILE_PX;
export const LEVEL_H = LEVEL_TILES_H * TILE_PX;

// Furniture pieces — placed in tile coords, sized in tiles. `solid` items
// block the player; the rug does not.
export type FurnitureKind =
  | "tv"
  | "bookshelf"
  | "sofa"
  | "chair"
  | "coffeeTable"
  | "rug"
  | "dogBed"
  | "foodBowl"
  | "waterBowl"
  | "door";

export type FurniturePiece = {
  kind: FurnitureKind;
  tileX: number;
  tileY: number;
  tileW: number;
  tileH: number;
  solid: boolean;
};

export const FURNITURE: readonly FurniturePiece[] = [
  // Top wall, left side: TV
  { kind: "tv", tileX: 3, tileY: 1, tileW: 5, tileH: 2, solid: true },
  // Top wall, right side: bookshelf
  { kind: "bookshelf", tileX: 22, tileY: 1, tileW: 4, tileH: 3, solid: true },
  // Middle-left: long sofa
  { kind: "sofa", tileX: 3, tileY: 6, tileW: 7, tileH: 2, solid: true },
  // Middle-right: chair
  { kind: "chair", tileX: 22, tileY: 7, tileW: 3, tileH: 3, solid: true },
  // Center floor rug (not solid; player walks over it)
  { kind: "rug", tileX: 11, tileY: 9, tileW: 8, tileH: 5, solid: false },
  // Coffee table on the rug
  {
    kind: "coffeeTable",
    tileX: 13,
    tileY: 10,
    tileW: 4,
    tileH: 3,
    solid: true,
  },
  // Bottom area: dog bed
  { kind: "dogBed", tileX: 13, tileY: 15, tileW: 4, tileH: 3, solid: true },
  // Bottom-left: bowls
  { kind: "foodBowl", tileX: 3, tileY: 17, tileW: 1, tileH: 1, solid: true },
  { kind: "waterBowl", tileX: 4, tileY: 17, tileW: 1, tileH: 1, solid: true },
  // Bottom wall: door (walkable gap; the visual sits in the bottom wall row)
  { kind: "door", tileX: 26, tileY: 19, tileW: 2, tileH: 1, solid: false },
];

// Where Gizmo starts — middle of the room, between sofa and dog bed.
export const PLAYER_START_X = (LEVEL_TILES_W / 2) * TILE_PX;
export const PLAYER_START_Y = LEVEL_TILES_H * 0.4 * TILE_PX;

// --- Collision -------------------------------------------------------------

// AABB rectangle in world (pixel) space.
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const furnitureRect = (f: FurniturePiece): Rect => ({
  x: f.tileX * TILE_PX,
  y: f.tileY * TILE_PX,
  w: f.tileW * TILE_PX,
  h: f.tileH * TILE_PX,
});

// All rectangles the player collides with. Perimeter walls split around
// the door so the player can walk through the gap. Cached at module load —
// the level is static for C2.
export const COLLISION_RECTS: readonly Rect[] = (() => {
  const rects: Rect[] = [];
  const t = TILE_PX;

  // Top wall (single horizontal strip).
  rects.push({ x: 0, y: 0, w: LEVEL_W, h: t });
  // Bottom wall — split around the door (door at tileX 26, w=2).
  const door = FURNITURE.find((f) => f.kind === "door");
  if (!door) {
    throw new Error("level: door piece missing");
  }
  const doorLeftPx = door.tileX * t;
  const doorRightPx = (door.tileX + door.tileW) * t;
  rects.push({ x: 0, y: LEVEL_H - t, w: doorLeftPx, h: t });
  rects.push({
    x: doorRightPx,
    y: LEVEL_H - t,
    w: LEVEL_W - doorRightPx,
    h: t,
  });
  // Left + right walls (span the interior vertically).
  rects.push({ x: 0, y: t, w: t, h: LEVEL_H - 2 * t });
  rects.push({ x: LEVEL_W - t, y: t, w: t, h: LEVEL_H - 2 * t });

  // Solid furniture.
  for (const f of FURNITURE) {
    if (f.solid) {
      rects.push(furnitureRect(f));
    }
  }
  return rects;
})();

// Axis-separated AABB resolution. Move on X then Y so corner cases produce
// clean slides instead of jitter. Player AABB is centered on (px, py) with
// half-extents hw, hh.
export const resolveCollision = (
  px: number,
  py: number,
  hw: number,
  hh: number,
  dx: number,
  dy: number,
): { x: number; y: number } => {
  // Move X, then resolve overlaps on the X axis only.
  let nx = px + dx;
  for (const r of COLLISION_RECTS) {
    if (
      nx + hw > r.x &&
      nx - hw < r.x + r.w &&
      py + hh > r.y &&
      py - hh < r.y + r.h
    ) {
      if (dx > 0) {
        nx = r.x - hw;
      } else if (dx < 0) {
        nx = r.x + r.w + hw;
      }
    }
  }

  let ny = py + dy;
  for (const r of COLLISION_RECTS) {
    if (
      nx + hw > r.x &&
      nx - hw < r.x + r.w &&
      ny + hh > r.y &&
      ny - hh < r.y + r.h
    ) {
      if (dy > 0) {
        ny = r.y - hh;
      } else if (dy < 0) {
        ny = r.y + r.h + hh;
      }
    }
  }

  return { x: nx, y: ny };
};
