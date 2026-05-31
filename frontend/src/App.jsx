import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import EditorPage from './pages/EditorPage';
import AdminPage from './pages/AdminPage';
import ProjectsPage from './pages/ProjectsPage';
import ThreatCatalogPage from './pages/ThreatCatalogPage';
import AssetLibraryPage from './pages/AssetLibraryPage';
import SecurityControlsPage from './pages/SecurityControlsPage';
import GlobalReportsPage from './pages/GlobalReportsPage';
import { useAuth } from './store/AuthContext';
import MobileGuard from './components/layout/MobileGuard';

// Protected route — redirects to login if no token
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Removed EditorProtectedRoute

function App() {
  return (
    <MobileGuard>
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/new" element={
          <ProtectedRoute>
            <ProjectSetupPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/editor" element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/assets" element={
          <ProtectedRoute>
            <AssetLibraryPage />
          </ProtectedRoute>
        } />
        <Route path="/threats-catalog" element={
          <ProtectedRoute>
            <ThreatCatalogPage />
          </ProtectedRoute>
        } />
        <Route path="/controls-library" element={
          <ProtectedRoute>
            <SecurityControlsPage />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <GlobalReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </BrowserRouter>
    </MobileGuard>
  );
}

export default App;