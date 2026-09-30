import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './ui/Layout';
import Home from './pages/Home';

const CoursePage = lazy(() => import('./pages/CoursePage'));
const UnitPage = lazy(() => import('./pages/UnitPage'));
const Lab = lazy(() => import('./pages/Lab'));
const Simulators = lazy(() => import('./pages/Simulators'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const Practice = lazy(() => import('./pages/Practice'));
const TutorPage = lazy(() => import('./pages/TutorPage'));
const About = lazy(() => import('./pages/About'));

export function Loading() {
  return <div className="p-8 text-sm text-muted"><span className="dots">Cargando</span></div>;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/curso/:courseId" element={<CoursePage />} />
          <Route path="/curso/:courseId/:unitId" element={<UnitPage />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/simuladores" element={<Simulators />} />
          <Route path="/simuladores/:simId" element={<SimulatorPage />} />
          <Route path="/practica" element={<Practice />} />
          <Route path="/auxiliar" element={<TutorPage />} />
          <Route path="/acerca" element={<About />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
