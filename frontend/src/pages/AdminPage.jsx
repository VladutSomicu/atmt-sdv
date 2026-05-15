import { useState, useEffect } from 'react';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/shared/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { Navigate } from 'react-router-dom';

/* ── Create User Modal ────────────────────────────────── */
function CreateUserModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', is_admin: false });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.full_name || !form.password) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/admin/users', form);
      toast.success(`User ${form.full_name} created`);
      setForm({ email: '', full_name: '', password: '', is_admin: false });
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Create New User"
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={saving ? 'Creating...' : 'Create user'}
    >
      <div className="space-y-3">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Jane Doe"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="jane@company.com"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Min. 8 characters"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_admin}
            onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-600 text-blue-600"
          />
          <span className="text-gray-300 text-sm">Grant admin privileges</span>
        </label>
      </div>
    </Modal>
  );
}

/* ── Edit User Modal ──────────────────────────────────── */
function EditUserModal({ isOpen, onClose, onUpdated, user }) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', is_admin: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ email: user.email || '', full_name: user.full_name || '', password: '', is_admin: user.is_admin || false });
    }
  }, [user]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password; // Don't send empty password if not changing
      await api.put(`/api/admin/users/${user.id}`, payload);
      toast.success(`User ${form.full_name} updated`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      title="Edit User"
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={saving ? 'Saving...' : 'Save changes'}
    >
      <div className="space-y-3">
        <div>
          <label className="text-gray-400 text-xs block mb-1">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">New Password (leave blank to keep current)</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_admin}
            onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-600 text-blue-600"
          />
          <span className="text-gray-300 text-sm">Grant admin privileges</span>
        </label>
      </div>
    </Modal>
  );
}

/* ── Main AdminPage ───────────────────────────────────── */
export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  // Guard: only admin can access this page
  if (!currentUser?.is_admin) return <Navigate to="/dashboard" replace />;

  const loadUsers = () => {
    api.get('/api/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleActive = async (u) => {
    try {
      await api.put(`/api/admin/users/${u.id}`, { is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    } finally {
      setDeactivateTarget(null);
    }
  };

  const deleteUser = async (u) => {
    try {
      await api.delete(`/api/admin/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(`User ${u.full_name} deleted`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleAdmin = async (u) => {
    try {
      await api.put(`/api/admin/users/${u.id}`, { is_admin: !u.is_admin });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_admin: !u.is_admin } : x));
      toast.success(`Admin privileges ${u.is_admin ? 'removed' : 'granted'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.is_admin).length,
    demo: users.filter(u => u.is_demo).length,
  };

  return (
    <AppLayout breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'User Management' }]}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-white text-2xl font-bold">User Management</h1>
            <span className="bg-purple-900/50 border border-purple-700 text-purple-300 text-xs px-2 py-0.5 rounded font-medium">ADMIN</span>
          </div>
          <p className="text-gray-500 text-sm">{stats.total} users registered in the workspace</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add user
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-green-400' },
          { label: 'Admins', value: stats.admins, color: 'text-purple-400' },
          { label: 'Demo accounts', value: stats.demo, color: 'text-yellow-400' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-xs bg-gray-900 border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white text-sm font-medium">All users</h2>
          <span className="text-gray-600 text-xs">{filtered.length} shown</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 text-sm">Loading users...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['USER', 'EMAIL', 'ROLE', 'STATUS', 'JOINED', 'ACTIONS'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{u.full_name}</p>
                        {u.is_demo && <span className="text-yellow-500 text-xs">Demo account</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-sm">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${u.is_admin ? 'bg-purple-900 text-purple-300' : 'bg-gray-800 text-gray-400'}`}>
                        {u.is_admin ? 'Admin' : 'User'}
                      </span>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => toggleAdmin(u)}
                          className="text-gray-600 hover:text-gray-300 text-xs transition-colors"
                          title={u.is_admin ? 'Remove admin' : 'Grant admin'}
                        >
                          {u.is_admin ? '↓' : '↑'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    {u.id !== currentUser?.id ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditTarget(u)}
                          className="text-gray-400 hover:text-white text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => u.is_active ? setDeactivateTarget(u) : toggleActive(u)}
                          className={`text-xs font-medium transition-colors ${u.is_active ? 'text-yellow-500 hover:text-yellow-400' : 'text-green-400 hover:text-green-300'}`}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-red-500 hover:text-red-400 text-xs font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-700 text-xs">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create user modal */}
      <CreateUserModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadUsers}
      />

      {/* Edit user modal */}
      <EditUserModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onUpdated={loadUsers}
        user={editTarget}
      />

      {/* Deactivate confirmation */}
      <Modal
        isOpen={!!deactivateTarget}
        title="Deactivate User"
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => toggleActive(deactivateTarget)}
        confirmText="Deactivate"
        confirmDanger={true}
      >
        <p className="text-gray-300 text-sm">
          Deactivate <span className="text-white font-medium">{deactivateTarget?.full_name}</span>?
          They will no longer be able to log in, but their data will be preserved.
        </p>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        title="Permanently Delete User"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteUser(deleteTarget)}
        confirmText="Delete Permanently"
        confirmDanger={true}
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to permanently delete <span className="text-white font-medium">{deleteTarget?.full_name}</span>?
          This action cannot be undone. All project memberships associated with this user will also be removed.
        </p>
      </Modal>
    </AppLayout>
  );
}
