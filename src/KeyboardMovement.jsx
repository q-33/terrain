import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const SPEED = 0.3

export default function KeyboardMovement({ controlsRef }) {
  const { camera } = useThree()
  const keys = useRef({})
  const fwd  = useRef(new THREE.Vector3())
  const move = useRef(new THREE.Vector3())

  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true }
    const up = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return
    const k = keys.current

    // Horizontal forward from camera look direction
    camera.getWorldDirection(fwd.current)
    fwd.current.y = 0
    fwd.current.normalize()

    move.current.set(0, 0, 0)
    if (k['ArrowUp'])    move.current.addScaledVector(fwd.current,  SPEED)
    if (k['ArrowDown'])  move.current.addScaledVector(fwd.current, -SPEED)

    if (move.current.lengthSq() > 0) {
      camera.position.add(move.current)
      controls.target.add(move.current)
    }

    // Left/right arrows rotate the orbit (azimuth)
    if (k['ArrowLeft'])  controls.rotateLeft( 0.025)
    if (k['ArrowRight']) controls.rotateLeft(-0.025)
  })

  return null
}
