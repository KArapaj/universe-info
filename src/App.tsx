import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TextureLoader } from 'three'

// Earth's real axial tilt — a small but important "correct geometry" detail.
const AXIAL_TILT = THREE.MathUtils.degToRad(23.4)

// Orbital parameters. The SHAPE is a real ellipse (a !== b) but the SCALE is
// stylized — sizes and distances are chosen to be viewable, not true-to-life.
// Decided 2026-06-12: elliptical + correct tilt/order, not real numbers.
const EARTH_ORBIT = { a: 9, b: 8, speed: 0.15 }
const MOON_ORBIT = { a: 1.6, b: 1.4, speed: 1.1 }

// A point on an ellipse with one FOCUS sitting at the local origin.
// (Kepler's 1st law: the body it orbits sits at a focus, not the center.)
function ellipsePoint(a: number, b: number, t: number): THREE.Vector3 {
  const c = Math.sqrt(Math.max(a * a - b * b, 0)) // focus offset
  return new THREE.Vector3(a * Math.cos(t) - c, 0, b * Math.sin(t))
}

// Faint visible ring tracing an orbit so the geometry is on display.
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

// The Sun sits at the center and is the scene's only light source.
function Sun() {
  const sun = useLoader(TextureLoader, '/textures/sun.jpg')
  return (
    <group>
      {/* meshBasicMaterial is unlit — the Sun always glows at full brightness. */}
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial map={sun} />
      </mesh>
      {/* decay=0 keeps every orbit evenly lit (stylized, not inverse-square). */}
      <pointLight intensity={2.5} decay={0} />
    </group>
  )
}

// Moon orbits Earth on its own ellipse. It is lit by the Sun's light at the
// world origin, so its day/night phase is real geometry — handy for eclipses.
function Moon() {
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
        <mesh>
          <sphereGeometry args={[0.18, 48, 48]} />
          <meshStandardMaterial map={map} />
        </mesh>
      </group>
    </>
  )
}

// Earth + its Moon, as a unit that travels along Earth's orbit.
function EarthSystem() {
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
      {/* Earth, tilted on its axis. */}
      <group rotation={[0, 0, AXIAL_TILT]}>
        <mesh ref={earthRef}>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshStandardMaterial map={day} />
        </mesh>
        {/* Clouds = a second, slightly larger, semi-transparent sphere. */}
        <mesh ref={cloudRef} scale={1.02}>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      </group>
      <Moon />
    </group>
  )
}

export default function App() {
  return (
    <>
      <div className="scale-badge">Not to scale</div>
      <Canvas camera={{ position: [0, 10, 20], fov: 50 }}>
        {/* Faint ambient so night sides aren't pure black; the Sun does the rest. */}
        <ambientLight intensity={0.05} />

        <Stars radius={200} depth={60} count={6000} factor={4} fade />

        <OrbitPath a={EARTH_ORBIT.a} b={EARTH_ORBIT.b} />
        <Sun />
        <EarthSystem />

        <OrbitControls enablePan={false} minDistance={3} maxDistance={60} />
      </Canvas>
    </>
  )
}
