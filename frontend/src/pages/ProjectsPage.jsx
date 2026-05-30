import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/shared/Modal';

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
  completed:   'text-emerald-400',
};

const roleColor = {
  engineer:  'bg-blue-900 text-blue-300',
  manager:   'bg-green-900 text-green-300',
  architect: 'bg-purple-900 text-purple-300',
  auditor:   'bg-yellow-900 text-yellow-300',
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

/* ── Projects Table (shared) ──────────────────────────── */
function ProjectsTable({ projects, showAllColumns = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contextMenu, setContextMenu] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [projects_, setProjects] = useState(projects);

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

      <ProjectContextMenu
        menu={contextMenu}
        canManage={user?.is_admin || contextMenu?.project?.my_role === 'manager'}
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

export default function ProjectsPage() {
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
    <AppLayout breadcrumb={[{ label: 'Projects' }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Projects</h1>
          <p className="text-gray-500 text-sm">Manage all your TARA projects</p>
        </div>
        {!user?.is_demo && (
          <a
            href="/projects/new"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-none transition-colors"
          >
            + New project
          </a>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Loading projects...</span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white text-sm font-medium">All projects</h2>
            <span className="text-gray-600 text-xs">{projects.length} total</span>
          </div>
          <ProjectsTable projects={projects} showAllColumns={user?.is_admin} />
        </div>
      )}
    </AppLayout>
  );
}
