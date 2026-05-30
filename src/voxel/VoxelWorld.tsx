import { useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from "./Chunk";
import { meshChunk, ChunkMesh } from "./mesher";
import { World } from "./world";
import { buildAtlasTexture } from "./textures";

type Props = {
  world: World;
};

const buildGeometry = (mesh: ChunkMesh): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
  g.setAttribute("color", new THREE.BufferAttribute(mesh.colors, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
  g.computeBoundingSphere();
  return g;
};

const parseChunkKey = (key: string): [number, number] => {
  const [cx, cz] = key.split(",");
  return [Number(cx), Number(cz)];
};

const VoxelWorld = ({ world }: Props) => {
  const version = useSyncExternalStore(world.subscribe, world.getVersion);
  // Per-chunk geometry cache. Mutated imperatively when chunks go dirty;
  // surrounding state (`version`) drives re-render so React picks up changes.
  const geosRef = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  const lastVersionRef = useRef(-1);

  // Re-mesh dirty chunks once per new version. Running this in render is
  // idempotent — second invocation for the same version sees an empty dirty
  // set and is a no-op. Doing it pre-JSX (instead of in an effect) avoids
  // a one-frame flicker where the world renders empty before effects fire.
  if (version !== lastVersionRef.current) {
    const dirty = world.takeDirty();
    for (const key of dirty) {
      const [cx, cz] = parseChunkKey(key);
      const chunk = world.getChunk(cx, cz);
      if (!chunk) {
        continue;
      }
      const mesh = meshChunk(chunk, (x, y, z) => world.getBlock(x, y, z));
      const old = geosRef.current.get(key);
      if (old) {
        old.dispose();
      }
      geosRef.current.set(key, buildGeometry(mesh));
    }
    lastVersionRef.current = version;
  }

  // Atlas built once at mount via offscreen canvas — no external PNG asset.
  // vertexColors carries the per-vertex AO grayscale; Lambert multiplies
  // map × color × lighting so corners read as inset.
  const material = useMemo(() => {
    const atlas = buildAtlasTexture();
    return new THREE.MeshLambertMaterial({
      map: atlas,
      vertexColors: true,
    });
  }, []);

  // Snapshot the entries so the render output is stable for this render pass.
  const entries = Array.from(geosRef.current.entries());

  return (
    <>
      {entries.map(([key, geo]) => {
        const [cx, cz] = parseChunkKey(key);
        return (
          <mesh
            key={key}
            position={[cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z]}
            geometry={geo}
            material={material}
          />
        );
      })}
    </>
  );
};

export default VoxelWorld;
