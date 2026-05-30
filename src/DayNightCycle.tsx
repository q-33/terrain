import { useRef, useMemo, RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TerrainStrategy } from "./TerrainStrategy";
import { SUN_DISTANCE } from "./constants";
import {
  makeDayNightSample,
  samplePalette,
  sunPositionAt,
  wallClockTimeOfDay,
} from "./dayNight";

type Props = {
  strategy: TerrainStrategy;
  // Held in a ref so the slider can scrub it without re-rendering TerrainView
  // every tick. The cycle reads and (when unpaused) advances it in useFrame.
  timeRef: RefObject<number>;
  paused: boolean;
};

const DayNightCycle = ({ strategy, timeRef, paused }: Props) => {
  const { scene } = useThree();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sampled = useMemo(() => makeDayNightSample(), []);
  const sunPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    // When live, time tracks the user's wall clock so the in-world sun
    // matches the sun outside their window. Pause to freeze, scrub the
    // slider to look around (the slider auto-pauses when dragged).
    if (!paused) {
      timeRef.current = wallClockTimeOfDay();
    }
    const t = timeRef.current;

    samplePalette(strategy.dayPalette, t, sampled);

    if (sunRef.current) {
      sunPositionAt(t, SUN_DISTANCE, sunPos);
      sunRef.current.position.copy(sunPos);
      sunRef.current.color.copy(sampled.sun);
      sunRef.current.intensity = sampled.sunIntensity;
    }
    if (ambientRef.current) {
      ambientRef.current.color.copy(sampled.ambient);
      ambientRef.current.intensity = sampled.ambientIntensity;
    }

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(sampled.sky);
    }
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(sampled.fog);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} />
      <directionalLight ref={sunRef} />
    </>
  );
};

export default DayNightCycle;
