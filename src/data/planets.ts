// Single source of truth for every celestial body.
// Adding a new body later = one more entry here, NOT a new page or component.

export interface PlanetFact {
  label: string
  value: string
}

export interface PlanetData {
  id: string // URL slug, e.g. /planet/earth
  name: string
  tagline: string
  description: string
  texture: string // equirectangular map in /public/textures
  cloudTexture?: string // optional second sphere (Earth)
  displayRadius: number // sphere size on the detail page (stylized)
  axialTilt?: number // degrees
  emissive?: boolean // true = self-lit (the Sun)
  facts: PlanetFact[]
}

export const planets: PlanetData[] = [
  {
    id: 'sun',
    name: 'The Sun',
    tagline: 'The star at the heart of our solar system.',
    description:
      'The Sun is a 4.6-billion-year-old G-type main-sequence star — a roughly ' +
      'spherical ball of hot plasma held together by its own gravity. It contains ' +
      '99.86% of all the mass in the solar system, and its gravity is what keeps ' +
      'every planet, including Earth, in orbit around it.',
    texture: '/textures/sun.jpg',
    displayRadius: 1.4,
    emissive: true,
    facts: [
      { label: 'Type', value: 'G2V main-sequence star' },
      { label: 'Diameter', value: '1,391,000 km (≈109× Earth)' },
      { label: 'Mass', value: '1.989 × 10³⁰ kg (99.86% of the solar system)' },
      { label: 'Surface temp.', value: '≈5,500 °C' },
      { label: 'Composition', value: '≈73% hydrogen, ≈25% helium' },
      { label: 'Age', value: '≈4.6 billion years' },
    ],
  },
  {
    id: 'earth',
    name: 'Earth',
    tagline: 'Our home — the only known world with life.',
    description:
      'Earth is the third planet from the Sun and the only place in the universe ' +
      'known to harbour life. It is an oblate sphere — very slightly flattened at ' +
      'the poles by its rotation — tilted 23.4° on its axis, which is what gives us ' +
      'the seasons as it orbits the Sun.',
    texture: '/textures/earth_daymap.jpg',
    cloudTexture: '/textures/earth_clouds.jpg',
    displayRadius: 1,
    axialTilt: 23.4,
    facts: [
      { label: 'Diameter', value: '12,742 km' },
      { label: 'Distance from Sun', value: '149.6 million km (1 AU)' },
      { label: 'Day length', value: '23.93 hours' },
      { label: 'Year length', value: '365.25 days' },
      { label: 'Axial tilt', value: '23.4°' },
      { label: 'Moons', value: '1 (the Moon)' },
    ],
  },
  {
    id: 'moon',
    name: 'The Moon',
    tagline: "Earth's only natural satellite.",
    description:
      'The Moon is the fifth-largest moon in the solar system and the only world ' +
      'beyond Earth that humans have walked on. It is tidally locked, so it always ' +
      'shows us the same face. Its orbit around Earth — and the shadows the two cast ' +
      'on each other — is what produces eclipses.',
    texture: '/textures/moon.jpg',
    displayRadius: 0.6,
    facts: [
      { label: 'Diameter', value: '3,474 km (≈27% of Earth)' },
      { label: 'Distance from Earth', value: '384,400 km (average)' },
      { label: 'Orbital period', value: '27.3 days' },
      { label: 'Surface gravity', value: '1.62 m/s² (≈1/6 of Earth)' },
      { label: 'Day length', value: '29.5 Earth days' },
    ],
  },
]

export const getPlanet = (id: string | undefined): PlanetData | undefined =>
  planets.find((p) => p.id === id)
