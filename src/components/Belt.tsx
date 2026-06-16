import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface BeltProps {
  innerRadius: number // scene units
  outerRadius: number // scene units
  count: number
  thickness: number // vertical scatter (scene units)
  minSize: number
  maxSize: number
  color: string
  angularSpeed: number // rad/sec — the whole belt revolves around the Sun
}

// A procedurally-scattered, instanced belt of rocks lying in the XZ plane.
// One lumpy icosahedron geometry is instanced thousands of times with random
// position / orientation / non-uniform scale — cheap (one draw call) yet varied.
// The displacement is a smooth function of each vertex's DIRECTION, so duplicated
// vertices (icosahedron faces are non-indexed) move identically and stay watertight.
export default function Belt({
  innerRadius,
  outerRadius,
  count,
  thickness,
  minSize,
  maxSize,
  color,
  angularSpeed,
}: BeltProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 1)
    const pos = geo.attributes.position
    const n = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      n.fromBufferAttribute(pos, i).normalize()
      const d = 1 + 0.2 * Math.sin(n.x * 8) + 0.2 * Math.cos(n.y * 7) + 0.18 * Math.sin(n.z * 9)
      pos.setXYZ(i, n.x * d, n.y * d, n.z * d)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    const dummy = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.random())
      dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * thickness, Math.sin(angle) * r)
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      const s = THREE.MathUtils.lerp(minSize, maxSize, Math.random())
      dummy.scale.set(
        s * (0.6 + Math.random() * 0.8),
        s * (0.6 + Math.random() * 0.8),
        s * (0.6 + Math.random() * 0.8),
      )
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [count, innerRadius, outerRadius, thickness, minSize, maxSize])

  useFrame((_, delta) => {
    meshRef.current.rotation.y += angularSpeed * delta
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
    </instancedMesh>
  )
}
