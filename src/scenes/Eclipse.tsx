import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { CameraControls, Stars } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState, type ElementRef } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { getPlanet } from '../data/planets'

// ---------------------------------------------------------------------------
// The eclipse scene is BESPOKE (not a /planet/:id route). It reuses the
// earth/moon/sun textures + real radiusKm from planets.ts, and renders the
// shadow cones as REAL geometry derived by the umbra formula L = r·d/(R−r).
// See research/2026-06-16-eclipse-page.md for the full design rationale.
//
// Scene unit = 1 Earth radius. Sun sits at its TRUE distance (no cheat); the
// Earth–Moon system is true-relative in both size and separation.
// ---------------------------------------------------------------------------

const earth = getPlanet('earth')!
const moon = getPlanet('moon')!
const sun = getPlanet('sun')!

const KM = 1 / earth.radiusKm // kilometres → scene units (Earth radius = 1)
const R_EARTH = 1
const R_MOON = moon.radiusKm * KM // ≈ 0.273
const R_SUN = sun.radiusKm * KM // ≈ 109.2
const MOON_DIST = 384_400 * KM // ≈ 60.3
const SUN_DIST = 149_600_000 * KM // 1 AU ≈ 23,481
const INCLINATION = THREE.MathUtils.degToRad(5.14) // Moon's orbital tilt

const SUN_POS = new THREE.Vector3(SUN_DIST, 0, 0)
const UP = new THREE.Vector3(0, 1, 0)

type Mode = 'solar' | 'lunar'

// Real umbra/penumbra geometry for an occluder of radius r, lit by the Sun.
// Umbra: converging cone, tip at length L = r·d/(R−r). Penumbra: diverging
// frustum (rendered to a finite length). d ≈ Sun→occluder distance.
function shadowOf(r: number) {
  const d = SUN_DIST
  const umbraLen = (r * d) / (R_SUN - r)
  const penLen = umbraLen * 1.5
  const penFar = r + (penLen * (R_SUN + r)) / d // penumbra outer radius at penLen
  return { umbraLen, penLen, penFar }
}

// Moon position on its real 5.14°-inclined orbit. The line of nodes points at
// the Sun (+X), so θ=0 → new moon AT the node (solar), θ=π → full moon at the
// node (lunar). Off the node the Moon rides above/below the ecliptic and its
// shadow misses Earth — which is exactly why eclipses are rare.
function moonAt(theta: number) {
  const along = MOON_DIST * Math.sin(theta) // distance along the orbit from the node line
  return new THREE.Vector3(
    MOON_DIST * Math.cos(theta),
    along * Math.sin(INCLINATION),
    along * Math.cos(INCLINATION),
  )
}

// Nearest hit of a ray (origin, unit dir) with a sphere at the world origin.
function raySphere(origin: THREE.Vector3, dir: THREE.Vector3, radius: number): THREE.Vector3 | null {
  const b = origin.dot(dir)
  const c = origin.dot(origin) - radius * radius
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  if (t < 0) return null
  return origin.clone().addScaledVector(dir, t)
}

// One body's pair of shadow cones (umbra + penumbra), oriented along the real
// shadow axis (anti-sunward) and brightened when it's the focused event.
function ShadowCones({
  position,
  occluderR,
  focus,
}: {
  position: THREE.Vector3
  occluderR: number
  focus: boolean
}) {
  const dir = useMemo(() => position.clone().sub(SUN_POS).normalize(), [position])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, dir), [dir])
  const { umbraLen, penLen, penFar } = useMemo(() => shadowOf(occluderR), [occluderR])

  return (
    <group position={position} quaternion={quat}>
      {/* Umbra — total occlusion. Converging cone to a tip. */}
      <mesh position={[0, umbraLen / 2, 0]}>
        <cylinderGeometry args={[0, occluderR, umbraLen, 64, 1, true]} />
        <meshBasicMaterial
          color="#05060c"
          transparent
          opacity={focus ? 0.5 : 0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Penumbra — partial occlusion. Diverging frustum. */}
      <mesh position={[0, penLen / 2, 0]}>
        <cylinderGeometry args={[penFar, occluderR, penLen, 64, 1, true]} />
        <meshBasicMaterial
          color="#2a2f47"
          transparent
          opacity={focus ? 0.16 : 0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// The literal dark dot the Moon's shadow paints on Earth — what satellites
// photograph during a solar eclipse. Only appears when the cone actually meets
// Earth (i.e. near the node at new moon).
function SurfaceSpot({ moonPos }: { moonPos: THREE.Vector3 }) {
  const spot = useMemo(() => {
    const dir = moonPos.clone().sub(SUN_POS).normalize()
    const hit = raySphere(moonPos, dir, R_EARTH)
    if (!hit) return null
    const t = hit.distanceTo(moonPos)
    const { umbraLen } = shadowOf(R_MOON)
    const umbraR = Math.max(R_MOON * (1 - t / umbraLen), 0) // 0 → graze (tiny path)
    const penR = R_MOON + (t * (R_SUN + R_MOON)) / SUN_DIST
    const normal = hit.clone().normalize()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    const pos = hit.clone().addScaledVector(normal, 0.012) // lift off the surface
    return { pos, quat, umbraR: Math.max(umbraR, 0.05), penR }
  }, [moonPos])

  if (!spot) return null
  return (
    <group position={spot.pos} quaternion={spot.quat}>
      <mesh>
        <circleGeometry args={[spot.penR, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <circleGeometry args={[spot.umbraR, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Bodies({ moonPos, eclipsed }: { moonPos: THREE.Vector3; eclipsed: number }) {
  const earthMap = useLoader(TextureLoader, earth.texture)
  const moonMap = useLoader(TextureLoader, moon.texture)
  const sunMap = useLoader(TextureLoader, sun.texture)
  const earthRef = useRef<THREE.Mesh>(null!)

  // A slow Earth spin keeps the scene alive without affecting the geometry.
  useFrame((_, delta) => {
    earthRef.current.rotation.y += delta * 0.05
  })

  // Blood-moon tint: as the Moon sinks into Earth's umbra, kill the direct
  // sunlight on it (darken the diffuse colour) and fade in the deep-red glow of
  // sunlight refracted through Earth's atmosphere — what makes an eclipsed Moon
  // red. (The cones are real geometry but don't occlude the light, so we model
  // the loss of direct sun here.)
  const moonEmissive = useMemo(() => new THREE.Color('#6a1608').multiplyScalar(eclipsed), [eclipsed])
  const moonColor = useMemo(() => new THREE.Color().setScalar(1 - 0.88 * eclipsed), [eclipsed])

  return (
    <>
      {/* Sun — at its TRUE distance; a small bright disk far off (often off-frame). */}
      <mesh position={SUN_POS}>
        <sphereGeometry args={[R_SUN, 48, 48]} />
        <meshBasicMaterial map={sunMap} />
      </mesh>

      <mesh ref={earthRef} position={[0, 0, 0]}>
        <sphereGeometry args={[R_EARTH, 64, 64]} />
        <meshStandardMaterial map={earthMap} />
      </mesh>

      <mesh position={moonPos}>
        <sphereGeometry args={[R_MOON, 48, 48]} />
        <meshStandardMaterial map={moonMap} color={moonColor} emissive={moonEmissive} />
      </mesh>
    </>
  )
}

type Controls = ElementRef<typeof CameraControls>

// Re-frames the camera when the eclipse mode changes (the user is otherwise
// free to rotate/zoom — the cones are real geometry, inspect from any angle).
function CameraRig({ controlsRef, mode }: { controlsRef: React.RefObject<Controls>; mode: Mode }) {
  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    // Solar geometry lives on +X (Moon between Earth and Sun); lunar on −X.
    const s = mode === 'solar' ? 1 : -1
    c.setLookAt(s * 28, 16, 52, s * 26, 0, 0, true)
  }, [controlsRef, mode])
  return null
}

export default function Eclipse() {
  const controlsRef = useRef<Controls>(null)
  const [mode, setMode] = useState<Mode>('solar')
  // Scrub angle in degrees (0 = new moon at node = solar; 180 = full = lunar).
  const [angle, setAngle] = useState(0)

  const theta = THREE.MathUtils.degToRad(angle)
  const moonPos = useMemo(() => moonAt(theta), [theta])

  // --- Live, honestly-derived status of the alignment ---
  const status = useMemo(() => {
    if (mode === 'solar') {
      const dir = moonPos.clone().sub(SUN_POS).normalize()
      // Closest approach of the shadow axis to Earth's centre.
      const axial = moonPos.dot(dir)
      const miss = Math.sqrt(Math.max(moonPos.lengthSq() - axial * axial, 0))
      const hit = raySphere(moonPos, dir, R_EARTH)
      if (hit) {
        const t = hit.distanceTo(moonPos)
        const { umbraLen } = shadowOf(R_MOON)
        return t <= umbraLen
          ? { kind: 'total', text: 'Total solar eclipse — the umbra is touching Earth.' }
          : { kind: 'annular', text: 'Annular eclipse — the umbra falls just short; a ring of Sun remains.' }
      }
      if (miss < R_EARTH + 0.6)
        return { kind: 'partial', text: 'Partial eclipse — only the penumbra grazes Earth.' }
      const km = Math.round((miss - R_EARTH) * earth.radiusKm).toLocaleString()
      return {
        kind: 'miss',
        text: `No eclipse — the Moon's shadow passes ~${km} km ${moonPos.y >= 0 ? 'above' : 'below'} Earth.`,
      }
    }
    // Lunar: how deep is the Moon inside Earth's umbra?
    const dir = new THREE.Vector3(0, 0, 0).sub(SUN_POS).normalize() // Earth's shadow axis (−X)
    const axial = moonPos.dot(dir)
    if (axial <= 0)
      return { kind: 'miss', text: 'No eclipse — the Moon is on the day side (new moon, not full).' }
    const radial = Math.sqrt(Math.max(moonPos.lengthSq() - axial * axial, 0))
    const { umbraLen } = shadowOf(R_EARTH)
    const umbraR = R_EARTH * (1 - axial / umbraLen)
    if (radial + R_MOON <= umbraR)
      return { kind: 'total', text: 'Total lunar eclipse — the Moon is fully inside Earth’s umbra (blood moon).' }
    if (radial - R_MOON < umbraR)
      return { kind: 'partial', text: 'Partial lunar eclipse — Earth’s umbra covers part of the Moon.' }
    const km = Math.round((radial - umbraR) * earth.radiusKm).toLocaleString()
    return { kind: 'miss', text: `No eclipse — the Moon passes ~${km} km ${moonPos.y >= 0 ? 'above' : 'below'} Earth’s shadow.` }
  }, [mode, moonPos])

  // Depth of the Moon in Earth's umbra (0..1) → drives the blood-moon tint.
  const eclipsed = useMemo(() => {
    if (mode !== 'lunar') return 0
    const dir = new THREE.Vector3(0, 0, 0).sub(SUN_POS).normalize()
    const axial = moonPos.dot(dir)
    if (axial <= 0) return 0
    const radial = Math.sqrt(Math.max(moonPos.lengthSq() - axial * axial, 0))
    const umbraR = R_EARTH * (1 - axial / shadowOf(R_EARTH).umbraLen)
    return THREE.MathUtils.clamp((umbraR - radial) / Math.max(umbraR, 0.001), 0, 1)
  }, [mode, moonPos])

  const selectMode = (m: Mode) => {
    setMode(m)
    setAngle(m === 'solar' ? 0 : 180)
  }

  return (
    <div className="planet-page">
      <Canvas camera={{ position: [28, 16, 52], fov: 50, near: 0.01, far: 40000 }}>
        <ambientLight intensity={0.05} />
        {/* Sun is ~23,500 Earth-radii away → its rays are parallel to within
            0.005°, so a directional light is the honest model. */}
        <directionalLight position={[100, 0, 0]} intensity={2.6} />
        <Stars radius={400} depth={80} count={6000} factor={4} fade />
        <Suspense fallback={null}>
          <Bodies moonPos={moonPos} eclipsed={eclipsed} />
        </Suspense>
        {/* Both cones are ALWAYS present (Earth always casts one; the Moon
            always casts one). The toggle just emphasises the relevant event. */}
        <ShadowCones position={new THREE.Vector3(0, 0, 0)} occluderR={R_EARTH} focus={mode === 'lunar'} />
        <ShadowCones position={moonPos} occluderR={R_MOON} focus={mode === 'solar'} />
        {mode === 'solar' && <SurfaceSpot moonPos={moonPos} />}
        <CameraControls ref={controlsRef} minDistance={2} maxDistance={1200} />
        <CameraRig controlsRef={controlsRef} mode={mode} />
      </Canvas>

      <Link to="/" className="back-link">
        ← Back to solar system
      </Link>

      <div className="scale-badge">Earth–Moon to scale · Sun at true distance, off-frame</div>

      {/* Bottom-centre controls: event toggle + scrub + live status. */}
      <div className="eclipse-controls">
        <div className="eclipse-toggle">
          <button className={mode === 'solar' ? 'active' : ''} onClick={() => selectMode('solar')}>
            ☀ Solar
          </button>
          <button className={mode === 'lunar' ? 'active' : ''} onClick={() => selectMode('lunar')}>
            🌑 Lunar
          </button>
        </div>
        <input
          className="scrub"
          type="range"
          min={0}
          max={360}
          step={0.5}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
        />
        <div className={`eclipse-status ${status.kind}`}>{status.text}</div>
        <div className="scrub-hint">Drag to move the Moon along its tilted orbit · rotate the scene to inspect the cones</div>
      </div>

      <EclipsePanel mode={mode} />
    </div>
  )
}

// NASA-sourced explainer + the four-point flat-earth debunk callout.
function EclipsePanel({ mode }: { mode: Mode }) {
  return (
    <aside className="panel eclipse-panel">
      <h1>Eclipses</h1>
      <p className="tagline">Real spheres, real shadows — rotate it yourself.</p>
      <p className="desc">
        {mode === 'solar' ? (
          <>
            A <strong>solar eclipse</strong> happens when the Moon passes between the Sun and Earth and its
            shadow falls on us. The Moon’s umbra is only <strong>~374,000 km</strong> long, almost exactly the
            <strong> ~384,400 km</strong> to Earth. At the Moon’s <em>average</em> distance the dark tip falls a
            few thousand km short — you get an <strong>annular</strong> “ring of fire.” Only when the Moon is
            nearer than average does the tip reach the ground for a <strong>total</strong> eclipse. Either way
            the shadow touches just a stripe a few hundred km wide — which is why any one spot sees totality
            only about once in 375 years.
          </>
        ) : (
          <>
            A <strong>lunar eclipse</strong> happens when the Moon passes through Earth’s shadow. Earth’s
            umbra is <strong>~1,382,000 km</strong> long — far past the Moon — so the Moon plunges fully
            into a wide shadow. The whole night side of Earth sees it at once, and it lasts for hours.
            Sunlight bent through Earth’s atmosphere paints the Moon deep red: a <em>blood moon</em>.
          </>
        )}
      </p>
      <p className="desc">
        The Moon’s orbit is tilted <strong>5.1°</strong>, so most months its shadow sails above or below
        Earth and nothing happens. Drag the slider away from alignment and watch the cone miss — that tilt
        is the whole reason eclipses are occasional, not monthly.
      </p>

      <div className="debunk">
        <h3>Flat-earth claims vs the geometry</h3>

        <div className="claim">
          <p className="claim-q">“Earth is a flat disc.”</p>
          <p className="claim-a">
            In a lunar eclipse, Earth’s shadow on the Moon is <strong>always a circular arc</strong> — every
            eclipse, from every angle. Only a sphere casts a round shadow in every direction; a disc would
            sometimes cast an ellipse or a line. Aristotle made this exact argument around 350 BC.
          </p>
        </div>

        <div className="claim">
          <p className="claim-q">“A ball couldn’t make such a narrow eclipse path.”</p>
          <p className="claim-a">
            The narrow path isn’t a problem to explain away — it’s a <strong>prediction</strong>. Feed the real
            Sun and Moon sizes into <em>L = r·d/(R−r)</em> and the umbra tip lands right at Earth’s surface.
            The thin stripe is the ball model’s signature, derived on screen.
          </p>
        </div>

        <div className="claim">
          <p className="claim-q">“Eclipses are mysterious or faked.”</p>
          <p className="claim-a">
            This same geometry predicts <strong>every eclipse to the minute, centuries ahead</strong> (the saros
            cycle; NASA’s tables run thousands of years). A model invented to dodge questions can’t forecast
            the future.
          </p>
        </div>

        <div className="claim">
          <p className="claim-q">“A hidden ‘shadow object’ dims the Moon.”</p>
          <p className="claim-a">
            During a <strong>selenelion</strong>, the eclipsed Moon and the Sun are both above the horizon at
            once — impossible if some object sat between them. The shadow is Earth’s own, exactly where the
            geometry puts it.
          </p>
        </div>
      </div>

      <p className="source">Data: NASA planetary fact sheets &amp; eclipse tables</p>
    </aside>
  )
}
