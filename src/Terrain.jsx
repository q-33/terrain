import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { fbm } from './noise'

// Terrain tile large enough that the fog (FAR=75) always hides the edge.
// Camera can drift REGEN_DIST before regeneration; tile edge is SIZE/2 away.
// Guarantee: SIZE/2 - REGEN_DIST > FOG_FAR  →  120 - 40 = 80 > 75 ✓
const SIZE        = 240
const SEGS        = 64
const HEIGHT      = 16
const REGEN_DIST  = 40
const SNAP        = 30
const VERT_COUNT  = SEGS * SEGS * 6   // 2 tris × 3 verts per quad, non-indexed

const WATER = [0.18, 0.35, 0.56]
const SAND  = [0.76, 0.66, 0.42]
const GRASS = [0.29, 0.49, 0.35]
const ROCK  = [0.42, 0.36, 0.31]
const SNOW  = [0.85, 0.90, 0.90]

function sampleH(wx, wz) {
  return fbm(wx * 0.018, wz * 0.018, 5, 2.1, 0.5) * HEIGHT
}

function rgb(h) {
  if (h < -1.5) return WATER
  if (h <  0.5) return SAND
  if (h <  5.0) return GRASS
  if (h <  9.0) return ROCK
  return SNOW
}

function fillBuffers(pos, col, cx, cz) {
  const step = SIZE / SEGS
  const ox = cx - SIZE / 2
  const oz = cz - SIZE / 2
  let i = 0
  for (let row = 0; row < SEGS; row++) {
    for (let col_ = 0; col_ < SEGS; col_++) {
      const x0 = ox + col_ * step,  z0 = oz + row * step
      const x1 = x0 + step,         z1 = z0 + step
      const h00 = sampleH(x0, z0), h10 = sampleH(x1, z0)
      const h01 = sampleH(x0, z1), h11 = sampleH(x1, z1)
      const [r1, g1, b1] = rgb((h00 + h10 + h01) / 3)
      const [r2, g2, b2] = rgb((h10 + h11 + h01) / 3)
      // tri 1
      pos[i*3]=x0; pos[i*3+1]=h00; pos[i*3+2]=z0; col[i*3]=r1; col[i*3+1]=g1; col[i*3+2]=b1; i++
      pos[i*3]=x1; pos[i*3+1]=h10; pos[i*3+2]=z0; col[i*3]=r1; col[i*3+1]=g1; col[i*3+2]=b1; i++
      pos[i*3]=x0; pos[i*3+1]=h01; pos[i*3+2]=z1; col[i*3]=r1; col[i*3+1]=g1; col[i*3+2]=b1; i++
      // tri 2
      pos[i*3]=x1; pos[i*3+1]=h10; pos[i*3+2]=z0; col[i*3]=r2; col[i*3+1]=g2; col[i*3+2]=b2; i++
      pos[i*3]=x1; pos[i*3+1]=h11; pos[i*3+2]=z1; col[i*3]=r2; col[i*3+1]=g2; col[i*3+2]=b2; i++
      pos[i*3]=x0; pos[i*3+1]=h01; pos[i*3+2]=z1; col[i*3]=r2; col[i*3+1]=g2; col[i*3+2]=b2; i++
    }
  }
}

export default function Terrain() {
  const { camera } = useThree()
  const center = useRef(new THREE.Vector2(0, 0))

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(VERT_COUNT * 3)
    const col = new Float32Array(VERT_COUNT * 3)
    fillBuffers(pos, col, 0, 0)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [])

  useFrame(() => {
    const cx = camera.position.x
    const cz = camera.position.z
    const dx = cx - center.current.x
    const dz = cz - center.current.y
    if (dx * dx + dz * dz < REGEN_DIST * REGEN_DIST) return

    // Snap to grid so the pop happens less often and never overlaps fog
    const nx = Math.round(cx / SNAP) * SNAP
    const nz = Math.round(cz / SNAP) * SNAP
    center.current.set(nx, nz)

    const posArr = geo.attributes.position.array
    const colArr = geo.attributes.color.array
    fillBuffers(posArr, colArr, nx, nz)
    geo.attributes.position.needsUpdate = true
    geo.attributes.color.needsUpdate    = true
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
  })

  return (
    <mesh geometry={geo}>
      <meshLambertMaterial vertexColors flatShading />
    </mesh>
  )
}
