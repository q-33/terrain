import * as THREE from "three";
import { RGB } from "./types";

// One keyframe in a strategy's day/night palette. `t` is the time-of-day in
// [0, 1) where 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
// Palettes interpolate linearly between adjacent keyframes; to avoid muddy
// RGB transitions through complementary colors (e.g. midnight blue → dawn
// pink), include intermediate "purple twilight" keyframes so the lerp never
// crosses the gray midpoint of two opposing hues.
export type DayNightKeyframe = {
  t: number;
  sky: RGB;
  fog: RGB;
  sun: RGB;
  ambient: RGB;
  sunIntensity: number;
  ambientIntensity: number;
};

// A palette must start at t=0 and end at t=1 with identical colors so the
// midnight wrap-around interpolates cleanly. Sorted ascending by t.
export type DayNightPalette = readonly DayNightKeyframe[];

// Reusable output container so per-frame sampling doesn't allocate.
export type DayNightSample = {
  sky: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  ambient: THREE.Color;
  sunIntensity: number;
  ambientIntensity: number;
};

export const makeDayNightSample = (): DayNightSample => ({
  sky: new THREE.Color(),
  fog: new THREE.Color(),
  sun: new THREE.Color(),
  ambient: new THREE.Color(),
  sunIntensity: 0,
  ambientIntensity: 0,
});

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const setFromRgbLerp = (out: THREE.Color, a: RGB, b: RGB, t: number): void => {
  out.setRGB(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
};

// Locate the bracket [palette[i], palette[i+1]] that contains `t` and write
// the interpolated keyframe into `out`. Assumes palette is sorted and covers
// the full [0, 1] range (caller guarantees via palette construction).
export const samplePalette = (
  palette: DayNightPalette,
  t: number,
  out: DayNightSample,
): void => {
  // Normalize into [0, 1). Cheap modulo via subtraction handles small overshoots
  // from the time advance without paying for %.
  let u = t;
  if (u >= 1) {
    u -= Math.floor(u);
  } else if (u < 0) {
    u -= Math.floor(u);
  }

  for (let i = 0; i < palette.length - 1; i++) {
    const a = palette[i];
    const b = palette[i + 1];
    if (u >= a.t && u <= b.t) {
      const span = b.t - a.t;
      const local = span > 0 ? (u - a.t) / span : 0;
      setFromRgbLerp(out.sky, a.sky, b.sky, local);
      setFromRgbLerp(out.fog, a.fog, b.fog, local);
      setFromRgbLerp(out.sun, a.sun, b.sun, local);
      setFromRgbLerp(out.ambient, a.ambient, b.ambient, local);
      out.sunIntensity = lerp(a.sunIntensity, b.sunIntensity, local);
      out.ambientIntensity = lerp(
        a.ambientIntensity,
        b.ambientIntensity,
        local,
      );
      return;
    }
  }

  // Fallback: clamp to the last keyframe. Only reached if the palette is
  // malformed (doesn't reach t=1).
  const last = palette[palette.length - 1];
  out.sky.setRGB(last.sky[0], last.sky[1], last.sky[2]);
  out.fog.setRGB(last.fog[0], last.fog[1], last.fog[2]);
  out.sun.setRGB(last.sun[0], last.sun[1], last.sun[2]);
  out.ambient.setRGB(last.ambient[0], last.ambient[1], last.ambient[2]);
  out.sunIntensity = last.sunIntensity;
  out.ambientIntensity = last.ambientIntensity;
};

// Returns the sun's world-space position for a given time-of-day. The sun
// traces a circle in the XY plane (east → up → west → down) with a small
// Z offset so the noon directional doesn't shine straight down — shadows
// (if any) and diffuse shading get a more flattering angle.
export const sunPositionAt = (
  t: number,
  radius: number,
  out: THREE.Vector3,
): void => {
  const phi = (t - 0.25) * Math.PI * 2;
  out.set(radius * Math.cos(phi), radius * Math.sin(phi), radius * 0.3);
};

// The player's local wall-clock time mapped into [0, 1) where 0 = local
// midnight, 0.5 = local solar noon. Used so the in-world sun matches the
// real world outside the user's window.
export const wallClockTimeOfDay = (): number => {
  const now = new Date();
  const seconds =
    now.getHours() * 3600 +
    now.getMinutes() * 60 +
    now.getSeconds() +
    now.getMilliseconds() / 1000;
  return seconds / 86400;
};
