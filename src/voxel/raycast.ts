import * as THREE from "three";

export type RaycastHit = {
  // The voxel that was hit, in world integer coords.
  x: number;
  y: number;
  z: number;
  // Outward normal of the hit face. Add it to (x, y, z) to get the empty
  // voxel a placement should occupy.
  normal: [number, number, number];
};

// Amanatides-Woo voxel ray traversal. Walks unit cells along the ray, only
// querying `isSolid` once per cell crossed — much cheaper than three's
// mesh raycaster for our use case, and ignores empty voxels entirely.
//
// `origin` is in world space (decimal coords); `direction` is normalized
// inside (we re-normalize defensively). `maxDistance` is in world units —
// Minecraft uses 5 blocks of reach; 6 here so the player can pick a block
// they can just see at the edge of their forward view.
export const raycastVoxel = (
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance: number,
  isSolid: (x: number, y: number, z: number) => boolean,
): RaycastHit | null => {
  let dx = direction.x;
  let dy = direction.y;
  let dz = direction.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-12) {
    return null;
  }
  dx /= len;
  dy /= len;
  dz /= len;

  let ix = Math.floor(origin.x);
  let iy = Math.floor(origin.y);
  let iz = Math.floor(origin.z);

  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

  // Parametric distance from origin to the first cell boundary in each axis.
  const nextBoundaryX = stepX > 0 ? ix + 1 : ix;
  const nextBoundaryY = stepY > 0 ? iy + 1 : iy;
  const nextBoundaryZ = stepZ > 0 ? iz + 1 : iz;

  let tMaxX = dx !== 0 ? (nextBoundaryX - origin.x) / dx : Infinity;
  let tMaxY = dy !== 0 ? (nextBoundaryY - origin.y) / dy : Infinity;
  let tMaxZ = dz !== 0 ? (nextBoundaryZ - origin.z) / dz : Infinity;

  let t = 0;
  // 0 = x, 1 = y, 2 = z — the axis we just stepped across.
  let lastAxis = 0;

  while (t <= maxDistance) {
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        ix += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        lastAxis = 0;
      } else {
        iz += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        lastAxis = 2;
      }
    } else {
      if (tMaxY < tMaxZ) {
        iy += stepY;
        t = tMaxY;
        tMaxY += tDeltaY;
        lastAxis = 1;
      } else {
        iz += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        lastAxis = 2;
      }
    }

    if (t > maxDistance) {
      return null;
    }

    if (isSolid(ix, iy, iz)) {
      // We entered this voxel through the face on `lastAxis`, traveling in
      // `step[lastAxis]`. The face we crossed therefore has the opposite
      // outward normal — that's the placement direction.
      const normal: [number, number, number] =
        lastAxis === 0
          ? [-stepX, 0, 0]
          : lastAxis === 1
            ? [0, -stepY, 0]
            : [0, 0, -stepZ];
      return { x: ix, y: iy, z: iz, normal };
    }
  }

  return null;
};
