import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { CameraControls, Line, Stars } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type ElementRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { getPlanet, planets, type PlanetData } from '../data/planets'

// --- Scene scale (see research/2026-06-13-grill-orrery-scale-and-navigation.md) ---
// Distances are TRUE relative: scene units = AU × DISTANCE_UNIT.
const DISTANCE_UNIT = 10 // units per AU  → Neptune sits at ~300 units
// Sizes live on a SEPARATE scale (~true-relative among planets), with a floor
// so the tiniest bodies stay visible. The Sun is the one deliberate cheat.
const SIZE_SCALE = 1.2 / 69911 // Jupiter (69,911 km) → 1.2 units
const MIN_SIZE = 0.05
const SUN_RADIUS = 2.0 // hand-set: biggest object, but < Mercury's perihelion (~3 units)
// Time: Earth completes one orbit in this many seconds; everything else is
// Kepler-true relative to that (outer planets crawl — which is real).
const EARTH_PERIOD_SECONDS = 14

const sizeOf = (radiusKm: number) => Math.max(radiusKm * SIZE_SCALE, MIN_SIZE)

// A point on an ellipse with one FOCUS at the local origin (Kepler's 1st law).
function ellipsePoint(a: number, b: number, t: number, out: THREE.Vector3) {
  const c = Math.sqrt(Math.max(a * a - b * b, 0))
  return out.set(a * Math.cos(t) - c, 0, b * Math.sin(t))
}

function OrbitPath({ a, b }: { a: number; b: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const v = new THREE.Vector3()
    for (let i = 0; i <= 160; i++) {
      pts.push(ellipsePoint(a, b, (i / 160) * Math.PI * 2, v).clone())
    }
    return pts
  }, [a, b])
  return <Line points={points} color="#33405e" lineWidth={1} transparent opacity={0.5} />
}

const hoverHandlers = (onSelect: () => void) => ({
  onClick: (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onSelect()
  },
  onPointerOver: (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = 'auto'
  },
})

type Positions = React.MutableRefObject<Map<string, THREE.Vector3>>

// The Moon: a special case. It orbits EARTH, not the Sun, and its true distance
// would glue it to Earth at this scale — so its orbit is deliberately enlarged
// and given a calm (non-Kepler) speed. Rendered as a child of Earth's group.
function Moon({ positions, onOpenDetails }: { positions: Positions; onOpenDetails: (id: string) => void }) {
  const data = getPlanet('moon')!
  const ref = useRef<THREE.Mesh>(null!)
  const world = useRef(new THREE.Vector3())
  const local = useRef(new THREE.Vector3())
  const map = useLoader(TextureLoader, data.texture)
  const dist = 0.55 // exaggerated Earth–Moon distance (scene units)

  useFrame((state) => {
    const t = state.clock.getElapsedTime() * 1.0 + 1.0
    ellipsePoint(dist, dist, t, local.current)
    ref.current.position.copy(local.current)
    ref.current.rotation.y += 0.003
    positions.current.set('moon', ref.current.getWorldPosition(world.current).clone())
  })

  return (
    <mesh ref={ref} {...hoverHandlers(() => onOpenDetails('moon'))}>
      <sphereGeometry args={[sizeOf(data.radiusKm), 32, 32]} />
      <meshStandardMaterial map={map} />
    </mesh>
  )
}

function OrbitingBody({
  planet,
  positions,
  onOpenDetails,
}: {
  planet: PlanetData
  positions: Positions
  onOpenDetails: (id: string) => void
}) {
  const group = useRef<THREE.Group>(null!)
  const spinner = useRef<THREE.Mesh>(null!)
  const map = useLoader(TextureLoader, planet.texture)
  const orbit = planet.orbit!

  const a = orbit.semiMajorAxisAU * DISTANCE_UNIT
  const b = a * Math.sqrt(1 - orbit.eccentricity * orbit.eccentricity)
  const angularSpeed = (Math.PI * 2) / (orbit.periodYears * EARTH_PERIOD_SECONDS)
  const radius = sizeOf(planet.radiusKm)
  const tilt = THREE.MathUtils.degToRad(planet.axialTilt ?? 0)
  const pos = useRef(new THREE.Vector3())

  useFrame((state) => {
    const t = orbit.phase + state.clock.getElapsedTime() * angularSpeed
    ellipsePoint(a, b, t, pos.current)
    group.current.position.copy(pos.current)
    spinner.current.rotation.y += 0.01
    positions.current.set(planet.id, pos.current)
  })

  return (
    <>
      <OrbitPath a={a} b={b} />
      <group ref={group}>
        <group rotation={[0, 0, tilt]}>
          <mesh ref={spinner} {...hoverHandlers(() => onOpenDetails(planet.id))}>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshStandardMaterial map={map} />
          </mesh>
        </group>
        {planet.id === 'earth' && <Moon positions={positions} onOpenDetails={onOpenDetails} />}
      </group>
    </>
  )
}

function Sun({ positions, onOpenDetails }: { positions: Positions; onOpenDetails: (id: string) => void }) {
  const sun = useLoader(TextureLoader, '/textures/sun.jpg')
  useEffect(() => {
    positions.current.set('sun', new THREE.Vector3(0, 0, 0))
  }, [positions])
  return (
    <group>
      <mesh {...hoverHandlers(() => onOpenDetails('sun'))}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <meshBasicMaterial map={sun} />
      </mesh>
      <pointLight intensity={2.5} decay={0} />
    </group>
  )
}

type Controls = ElementRef<typeof CameraControls>

// Flies the camera to the focused body, then locks on and follows it as it orbits.
function CameraDirector({
  controlsRef,
  positions,
  focusId,
}: {
  controlsRef: React.RefObject<Controls>
  positions: Positions
  focusId: string | null
}) {
  const lastFocus = useRef<string | null>(null)
  const transitioning = useRef(false)
  const camPos = useRef(new THREE.Vector3())

  // 'rest' fires when camera motion settles → the glide is done, start following.
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    const onRest = () => {
      transitioning.current = false
    }
    c.addEventListener('rest', onRest)
    return () => c.removeEventListener('rest', onRest)
  }, [controlsRef])

  useFrame(() => {
    const c = controlsRef.current
    if (!c || !focusId) return
    const target = positions.current.get(focusId)
    if (!target) return

    if (lastFocus.current !== focusId) {
      // New selection → glide. Stand-off scales with the body's size.
      const radius = focusId === 'sun' ? SUN_RADIUS : sizeOf(getPlanet(focusId)?.radiusKm ?? 1000)
      const d = Math.max(radius * 4, 1.2)
      const dest = target.clone().add(new THREE.Vector3(d * 0.7, d * 0.45, d * 0.7))

      c.getPosition(camPos.current)
      const travel = camPos.current.distanceTo(dest)
      // Sub-linear: ~1s for near hops, capped ~7s for the haul to Neptune.
      c.smoothTime = THREE.MathUtils.clamp(Math.sqrt(travel) * 0.11, 0.3, 1.8)

      c.setLookAt(dest.x, dest.y, dest.z, target.x, target.y, target.z, true)
      transitioning.current = true
      lastFocus.current = focusId
    } else if (!transitioning.current) {
      // Locked on → keep the orbit centre glued to the moving body. The user can
      // still freely rotate/zoom around it (camera-controls keeps its spherical
      // offset when the target moves).
      c.setTarget(target.x, target.y, target.z, false)
    }
  })

  return null
}

export default function SolarSystem() {
  const navigate = useNavigate()
  const controlsRef = useRef<Controls>(null)
  const positions = useRef(new Map<string, THREE.Vector3>())
  const [focusId, setFocusId] = useState<string | null>(null)

  // Built OUTSIDE the Canvas, passed in as a prop — router context need not be
  // bridged into the react-three-fiber renderer.
  const openDetails = (id: string) => navigate(`/planet/${id}`)
  const orbiting = planets.filter((p) => p.orbit)

  return (
    <>
      <div className="scale-badge">Distances to scale · sizes &amp; Sun exaggerated</div>
      <div className="hint">Pick a planet to fly there · click a body to learn about it</div>

      <nav className="planet-list">
        <h2>Bodies</h2>
        {planets.map((p) => (
          <button
            key={p.id}
            className={p.id === focusId ? 'active' : ''}
            onClick={() => setFocusId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </nav>

      <Canvas camera={{ position: [0, 30, 60], fov: 50, near: 0.01, far: 5000 }}>
        <ambientLight intensity={0.06} />
        <Stars radius={400} depth={80} count={8000} factor={4} fade />
        <Suspense fallback={null}>
          <Sun positions={positions} onOpenDetails={openDetails} />
          {orbiting.map((p) => (
            <OrbitingBody key={p.id} planet={p} positions={positions} onOpenDetails={openDetails} />
          ))}
        </Suspense>
        <CameraControls ref={controlsRef} minDistance={0.1} maxDistance={1500} />
        <CameraDirector controlsRef={controlsRef} positions={positions} focusId={focusId} />
      </Canvas>
    </>
  )
}
