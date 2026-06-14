import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { TextureLoader } from 'three'

// A flat ring laid in the equatorial (XZ) plane. Rendered as a child of a body's
// tilt group so it shares the axial tilt.
//
// GOTCHA: THREE.RingGeometry's default UVs do NOT map a banded ring texture
// radially — they'd smear it around the circumference. We rebuild the UVs so
// u = normalized radius (inner → outer), which makes the texture's horizontal
// axis run outward across the ring. Transparency comes from the PNG's own alpha.
export default function PlanetRing({
  texture,
  innerRadius,
  outerRadius,
}: {
  texture: string
  innerRadius: number
  outerRadius: number
}) {
  const map = useLoader(TextureLoader, texture)

  const geometry = useMemo(() => {
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 128)
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const u = (v.length() - innerRadius) / (outerRadius - innerRadius)
      uv.setXY(i, u, 1)
    }
    return geo
  }, [innerRadius, outerRadius])

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        map={map}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
