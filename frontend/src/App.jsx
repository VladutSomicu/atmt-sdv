import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import EditorPage from './pages/EditorPage';
import AdminPage from './pages/AdminPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectMembersPage from './pages/ProjectMembersPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { useAuth } from './store/AuthContext';
import MobileGuard from './components/layout/MobileGuard';

// Protected route — redirects to login if no token
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <MobileGuard>{children}</MobileGuard>;
}

function App() {
  return (
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
            <PlaceholderPage title="Asset Library" description="Manage global vehicle components and definitions." />
          </ProtectedRoute>
        } />
        <Route path="/threats" element={
          <ProtectedRoute>
            <PlaceholderPage title="Threat Catalog" description="Browse STRIDE, CAPEC, and LINDDUN references." />
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute>
            <PlaceholderPage title="Team Management" description="Manage organization members and global roles." />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <PlaceholderPage title="Global Reports" description="View and export aggregated compliance reports." />
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/members" element={
          <ProtectedRoute>
            <ProjectMembersPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;