import { useRef, useMemo, RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TerrainStrategy } from "./TerrainStrategy";
import { DAY_LENGTH_SECONDS, SUN_DISTANCE } from "./constants";
import { makeDayNightSample, samplePalette, sunPositionAt } from "./dayNight";

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

  useFrame((_, delta) => {
    if (!paused) {
      let next = timeRef.current + delta / DAY_LENGTH_SECONDS;
      if (next >= 1) {
        next -= Math.floor(next);
      }
      timeRef.current = next;
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
