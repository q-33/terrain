import { useRef, useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useThree } from "@react-three/fiber";
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
import {
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_INITIAL_POSITION,
  CAMERA_NEAR,
  ORBIT_DAMPING_FACTOR,
  ORBIT_MAX_DISTANCE,
  ORBIT_MAX_POLAR_ANGLE,
  ORBIT_MIN_DISTANCE,
  ORBIT_MIN_POLAR_ANGLE,
} from "./constants";

type OrbitControlsImpl = OrbitControlsBase;
import Terrain from "./Terrain";
import SettingsPanel from "./SettingsPanel";
import CameraStateSync from "./CameraStateSync";
import Gizmo from "./characters/Gizmo";
import GizmoModel from "./characters/GizmoModel";
import GizmoMovement from "./characters/GizmoMovement";
import { readUrlState, writeUrlState } from "./urlState";
import { getSeed } from "./noise";

// Lazy so the /characters route doesn't pay for its three-stdlib + GLB loader
// surface area in the main terrain bundle.
const CharacterViewer = lazy(() => import("./CharacterViewer"));

// Read once at module load; the overlay is a dev/debug aid, not reactive.
const debugEnabled =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("debug");

// Lazy so r3f-perf (~200 kB) is only fetched when ?debug is set, not on every
// page load.
const PerfOverlay = lazy(() =>
  import("r3f-perf").then((m) => ({ default: m.Perf })),
);

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

const SELECT_STYLE: React.CSSProperties = {
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
  fontFamily: "monospace",
  padding: "5px 24px 5px 10px",
  borderRadius: 8,
  cursor: "pointer",
  letterSpacing: "0.04em",
  outline: "none",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
};

const SELECT_ARROW_STYLE: React.CSSProperties = {
  position: "absolute",
  right: 8,
  top: "50%",
  transform: "translateY(-50%)",
  pointerEvents: "none",
  color: "rgba(255,255,255,0.4)",
  fontSize: 10,
  lineHeight: "1",
};

type SelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  wrapperStyle?: React.CSSProperties;
  children: React.ReactNode;
};

export const SelectField = ({
  value,
  onChange,
  wrapperStyle,
  children,
}: SelectFieldProps) => (
  <div
    style={{ position: "relative", display: "inline-block", ...wrapperStyle }}
  >
    <select
      style={SELECT_STYLE}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
    <span style={SELECT_ARROW_STYLE}>▾</span>
  </div>
);

// OrbitControls always calls preventDefault() on contextmenu, suppressing the
// browser's right-click menu. Intercept in capture phase before it can, and
// call stopImmediatePropagation() so OrbitControls' listener never fires.
const AllowContextMenu = () => {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const handler = (e: Event) => e.stopImmediatePropagation();
    el.addEventListener("contextmenu", handler, { capture: true });
    return () =>
      el.removeEventListener("contextmenu", handler, { capture: true });
  }, [gl]);
  return null;
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
          <Suspense fallback={null}>
            <CharacterViewer
              characterId={characterId}
              onCharacterChange={setCharacterId}
            />
          </Suspense>
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
  const initialUrlState = useMemo(() => readUrlState(), []);
  const initialStrategy = useMemo(() => {
    const requested = initialUrlState.strategy?.toLowerCase();
    if (!requested) {
      return earthStrategy;
    }
    return (
      ALL_STRATEGIES.find((s) => s.name.toLowerCase() === requested) ??
      earthStrategy
    );
  }, [initialUrlState.strategy]);
  const [fogDensity, setFogDensity] = useState(
    initialStrategy.defaultFogDensity,
  );
  const [viewDistance, setViewDistance] = useState(
    initialStrategy.defaultViewDistance,
  );
  const [strategy, setStrategy] = useState<TerrainStrategy>(initialStrategy);

  // Write seed + strategy back to the URL on every strategy change. `immediate`
  // because strategy switches are discrete user actions, not per-frame state.
  useEffect(() => {
    writeUrlState(
      { seed: getSeed(), strategy: strategy.name.toLowerCase() },
      true,
    );
  }, [strategy]);

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
        camera={{
          fov: CAMERA_FOV,
          near: CAMERA_NEAR,
          far: CAMERA_FAR,
          position: CAMERA_INITIAL_POSITION,
        }}
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
        <AllowContextMenu />
        {debugEnabled && (
          <Suspense fallback={null}>
            <PerfOverlay position="top-left" />
          </Suspense>
        )}
        <ambientLight intensity={0.45} />
        <directionalLight position={[60, 80, 40]} intensity={1.6} />
        <hemisphereLight args={["#a8d0e6", "#6b8e4e", 0.5]} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={ORBIT_DAMPING_FACTOR}
          minDistance={ORBIT_MIN_DISTANCE}
          maxDistance={ORBIT_MAX_DISTANCE}
          minPolarAngle={ORBIT_MIN_POLAR_ANGLE}
          maxPolarAngle={ORBIT_MAX_POLAR_ANGLE}
          enableKeys={false}
          enablePan={false}
        />
        <CameraStateSync
          controlsRef={controlsRef}
          initialX={initialUrlState.x}
          initialZ={initialUrlState.z}
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
        <SelectField
          value={characterId}
          onChange={(v) => onCharacterChange(v as CharacterId)}
        >
          {CHARACTER_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </SelectField>
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
