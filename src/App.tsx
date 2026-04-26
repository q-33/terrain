import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, Fog } from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SKY } from "./constants";
import Terrain from "./Terrain";
import KeyboardMovement from "./KeyboardMovement";
import SettingsPanel from "./SettingsPanel";

// viewDistance 0–100 → fog.far (40–250)
// fogDensity   0–100 → fog.near as fraction of far (0%=thin, 100%=thick)
const fogNearFar = (
  density: number,
  viewDistance: number,
): [number, number] => {
  const far = 40 + (viewDistance / 100) * 210;
  const near = far * (1 - (density / 100) * 0.9);
  return [near, far];
};

const App = () => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const fogRef = useRef<Fog | null>(null);
  const [fogDensity, setFogDensity] = useState(50);
  const [viewDistance, setViewDistance] = useState(50);

  useEffect(() => {
    if (!fogRef.current) {
      return;
    }
    const [near, far] = fogNearFar(fogDensity, viewDistance);
    fogRef.current.near = near;
    fogRef.current.far = far;
  }, [fogDensity, viewDistance]);

  return (
    <>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 300, position: [0, 22, 28] }}
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          scene.background = new Color(SKY);
          const [near, far] = fogNearFar(fogDensity, viewDistance);
          const fog = new Fog(SKY, near, far);
          scene.fog = fog;
          fogRef.current = fog;
        }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[60, 80, 40]} intensity={1.6} />
        <hemisphereLight args={["#a8d0e6", "#6b8e4e", 0.5]} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={4}
          maxDistance={80}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
        />
        <KeyboardMovement controlsRef={controlsRef} />
        <Terrain />
      </Canvas>

      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.7)",
          fontSize: 12,
          fontFamily: "monospace",
          background: "rgba(0,0,0,0.35)",
          padding: "6px 14px",
          borderRadius: 8,
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        ↑↓ move &nbsp;|&nbsp; ←→ turn &nbsp;|&nbsp; drag — orbit &nbsp;|&nbsp;
        scroll — zoom
      </div>

      <SettingsPanel
        fogDensity={fogDensity}
        onFogDensity={setFogDensity}
        viewDistance={viewDistance}
        onViewDistance={setViewDistance}
      />
    </>
  );
};

export default App;
