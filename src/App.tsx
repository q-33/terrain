import { useRef, useState, useEffect, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, Fog, Group, Scene } from "three";
import { OrbitControls as OrbitControlsBase } from "three-stdlib";
import {
  earthStrategy,
  ALL_STRATEGIES,
  TerrainStrategy,
} from "./TerrainStrategy";

type OrbitControlsImpl = OrbitControlsBase;
import Terrain from "./Terrain";
import SettingsPanel from "./SettingsPanel";
import Gizmo from "./characters/Gizmo";
import GizmoModel from "./characters/GizmoModel";
import GizmoMovement from "./characters/GizmoMovement";
import CharacterViewer from "./CharacterViewer";

export type CharacterId = "model" | "builtin";

export const CHARACTER_OPTIONS: { id: CharacterId; label: string }[] = [
  { id: "builtin", label: "Gizmo · built-in" },
  { id: "model", label: "Gizmo · model" },
];

// viewDistance 0–100 → fog.far (40–650)
// fogDensity   0–100 → fog.near as fraction of far (0%=thin, 100%=thick)
const fogNearFar = (
  density: number,
  viewDistance: number,
): [number, number] => {
  const far = 40 + (viewDistance / 100) * 610;
  const near = far * (1 - (density / 100) * 0.9);
  return [near, far];
};

export const SELECT_STYLE: React.CSSProperties = {
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
  fontFamily: "monospace",
  padding: "5px 10px",
  borderRadius: 8,
  cursor: "pointer",
  letterSpacing: "0.04em",
  outline: "none",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  paddingRight: 28,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.4)'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

const App = () => {
  const [characterId, setCharacterId] = useState<CharacterId>("builtin");

  return (
    <Routes>
      <Route
        path="/"
        element={
          <TerrainView
            characterId={characterId}
            onCharacterChange={setCharacterId}
          />
        }
      />
      <Route
        path="/characters"
        element={
          <CharacterViewer
            characterId={characterId}
            onCharacterChange={setCharacterId}
          />
        }
      />
    </Routes>
  );
};

type ActiveCharacterProps = {
  gizmoRef: React.RefObject<Group | null>;
  movingRef: React.RefObject<boolean>;
  jumpingRef: React.RefObject<boolean>;
  characterId: CharacterId;
};

const ActiveCharacter = ({
  gizmoRef,
  movingRef,
  jumpingRef,
  characterId,
}: ActiveCharacterProps) => {
  if (characterId === "model") {
    return (
      <Suspense fallback={null}>
        <GizmoModel
          ref={gizmoRef}
          movingRef={movingRef}
          jumpingRef={jumpingRef}
        />
      </Suspense>
    );
  }
  return <Gizmo ref={gizmoRef} movingRef={movingRef} jumpingRef={jumpingRef} />;
};

type TerrainViewProps = {
  characterId: CharacterId;
  onCharacterChange: (id: CharacterId) => void;
};

const TerrainView = ({ characterId, onCharacterChange }: TerrainViewProps) => {
  const navigate = useNavigate();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const fogRef = useRef<Fog | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const gizmoRef = useRef<Group | null>(null);
  const movingRef = useRef(false);
  const jumpingRef = useRef(false);
  const [fogDensity, setFogDensity] = useState(earthStrategy.defaultFogDensity);
  const [viewDistance, setViewDistance] = useState(
    earthStrategy.defaultViewDistance,
  );
  const [strategy, setStrategy] = useState<TerrainStrategy>(earthStrategy);

  useEffect(() => {
    if (!fogRef.current) {
      return;
    }
    const [near, far] = fogNearFar(fogDensity, viewDistance);
    fogRef.current.near = near;
    fogRef.current.far = far;
  }, [fogDensity, viewDistance]);

  useEffect(() => {
    if (sceneRef.current) {
      (sceneRef.current.background as Color).set(strategy.skyColor);
    }
    if (fogRef.current) {
      fogRef.current.color.set(strategy.fogColor);
    }
    setFogDensity(strategy.defaultFogDensity);
    setViewDistance(strategy.defaultViewDistance);
  }, [strategy]);

  return (
    <>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 700, position: [0, 2.5, 6] }}
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          sceneRef.current = scene;
          scene.background = new Color(strategy.skyColor);
          const [near, far] = fogNearFar(fogDensity, viewDistance);
          const fog = new Fog(strategy.fogColor, near, far);
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
          minDistance={2}
          maxDistance={80}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.5}
        />
        <GizmoMovement
          controlsRef={controlsRef}
          gizmoRef={gizmoRef}
          movingRef={movingRef}
          jumpingRef={jumpingRef}
        />
        <ActiveCharacter
          gizmoRef={gizmoRef}
          movingRef={movingRef}
          jumpingRef={jumpingRef}
          characterId={characterId}
        />
        <Terrain strategy={strategy} />
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
        ↑↓ move &nbsp;|&nbsp; ←→ turn &nbsp;|&nbsp; space — jump &nbsp;|&nbsp;
        drag — orbit &nbsp;|&nbsp; scroll — zoom
      </div>

      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <select
          style={SELECT_STYLE}
          value={characterId}
          onChange={(e) => onCharacterChange(e.target.value as CharacterId)}
        >
          {CHARACTER_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.82)",
            fontSize: 12,
            fontFamily: "monospace",
            padding: "6px 14px",
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
          onClick={() => navigate("/characters")}
        >
          characters →
        </button>
      </div>

      <SettingsPanel
        fogDensity={fogDensity}
        onFogDensity={setFogDensity}
        viewDistance={viewDistance}
        onViewDistance={setViewDistance}
        strategy={strategy}
        onStrategy={setStrategy}
        strategies={ALL_STRATEGIES}
      />
    </>
  );
};

export default App;
