import { useState, useEffect } from 'react';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';

const riskBadge = (score) => {
  if (score >= 16) return 'bg-red-900 text-red-300 border-red-800';
  if (score >= 12) return 'bg-orange-900 text-orange-300 border-orange-800';
  if (score >= 8)  return 'bg-yellow-900 text-yellow-300 border-yellow-800';
  if (score >= 4)  return 'bg-blue-900 text-blue-300 border-blue-800';
  return 'bg-gray-800 text-gray-400 border-gray-700';
};

const riskLabel = (score) => {
  if (score >= 16) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 8)  return 'MEDIUM';
  if (score >= 4)  return 'LOW';
  return 'DRAFT';
};

const statusColor = {
  draft:       'text-gray-400',
  in_analysis: 'text-blue-400',
  mitigating:  'text-yellow-400',
  completed:   'text-green-400',
};

const roleColor = {
  engineer:  'bg-blue-900 text-blue-300',
  manager:   'bg-green-900 text-green-300',
  architect: 'bg-purple-900 text-purple-300',
  auditor:   'bg-yellow-900 text-yellow-300',
};

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    api.get('/api/projects')
      .then(res => setProjects(res.data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: projects.length,
    critical: projects.filter(p => p.status === 'in_analysis').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <AppLayout breadcrumb={[{ label: 'Dashboard' }]}>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {projects.length} active - ISO 21434 workspace
          </p>
        </div>
        {!user.is_demo && (
          <a
            href="/projects/new"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New project
          </a>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'ACTIVE PROJECTS', value: stats.total, sub: 'in workspace' },
          { label: 'IN ANALYSIS', value: stats.critical, sub: 'running TARA' },
          { label: 'COMPLETED', value: stats.completed, sub: 'reports generated' },
          { label: 'STANDARDS', value: 'R155 / R156', sub: 'ISO 21434 compliant' },
        ].map((card, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
              {card.label}
            </p>
            <p className="text-white text-3xl font-bold">{card.value}</p>
            <p className="text-gray-600 text-xs mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Projects table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white text-sm font-medium">All projects</h2>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-600">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No projects yet</p>
            <p className="text-gray-600 text-sm mt-1">Create your first TARA project</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['PROJECT', 'VEHICLE PROFILE', 'RISK', 'STATUS', 'ROLE', 'LAST UPDATE'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => {
                const vp = p.vehicle_profile || {};
                return (
                  <tr
                    key={p.id}
                    onClick={() => window.location.href = `/projects/${p.id}/editor`}
                    className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {vp.propulsion?.slice(0,2) || 'PR'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{p.name}</p>
                          <p className="text-gray-600 text-xs">{p.description?.slice(0,40) || ''}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {vp.propulsion && <span className="text-gray-400 text-xs">{vp.propulsion}</span>}
                        {vp.architecture && <span className="text-gray-600 text-xs">/ {vp.architecture}</span>}
                        {vp.sae_level !== undefined && <span className="text-gray-600 text-xs">/ SAE {vp.sae_level}</span>}
                        {vp.ota_support && <span className="text-blue-500 text-xs">/ OTA</span>}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${riskBadge(0)}`}>
                        {p.status === 'draft' ? 'DRAFT' : 'N/A'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-medium ${statusColor[p.status] || 'text-gray-400'}`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColor[p.my_role] || 'bg-gray-800 text-gray-400'}`}>
                        {p.my_role}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}