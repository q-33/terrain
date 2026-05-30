import { useMemo } from "react";
import * as THREE from "three";
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from "./Chunk";
import { generateChunk } from "./worldGen";
import { meshChunk, ChunkMesh } from "./mesher";

// Phase A v0: pre-generate a fixed grid of chunks around origin once at
// mount. No streaming loader yet — that's a follow-up PR. With WORLD_RADIUS = 3
// we render a 7×7 grid (49 chunks, 112×112 voxels) which is enough to see
// terrain horizon-to-horizon and prove the mesher works.
const WORLD_RADIUS = 3;

type BuiltChunk = {
  chunkX: number;
  chunkZ: number;
  geometry: THREE.BufferGeometry;
};

const buildGeometry = (mesh: ChunkMesh): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  g.setAttribute("color", new THREE.BufferAttribute(mesh.colors, 3));
  g.computeBoundingSphere();
  return g;
};

const VoxelWorld = () => {
  const chunks = useMemo<BuiltChunk[]>(() => {
    const built: BuiltChunk[] = [];
    for (let cz = -WORLD_RADIUS; cz <= WORLD_RADIUS; cz++) {
      for (let cx = -WORLD_RADIUS; cx <= WORLD_RADIUS; cx++) {
        const chunk = generateChunk(cx, cz);
        const mesh = meshChunk(chunk);
        built.push({ chunkX: cx, chunkZ: cz, geometry: buildGeometry(mesh) });
      }
    }
    return built;
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        vertexColors: true,
      }),
    [],
  );

  return (
    <>
      {chunks.map(({ chunkX, chunkZ, geometry }) => (
        <mesh
          key={`${chunkX},${chunkZ}`}
          position={[chunkX * CHUNK_SIZE_X, 0, chunkZ * CHUNK_SIZE_Z]}
          geometry={geometry}
          material={material}
        />
      ))}
    </>
  );
};

export default VoxelWorld;
