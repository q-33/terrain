import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  PLAYER_EYE_HEIGHT,
  PLAYER_GRAVITY,
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
} from "../constants";
import { worldSurfaceHeight } from "./worldGen";
import { writeUrlState } from "../urlState";
import { World } from "./world";

type Props = {
  world: World;
  initialX?: number;
  initialZ?: number;
};

// Surface query that respects player edits. Queries the actual world first
// — so dug holes drop the player and placed blocks support them — and
// falls back to the procedural generator at the edge of the loaded area
// so the player doesn't fall through unloaded chunks.
const surfaceYFor = (world: World, worldX: number, worldZ: number): number => {
  const x = Math.floor(worldX);
  const z = Math.floor(worldZ);
  const actual = world.topSolidY(x, z);
  if (actual >= 0) {
    return actual;
  }
  return worldSurfaceHeight(x, z);
};

// First-person walker. The camera IS the player — PointerLockControls
// handles mouse-look, this component handles keyboard movement, gravity,
// jump, and clamping to the voxel surface. No AABB collision against
// blocks yet (Phase C); the player is treated as a point that snaps to
// the top of whatever column they're standing in.
const PlayerController = ({ world, initialX, initialZ }: Props): null => {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const initialized = useRef(false);
  const verticalVel = useRef(0);
  const grounded = useRef(true);

  // Per-frame scratch vectors so the hot path doesn't allocate.
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const worldUp = useRef(new THREE.Vector3(0, 1, 0));
  const move = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!initialized.current) {
      initialized.current = true;
      if (initialX !== undefined) {
        camera.position.x = initialX;
      }
      if (initialZ !== undefined) {
        camera.position.z = initialZ;
      }
      camera.position.y =
        surfaceYFor(world, camera.position.x, camera.position.z) +
        1 +
        PLAYER_EYE_HEIGHT;
    }

    // Build a flat-XZ forward from the camera's look direction. If the
    // camera is staring straight up/down the projected forward goes near
    // zero — fall back to -Z so movement keys still do something.
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    if (forward.current.lengthSq() < 1e-6) {
      forward.current.set(0, 0, -1);
    } else {
      forward.current.normalize();
    }
    right.current.crossVectors(forward.current, worldUp.current).normalize();

    const k = keys.current;
    const step = PLAYER_MOVE_SPEED * delta;
    move.current.set(0, 0, 0);
    if (k["KeyW"]) {
      move.current.addScaledVector(forward.current, step);
    }
    if (k["KeyS"]) {
      move.current.addScaledVector(forward.current, -step);
    }
    if (k["KeyD"]) {
      move.current.addScaledVector(right.current, step);
    }
    if (k["KeyA"]) {
      move.current.addScaledVector(right.current, -step);
    }
    camera.position.x += move.current.x;
    camera.position.z += move.current.z;

    if (k["Space"] && grounded.current) {
      verticalVel.current = PLAYER_JUMP_SPEED;
      grounded.current = false;
    }
    verticalVel.current -= PLAYER_GRAVITY * delta;
    camera.position.y += verticalVel.current * delta;

    // Ground clamp — top of the surface block + eye height. Negative vel
    // on contact resets to a clean grounded state so jump triggers again.
    const groundY =
      surfaceYFor(world, camera.position.x, camera.position.z) +
      1 +
      PLAYER_EYE_HEIGHT;
    if (camera.position.y <= groundY) {
      camera.position.y = groundY;
      verticalVel.current = 0;
      grounded.current = true;
    }

    // URL sync (urlState throttles to ~400ms internally).
    writeUrlState({
      x: Math.round(camera.position.x * 10) / 10,
      z: Math.round(camera.position.z * 10) / 10,
    });
  });

  return null;
};

export default PlayerController;
