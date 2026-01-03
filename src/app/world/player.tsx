import * as THREE from "three"
import * as RAPIER from "@dimforge/rapier3d-compat"
import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { useKeyboardControls } from "@react-three/drei"
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier"
import type { RapierRigidBody } from "@react-three/rapier"

const SPEED = 5
const direction = new THREE.Vector3()
const frontVector = new THREE.Vector3()
const sideVector = new THREE.Vector3()
const rotation = new THREE.Vector3()

type ControlKey = "forward" | "backward" | "left" | "right" | "jump"

export function Player({ lerp = THREE.MathUtils.lerp }) {
  const { camera } = useThree()
  const ref = useRef<RapierRigidBody | null>(null)
  const rapier = useRapier()

  // drei version expects a string union for actions
  const [, get] = useKeyboardControls<ControlKey>()

  useFrame(() => {
    //const { forward, backward, left, right, jump } = get()

    const rb = ref.current
    if (!rb) return

    // get() typing varies by drei version; treat it defensively
    const state = get() as Record<ControlKey, boolean>

    const forward = state.forward ? 1 : 0
    const backward = state.backward ? 1 : 0
    const left = state.left ? 1 : 0
    const right = state.right ? 1 : 0
    const jump = !!state.jump

    const velocity = rb.linvel()

    // update camera (original behavior: camera tracks rigid body translation)
    const t = rb.translation()
    camera.position.set(t.x, t.y, t.z)

    // movement
    frontVector.set(0, 0, backward - forward)
    sideVector.set(left - right, 0, 0)

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(SPEED)
      .applyEuler(camera.rotation)

    rb.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true)

    // jumping
    const world = rapier.world
    const origin = rb.translation()
    const hit = world.castRay(new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 }), 2, true)

    // Strict-TS safe helpers
    const asUnknown = hit as unknown

    const hasCollider = (h: unknown): h is { collider: unknown } => {
      return typeof h === "object" && h !== null && "collider" in h
    }

    const getToi = (h: unknown): number | undefined => {
      if (typeof h !== "object" || h === null) return undefined

      // Use safe indexed access via unknown -> object -> any, without Record casts
      const anyH = h as any
      if (typeof anyH.timeOfImpact === "number") return anyH.timeOfImpact
      if (typeof anyH.toi === "number") return anyH.toi
      return undefined
    }

    const toi = getToi(asUnknown)
    const grounded = hasCollider(asUnknown) && typeof toi === "number" && toi <= 1.75

    if (jump && grounded) rb.setLinvel({ x: 0, y: 7.5, z: 0 }, true)

    // Note: rotation is kept. If the original repo used it for camera smoothing/rotation.
    void rotation
    void lerp
  })
  return (
    <RigidBody
      ref={ref}
      colliders={false}
      mass={1}
      type="dynamic"
      position={[0, 60, 0]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.75, 0.5]} />
    </RigidBody>
  )
}
