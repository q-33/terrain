import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Color, Fog } from 'three'
import Terrain from './Terrain'
import KeyboardMovement from './KeyboardMovement'

export default function App() {
  const controlsRef = useRef()

  return (
    <>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 22, 28] }}
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          scene.background = new Color('#8fb4c8')
          scene.fog = new Fog('#8fb4c8', 20, 75)
        }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[60, 80, 40]} intensity={1.6} />
        <hemisphereLight args={['#a8d0e6', '#6b8e4e', 0.5]} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          minDistance={4}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2.05}
        />
        <KeyboardMovement controlsRef={controlsRef} />
        <Terrain />
      </Canvas>

      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.35)', padding: '6px 14px', borderRadius: 8,
        pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
      }}>
        ↑↓ move &nbsp;|&nbsp; ←→ turn &nbsp;|&nbsp; drag — orbit &nbsp;|&nbsp; scroll — zoom
      </div>
    </>
  )
}
