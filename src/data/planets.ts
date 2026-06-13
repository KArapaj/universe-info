// Single source of truth for every celestial body.
// Drives FOUR things: the orbiting 3D bodies, the orbit geometry, the
// navigation list, and the /planet/:id detail routes.
// Adding a new body later = one more entry here. No new pages or components.

export interface PlanetFact {
  label: string
  value: string
}

// Heliocentric orbital elements (real values). The scene scales these:
// distances are TRUE relative (AU x one factor); orbits use the real (low)
// eccentricity so they look honestly near-circular; angular speed ∝ 1/period.
export interface OrbitElements {
  semiMajorAxisAU: number
  eccentricity: number
  periodYears: number
  phase: number // initial angle (radians), just to spread bodies out
}

export interface PlanetData {
  id: string // URL slug, e.g. /planet/earth
  name: string
  tagline: string
  description: string
  texture: string // equirectangular map in /public/textures
  cloudTexture?: string // optional second sphere (Earth)
  displayRadius: number // sphere size on the DETAIL page (stylized, standalone)
  radiusKm: number // real equatorial radius — drives ORRERY relative sizing
  axialTilt?: number // degrees
  emissive?: boolean // true = self-lit (the Sun)
  orbit?: OrbitElements // heliocentric orbit; omitted for the Sun and the Moon
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
    radiusKm: 696000,
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
    id: 'mercury',
    name: 'Mercury',
    tagline: 'The smallest planet and the closest to the Sun.',
    description:
      'Mercury is the smallest planet in the solar system and the nearest to the ' +
      'Sun. With almost no atmosphere to trap heat, it swings between scorching ' +
      'days and freezing nights. A year on Mercury lasts just 88 Earth days.',
    texture: '/textures/mercury.jpg',
    displayRadius: 1,
    radiusKm: 2440,
    axialTilt: 0.03,
    orbit: { semiMajorAxisAU: 0.387, eccentricity: 0.206, periodYears: 0.241, phase: 0.5 },
    facts: [
      { label: 'Diameter', value: '4,879 km' },
      { label: 'Distance from Sun', value: '57.9 million km (0.39 AU)' },
      { label: 'Day length', value: '176 Earth days' },
      { label: 'Year length', value: '88 Earth days' },
      { label: 'Moons', value: '0' },
    ],
  },
  {
    id: 'venus',
    name: 'Venus',
    tagline: "The hottest planet — Earth's toxic twin.",
    description:
      'Venus is almost the same size as Earth, but a runaway greenhouse effect ' +
      'makes it the hottest planet in the solar system, hotter even than Mercury. ' +
      'Its thick carbon-dioxide atmosphere crushes and bakes the surface. It also ' +
      'spins backwards compared with most planets.',
    texture: '/textures/venus.jpg',
    displayRadius: 1,
    radiusKm: 6052,
    axialTilt: 177.4,
    orbit: { semiMajorAxisAU: 0.723, eccentricity: 0.007, periodYears: 0.615, phase: 2.1 },
    facts: [
      { label: 'Diameter', value: '12,104 km' },
      { label: 'Distance from Sun', value: '108.2 million km (0.72 AU)' },
      { label: 'Surface temp.', value: '≈465 °C' },
      { label: 'Year length', value: '225 Earth days' },
      { label: 'Moons', value: '0' },
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
    radiusKm: 6371,
    axialTilt: 23.4,
    orbit: { semiMajorAxisAU: 1.0, eccentricity: 0.017, periodYears: 1.0, phase: 4.0 },
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
    radiusKm: 1737,
    facts: [
      { label: 'Diameter', value: '3,474 km (≈27% of Earth)' },
      { label: 'Distance from Earth', value: '384,400 km (average)' },
      { label: 'Orbital period', value: '27.3 days' },
      { label: 'Surface gravity', value: '1.62 m/s² (≈1/6 of Earth)' },
      { label: 'Day length', value: '29.5 Earth days' },
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    tagline: 'The red planet — the most explored world after Earth.',
    description:
      'Mars is a cold desert world whose rusty iron-oxide dust gives it a red hue. ' +
      'It has the largest volcano and one of the deepest canyons in the solar ' +
      'system, polar ice caps, and clear evidence that liquid water once flowed ' +
      'across its surface.',
    texture: '/textures/mars.jpg',
    displayRadius: 1,
    radiusKm: 3390,
    axialTilt: 25.2,
    orbit: { semiMajorAxisAU: 1.524, eccentricity: 0.093, periodYears: 1.881, phase: 5.5 },
    facts: [
      { label: 'Diameter', value: '6,779 km' },
      { label: 'Distance from Sun', value: '227.9 million km (1.52 AU)' },
      { label: 'Day length', value: '24.6 hours' },
      { label: 'Year length', value: '687 Earth days' },
      { label: 'Moons', value: '2 (Phobos & Deimos)' },
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    tagline: 'The giant — more massive than all other planets combined.',
    description:
      'Jupiter is the largest planet in the solar system, a gas giant more than ' +
      'twice as massive as all the other planets put together. Its Great Red Spot ' +
      'is a storm larger than Earth that has raged for centuries. It has at least ' +
      '95 known moons.',
    texture: '/textures/jupiter.jpg',
    displayRadius: 1,
    radiusKm: 69911,
    axialTilt: 3.1,
    orbit: { semiMajorAxisAU: 5.203, eccentricity: 0.048, periodYears: 11.86, phase: 1.2 },
    facts: [
      { label: 'Diameter', value: '139,820 km (≈11× Earth)' },
      { label: 'Distance from Sun', value: '778.5 million km (5.2 AU)' },
      { label: 'Day length', value: '9.9 hours (fastest spin)' },
      { label: 'Year length', value: '11.9 Earth years' },
      { label: 'Moons', value: '95+ known' },
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    tagline: 'The ringed jewel of the solar system.',
    description:
      'Saturn is a gas giant famous for its spectacular ring system, made of ' +
      'countless chunks of ice and rock. It is the least dense planet — it would ' +
      'float in water if you had a big enough ocean. (Rings are coming in a later ' +
      'pass.)',
    texture: '/textures/saturn.jpg',
    displayRadius: 1,
    radiusKm: 58232,
    axialTilt: 26.7,
    orbit: { semiMajorAxisAU: 9.537, eccentricity: 0.054, periodYears: 29.45, phase: 3.3 },
    facts: [
      { label: 'Diameter', value: '116,460 km (≈9× Earth)' },
      { label: 'Distance from Sun', value: '1.43 billion km (9.5 AU)' },
      { label: 'Day length', value: '10.7 hours' },
      { label: 'Year length', value: '29.4 Earth years' },
      { label: 'Moons', value: '146+ known' },
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    tagline: 'The ice giant that rolls on its side.',
    description:
      'Uranus is an ice giant tipped over at 98°, so it essentially orbits the Sun ' +
      'on its side — likely the result of an ancient collision. Methane in its ' +
      'atmosphere gives it a pale blue-green colour.',
    texture: '/textures/uranus.jpg',
    displayRadius: 1,
    radiusKm: 25362,
    axialTilt: 97.8,
    orbit: { semiMajorAxisAU: 19.19, eccentricity: 0.047, periodYears: 84.0, phase: 5.0 },
    facts: [
      { label: 'Diameter', value: '50,724 km (≈4× Earth)' },
      { label: 'Distance from Sun', value: '2.87 billion km (19.2 AU)' },
      { label: 'Day length', value: '17.2 hours' },
      { label: 'Year length', value: '84 Earth years' },
      { label: 'Moons', value: '28 known' },
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    tagline: 'The windiest, most distant planet.',
    description:
      'Neptune is the most distant planet from the Sun, a deep-blue ice giant with ' +
      'the fastest winds in the solar system — over 2,000 km/h. It is so far away ' +
      'that a single orbit takes nearly 165 Earth years; it has completed only one ' +
      'since its discovery in 1846.',
    texture: '/textures/neptune.jpg',
    displayRadius: 1,
    radiusKm: 24622,
    axialTilt: 28.3,
    orbit: { semiMajorAxisAU: 30.07, eccentricity: 0.009, periodYears: 164.8, phase: 0.8 },
    facts: [
      { label: 'Diameter', value: '49,244 km (≈3.9× Earth)' },
      { label: 'Distance from Sun', value: '4.5 billion km (30.1 AU)' },
      { label: 'Day length', value: '16.1 hours' },
      { label: 'Year length', value: '164.8 Earth years' },
      { label: 'Moons', value: '16 known' },
    ],
  },
]

export const getPlanet = (id: string | undefined): PlanetData | undefined =>
  planets.find((p) => p.id === id)
