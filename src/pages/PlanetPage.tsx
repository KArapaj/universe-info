import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { getPlanet, type PlanetData } from '../data/planets'
import PlanetRing from '../components/PlanetRing'

// Slowly rotating cloud layer for bodies that have one (Earth).
function CloudLayer({ texture, radius }: { texture: string; radius: number }) {
  const ref = useRef<THREE.Mesh>(null!)
  const map = useLoader(TextureLoader, texture)
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.18
  })
  return (
    <mesh ref={ref} scale={1.02}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial map={map} transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

// The single body, driven entirely by its planets.ts entry.
function Body({ planet }: { planet: PlanetData }) {
  const ref = useRef<THREE.Mesh>(null!)
  const map = useLoader(TextureLoader, planet.texture)
  const tilt = THREE.MathUtils.degToRad(planet.axialTilt ?? 0)

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.12
  })

  return (
    <group rotation={[0, 0, tilt]}>
      <mesh ref={ref}>
        <sphereGeometry args={[planet.displayRadius, 64, 64]} />
        {planet.emissive ? (
          <meshBasicMaterial map={map} />
        ) : (
          <meshStandardMaterial map={map} />
        )}
      </mesh>
      {planet.cloudTexture && (
        <CloudLayer texture={planet.cloudTexture} radius={planet.displayRadius} />
      )}
      {planet.ring && (
        <PlanetRing
          texture={planet.ring.texture}
          innerRadius={planet.displayRadius * planet.ring.innerScale}
          outerRadius={planet.displayRadius * planet.ring.outerScale}
        />
      )}
    </group>
  )
}

export default function PlanetPage() {
  const { id } = useParams()
  const planet = getPlanet(id)

  // Unknown slug → back to the landing scene.
  if (!planet) return <Navigate to="/" replace />

  return (
    <div className="planet-page">
      <Canvas camera={{ position: [0, 0, planet.displayRadius * 3.2], fov: 50 }}>
        <ambientLight intensity={0.15} />
        <directionalLight position={[5, 3, 5]} intensity={2} />
        <Stars radius={200} depth={60} count={5000} factor={4} fade />
        <Suspense fallback={null}>
          {/* key forces a clean remount when navigating between bodies. */}
          <Body key={planet.id} planet={planet} />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={planet.displayRadius * 1.6} maxDistance={30} />
      </Canvas>

      <Link to="/" className="back-link">
        ← Back to solar system
      </Link>

      <aside className="panel">
        <h1>
          {planet.name}
          {planet.dwarfPlanet && <span className="dwarf-badge">Dwarf planet</span>}
        </h1>
        <p className="tagline">{planet.tagline}</p>
        <p className="desc">{planet.description}</p>
        <dl className="facts">
          {planet.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="source">Data: NASA planetary fact sheets</p>
      </aside>
    </div>
  )
}
