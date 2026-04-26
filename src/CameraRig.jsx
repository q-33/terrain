import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const MOVE_SPEED = 0.18
const ROTATE_SPEED = 0.025
const DRAG_SENSITIVITY = 0.004
const TILT_LIMIT = Math.PI / 2 - 0.05

export default function CameraRig() {
  const { camera, gl } = useThree()
  const keys = useRef({})
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  const yaw = useRef(-Math.PI * 0.15)
  const pitch = useRef(-0.7)
  const pos = useRef(new THREE.Vector3(0, 22, 28))

  useEffect(() => {
    const onKey = (e) => { keys.current[e.code] = e.type === 'keydown' }
    const onDown = (e) => { drag.current = { active: true, lastX: e.clientX, lastY: e.clientY } }
    const onUp   = ()  => { drag.current.active = false }
    const onMove = (e) => {
      if (!drag.current.active) return
      const dx = e.clientX - drag.current.lastX
      const dy = e.clientY - drag.current.lastY
      drag.current.lastX = e.clientX
      drag.current.lastY = e.clientY
      yaw.current   -= dx * DRAG_SENSITIVITY
      pitch.current -= dy * DRAG_SENSITIVITY
      pitch.current  = Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, pitch.current))
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    gl.domElement.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      gl.domElement.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
    }
  }, [gl])

  useFrame(() => {
    const k = keys.current

    if (k['ArrowLeft'])  yaw.current   += ROTATE_SPEED
    if (k['ArrowRight']) yaw.current   -= ROTATE_SPEED
    if (k['ArrowUp'])    pitch.current += ROTATE_SPEED
    if (k['ArrowDown'])  pitch.current -= ROTATE_SPEED
    pitch.current = Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, pitch.current))

    // forward/strafe in world-xz plane
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    const right   = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current))

    if (k['KeyW'] || k['KeyI']) pos.current.addScaledVector(forward, MOVE_SPEED)
    if (k['KeyS'] || k['KeyK']) pos.current.addScaledVector(forward, -MOVE_SPEED)
    if (k['KeyA'] || k['KeyJ']) pos.current.addScaledVector(right, -MOVE_SPEED)
    if (k['KeyD'] || k['KeyL']) pos.current.addScaledVector(right, MOVE_SPEED)
    if (k['KeyQ'] || k['Space']) pos.current.y += MOVE_SPEED
    if (k['KeyE'] || k['ShiftLeft']) pos.current.y -= MOVE_SPEED

    camera.position.copy(pos.current)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current
  })

  return null
}
