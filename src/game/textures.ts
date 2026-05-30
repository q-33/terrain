import { Texture } from "pixi.js";

// All sprite art is procedurally drawn into offscreen canvases at startup.
// No external PNG ships — the look is "Among Us-ish cozy" expressed with
// rounded shapes and soft colors. Each function returns a Pixi Texture.

export const TILE_PX = 32;

// Generic 2D-canvas wrapper. Returns a Texture from the canvas. nearest=true
// when crisp pixel edges matter (tiny pixel-art sprites); leave default for
// rounded furniture where smoothing reads as "soft."
const makeTexture = (
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  nearest = false,
): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("textures: 2d canvas context unavailable");
  }
  paint(ctx);
  const texture = Texture.from(canvas);
  if (nearest) {
    texture.source.scaleMode = "nearest";
  }
  return texture;
};

// --- Tiles -----------------------------------------------------------------

// Warm wood plank. One vertical seam down the middle and a couple of
// horizontal grain wisps. Designed to tile seamlessly via TilingSprite.
export const makeWoodTileTexture = (): Texture =>
  makeTexture(TILE_PX, TILE_PX, (ctx) => {
    // Base plank
    ctx.fillStyle = "#a47148";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    // Slight darker grain bands
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    for (let y = 4; y < TILE_PX; y += 9) {
      ctx.fillRect(0, y, TILE_PX, 1);
    }
    // Vertical seam in the middle as plank divider
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(TILE_PX / 2 - 1, 0, 1, TILE_PX);
    // Tiny lighter speckle for variation
    ctx.fillStyle = "rgba(255, 235, 200, 0.12)";
    for (let i = 0; i < 6; i++) {
      const x = (i * 13 + 5) % TILE_PX;
      const y = (i * 7 + 3) % TILE_PX;
      ctx.fillRect(x, y, 1, 1);
    }
  });

// Wall tile — cream with a soft inner shadow at the bottom so walls read as
// having a top edge.
export const makeWallTileTexture = (): Texture =>
  makeTexture(TILE_PX, TILE_PX, (ctx) => {
    ctx.fillStyle = "#e8dcc4";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    // Slight darker top edge so adjacent walls "join" visually
    ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
    ctx.fillRect(0, 0, TILE_PX, 2);
    // Subtle shadow line at the bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.fillRect(0, TILE_PX - 3, TILE_PX, 3);
  });

// Rug — patterned, larger texture. Single texture sized for a 8x4-tile rug.
export const makeRugTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    // Soft teal base
    ctx.fillStyle = "#7ba89e";
    ctx.fillRect(0, 0, w, h);
    // Inner border
    ctx.strokeStyle = "#5a8273";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    // Diamond pattern in the center
    ctx.fillStyle = "rgba(255, 248, 220, 0.25)";
    const dx = TILE_PX;
    const dy = TILE_PX;
    for (let y = 24; y < h - 24; y += dy) {
      for (let x = 24; x < w - 24; x += dx) {
        ctx.beginPath();
        ctx.moveTo(x + dx / 2, y);
        ctx.lineTo(x + dx, y + dy / 2);
        ctx.lineTo(x + dx / 2, y + dy);
        ctx.lineTo(x, y + dy / 2);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
};

// --- Furniture -------------------------------------------------------------

// TV — dark frame around a slightly lit screen. Width-spanning along a wall.
export const makeTvTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    ctx.fillStyle = "#1f1f24";
    ctx.fillRect(0, 0, w, h);
    // Screen
    ctx.fillStyle = "#3b5570";
    ctx.fillRect(4, 4, w - 8, h - 8);
    // Subtle scanline highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(4, 4, w - 8, 2);
  });
};

// Bookshelf — vertical with shelves and colored book spines.
export const makeBookshelfTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    // Wood frame
    ctx.fillStyle = "#6b4426";
    ctx.fillRect(0, 0, w, h);
    // Interior (darker)
    ctx.fillStyle = "#3a2515";
    ctx.fillRect(3, 3, w - 6, h - 6);
    // Shelves and books
    const shelfCount = tilesTall;
    const shelfH = (h - 6) / shelfCount;
    const bookColors = [
      "#b04848",
      "#c89a2e",
      "#3a6ba8",
      "#5a8240",
      "#7a4a8a",
      "#c88240",
    ];
    for (let s = 0; s < shelfCount; s++) {
      const sy = 3 + s * shelfH;
      // Books filling the shelf
      let bx = 5;
      let ci = (s * 3) % bookColors.length;
      while (bx < w - 8) {
        const bw = 3 + (ci % 3);
        ctx.fillStyle = bookColors[ci % bookColors.length];
        ctx.fillRect(bx, sy + 3, bw, shelfH - 6);
        bx += bw + 1;
        ci++;
      }
      // Shelf board on top
      ctx.fillStyle = "#6b4426";
      ctx.fillRect(3, sy + shelfH - 2, w - 6, 2);
    }
  });
};

// Sofa — long rounded cushy shape with 3 cushion bumps and armrests.
export const makeSofaTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    // Sofa body — rounded rect
    ctx.fillStyle = "#7a5a8a";
    roundedRect(ctx, 2, 2, w - 4, h - 4, 12);
    ctx.fill();
    // Cushions (3 across)
    ctx.fillStyle = "#8e6c9e";
    const cushionW = (w - 24) / 3;
    for (let i = 0; i < 3; i++) {
      roundedRect(ctx, 10 + i * (cushionW + 2), 8, cushionW, h - 16, 6);
      ctx.fill();
    }
    // Highlight on top of each cushion
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(12 + i * (cushionW + 2), 12, cushionW - 4, 2);
    }
  });
};

// Chair — small cushy square.
export const makeChairTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    ctx.fillStyle = "#6a8a7a";
    roundedRect(ctx, 2, 2, w - 4, h - 4, 12);
    ctx.fill();
    ctx.fillStyle = "#7e9d8e";
    roundedRect(ctx, 8, 8, w - 16, h - 16, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.fillRect(10, 12, w - 20, 2);
  });
};

// Coffee table — simple wood rectangle with a slightly lighter top.
export const makeCoffeeTableTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    ctx.fillStyle = "#6b4426";
    roundedRect(ctx, 2, 2, w - 4, h - 4, 6);
    ctx.fill();
    ctx.fillStyle = "#85603a";
    ctx.fillRect(4, 4, w - 8, h - 8);
    // Grain lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
    ctx.lineWidth = 1;
    for (let y = 8; y < h - 4; y += 5) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(w - 4, y);
      ctx.stroke();
    }
  });
};

// Dog bed — soft round-cornered cushion.
export const makeDogBedTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    // Rim
    ctx.fillStyle = "#c66060";
    roundedRect(ctx, 2, 2, w - 4, h - 4, 18);
    ctx.fill();
    // Inner cushion
    ctx.fillStyle = "#ec9d9d";
    roundedRect(ctx, 8, 8, w - 16, h - 16, 12);
    ctx.fill();
    // Tiny "GIZMO" reading hint — a small bone shape
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    ctx.arc(cx - 6, cy, 3, 0, Math.PI * 2);
    ctx.arc(cx + 6, cy, 3, 0, Math.PI * 2);
    ctx.rect(cx - 6, cy - 1.5, 12, 3);
    ctx.fill();
  });
};

// Bowl — small circle with darker rim. Fixed 1-tile square.
export const makeBowlTexture = (kind: "food" | "water"): Texture =>
  makeTexture(TILE_PX, TILE_PX, (ctx) => {
    // Bowl rim
    ctx.fillStyle = "#5a4030";
    ctx.beginPath();
    ctx.arc(TILE_PX / 2, TILE_PX / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    // Inner
    ctx.fillStyle = kind === "water" ? "#5ab2e8" : "#c88a4a";
    ctx.beginPath();
    ctx.arc(TILE_PX / 2, TILE_PX / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(TILE_PX / 2 - 3, TILE_PX / 2 - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  });

// Door — visible gap in the wall with a doorframe + a hint of darker space
// beyond. Walkable in the level, but C2 doesn't actually transition anywhere.
export const makeDoorTexture = (
  tilesWide: number,
  tilesTall: number,
): Texture => {
  const w = tilesWide * TILE_PX;
  const h = tilesTall * TILE_PX;
  return makeTexture(w, h, (ctx) => {
    // Frame
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(0, 0, w, h);
    // Darker open space
    ctx.fillStyle = "#1a1208";
    ctx.fillRect(3, 3, w - 6, h - 3);
  });
};

// --- Gizmo (the player) ----------------------------------------------------

// Top-down Cavachon: cream body ellipse, smaller head ellipse facing "up"
// (toward -Y in sprite space), two ears, dark dot eyes, dark nose, tail nub.
// The sprite faces "up"; movement direction is applied as a rotation around
// the sprite's anchor (set to 0.5, 0.5 by the consumer).
export const makeGizmoTexture = (): Texture => {
  const size = 64;
  return makeTexture(
    size,
    size,
    (ctx) => {
      const cx = size / 2;
      // Tail nub (drawn first so body covers its root)
      ctx.fillStyle = "#f1e6d0";
      ctx.beginPath();
      ctx.ellipse(cx, 52, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = "#f1e6d0";
      ctx.beginPath();
      ctx.ellipse(cx, 38, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Slightly lighter chest highlight
      ctx.fillStyle = "#f8f1de";
      ctx.beginPath();
      ctx.ellipse(cx, 34, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Left ear (apricot tint, slightly behind head)
      ctx.fillStyle = "#e8d4b2";
      ctx.beginPath();
      ctx.ellipse(cx - 9, 19, 6, 10, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Right ear
      ctx.beginPath();
      ctx.ellipse(cx + 9, 19, 6, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = "#f1e6d0";
      ctx.beginPath();
      ctx.ellipse(cx, 20, 11, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#0e0604";
      ctx.beginPath();
      ctx.arc(cx - 4, 19, 1.6, 0, Math.PI * 2);
      ctx.arc(cx + 4, 19, 1.6, 0, Math.PI * 2);
      ctx.fill();
      // Nose
      ctx.fillStyle = "#2a1810";
      ctx.beginPath();
      ctx.ellipse(cx, 12, 2.2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    },
    true,
  );
};

// --- Helpers ---------------------------------------------------------------

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};
