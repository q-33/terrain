import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  TERRAIN_TILE_SIZE,
  TERRAIN_SEGMENTS,
  TERRAIN_HEIGHT_SCALE,
  TERRAIN_REGEN_DISTANCE,
  TERRAIN_SNAP_GRID,
  TERRAIN_NOISE_FREQUENCY,
  TERRAIN_NOISE_OCTAVES,
  TERRAIN_NOISE_LACUNARITY,
  TERRAIN_NOISE_GAIN,
} from "./constants";
import { fractalNoise } from "./noise";
import { TerrainStrategy } from "./TerrainStrategy";

// Indexed grid: (SEG+1)² shared vertices, SEG²·6 indices. Sharing vertices
// is what makes smooth shading possible — every interior vertex is hit by 6
// triangles, so `computeVertexNormals` produces a single averaged normal.
//
// Tile is large enough that fog always hides the regenerated edge:
//   TERRAIN_TILE_SIZE/2 - TERRAIN_REGEN_DISTANCE = 240, fog far max = 650.
// Keep the view-distance slider below ~35% near a tile boundary or grow SIZE.
const VERT_PER_ROW = TERRAIN_SEGMENTS + 1;
const VERT_COUNT = VERT_PER_ROW * VERT_PER_ROW;
const INDEX_COUNT = TERRAIN_SEGMENTS * TERRAIN_SEGMENTS * 6;

const sampleTerrainHeight = (worldX: number, worldZ: number): number =>
  fractalNoise(
    worldX * TERRAIN_NOISE_FREQUENCY,
    worldZ * TERRAIN_NOISE_FREQUENCY,
    TERRAIN_NOISE_OCTAVES,
    TERRAIN_NOISE_LACUNARITY,
    TERRAIN_NOISE_GAIN,
  ) * TERRAIN_HEIGHT_SCALE;

const populateTerrainPositions = (
  positions: Float32Array,
  centerX: number,
  centerZ: number,
): void => {
  const quadSize = TERRAIN_TILE_SIZE / TERRAIN_SEGMENTS;
  const originX = centerX - TERRAIN_TILE_SIZE / 2;
  const originZ = centerZ - TERRAIN_TILE_SIZE / 2;
  let i = 0;
  for (let row = 0; row < VERT_PER_ROW; row++) {
    const z = originZ + row * quadSize;
    for (let col = 0; col < VERT_PER_ROW; col++) {
      const x = originX + col * quadSize;
      positions[i] = x;
      positions[i + 1] = sampleTerrainHeight(x, z);
      positions[i + 2] = z;
      i += 3;
    }
  }
};

const buildIndices = (): Uint16Array | Uint32Array => {
  const buf =
    VERT_COUNT > 65535
      ? new Uint32Array(INDEX_COUNT)
      : new Uint16Array(INDEX_COUNT);
  let i = 0;
  for (let row = 0; row < TERRAIN_SEGMENTS; row++) {
    for (let col = 0; col < TERRAIN_SEGMENTS; col++) {
      const a = row * VERT_PER_ROW + col;
      const b = a + 1;
      const c = a + VERT_PER_ROW;
      const d = c + 1;
      // CCW winding from above (Y up) so normals point up after computeVertexNormals.
      buf[i++] = a;
      buf[i++] = c;
      buf[i++] = b;
      buf[i++] = b;
      buf[i++] = c;
      buf[i++] = d;
    }
  }
  return buf;
};

// GLSL prelude injected into the fragment shader. Provides the varying, the
// strategy uniforms, and the small noise/triplanar helpers used by the color
// block. Two-octave value noise is plenty for surface texture and stays cheap.
const FRAGMENT_PRELUDE = /* glsl */ `
varying vec3 vWorldPos;
uniform vec3 uBiomeColors[5];
uniform float uBiomeHeights[4];
uniform vec3 uRockColor;
uniform float uBlendRange;
uniform float uDetailScale;
uniform float uDetailStrength;

float terrainHash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float terrainValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = terrainHash21(i);
  float b = terrainHash21(i + vec2(1.0, 0.0));
  float c = terrainHash21(i + vec2(0.0, 1.0));
  float d = terrainHash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float terrainFbm2(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 2; i++) {
    v += terrainValueNoise(p) * a;
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

// Sample fbm on three orthogonal planes and blend by |faceNormal| so cliffs
// don't show vertically smeared XZ noise.
float terrainTriplanar(vec3 wp, vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  w /= (w.x + w.y + w.z + 1e-5);
  float nx = terrainFbm2(wp.yz * uDetailScale);
  float ny = terrainFbm2(wp.xz * uDetailScale);
  float nz = terrainFbm2(wp.xy * uDetailScale);
  return nx * w.x + ny * w.y + nz * w.z;
}
`;

// Replaces <color_fragment>. Writes the final diffuseColor.rgb that the rest
// of the PBR pipeline (lights, fog, tonemap) then operates on — never touches
// gl_FragColor directly. Slope is measured from screen-space derivatives of
// vWorldPos so the rock blend stays sharp even though vertex normals are
// smoothed for diffuse lighting.
const FRAGMENT_COLOR_INJECT = /* glsl */ `
float h = vWorldPos.y;
vec3 col = uBiomeColors[0];
col = mix(col, uBiomeColors[1], smoothstep(uBiomeHeights[0] - uBlendRange, uBiomeHeights[0] + uBlendRange, h));
col = mix(col, uBiomeColors[2], smoothstep(uBiomeHeights[1] - uBlendRange, uBiomeHeights[1] + uBlendRange, h));
col = mix(col, uBiomeColors[3], smoothstep(uBiomeHeights[2] - uBlendRange, uBiomeHeights[2] + uBlendRange, h));
col = mix(col, uBiomeColors[4], smoothstep(uBiomeHeights[3] - uBlendRange, uBiomeHeights[3] + uBlendRange, h));

vec3 dpdx = dFdx(vWorldPos);
vec3 dpdy = dFdy(vWorldPos);
vec3 faceNormal = normalize(cross(dpdx, dpdy));

float n = terrainTriplanar(vWorldPos, faceNormal);
float slope = 1.0 - abs(faceNormal.y);

vec3 rock = uRockColor * (0.78 + n * 0.5);
col = mix(col, rock, smoothstep(0.32, 0.62, slope));

col *= 1.0 + (n - 0.5) * uDetailStrength;

diffuseColor.rgb = col;
`;

type StrategyUniforms = {
  uBiomeColors: { value: THREE.Vector3[] };
  uBiomeHeights: { value: number[] };
  uRockColor: { value: THREE.Vector3 };
  uBlendRange: { value: number };
  uDetailScale: { value: number };
  uDetailStrength: { value: number };
};

const makeUniforms = (strategy: TerrainStrategy): StrategyUniforms => ({
  uBiomeColors: {
    value: strategy.biomeColors.map((c) => new THREE.Vector3(c[0], c[1], c[2])),
  },
  uBiomeHeights: { value: [...strategy.biomeHeights] },
  uRockColor: {
    value: new THREE.Vector3(
      strategy.rockColor[0],
      strategy.rockColor[1],
      strategy.rockColor[2],
    ),
  },
  uBlendRange: { value: strategy.blendRange },
  uDetailScale: { value: strategy.detailScale },
  uDetailStrength: { value: strategy.detailStrength },
});

// Mutate the existing uniform values in place so every compiled program
// (Three may recompile when lights or fog change) reads the same references.
const updateUniforms = (
  uniforms: StrategyUniforms,
  strategy: TerrainStrategy,
): void => {
  for (let i = 0; i < 5; i++) {
    const c = strategy.biomeColors[i];
    uniforms.uBiomeColors.value[i].set(c[0], c[1], c[2]);
  }
  for (let i = 0; i < 4; i++) {
    uniforms.uBiomeHeights.value[i] = strategy.biomeHeights[i];
  }
  uniforms.uRockColor.value.set(
    strategy.rockColor[0],
    strategy.rockColor[1],
    strategy.rockColor[2],
  );
  uniforms.uBlendRange.value = strategy.blendRange;
  uniforms.uDetailScale.value = strategy.detailScale;
  uniforms.uDetailStrength.value = strategy.detailStrength;
};

type TerrainProps = {
  strategy: TerrainStrategy;
};

const Terrain = ({ strategy }: TerrainProps) => {
  const { camera } = useThree();
  const center = useRef(new THREE.Vector2(0, 0));
  const strategyRef = useRef(strategy);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(VERT_COUNT * 3);
    populateTerrainPositions(positions, 0, 0);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setIndex(new THREE.BufferAttribute(buildIndices(), 1));
    g.computeVertexNormals();
    return g;
  }, []);

  const material = useMemo(() => {
    const initial = strategyRef.current;
    const mat = new THREE.MeshStandardMaterial({
      roughness: initial.roughness,
      metalness: initial.metalness,
    });
    const uniforms = makeUniforms(initial);
    mat.userData.uniforms = uniforms;

    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>\nvarying vec3 vWorldPos;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAGMENT_PRELUDE}`)
        .replace("#include <color_fragment>", FRAGMENT_COLOR_INJECT);
    };

    return mat;
  }, []);

  useEffect(() => {
    strategyRef.current = strategy;
    const uniforms = material.userData.uniforms as StrategyUniforms;
    updateUniforms(uniforms, strategy);
    material.roughness = strategy.roughness;
    material.metalness = strategy.metalness;
  }, [strategy, material]);

  useFrame(() => {
    const cx = camera.position.x;
    const cz = camera.position.z;
    const dx = cx - center.current.x;
    const dz = cz - center.current.y;
    if (dx * dx + dz * dz < TERRAIN_REGEN_DISTANCE * TERRAIN_REGEN_DISTANCE) {
      return;
    }

    // Snap so the pop happens less often and never overlaps with the fog band.
    const snappedX = Math.round(cx / TERRAIN_SNAP_GRID) * TERRAIN_SNAP_GRID;
    const snappedZ = Math.round(cz / TERRAIN_SNAP_GRID) * TERRAIN_SNAP_GRID;
    center.current.set(snappedX, snappedZ);

    const positions = geo.attributes.position.array as Float32Array;
    populateTerrainPositions(positions, snappedX, snappedZ);
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  });

  return <mesh geometry={geo} material={material} />;
};

export default Terrain;
