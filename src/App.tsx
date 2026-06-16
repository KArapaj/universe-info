import { Route, Routes } from 'react-router-dom'
import SolarSystem from './scenes/SolarSystem'
import PlanetPage from './pages/PlanetPage'
import Eclipse from './scenes/Eclipse'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SolarSystem />} />
      <Route path="/planet/:id" element={<PlanetPage />} />
      <Route path="/eclipse" element={<Eclipse />} />
    </Routes>
  )
}
