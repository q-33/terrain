import { useRef, useEffect, RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls as OrbitControlsBase } from "three-stdlib";
import { fractalNoise } from "../noise";
import {
  KEYBOARD_MOVE_SPEED,
  KEYBOARD_TURN_SPEED,
  TERRAIN_NOISE_FREQUENCY,
  TERRAIN_NOISE_OCTAVES,
  TERRAIN_NOISE_LACUNARITY,
  TERRAIN_NOISE_GAIN,
  TERRAIN_HEIGHT_SCALE,
} from "../constants";

const JUMP_SPEED = 7;
const GRAVITY = 20;

type Props = {
  controlsRef: RefObject<OrbitControlsBase | null>;
  gizmoRef: RefObject<THREE.Group | null>;
  movingRef: RefObject<boolean>;
  jumpingRef: RefObject<boolean>;
};

const terrainHeightAt = (x: number, z: number): number =>
  fractalNoise(
    x * TERRAIN_NOISE_FREQUENCY,
    z * TERRAIN_NOISE_FREQUENCY,
    TERRAIN_NOISE_OCTAVES,
    TERRAIN_NOISE_LACUNARITY,
    TERRAIN_NOISE_GAIN,
  ) * TERRAIN_HEIGHT_SCALE;

const GizmoMovement = ({
  controlsRef,
  gizmoRef,
  movingRef,
  jumpingRef,
}: Props): null => {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const fwd = useRef(new THREE.Vector3());
  const move = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const yAxis = useRef(new THREE.Vector3(0, 1, 0));
  const jumpVel = useRef(0);
  const jumpY = useRef(0);
  const prevJumpY = useRef(0);
  const spaceConsumed = useRef(false);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.code === "Space") {
        spaceConsumed.current = false;
      }
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    const k = keys.current;

    if (k["ArrowLeft"] || k["ArrowRight"]) {
      const angle = k["ArrowLeft"] ? KEYBOARD_TURN_SPEED : -KEYBOARD_TURN_SPEED;
      offset.current.subVectors(camera.position, controls.target);
      offset.current.applyAxisAngle(yAxis.current, angle);
      camera.position.copy(controls.target).add(offset.current);
    }

    camera.getWorldDirection(fwd.current);
    fwd.current.y = 0;
    fwd.current.normalize();

    move.current.set(0, 0, 0);
    if (k["ArrowUp"]) {
      move.current.addScaledVector(fwd.current, KEYBOARD_MOVE_SPEED);
    }
    if (k["ArrowDown"]) {
      move.current.addScaledVector(fwd.current, -KEYBOARD_MOVE_SPEED);
    }

    const isMoving = move.current.lengthSq() > 0;
    movingRef.current = isMoving;

    if (isMoving) {
      camera.position.add(move.current);
      controls.target.add(move.current);
    }

    // Jump — only trigger once per Space press, only when grounded
    const grounded = jumpY.current === 0 && jumpVel.current === 0;
    if (k["Space"] && !spaceConsumed.current && grounded) {
      jumpVel.current = JUMP_SPEED;
      spaceConsumed.current = true;
    }

    // Apply jump physics
    prevJumpY.current = jumpY.current;
    if (jumpVel.current !== 0 || jumpY.current > 0) {
      jumpVel.current -= GRAVITY * delta;
      jumpY.current = Math.max(0, jumpY.current + jumpVel.current * delta);
      if (jumpY.current === 0 && jumpVel.current < 0) {
        jumpVel.current = 0;
      }
    }

    const jumpDelta = jumpY.current - prevJumpY.current;
    if (jumpDelta !== 0) {
      camera.position.y += jumpDelta;
      controls.target.y += jumpDelta;
    }

    jumpingRef.current = jumpY.current > 0;

    const gizmo = gizmoRef.current;
    if (!gizmo) {
      return;
    }

    const tx = controls.target.x;
    const tz = controls.target.z;
    const ty = terrainHeightAt(tx, tz);
    gizmo.position.set(tx, ty + jumpY.current, tz);
    gizmo.rotation.y = Math.atan2(fwd.current.x, fwd.current.z);
  });

  return null;
};

export default GizmoMovement;
