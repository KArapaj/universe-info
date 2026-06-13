import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { TextureLoader } from 'three'

const AXIAL_TILT = THREE.MathUtils.degToRad(23.4)

// Orbital parameters. The SHAPE is a real ellipse (a !== b); the SCALE is
// stylized — sizes/distances are viewable, not true-to-life.
const EARTH_ORBIT = { a: 9, b: 8, speed: 0.15 }
const MOON_ORBIT = { a: 1.6, b: 1.4, speed: 1.1 }

// A point on an ellipse with one FOCUS at the local origin (Kepler's 1st law).
function ellipsePoint(a: number, b: number, t: number): THREE.Vector3 {
  const c = Math.sqrt(Math.max(a * a - b * b, 0))
  return new THREE.Vector3(a * Math.cos(t) - c, 0, b * Math.sin(t))
}

function OrbitPath({ a, b }: { a: number; b: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 128; i++) {
      pts.push(ellipsePoint(a, b, (i / 128) * Math.PI * 2))
    }
    return pts
  }, [a, b])
  return <Line points={points} color="#3a4a6b" lineWidth={1} transparent opacity={0.6} />
}

// Shared hover-cursor handlers so clickable bodies feel clickable.
const handlers = (onSelect: () => void) => ({
  onClick: (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onSelect()
  },
  onPointerOver: () => {
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = 'auto'
  },
})

function Sun({ onSelect }: { onSelect: () => void }) {
  const sun = useLoader(TextureLoader, '/textures/sun.jpg')
  return (
    <group>
      <mesh {...handlers(onSelect)}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial map={sun} />
      </mesh>
      <pointLight intensity={2.5} decay={0} />
    </group>
  )
}

function Moon({ onSelect }: { onSelect: () => void }) {
  const moonRef = useRef<THREE.Group>(null!)
  const map = useLoader(TextureLoader, '/textures/moon.jpg')

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * MOON_ORBIT.speed
    const p = ellipsePoint(MOON_ORBIT.a, MOON_ORBIT.b, t)
    moonRef.current.position.set(p.x, p.y, p.z)
  })

  return (
    <>
      <OrbitPath a={MOON_ORBIT.a} b={MOON_ORBIT.b} />
      <group ref={moonRef}>
        <mesh {...handlers(onSelect)}>
          <sphereGeometry args={[0.18, 48, 48]} />
          <meshStandardMaterial map={map} />
        </mesh>
      </group>
    </>
  )
}

function EarthSystem({
  onSelectEarth,
  onSelectMoon,
}: {
  onSelectEarth: () => void
  onSelectMoon: () => void
}) {
  const systemRef = useRef<THREE.Group>(null!)
  const earthRef = useRef<THREE.Mesh>(null!)
  const cloudRef = useRef<THREE.Mesh>(null!)
  const [day, clouds] = useLoader(TextureLoader, [
    '/textures/earth_daymap.jpg',
    '/textures/earth_clouds.jpg',
  ])

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime() * EARTH_ORBIT.speed
    const p = ellipsePoint(EARTH_ORBIT.a, EARTH_ORBIT.b, t)
    systemRef.current.position.set(p.x, p.y, p.z)
    earthRef.current.rotation.y += delta * 0.3
    cloudRef.current.rotation.y += delta * 0.35
  })

  return (
    <group ref={systemRef}>
      <group rotation={[0, 0, AXIAL_TILT]}>
        <mesh ref={earthRef} {...handlers(onSelectEarth)}>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshStandardMaterial map={day} />
        </mesh>
        {/* Clouds: a second, slightly larger, semi-transparent sphere. */}
        {/* raycast={null} so clicks fall through to Earth beneath it. */}
        <mesh ref={cloudRef} scale={1.02} raycast={() => null}>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      </group>
      <Moon onSelect={onSelectMoon} />
    </group>
  )
}

export default function SolarSystem() {
  const navigate = useNavigate()
  // Built OUTSIDE the Canvas, then passed in as props — so router context
  // doesn't need to be bridged into the react-three-fiber renderer.
  const go = (id: string) => navigate(`/planet/${id}`)

  return (
    <>
      <div className="scale-badge">Not to scale</div>
      <div className="hint">Click the Sun, Earth, or Moon to explore</div>
      <Canvas camera={{ position: [0, 10, 20], fov: 50 }}>
        <ambientLight intensity={0.05} />
        <Stars radius={200} depth={60} count={6000} factor={4} fade />
        <Suspense fallback={null}>
          <OrbitPath a={EARTH_ORBIT.a} b={EARTH_ORBIT.b} />
          <Sun onSelect={() => go('sun')} />
          <EarthSystem onSelectEarth={() => go('earth')} onSelectMoon={() => go('moon')} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={3} maxDistance={60} />
      </Canvas>
    </>
  )
}
