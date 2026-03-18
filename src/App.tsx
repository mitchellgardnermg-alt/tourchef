import { Route, Routes } from 'react-router-dom';
import { CarnetProvider } from './carnet/store';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResultsPage } from './pages/ResultsPage';

export default function App() {
  return (
    <CarnetProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </CarnetProvider>
  );
}

