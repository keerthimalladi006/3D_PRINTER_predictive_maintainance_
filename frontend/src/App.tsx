import { Navigate, Route, Routes } from 'react-router-dom';
import { OverviewPage } from './pages/OverviewPage';
import { VibrationPage } from './pages/VibrationPage';
import { HealthPage } from './pages/HealthPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { TestPage } from './pages/TestPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/overview" element={<OverviewPage />} />
      <Route path="/vibration" element={<VibrationPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="/anomalies" element={<AnomaliesPage />} />
      <Route path="/digital-twin" element={<DigitalTwinPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export default App;
