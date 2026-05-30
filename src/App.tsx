import { useRef, useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useThree, Canvas } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { Color, Fog } from "three";
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
} from "./constants";
import {
  makeDayNightSample,
  samplePalette,
  wallClockTimeOfDay,
} from "./dayNight";
import VoxelWorld from "./voxel/VoxelWorld";
import PlayerController from "./voxel/PlayerController";
import SettingsPanel from "./SettingsPanel";
import DayNightCycle from "./DayNightCycle";
import { readUrlState, writeUrlState } from "./urlState";
import { getSeed } from "./noise";

// Read once at module load; the overlay is a dev/debug aid, not reactive.
const debugEnabled =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("debug");

// Lazy so r3f-perf (~200 kB) is only fetched when ?debug is set, not on every
// page load.
const PerfOverlay = lazy(() =>
  import("r3f-perf").then((m) => ({ default: m.Perf })),
);

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

// PointerLockControls calls preventDefault() on contextmenu (right-click),
// which we want to repurpose for placing blocks later. For now, just stop
// the browser menu from appearing when the user right-clicks during play.
const AllowContextMenu = () => {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const handler = (e: Event) => e.preventDefault();
    el.addEventListener("contextmenu", handler);
    return () => el.removeEventListener("contextmenu", handler);
  }, [gl]);
  return null;
};

const App = () => {
  const fogRef = useRef<Fog | null>(null);
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
  const timeRef = useRef(wallClockTimeOfDay());
  const [paused, setPaused] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);

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

  // DayNightCycle owns scene.background and scene.fog.color now — strategy
  // changes only need to reset the fog distance sliders to the new defaults.
  useEffect(() => {
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
          const init = makeDayNightSample();
          samplePalette(strategy.dayPalette, wallClockTimeOfDay(), init);
          scene.background = new Color().copy(init.sky);
          const [near, far] = fogNearFar(fogDensity, viewDistance);
          const fog = new Fog(init.fog.getHex(), near, far);
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
        <DayNightCycle strategy={strategy} timeRef={timeRef} paused={paused} />
        <PointerLockControls
          onLock={() => setPointerLocked(true)}
          onUnlock={() => setPointerLocked(false)}
        />
        <PlayerController
          initialX={initialUrlState.x}
          initialZ={initialUrlState.z}
        />
        <VoxelWorld />
      </Canvas>

      {!pointerLocked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            color: "rgba(255,255,255,0.92)",
            fontFamily: "monospace",
            fontSize: 16,
            pointerEvents: "none",
            letterSpacing: "0.04em",
          }}
        >
          click to play · WASD move · space jump · esc release
        </div>
      )}

      <SettingsPanel
        fogDensity={fogDensity}
        onFogDensity={setFogDensity}
        viewDistance={viewDistance}
        onViewDistance={setViewDistance}
        strategy={strategy}
        onStrategy={setStrategy}
        strategies={ALL_STRATEGIES}
        timeRef={timeRef}
        paused={paused}
        onPausedChange={setPaused}
      />
    </>
  );
};

export default App;
