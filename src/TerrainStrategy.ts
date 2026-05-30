import { RGB } from "./types";

// Five biome colors stacked low → high, separated by four transition heights.
// The shader blends between adjacent layers using `smoothstep` with `blendRange`
// so there are no hard bands. `rockColor` is mixed in on steep faces (slope is
// measured per-pixel from screen-space derivatives of world position so the
// blend stays sharp even though vertex normals are smoothed).
export type TerrainStrategy = {
  name: string;
  skyColor: string;
  fogColor: string;
  defaultFogDensity: number;
  defaultViewDistance: number;
  roughness: number;
  metalness: number;
  biomeColors: readonly [RGB, RGB, RGB, RGB, RGB];
  biomeHeights: readonly [number, number, number, number];
  rockColor: RGB;
  blendRange: number;
  detailScale: number;
  detailStrength: number;
};

export const earthStrategy: TerrainStrategy = {
  name: "Earth",
  skyColor: "#8fb4c8",
  fogColor: "#8fb4c8",
  defaultFogDensity: 50,
  defaultViewDistance: 50,
  roughness: 0.92,
  metalness: 0.0,
  biomeColors: [
    [0.12, 0.28, 0.5], // deep water
    [0.78, 0.68, 0.44], // sand
    [0.24, 0.46, 0.3], // grass
    [0.4, 0.34, 0.29], // soil / lower slope
    [0.92, 0.95, 0.96], // snow
  ],
  biomeHeights: [-1.5, 0.6, 5.0, 9.0],
  rockColor: [0.36, 0.33, 0.31],
  blendRange: 1.4,
  detailScale: 0.18,
  detailStrength: 0.22,
};

export const marsStrategy: TerrainStrategy = {
  name: "Mars",
  skyColor: "#b5581a",
  fogColor: "#c27040",
  defaultFogDensity: 65,
  defaultViewDistance: 35,
  roughness: 0.97,
  metalness: 0.0,
  biomeColors: [
    [0.18, 0.07, 0.05], // crater floor
    [0.5, 0.2, 0.11], // rusty lowlands
    [0.64, 0.33, 0.16], // ochre plains
    [0.74, 0.5, 0.32], // dusty highlands
    [0.85, 0.72, 0.62], // pale summit
  ],
  biomeHeights: [-4.0, 0.0, 4.0, 7.5],
  rockColor: [0.3, 0.16, 0.1],
  blendRange: 1.6,
  detailScale: 0.15,
  detailStrength: 0.28,
};

export const oceanFloorStrategy: TerrainStrategy = {
  name: "Ocean Floor",
  skyColor: "#060e1c",
  fogColor: "#07111f",
  defaultFogDensity: 75,
  defaultViewDistance: 25,
  roughness: 0.55,
  metalness: 0.18,
  biomeColors: [
    [0.03, 0.04, 0.07], // hadal trench
    [0.07, 0.1, 0.18], // abyssal plain
    [0.16, 0.2, 0.28], // continental slope
    [0.26, 0.24, 0.23], // seamount basalt
    [0.65, 0.54, 0.34], // hydrothermal minerals
  ],
  biomeHeights: [-5.0, -1.5, 2.0, 6.0],
  rockColor: [0.18, 0.18, 0.2],
  blendRange: 1.8,
  detailScale: 0.22,
  detailStrength: 0.18,
};

export const ALL_STRATEGIES: readonly TerrainStrategy[] = [
  earthStrategy,
  marsStrategy,
  oceanFloorStrategy,
];
