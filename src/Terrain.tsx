import { useMemo, useRef, useEffect } from "react";
import { RGB } from "./types";
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

// Tile large enough that fog always hides the edge:
// TERRAIN_TILE_SIZE/2 - TERRAIN_REGEN_DISTANCE > fog far  →  360 - 120 = 240 < 650 max
// Keep fog view distance slider below ~35% when at tile edge or increase SIZE further.
const VERT_COUNT = TERRAIN_SEGMENTS * TERRAIN_SEGMENTS * 6; // 2 tris × 3 verts per quad

const sampleTerrainHeight = (worldX: number, worldZ: number): number =>
  fractalNoise(
    worldX * TERRAIN_NOISE_FREQUENCY,
    worldZ * TERRAIN_NOISE_FREQUENCY,
    TERRAIN_NOISE_OCTAVES,
    TERRAIN_NOISE_LACUNARITY,
    TERRAIN_NOISE_GAIN,
  ) * TERRAIN_HEIGHT_SCALE;

// Writes a single vertex (position + color) into the flat buffer arrays at slot i.
const writeVertex = (
  positions: Float32Array,
  colors: Float32Array,
  i: number,
  x: number,
  y: number,
  z: number,
  color: RGB,
): void => {
  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;
  colors[i * 3] = color[0];
  colors[i * 3 + 1] = color[1];
  colors[i * 3 + 2] = color[2];
};

// Samples height at all four corners of each quad, then writes two triangles
// (CCW winding from above so normals point up) with flat per-face colors into
// the pre-allocated position and color GPU buffers.
const populateTerrainBuffers = (
  positions: Float32Array,
  colors: Float32Array,
  centerX: number,
  centerZ: number,
  strategy: TerrainStrategy,
): void => {
  const quadSize = TERRAIN_TILE_SIZE / TERRAIN_SEGMENTS;
  const originX = centerX - TERRAIN_TILE_SIZE / 2;
  const originZ = centerZ - TERRAIN_TILE_SIZE / 2;
  let vertexIndex = 0;

  for (let row = 0; row < TERRAIN_SEGMENTS; row++) {
    for (let col = 0; col < TERRAIN_SEGMENTS; col++) {
      const x0 = originX + col * quadSize;
      const z0 = originZ + row * quadSize;
      const x1 = x0 + quadSize;
      const z1 = z0 + quadSize;

      const h00 = sampleTerrainHeight(x0, z0);
      const h10 = sampleTerrainHeight(x1, z0);
      const h01 = sampleTerrainHeight(x0, z1);
      const h11 = sampleTerrainHeight(x1, z1);

      const colorTri1 = strategy.colorForHeight((h00 + h10 + h01) / 3);
      const colorTri2 = strategy.colorForHeight((h10 + h11 + h01) / 3);

      // Triangle 1: top-left, bottom-left, top-right
      writeVertex(positions, colors, vertexIndex++, x0, h00, z0, colorTri1);
      writeVertex(positions, colors, vertexIndex++, x0, h01, z1, colorTri1);
      writeVertex(positions, colors, vertexIndex++, x1, h10, z0, colorTri1);

      // Triangle 2: top-right, bottom-left, bottom-right
      writeVertex(positions, colors, vertexIndex++, x1, h10, z0, colorTri2);
      writeVertex(positions, colors, vertexIndex++, x0, h01, z1, colorTri2);
      writeVertex(positions, colors, vertexIndex++, x1, h11, z1, colorTri2);
    }
  }
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
    const colors = new Float32Array(VERT_COUNT * 3);
    populateTerrainBuffers(positions, colors, 0, 0, strategyRef.current);
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  // When strategy changes, repopulate only colors — positions are unchanged.
  useEffect(() => {
    strategyRef.current = strategy;
    const positions = geo.attributes.position.array as Float32Array;
    const colors = geo.attributes.color.array as Float32Array;
    populateTerrainBuffers(
      positions,
      colors,
      center.current.x,
      center.current.y,
      strategy,
    );
    geo.attributes.color.needsUpdate = true;
  }, [strategy, geo]);

  useFrame(() => {
    const cx = camera.position.x;
    const cz = camera.position.z;
    const dx = cx - center.current.x;
    const dz = cz - center.current.y;
    if (dx * dx + dz * dz < TERRAIN_REGEN_DISTANCE * TERRAIN_REGEN_DISTANCE) {
      return;
    }

    // Snap to grid so the pop happens less often and never overlaps fog
    const snappedX = Math.round(cx / TERRAIN_SNAP_GRID) * TERRAIN_SNAP_GRID;
    const snappedZ = Math.round(cz / TERRAIN_SNAP_GRID) * TERRAIN_SNAP_GRID;
    center.current.set(snappedX, snappedZ);

    const positions = geo.attributes.position.array as Float32Array;
    const colors = geo.attributes.color.array as Float32Array;
    populateTerrainBuffers(
      positions,
      colors,
      snappedX,
      snappedZ,
      strategyRef.current,
    );
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  });

  return (
    <mesh geometry={geo}>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  );
};

export default Terrain;
