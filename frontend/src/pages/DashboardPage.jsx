import { useState, useEffect } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/api/projects')
      .then(res => setProjects(res.data.projects))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const statusColor = (status) => {
    const map = {
      draft: 'bg-gray-700 text-gray-300',
      in_analysis: 'bg-blue-900 text-blue-300',
      mitigating: 'bg-yellow-900 text-yellow-300',
      completed: 'bg-green-900 text-green-300',
    };
    return map[status] || 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-bold text-xl tracking-wider">ATMT</span>
          <span className="text-gray-600 text-xs">v0.9</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user.full_name}</span>
          {user.is_admin && (
            <span className="bg-blue-900 text-blue-300 text-xs px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          )}
          {user.is_demo && (
            <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-0.5 rounded-full">
              DEMO
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Projects</h1>
            <p className="text-gray-500 text-sm mt-1">
              Your TARA projects and analysis workspaces
            </p>
          </div>
          {!user.is_demo && (
            <button
              onClick={() => window.location.href = '/projects/new'}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Project
            </button>
          )}
        </div>

        {/* Projects list */}
        {loading ? (
          <div className="text-gray-500 text-center py-20">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No projects yet</p>
            <p className="text-gray-600 text-sm mt-2">
              Create your first TARA project to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => window.location.href = `/projects/${project.id}/editor`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-blue-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{project.name}</h3>
                    {project.description && (
                      <p className="text-gray-500 text-sm mt-1">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(project.status)}`}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                      {project.my_role}
                    </span>
                  </div>
                </div>

                {/* Vehicle profile badges */}
                {project.vehicle_profile && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {project.vehicle_profile.propulsion && (
                      <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded">
                        {project.vehicle_profile.propulsion}
                      </span>
                    )}
                    {project.vehicle_profile.architecture && (
                      <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded">
                        {project.vehicle_profile.architecture}
                      </span>
                    )}
                    {project.vehicle_profile.sae_level !== undefined && (
                      <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded">
                        SAE L{project.vehicle_profile.sae_level}
                      </span>
                    )}
                    {project.vehicle_profile.ota_support && (
                      <span className="bg-gray-800 text-blue-400 text-xs px-2 py-0.5 rounded">
                        OTA
                      </span>
                    )}
                  </div>
                )}

                <div className="text-gray-600 text-xs mt-3">
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}