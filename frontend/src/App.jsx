import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import EditorPage from './pages/EditorPage';

// Protected route — redirects to login if no token
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;