import { useRef, RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls as OrbitControlsBase } from "three-stdlib";
import { writeUrlState } from "./urlState";

type Props = {
  controlsRef: RefObject<OrbitControlsBase | null>;
  initialX?: number;
  initialZ?: number;
};

// On first frame, snap camera + orbit target to the URL-provided (x, z) — the
// shared delta keeps the user's zoom/angle intact at the new spot. After that
// it just pushes target.x/z back into the URL on every frame; the writer in
// urlState.ts coalesces to one update per ~400ms.
const CameraStateSync = ({ controlsRef, initialX, initialZ }: Props): null => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    if (!initialized.current) {
      initialized.current = true;
      if (initialX !== undefined || initialZ !== undefined) {
        const tx = initialX ?? controls.target.x;
        const tz = initialZ ?? controls.target.z;
        const dx = tx - controls.target.x;
        const dz = tz - controls.target.z;
        controls.target.x = tx;
        controls.target.z = tz;
        camera.position.x += dx;
        camera.position.z += dz;
      }
      return;
    }

    writeUrlState({
      x: Math.round(controls.target.x * 10) / 10,
      z: Math.round(controls.target.z * 10) / 10,
    });
  });

  return null;
};

export default CameraStateSync;
