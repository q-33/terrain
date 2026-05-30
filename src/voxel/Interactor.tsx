import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { World } from "./world";
import { raycastVoxel, RaycastHit } from "./raycast";
import { BlockId, blockOf } from "./blocks";

type Props = {
  world: World;
};

// Player reach — Minecraft is 5 blocks; 6 feels a touch more generous and
// keeps the picker reliable when looking at distant features.
const REACH = 6;

// Picker + click handlers + visual highlight of the targeted block.
// Mouse listeners attach to `document` (not the canvas) so they don't race
// with PointerLockControls' own pointerdown handler that requests the lock,
// and they gate on `document.pointerLockElement` so the very first click
// (used to engage lock) doesn't also break a block under the crosshair.
const Interactor = ({ world }: Props) => {
  const { camera } = useThree();
  const hitRef = useRef<RaycastHit | null>(null);
  const highlightRef = useRef<THREE.LineSegments>(null);

  const highlightGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    [],
  );
  const highlightMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  // Reused per frame to avoid allocations on the picker hot path.
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    camera.getWorldDirection(direction);
    const hit = raycastVoxel(
      camera.position,
      direction,
      REACH,
      (x, y, z) => blockOf(world.getBlock(x, y, z)).solid,
    );
    hitRef.current = hit;

    const highlight = highlightRef.current;
    if (!highlight) {
      return;
    }
    if (hit) {
      highlight.visible = true;
      highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    } else {
      highlight.visible = false;
    }
  });

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement === null) {
        return;
      }
      const hit = hitRef.current;
      if (!hit) {
        return;
      }
      if (e.button === 0) {
        // Destroy the targeted block.
        world.setBlock(hit.x, hit.y, hit.z, BlockId.Air);
      } else if (e.button === 2) {
        // Place against the targeted face. Hotbar / block selection is B3;
        // for now everything places as grass.
        const [nx, ny, nz] = hit.normal;
        world.setBlock(hit.x + nx, hit.y + ny, hit.z + nz, BlockId.Grass);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [world]);

  return (
    <lineSegments
      ref={highlightRef}
      geometry={highlightGeo}
      material={highlightMat}
      visible={false}
    />
  );
};

export default Interactor;
