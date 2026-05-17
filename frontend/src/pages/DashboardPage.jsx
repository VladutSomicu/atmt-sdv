import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../store/AuthContext';
import Modal from '../components/shared/Modal';
import toast from 'react-hot-toast';

/* ── Helpers ─────────────────────────────────────────── */
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

/* ── Context Menu ─────────────────────────────────────── */
function ProjectContextMenu({ menu, onRename, onDelete, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!menu) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
      style={{ top: menu.y, left: menu.x, minWidth: 160 }}
    >
      <button
        onClick={onRename}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Rename
      </button>
      <div className="border-t border-gray-800" />
      <button
        onClick={onDelete}
        className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete project
      </button>
    </div>
  );
}

/* ── Analytics Components ────────────────────────────── */
function DonutChart({ value, total, label, colorClass }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-800" />
          <circle 
            cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" 
            className={colorClass}
            strokeDasharray={213.6}
            strokeDashoffset={213.6 - (213.6 * percentage) / 100}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-sm font-bold text-white">{percentage}%</span>
      </div>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">{label}</p>
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div 
            className={`w-full rounded-t-sm transition-all duration-500 ${d.color}`} 
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Admin Dashboard ──────────────────────────────────── */
function AdminDashboard({ projects }) {
  const navigate = useNavigate();

  const stats = {
    total: projects.length,
    critical: projects.filter(p => (p.max_risk_score || 0) >= 16).length,
    inAnalysis: projects.filter(p => p.status === 'in_analysis').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  const riskData = [
    { label: 'Low', value: projects.filter(p => (p.max_risk_score || 0) < 8 && p.max_risk_score > 0).length, color: 'bg-blue-500/40' },
    { label: 'Med', value: projects.filter(p => (p.max_risk_score || 0) >= 8 && (p.max_risk_score || 0) < 12).length, color: 'bg-yellow-500/40' },
    { label: 'High', value: projects.filter(p => (p.max_risk_score || 0) >= 12 && (p.max_risk_score || 0) < 16).length, color: 'bg-orange-500/40' },
    { label: 'Crit', value: stats.critical, color: 'bg-red-500/40' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-white text-2xl font-bold">Fleet Security Overview</h1>
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">System Admin</span>
          </div>
          <p className="text-gray-500 text-sm italic">Real-time ISO 21434 compliance tracking across all SDV projects.</p>
        </div>
        <div className="flex gap-2">
          <a href="/reports" className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors border border-gray-700">
            Global Report
          </a>
          <a href="/projects/new" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-600/20">
            + New Project
          </a>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Key Stats */}
        <div className="col-span-8 grid grid-cols-3 gap-4">
          <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-1">Organization Health</p>
                <p className="text-white text-3xl font-bold">{Math.round((stats.completed / (stats.total || 1)) * 100)}% <span className="text-gray-600 text-sm font-normal">Compliant</span></p>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Active TARA</p>
                  <p className="text-white text-lg font-bold">{stats.inAnalysis}</p>
                </div>
                <div className="border-l border-gray-800 h-8 mt-1" />
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Total Assets</p>
                  <p className="text-white text-lg font-bold">128</p>
                </div>
                <div className="border-l border-gray-800 h-8 mt-1" />
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Vulnerabilities</p>
                  <p className="text-red-400 text-lg font-bold">42</p>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <DonutChart value={stats.completed} total={stats.total} label="Completed" colorClass="text-emerald-500" />
              <DonutChart value={stats.critical} total={stats.total} label="At Risk" colorClass="text-red-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-gray-500 text-[10px] uppercase font-bold mb-4">Risk Distribution</p>
            <MiniBarChart data={riskData} />
            <div className="flex justify-between text-[8px] text-gray-600 mt-2 uppercase font-bold">
              <span>Low</span>
              <span>Med</span>
              <span>High</span>
              <span>Crit</span>
            </div>
          </div>

          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
            <p className="text-gray-500 text-[10px] uppercase font-bold mb-1">System Load</p>
            <p className="text-white text-2xl font-bold">84%</p>
            <p className="text-gray-600 text-[10px] mt-1">API Throughput: 1.2k req/min</p>
            <div className="mt-4 flex gap-1">
              {[40, 60, 45, 90, 85, 70, 84].map((v, i) => (
                <div key={i} className="flex-1 bg-blue-500/20 h-8 rounded-sm relative group/bar">
                  <div className="absolute bottom-0 left-0 w-full bg-blue-500/40 rounded-sm transition-all" style={{ height: `${v}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Admin Links */}
        <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Management Hub</p>
          <div className="space-y-3">
            {[
              { label: 'Asset Library', icon: '📦', href: '/assets', color: 'bg-blue-500/10 text-blue-400' },
              { label: 'Threat Catalog', icon: '⚡', href: '/threats-catalog', color: 'bg-orange-500/10 text-orange-400' },
              { label: 'Security Controls', icon: '🛡️', href: '/controls-library', color: 'bg-emerald-500/10 text-emerald-400' },
              { label: 'User Directory', icon: '👥', href: '/admin', color: 'bg-purple-500/10 text-purple-400' },
            ].map((link) => (
              <a 
                key={link.label}
                href={link.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700 group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${link.color}`}>
                  {link.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-blue-400">{link.label}</p>
                  <p className="text-gray-600 text-[10px]">Configure global parameters</p>
                </div>
                <svg className="w-4 h-4 ml-auto text-gray-700 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── User Dashboard ───────────────────────────────────── */
function UserDashboard({ projects, user }) {
  const criticalCount = projects.reduce((acc, p) => acc + (p.max_risk_score >= 16 ? 1 : 0), 0);
  const inProgress = projects.filter(p => p.status !== 'completed').length;
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            You have <span className="text-white font-medium">{projects.length}</span> project{projects.length !== 1 ? 's' : ''} assigned to your workspace.
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/projects/new" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-600/20">
            + Create New Project
          </a>
        </div>
      </div>

      {/* Real Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Active Projects</p>
          <p className="text-white text-3xl font-bold">{inProgress}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Critical Risks</p>
          <p className={criticalCount > 0 ? "text-red-400 text-3xl font-bold" : "text-emerald-400 text-3xl font-bold"}>
            {criticalCount}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Completed TARA</p>
          <p className="text-white text-3xl font-bold">{projects.length - inProgress}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Compliance Status</p>
          <p className="text-blue-400 text-xl font-bold mt-1 tracking-tight">ISO 21434 / R155</p>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
          <h2 className="text-white text-sm font-bold uppercase tracking-wider">Your Project Workspace</h2>
          <span className="text-gray-500 text-[10px] font-medium">{projects.length} items</span>
        </div>
        <ProjectsTable projects={projects} />
      </div>
    </div>
  );
}

/* ── Projects Table (shared) ──────────────────────────── */
function ProjectsTable({ projects, showAllColumns = false }) {
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [projects_, setProjects] = useState(projects);

  // Keep in sync with parent
  useEffect(() => setProjects(projects), [projects]);

  const handleContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, project });
  };

  const handleRename = async () => {
    if (!newName.trim() || !renameTarget) return;
    try {
      await api.put(`/api/projects/${renameTarget.id}`, { name: newName.trim() });
      setProjects(prev => prev.map(p => p.id === renameTarget.id ? { ...p, name: newName.trim() } : p));
      toast.success('Project renamed successfully');
    } catch {
      toast.error('Failed to rename project');
    } finally {
      setRenameTarget(null);
      setNewName('');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/projects/${deleteTarget.id}`);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (projects_.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No projects yet</p>
        <p className="text-gray-600 text-sm mt-1">Create your first TARA project</p>
      </div>
    );
  }

  const headers = showAllColumns
    ? ['PROJECT', 'VEHICLE PROFILE', 'RISK', 'STATUS', 'ROLE', 'LAST UPDATE']
    : ['PROJECT', 'VEHICLE PROFILE', 'RISK', 'STATUS', 'MY ROLE', 'LAST UPDATE'];

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            {headers.map(h => (
              <th key={h} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects_.map((p) => {
            const vp = p.vehicle_profile || {};
            return (
              <tr
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}/editor`)}
                onContextMenu={(e) => handleContextMenu(e, p)}
                className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {vp.propulsion?.slice(0, 2) || 'PR'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-gray-600 text-xs">{p.description?.slice(0, 40) || ''}</p>
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
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${riskBadge(p.max_risk_score || 0)}`}>
                    {p.max_risk_score ? riskLabel(p.max_risk_score) : 'DRAFT'}
                  </span>
                </td>

                <td className="px-5 py-3.5">
                  <span className={`text-sm font-medium ${statusColor[p.status] || 'text-gray-400'}`}>
                    {p.status?.replace('_', ' ')}
                  </span>
                </td>

                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColor[p.my_role] || 'bg-gray-800 text-gray-400'}`}>
                    {p.my_role || '—'}
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

      {/* Context Menu */}
      <ProjectContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRename={() => {
          setRenameTarget(contextMenu.project);
          setNewName(contextMenu.project.name);
          setContextMenu(null);
        }}
        onDelete={() => {
          setDeleteTarget(contextMenu.project);
          setContextMenu(null);
        }}
      />

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameTarget}
        title="Rename Project"
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRename}
        confirmText="Rename"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="Project name..."
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        title="Delete Project"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmText="Delete"
        confirmDanger={true}
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to permanently delete <span className="text-white font-medium">{deleteTarget?.name}</span>?
          This will remove all diagrams, threats, and compliance data. This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}

/* ── Main export ──────────────────────────────────────── */
export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/api/projects')
      .then(res => setProjects(res.data.projects))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout breadcrumb={[{ label: user?.is_admin ? 'Admin Dashboard' : 'Dashboard' }]}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Loading workspace...</span>
          </div>
        </div>
      ) : user?.is_admin ? (
        <AdminDashboard projects={projects} />
      ) : (
        <UserDashboard projects={projects} user={user} />
      )}
    </AppLayout>
  );
}