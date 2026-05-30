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
  if (score >= 8) return 'bg-yellow-900 text-yellow-300 border-yellow-800';
  if (score >= 4) return 'bg-blue-900 text-blue-300 border-blue-800';
  return 'bg-gray-800 text-gray-400 border-gray-700';
};

const riskLabel = (score) => {
  if (score >= 16) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 8) return 'MEDIUM';
  if (score >= 4) return 'LOW';
  return 'DRAFT';
};

const statusColor = {
  draft: 'text-gray-400',
  in_analysis: 'text-blue-400',
  completed: 'text-emerald-400',
};

const roleColor = {
  engineer: 'bg-blue-900 text-blue-300',
  manager: 'bg-green-900 text-green-300',
  architect: 'bg-purple-900 text-purple-300',
  auditor: 'bg-yellow-900 text-yellow-300',
};

/* ── Context Menu ─────────────────────────────────────── */
function ProjectContextMenu({ menu, onRename, onDelete, onClose, canManage }) {
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
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-none  overflow-hidden"
      style={{ top: menu.y, left: menu.x, minWidth: 160 }}
    >
      {canManage ? (
        <>
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
        </>
      ) : (
        <p className="px-3 py-2 text-xs text-gray-500">No actions available for your role</p>
      )}
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
    otaCapable: projects.filter(p => p.vehicle_profile?.ota_support).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-white text-3xl font-bold tracking-tight">Fleet Security Overview</h1>
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2.5 py-0.5 rounded uppercase font-bold tracking-wider">System Admin</span>
          </div>
          <p className="text-gray-500 text-sm mt-2">Real-time compliance tracking across all SDV projects in the organization.</p>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Left: Key Stats */}
        <div className="col-span-8 space-y-6">
          {/* Top 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
              <p className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">Total Projects</p>
              <div className="flex items-end gap-3">
                <p className="text-white text-4xl font-black">{stats.total}</p>
                <p className="text-gray-500 text-sm font-medium mb-1">in workspace</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
              <p className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">OTA Capable</p>
              <div className="flex items-end gap-3">
                <p className="text-white text-4xl font-black">{stats.otaCapable}</p>
                <p className="text-gray-500 text-sm font-medium mb-1">vehicles</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
              <p className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">Critical Risks</p>
              <div className="flex items-end gap-3">
                <p className={`${stats.critical > 0 ? 'text-red-400' : 'text-emerald-400'} text-4xl font-black`}>{stats.critical}</p>
                <p className="text-gray-500 text-sm font-medium mb-1">fleet-wide</p>
              </div>
            </div>
          </div>

          {/* Organization Health & Demographics */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-none bg-emerald-500" />
                  Organization Health
                </h2>
                <p className="text-gray-500 text-xs mb-6">Percentage of projects successfully completing security lifecycle.</p>
              </div>
              <div className="flex items-center justify-around flex-1">
                <div className="flex flex-col items-center">
                  <p className="text-4xl font-black text-white mb-2">{Math.round((stats.completed / (stats.total || 1)) * 100)}%</p>
                  <p className="text-emerald-500 text-xs uppercase tracking-wider font-bold">Compliant</p>
                </div>
                <div className="h-16 border-l border-gray-800"></div>
                <div className="flex gap-4">
                  <DonutChart value={stats.completed} total={stats.total} label="Completed" colorClass="text-emerald-500" />
                  <DonutChart value={stats.critical} total={stats.total} label="At Risk" colorClass="text-red-500" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
                <p className="text-gray-500 text-xs uppercase font-bold mb-3 tracking-wider">Vehicle Architectures</p>
                <div className="space-y-4 relative z-10">
                  {['Classic', 'SDV'].map(type => {
                    const count = projects.filter(p => p.vehicle_profile?.architecture === type).length;
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-400 font-medium">{type}</span>
                          <span className="text-white font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-none h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-none" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
                <p className="text-gray-500 text-xs uppercase font-bold mb-3 tracking-wider">Fleet Propulsion</p>
                <div className="space-y-4 relative z-10">
                  {['EV', 'ICE', 'Hybrid'].map(type => {
                    const count = projects.filter(p => p.vehicle_profile?.propulsion === type).length;
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-gray-400 font-medium">{type}</span>
                          <span className="text-white font-bold">{count}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-none h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-none" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Quick Admin Links */}
        <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-none p-6">
          <h2 className="text-white text-sm font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-none bg-orange-500" />
            Management Hub
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Asset Library', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>, href: '/assets', color: 'bg-blue-500/10 text-blue-400' },
              { label: 'Threat Catalog', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>, href: '/threats-catalog', color: 'bg-orange-500/10 text-orange-400' },
              { label: 'Security Controls', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, href: '/controls-library', color: 'bg-emerald-500/10 text-emerald-400' },
              { label: 'User Directory', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5zm0-3a4 4 0 100-8 4 4 0 000 8z" /></svg>, href: '/admin', color: 'bg-purple-500/10 text-purple-400' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="flex items-center gap-4 p-4 rounded-none hover:bg-gray-800 transition-all border border-transparent hover:border-gray-700 group"
              >
                <div className={`w-12 h-12 rounded-none flex items-center justify-center text-xl ${link.color}`}>
                  {link.icon}
                </div>
                <div>
                  <p className="text-white text-sm font-bold group-hover:text-blue-400">{link.label}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Configure global parameters</p>
                </div>
                <svg className="w-5 h-5 ml-auto text-gray-600 group-hover:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  const navigate = useNavigate();

  const totalProjects = projects.length;
  const inProgress = projects.filter(p => p.status !== 'completed').length;
  const completed = totalProjects - inProgress;

  const criticalProjects = projects.filter(p => (p.max_risk_score || 0) >= 16).length;
  const highProjects = projects.filter(p => (p.max_risk_score || 0) >= 12 && (p.max_risk_score || 0) < 16).length;
  const mediumProjects = projects.filter(p => (p.max_risk_score || 0) >= 8 && (p.max_risk_score || 0) < 12).length;
  const lowProjects = projects.filter(p => (p.max_risk_score || 0) > 0 && (p.max_risk_score || 0) < 8).length;

  const evaluatedProjects = projects.filter(p => p.status === 'completed' || (p.max_risk_score !== null && p.max_risk_score > 0));
  const compliantProjects = evaluatedProjects.filter(p => p.status === 'completed' || p.max_risk_score < 12).length;
  const healthScore = evaluatedProjects.length > 0 ? Math.round((compliantProjects / evaluatedProjects.length) * 100) : 'N/A';
  const healthColor = healthScore === 'N/A' ? 'text-gray-500' : healthScore > 80 ? 'text-emerald-400' : healthScore > 50 ? 'text-yellow-400' : 'text-red-400';
  const recentProjects = [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-3xl font-bold tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            You have <span className="text-white font-medium">{projects.length}</span> project{projects.length !== 1 ? 's' : ''} assigned to your workspace.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Left Column: Stats & Risk Landscape */}
        <div className="col-span-8 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
              <p className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">Total Projects</p>
              <div className="flex items-end gap-3">
                <p className="text-white text-4xl font-black">{totalProjects}</p>
                <p className="text-gray-500 text-sm font-medium mb-1">in workspace</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
              <p className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">Critical Risks</p>
              <div className="flex items-end gap-3">
                <p className={`${criticalProjects > 0 ? "text-red-400" : "text-emerald-400"} text-4xl font-black`}>
                  {criticalProjects}
                </p>
                <p className="text-gray-500 text-sm font-medium mb-1">needs attention</p>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-none p-6 relative overflow-hidden group">
              <p className="text-gray-500 text-xs uppercase font-bold mb-2 tracking-wider">Fleet Compliance Status</p>
              <div className="flex items-end gap-3">
                <p className={`${healthColor} text-4xl font-black`}>
                  {healthScore}{healthScore !== 'N/A' ? '%' : ''}
                </p>
                <p className="text-gray-500 text-sm font-medium mb-1">compliant</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-none p-5">
            <h2 className="text-white text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-none bg-blue-500" />
              Risk Landscape
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Critical', count: criticalProjects, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
                { label: 'High', count: highProjects, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
                { label: 'Medium', count: mediumProjects, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                { label: 'Low', count: lowProjects, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              ].map(({ label, count, color, bg, border }) => (
                <div key={label} className={`flex flex-col items-center justify-center p-4 rounded-none border ${bg} ${border}`}>
                  <p className={`text-3xl font-black ${color}`}>{count}</p>
                  <p className={`text-[10px] uppercase tracking-wider mt-1.5 font-bold ${color} opacity-80`}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="col-span-4 bg-gray-900 border border-gray-800 rounded-none p-5 flex flex-col">
          <h2 className="text-white text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-none bg-purple-500" />
            Recent Activity
          </h2>
          {recentProjects.length > 0 ? (
            <div className="space-y-3 flex-1">
              {recentProjects.map((p, idx) => {
                return (
                  <div key={p.id} className="relative pl-4 border-l border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-none bg-gray-600 border-2 border-gray-900" />
                    <p className="text-white text-sm font-bold truncate pr-4">{p.name}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Status changed to <span className="text-gray-300 capitalize">{p.status?.replace('_', ' ')}</span>
                    </p>
                    <p className="text-gray-600 text-[10px] mt-1 uppercase font-medium">
                      {new Date(p.updated_at).toLocaleDateString()} at {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <span className="text-gray-700 text-3xl mb-2">📭</span>
              <p className="text-gray-500 text-sm">No recent activity.</p>
            </div>
          )}
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden ">
        <div className="px-6 py-5 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
          <h2 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-none bg-emerald-500" />
            Your Workspace
          </h2>
          <span className="bg-gray-800 text-gray-400 text-xs font-bold px-3 py-1 rounded-none">{projects.length} PROJECTS</span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <ProjectsTable projects={projects} />
        </div>
      </div>
    </div>
  );
}

/* ── Projects Table (shared) ──────────────────────────── */
function ProjectsTable({ projects, showAllColumns = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
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

    // Determine if the user can manage this project
    const canManage = user?.is_admin || ['admin', 'manager'].includes(project.my_role);
    setContextMenu({ x: e.clientX, y: e.clientY, project, canManage });
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
          <tr className="border-b border-gray-800 text-gray-600 text-xs font-medium uppercase tracking-wider">
            <th className="px-5 py-3 text-left">Project</th>
            <th className="px-5 py-3 text-left">Vehicle Profile</th>
            <th className="px-5 py-3 text-center">Risk</th>
            <th className="px-5 py-3 text-center">Status</th>
            <th className="px-5 py-3 text-center">{showAllColumns ? 'Role' : 'My Role'}</th>
            <th className="px-5 py-3 text-center">Last Update</th>
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
                    {vp.category && <span className="text-gray-300 text-xs font-bold">{vp.category}</span>}
                    {vp.category && (vp.propulsion || vp.architecture) && <span className="text-gray-600 text-xs">/</span>}
                    {vp.propulsion && <span className="text-gray-400 text-xs">{vp.propulsion}</span>}
                    {vp.architecture && <span className="text-gray-600 text-xs">/ {vp.architecture}</span>}
                    {vp.sae_level !== undefined && <span className="text-gray-600 text-xs">/ SAE {vp.sae_level}</span>}
                    {vp.ota_support && <span className="text-blue-500 text-xs">/ OTA</span>}
                  </div>
                </td>

                <td className="px-5 py-3.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${riskBadge(p.max_risk_score || 0)}`}>
                    {p.max_risk_score ? riskLabel(p.max_risk_score) : 'DRAFT'}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-center">
                  <span className={`text-sm font-medium ${statusColor[p.status] || 'text-gray-400'}`}>
                    {p.status?.replace('_', ' ')}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColor[p.my_role] || 'bg-gray-800 text-gray-400'}`}>
                    {p.my_role || '—'}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-center text-gray-500 text-xs">
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
        canManage={contextMenu?.canManage}
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
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
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