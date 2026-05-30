import { forwardRef, useRef, RefObject } from "react";
import { Vec3 } from "../types";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const WALK_PHASE_SPEED = 16;
const WALK_LEG_SWING = 0.7;
const WALK_BOB_AMOUNT = 0.06;
const WALK_ROLL_AMOUNT = 0.12;
const JUMP_LEG_TUCK = 0.9;
const JUMP_LEG_TUCK_SPEED = 0.18;
const LEG_RETURN_SPEED = 0.3;

// Cream/off-white Cavachon palette — modeled after the reference photos.
// The fur is nearly uniform cream with a faint apricot warmth on the ears
// and around the muzzle; no contrast cap or tan ears.
const FUR_BASE = "#f1e6d0";
const FUR_HIGHLIGHT = "#f8f1de";
const FUR_WARM = "#e8d4b2";
const PAW_DARK = "#1a0e08";
const MUZZLE_CREAM = "#ece0c8";
const EYE_DARK = "#0e0604";
const NOSE_DARK = "#2a1810";
const EYE_WHITE = "#f8f4ee";
const EYE_SHINE = "#ffd8a8";
const TONGUE_PINK = "#d56880";

type Props = {
  movingRef: RefObject<boolean>;
  jumpingRef?: RefObject<boolean>;
};

const LegGroup = ({
  position,
  phaseOffset,
  walkPhaseRef,
  movingRef,
  jumpingRef,
}: {
  position: Vec3;
  phaseOffset: number;
  walkPhaseRef: RefObject<number>;
  movingRef: RefObject<boolean>;
  jumpingRef?: RefObject<boolean>;
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }
    const jumping = jumpingRef?.current ?? false;
    if (jumping) {
      groupRef.current.rotation.x +=
        (JUMP_LEG_TUCK - groupRef.current.rotation.x) * JUMP_LEG_TUCK_SPEED;
      return;
    }
    const swingAmt = movingRef.current ? WALK_LEG_SWING : 0;
    const target = swingAmt * Math.sin(walkPhaseRef.current + phaseOffset);
    groupRef.current.rotation.x +=
      (target - groupRef.current.rotation.x) * LEG_RETURN_SPEED;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.072, 0.066, 0.44, 7]} />
        <meshLambertMaterial color={FUR_BASE} />
      </mesh>
      {/* Fluff puff over the leg — cavachons have very full leg fur */}
      <mesh position={[0, -0.12, 0]} scale={[1.15, 1, 1.15]}>
        <sphereGeometry args={[0.1, 8, 7]} />
        <meshLambertMaterial color={FUR_HIGHLIGHT} />
      </mesh>
      <mesh position={[0, -0.44, 0]} scale={[1, 0.65, 1.1]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshLambertMaterial color={PAW_DARK} />
      </mesh>
    </group>
  );
};

const Gizmo = forwardRef<THREE.Group, Props>(
  ({ movingRef, jumpingRef }, ref) => {
    const walkPhaseRef = useRef(0);
    const bodyGroupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
      const jumping = jumpingRef?.current ?? false;

      if (movingRef.current && !jumping) {
        walkPhaseRef.current += delta * WALK_PHASE_SPEED;
      }

      if (bodyGroupRef.current) {
        if (jumping) {
          bodyGroupRef.current.scale.y +=
            (1.18 - bodyGroupRef.current.scale.y) * 0.15;
          bodyGroupRef.current.scale.x +=
            (0.88 - bodyGroupRef.current.scale.x) * 0.15;
          bodyGroupRef.current.rotation.z +=
            (0 - bodyGroupRef.current.rotation.z) * 0.15;
        } else {
          bodyGroupRef.current.scale.y +=
            (1 - bodyGroupRef.current.scale.y) * 0.2;
          bodyGroupRef.current.scale.x +=
            (1 - bodyGroupRef.current.scale.x) * 0.2;
          const bob = movingRef.current
            ? WALK_BOB_AMOUNT * Math.abs(Math.sin(walkPhaseRef.current))
            : 0;
          bodyGroupRef.current.position.y = bob;
          const roll = movingRef.current
            ? WALK_ROLL_AMOUNT * Math.sin(walkPhaseRef.current)
            : 0;
          bodyGroupRef.current.rotation.z +=
            (roll - bodyGroupRef.current.rotation.z) * 0.2;
        }
      }
    });

    return (
      <group ref={ref} name="gizmo">
        {/* Raises geometry so the lowest paw sits at y=0 */}
        <group position={[0, 0.15, 0]}>
          <group ref={bodyGroupRef} name="body-group">
            <mesh
              name="body-core"
              position={[0, 0.52, 0]}
              scale={[0.72, 0.58, 0.9]}
            >
              <sphereGeometry args={[0.5, 12, 10]} />
              <meshLambertMaterial color={FUR_BASE} />
            </mesh>

            {/* Extra side fluff puffs for the curly-coat silhouette */}
            <mesh
              name="body-side-left"
              position={[-0.34, 0.5, 0.05]}
              scale={[0.32, 0.46, 0.6]}
            >
              <sphereGeometry args={[0.5, 8, 7]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>
            <mesh
              name="body-side-right"
              position={[0.34, 0.5, 0.05]}
              scale={[0.32, 0.46, 0.6]}
            >
              <sphereGeometry args={[0.5, 8, 7]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>

            <mesh
              name="body-top-fluff"
              position={[0, 0.7, 0.05]}
              scale={[0.66, 0.48, 0.82]}
            >
              <sphereGeometry args={[0.5, 10, 8]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>

            <mesh
              name="chest-fluff"
              position={[0, 0.42, 0.34]}
              scale={[0.62, 0.54, 0.6]}
            >
              <sphereGeometry args={[0.5, 10, 8]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>

            <mesh
              name="neck"
              position={[0, 0.86, 0.22]}
              scale={[0.32, 0.32, 0.32]}
            >
              <sphereGeometry args={[0.5, 10, 8]} />
              <meshLambertMaterial color={FUR_BASE} />
            </mesh>

            <mesh name="head" position={[0, 1.04, 0.4]}>
              <sphereGeometry args={[0.34, 14, 12]} />
              <meshLambertMaterial color={FUR_BASE} />
            </mesh>

            {/* Top-of-head fluff — same color as body, just for the round silhouette */}
            <mesh
              name="head-fluff"
              position={[0, 1.28, 0.32]}
              scale={[0.42, 0.22, 0.4]}
            >
              <sphereGeometry args={[0.5, 10, 8]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>

            {/* Long floppy ears matching body color with a faint apricot warmth */}
            <mesh
              name="ear-left"
              position={[-0.34, 0.92, 0.27]}
              scale={[0.18, 0.5, 0.13]}
              rotation={[0.2, 0, 0.18]}
            >
              <sphereGeometry args={[0.5, 8, 7]} />
              <meshLambertMaterial color={FUR_WARM} />
            </mesh>
            <mesh
              name="ear-right"
              position={[0.34, 0.92, 0.27]}
              scale={[0.18, 0.5, 0.13]}
              rotation={[0.2, 0, -0.18]}
            >
              <sphereGeometry args={[0.5, 8, 7]} />
              <meshLambertMaterial color={FUR_WARM} />
            </mesh>

            <mesh
              name="cheek-left"
              position={[-0.22, 1.0, 0.46]}
              scale={[0.34, 0.32, 0.32]}
            >
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>

            <mesh
              name="cheek-right"
              position={[0.22, 1.0, 0.46]}
              scale={[0.34, 0.32, 0.32]}
            >
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>

            <mesh
              name="snout"
              position={[0, 0.95, 0.66]}
              scale={[0.34, 0.26, 0.32]}
            >
              <sphereGeometry args={[0.5, 10, 8]} />
              <meshLambertMaterial color={MUZZLE_CREAM} />
            </mesh>

            {/* Dark brown nose — a small flattened sphere reads softer than
                a dodecahedron and matches the photo reference. */}
            <mesh
              name="nose"
              position={[0, 0.97, 0.82]}
              scale={[1.05, 0.78, 0.6]}
            >
              <sphereGeometry args={[0.046, 12, 10]} />
              <meshLambertMaterial color={NOSE_DARK} />
            </mesh>

            {/* Small pink tongue tip just below the nose — the "always
                slightly panting" look from photo IMG_8336/8388. */}
            <mesh
              name="tongue"
              position={[0, 0.9, 0.79]}
              rotation={[0.35, 0, 0]}
              scale={[1, 0.45, 1.1]}
            >
              <sphereGeometry args={[0.032, 10, 8]} />
              <meshLambertMaterial color={TONGUE_PINK} />
            </mesh>

            <mesh name="eye-left-sclera" position={[-0.12, 1.1, 0.69]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshLambertMaterial color={EYE_WHITE} />
            </mesh>
            <mesh name="eye-left-iris" position={[-0.12, 1.1, 0.74]}>
              <sphereGeometry args={[0.062, 10, 8]} />
              <meshLambertMaterial color={EYE_DARK} />
            </mesh>
            <mesh name="eye-left-shine" position={[-0.09, 1.13, 0.79]}>
              <circleGeometry args={[0.02, 16]} />
              <meshBasicMaterial color={EYE_SHINE} />
            </mesh>

            <mesh name="eye-right-sclera" position={[0.12, 1.1, 0.69]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshLambertMaterial color={EYE_WHITE} />
            </mesh>
            <mesh name="eye-right-iris" position={[0.12, 1.1, 0.74]}>
              <sphereGeometry args={[0.062, 10, 8]} />
              <meshLambertMaterial color={EYE_DARK} />
            </mesh>
            <mesh name="eye-right-shine" position={[0.15, 1.13, 0.79]}>
              <circleGeometry args={[0.02, 16]} />
              <meshBasicMaterial color={EYE_SHINE} />
            </mesh>

            <mesh
              name="tail-base"
              position={[0, 0.82, -0.5]}
              rotation={[-0.7, 0, 0.1]}
              scale={[0.5, 0.52, 0.42]}
            >
              <sphereGeometry args={[0.5, 8, 6]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>
            <mesh
              name="tail-tip"
              position={[0.04, 0.96, -0.58]}
              rotation={[-1.1, 0, 0.15]}
              scale={[0.38, 0.42, 0.34]}
            >
              <sphereGeometry args={[0.5, 8, 6]} />
              <meshLambertMaterial color={FUR_HIGHLIGHT} />
            </mesh>
          </group>

          <LegGroup
            position={[-0.24, 0.42, 0.38]}
            phaseOffset={0}
            walkPhaseRef={walkPhaseRef}
            movingRef={movingRef}
            jumpingRef={jumpingRef}
          />
          <LegGroup
            position={[0.24, 0.42, 0.38]}
            phaseOffset={Math.PI}
            walkPhaseRef={walkPhaseRef}
            movingRef={movingRef}
            jumpingRef={jumpingRef}
          />
          <LegGroup
            position={[-0.24, 0.38, -0.32]}
            phaseOffset={Math.PI}
            walkPhaseRef={walkPhaseRef}
            movingRef={movingRef}
            jumpingRef={jumpingRef}
          />
          <LegGroup
            position={[0.24, 0.38, -0.32]}
            phaseOffset={0}
            walkPhaseRef={walkPhaseRef}
            movingRef={movingRef}
            jumpingRef={jumpingRef}
          />
        </group>
      </group>
    );
  },
);

Gizmo.displayName = "Gizmo";

export default Gizmo;
