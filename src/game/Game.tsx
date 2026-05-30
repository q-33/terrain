import { useMemo } from "react";
import { extend } from "@pixi/react";
import { Container, Graphics, Sprite, TilingSprite } from "pixi.js";
import { FURNITURE, FurnitureKind, LEVEL_H, LEVEL_W } from "./level";
import { TILE_PX } from "./textures";
import {
  makeBookshelfTexture,
  makeBowlTexture,
  makeChairTexture,
  makeCoffeeTableTexture,
  makeDogBedTexture,
  makeDoorTexture,
  makeRugTexture,
  makeSofaTexture,
  makeTvTexture,
  makeWoodTileTexture,
} from "./textures";
import Player from "./Player";

extend({ Container, Graphics, Sprite, TilingSprite });

type Props = {
  stageWidth: number;
  stageHeight: number;
};

// Renders the static level (floor, walls, furniture) and mounts the player
// on top. Centered in the viewport via an outer container offset; the level
// itself is laid out in pixel coords starting at (0, 0).
const Game = ({ stageWidth, stageHeight }: Props) => {
  // Textures built once. Furniture textures are sized to match the pieces
  // in level.ts so each renders pixel-perfect at scale 1.
  const tex = useMemo(
    () => ({
      floor: makeWoodTileTexture(),
      tv: makeTvTexture(5, 2),
      bookshelf: makeBookshelfTexture(4, 3),
      sofa: makeSofaTexture(7, 2),
      chair: makeChairTexture(3, 3),
      coffeeTable: makeCoffeeTableTexture(4, 3),
      rug: makeRugTexture(8, 5),
      dogBed: makeDogBedTexture(4, 3),
      foodBowl: makeBowlTexture("food"),
      waterBowl: makeBowlTexture("water"),
      door: makeDoorTexture(2, 1),
    }),
    [],
  );

  const offsetX = Math.max(0, (stageWidth - LEVEL_W) / 2);
  const offsetY = Math.max(0, (stageHeight - LEVEL_H) / 2);

  // Split rendering: rug under everything, then solid furniture, then the
  // door (visually sits in the wall gap), then the player on top.
  const rug = FURNITURE.find((f) => f.kind === "rug");
  const door = FURNITURE.find((f) => f.kind === "door");
  const onTopOfFloor = FURNITURE.filter(
    (f) => f.kind !== "rug" && f.kind !== "door",
  );

  // Door positions in pixel coords for the wall gap.
  const doorLeftPx = door ? door.tileX * TILE_PX : LEVEL_W;
  const doorRightPx = door ? (door.tileX + door.tileW) * TILE_PX : LEVEL_W;

  return (
    <pixiContainer x={offsetX} y={offsetY}>
      {/* Floor: a single TilingSprite covering the interior. */}
      <pixiTilingSprite
        texture={tex.floor}
        x={TILE_PX}
        y={TILE_PX}
        width={LEVEL_W - 2 * TILE_PX}
        height={LEVEL_H - 2 * TILE_PX}
      />

      {/* Rug — below all other furniture so coffee table sits on top. */}
      {rug && (
        <pixiSprite
          texture={tex.rug}
          x={rug.tileX * TILE_PX}
          y={rug.tileY * TILE_PX}
        />
      )}

      {/* Walls — single Graphics draw call. Cream rectangles + a soft
          shadow line at the inside edge of each wall so the player reads
          the room as enclosed rather than as a flat ring. */}
      <pixiGraphics
        draw={(g) => {
          g.clear();
          const wallColor = 0xe8dcc4;
          // Top wall
          g.rect(0, 0, LEVEL_W, TILE_PX).fill(wallColor);
          // Bottom wall split around the door
          g.rect(0, LEVEL_H - TILE_PX, doorLeftPx, TILE_PX).fill(wallColor);
          g.rect(
            doorRightPx,
            LEVEL_H - TILE_PX,
            LEVEL_W - doorRightPx,
            TILE_PX,
          ).fill(wallColor);
          // Side walls (span between top + bottom)
          g.rect(0, TILE_PX, TILE_PX, LEVEL_H - 2 * TILE_PX).fill(wallColor);
          g.rect(
            LEVEL_W - TILE_PX,
            TILE_PX,
            TILE_PX,
            LEVEL_H - 2 * TILE_PX,
          ).fill(wallColor);

          // Inside-edge shadow lines so walls have a soft 3D feel.
          const shadow = { color: 0x000000, alpha: 0.18 };
          g.rect(TILE_PX, TILE_PX, LEVEL_W - 2 * TILE_PX, 3).fill(shadow);
          g.rect(TILE_PX, TILE_PX, 3, LEVEL_H - 2 * TILE_PX).fill(shadow);
          g.rect(LEVEL_W - TILE_PX - 3, TILE_PX, 3, LEVEL_H - 2 * TILE_PX).fill(
            shadow,
          );
        }}
      />

      {/* Door — visual fills the gap in the bottom wall. */}
      {door && (
        <pixiSprite
          texture={tex.door}
          x={door.tileX * TILE_PX}
          y={door.tileY * TILE_PX}
        />
      )}

      {/* Furniture (everything except rug and door). */}
      {onTopOfFloor.map((f) => {
        const texture = tex[f.kind as Exclude<FurnitureKind, "rug" | "door">];
        return (
          <pixiSprite
            key={`${f.kind}-${f.tileX}-${f.tileY}`}
            texture={texture}
            x={f.tileX * TILE_PX}
            y={f.tileY * TILE_PX}
          />
        );
      })}

      {/* Player on top of everything. */}
      <Player />
    </pixiContainer>
  );
};

export default Game;
