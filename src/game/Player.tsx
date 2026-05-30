import { useEffect, useMemo, useRef, useState } from "react";
import { extend, useTick } from "@pixi/react";
import { Sprite } from "pixi.js";
import { PLAYER_START_X, PLAYER_START_Y, resolveCollision } from "./level";
import { makeGizmoTexture } from "./textures";

extend({ Sprite });

// Tuned to feel like a small dog wandering — fast enough to feel responsive,
// slow enough that the player notices furniture as they walk past it.
const PLAYER_SPEED = 180; // pixels per second
const PLAYER_HALF = 12; // collision half-extent (24x24 AABB)

// Gizmo: WASD/arrow movement at constant pixel speed, AABB-axis-separated
// collision against the level's static rects, rotates to face movement
// direction. Sprite texture faces "up" (toward -Y) so the rotation formula
// is atan2(vy, vx) + π/2.
const Player = () => {
  const [state, setState] = useState({
    x: PLAYER_START_X,
    y: PLAYER_START_Y,
    rotation: 0,
  });
  const keys = useRef<Record<string, boolean>>({});
  const texture = useMemo(() => makeGizmoTexture(), []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useTick((ticker) => {
    const k = keys.current;
    let vx = 0;
    let vy = 0;
    if (k["KeyW"] || k["ArrowUp"]) {
      vy -= 1;
    }
    if (k["KeyS"] || k["ArrowDown"]) {
      vy += 1;
    }
    if (k["KeyA"] || k["ArrowLeft"]) {
      vx -= 1;
    }
    if (k["KeyD"] || k["ArrowRight"]) {
      vx += 1;
    }

    // No input → skip the state update so React doesn't re-render every
    // frame while standing still. Rotation persists from the last move.
    if (vx === 0 && vy === 0) {
      return;
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    vx /= len;
    vy /= len;
    const newRotation = Math.atan2(vy, vx) + Math.PI / 2;

    const dt = ticker.deltaMS / 1000;
    const dx = vx * PLAYER_SPEED * dt;
    const dy = vy * PLAYER_SPEED * dt;

    setState((prev) => {
      const next = resolveCollision(
        prev.x,
        prev.y,
        PLAYER_HALF,
        PLAYER_HALF,
        dx,
        dy,
      );
      return { x: next.x, y: next.y, rotation: newRotation };
    });
  });

  return (
    <pixiSprite
      texture={texture}
      x={state.x}
      y={state.y}
      anchor={0.5}
      rotation={state.rotation}
    />
  );
};

export default Player;
