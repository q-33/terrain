import { DayNightPalette } from "./dayNight";

// A "world" preset — currently just naming, default fog distances, and the
// day/night palette. Earth/Mars/Ocean used to carry biome shader uniforms
// for the smooth-terrain renderer; with the voxel pivot those moved into
// the world generator and block registry. The biome name still survives so
// the URL and biome buttons keep working as a sky/fog mood toggle.
export type TerrainStrategy = {
  name: string;
  defaultFogDensity: number;
  defaultViewDistance: number;
  dayPalette: DayNightPalette;
};

// Earth: clear daytime blue, warm sunrise/sunset, deep navy night. The
// purple keyframes at t=0.20 and t=0.80 sit between the night blue and the
// sunrise/sunset orange so the RGB lerp never passes through muddy gray.
const earthPalette: DayNightPalette = [
  {
    t: 0.0,
    sky: [0.04, 0.07, 0.16],
    fog: [0.04, 0.07, 0.16],
    sun: [1.0, 0.9, 0.75],
    ambient: [0.1, 0.14, 0.25],
    sunIntensity: 0.0,
    ambientIntensity: 0.08,
  },
  {
    t: 0.2,
    sky: [0.16, 0.12, 0.29],
    fog: [0.16, 0.12, 0.29],
    sun: [1.0, 0.6, 0.4],
    ambient: [0.22, 0.17, 0.32],
    sunIntensity: 0.2,
    ambientIntensity: 0.18,
  },
  {
    t: 0.28,
    sky: [0.91, 0.63, 0.48],
    fog: [0.84, 0.53, 0.41],
    sun: [1.0, 0.7, 0.44],
    ambient: [0.78, 0.6, 0.53],
    sunIntensity: 1.2,
    ambientIntensity: 0.35,
  },
  {
    t: 0.5,
    sky: [0.561, 0.706, 0.784],
    fog: [0.561, 0.706, 0.784],
    sun: [1.0, 0.96, 0.88],
    ambient: [0.72, 0.78, 0.83],
    sunIntensity: 1.8,
    ambientIntensity: 0.45,
  },
  {
    t: 0.72,
    sky: [0.85, 0.47, 0.31],
    fog: [0.77, 0.41, 0.22],
    sun: [1.0, 0.5, 0.31],
    ambient: [0.75, 0.5, 0.44],
    sunIntensity: 1.2,
    ambientIntensity: 0.35,
  },
  {
    t: 0.8,
    sky: [0.16, 0.09, 0.22],
    fog: [0.16, 0.09, 0.22],
    sun: [1.0, 0.44, 0.31],
    ambient: [0.17, 0.11, 0.25],
    sunIntensity: 0.15,
    ambientIntensity: 0.18,
  },
  {
    t: 1.0,
    sky: [0.04, 0.07, 0.16],
    fog: [0.04, 0.07, 0.16],
    sun: [1.0, 0.9, 0.75],
    ambient: [0.1, 0.14, 0.25],
    sunIntensity: 0.0,
    ambientIntensity: 0.08,
  },
];

export const earthStrategy: TerrainStrategy = {
  name: "Earth",
  defaultFogDensity: 50,
  defaultViewDistance: 50,
  dayPalette: earthPalette,
};

// Mars: rust-toned at all hours; sun gets a redder cast than Earth's. Night
// is nearly black with a hint of brown so silhouettes are still readable.
const marsPalette: DayNightPalette = [
  {
    t: 0.0,
    sky: [0.1, 0.04, 0.02],
    fog: [0.1, 0.04, 0.02],
    sun: [1.0, 0.66, 0.44],
    ambient: [0.16, 0.06, 0.02],
    sunIntensity: 0.0,
    ambientIntensity: 0.1,
  },
  {
    t: 0.2,
    sky: [0.29, 0.09, 0.03],
    fog: [0.29, 0.09, 0.03],
    sun: [1.0, 0.54, 0.29],
    ambient: [0.29, 0.13, 0.05],
    sunIntensity: 0.2,
    ambientIntensity: 0.2,
  },
  {
    t: 0.28,
    sky: [0.78, 0.44, 0.23],
    fog: [0.72, 0.41, 0.21],
    sun: [1.0, 0.66, 0.44],
    ambient: [0.72, 0.44, 0.27],
    sunIntensity: 1.4,
    ambientIntensity: 0.4,
  },
  {
    t: 0.5,
    sky: [0.71, 0.35, 0.1],
    fog: [0.76, 0.44, 0.25],
    sun: [1.0, 0.82, 0.63],
    ambient: [0.75, 0.54, 0.4],
    sunIntensity: 1.8,
    ambientIntensity: 0.5,
  },
  {
    t: 0.72,
    sky: [0.63, 0.25, 0.13],
    fog: [0.6, 0.22, 0.16],
    sun: [1.0, 0.44, 0.25],
    ambient: [0.6, 0.24, 0.17],
    sunIntensity: 1.3,
    ambientIntensity: 0.4,
  },
  {
    t: 0.8,
    sky: [0.17, 0.05, 0.03],
    fog: [0.17, 0.05, 0.03],
    sun: [1.0, 0.38, 0.25],
    ambient: [0.23, 0.08, 0.06],
    sunIntensity: 0.2,
    ambientIntensity: 0.2,
  },
  {
    t: 1.0,
    sky: [0.1, 0.04, 0.02],
    fog: [0.1, 0.04, 0.02],
    sun: [1.0, 0.66, 0.44],
    ambient: [0.16, 0.06, 0.02],
    sunIntensity: 0.0,
    ambientIntensity: 0.1,
  },
];

export const marsStrategy: TerrainStrategy = {
  name: "Mars",
  defaultFogDensity: 65,
  defaultViewDistance: 35,
  dayPalette: marsPalette,
};

// Ocean floor: surface sunlight barely reaches here, so the cycle is muted —
// the difference between "midnight" and "noon" is a few percent of ambient
// brightness, not a hue swing. Still alive; just quietly.
const oceanFloorPalette: DayNightPalette = [
  {
    t: 0.0,
    sky: [0.008, 0.012, 0.031],
    fog: [0.012, 0.016, 0.063],
    sun: [0.25, 0.5, 0.63],
    ambient: [0.024, 0.031, 0.078],
    sunIntensity: 0.0,
    ambientIntensity: 0.05,
  },
  {
    t: 0.2,
    sky: [0.016, 0.02, 0.086],
    fog: [0.016, 0.024, 0.102],
    sun: [0.19, 0.44, 0.63],
    ambient: [0.039, 0.047, 0.125],
    sunIntensity: 0.05,
    ambientIntensity: 0.1,
  },
  {
    t: 0.28,
    sky: [0.024, 0.039, 0.125],
    fog: [0.024, 0.039, 0.125],
    sun: [0.25, 0.56, 0.69],
    ambient: [0.047, 0.071, 0.157],
    sunIntensity: 0.15,
    ambientIntensity: 0.15,
  },
  {
    t: 0.5,
    sky: [0.024, 0.055, 0.11],
    fog: [0.027, 0.067, 0.122],
    sun: [0.31, 0.56, 0.69],
    ambient: [0.055, 0.094, 0.157],
    sunIntensity: 0.5,
    ambientIntensity: 0.25,
  },
  {
    t: 0.72,
    sky: [0.024, 0.039, 0.094],
    fog: [0.024, 0.039, 0.094],
    sun: [0.25, 0.5, 0.63],
    ambient: [0.039, 0.063, 0.094],
    sunIntensity: 0.2,
    ambientIntensity: 0.15,
  },
  {
    t: 0.8,
    sky: [0.016, 0.02, 0.078],
    fog: [0.016, 0.02, 0.078],
    sun: [0.19, 0.44, 0.63],
    ambient: [0.024, 0.031, 0.078],
    sunIntensity: 0.05,
    ambientIntensity: 0.08,
  },
  {
    t: 1.0,
    sky: [0.008, 0.012, 0.031],
    fog: [0.012, 0.016, 0.063],
    sun: [0.25, 0.5, 0.63],
    ambient: [0.024, 0.031, 0.078],
    sunIntensity: 0.0,
    ambientIntensity: 0.05,
  },
];

export const oceanFloorStrategy: TerrainStrategy = {
  name: "Ocean Floor",
  defaultFogDensity: 75,
  defaultViewDistance: 25,
  dayPalette: oceanFloorPalette,
};

export const ALL_STRATEGIES: readonly TerrainStrategy[] = [
  earthStrategy,
  marsStrategy,
  oceanFloorStrategy,
];
