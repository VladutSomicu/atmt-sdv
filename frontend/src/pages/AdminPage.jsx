import { useState, useEffect } from 'react';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/shared/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../store/AuthContext';
import { Navigate } from 'react-router-dom';
import useSortableData from '../hooks/useSortableData';
import SortableHeader from '../components/shared/SortableHeader';

/* ── Create User Modal ────────────────────────────────── */
function CreateUserModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirmPassword: '', is_admin: false });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.full_name || !form.password) {
      toast.error('All fields are required');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{12,}$/;
    if (!passwordRegex.test(form.password)) {
      toast.error('Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      await api.post('/api/admin/users', payload);
      toast.success(`User ${form.full_name} created`);
      setForm({ email: '', full_name: '', password: '', confirmPassword: '', is_admin: false });
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
            placeholder="John Doe"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="john@company.com"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min. 12 chars, upper, lower, number, symbol"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 focus:outline-none"
              tabIndex="-1"
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Retype password"
              className={`w-full bg-gray-800 border text-white rounded-none px-3 py-2 text-sm focus:outline-none pr-10 ${form.confirmPassword && form.password !== form.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-700 focus:border-blue-500'
                }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 focus:outline-none"
              tabIndex="-1"
            >
              {showConfirmPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
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
function EditUserModal({ isOpen, onClose, onUpdated, user, currentUser }) {
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirmPassword: '', is_admin: false });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ email: user.email || '', full_name: user.full_name || '', password: '', confirmPassword: '', is_admin: user.is_admin || false });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (form.password) {
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{12,}$/;
      if (!passwordRegex.test(form.password)) {
        toast.error('Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
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
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">New Password (leave blank to keep current)</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 focus:outline-none"
              tabIndex="-1"
            >
              {showPassword ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {form.password && (
          <div>
            <label className="text-gray-400 text-xs block mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className={`w-full bg-gray-800 border text-white rounded-none px-3 py-2 text-sm focus:outline-none pr-10 ${form.confirmPassword && form.password !== form.confirmPassword
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-700 focus:border-blue-500'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 focus:outline-none"
                tabIndex="-1"
              >
                {showConfirmPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_admin}
            onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-600 text-blue-600"
            disabled={user?.id === currentUser?.id}
          />
          <span className={`text-sm ${user?.id === currentUser?.id ? 'text-gray-500' : 'text-gray-300'}`}>
            Grant admin privileges {user?.id === currentUser?.id && '(Cannot remove own privileges)'}
          </span>
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
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'audit'

  // Users tab state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  // Audit log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const { items: sortedUsers, requestSort: sortUsers, sortConfig: userSortConfig } = useSortableData(users);
  const { items: sortedAudit, requestSort: sortAudit, sortConfig: auditSortConfig } = useSortableData(auditLogs, { key: 'created_at', direction: 'descending' });

  // Guard: only admin can access this page
  if (!currentUser?.is_admin) return <Navigate to="/dashboard" replace />;

  const loadUsers = () => {
    api.get('/api/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  const loadAuditLog = () => {
    setLoadingAudit(true);
    api.get('/api/admin/audit')
      .then(res => setAuditLogs(res.data.audit_log || []))
      .catch(() => toast.error('Failed to load global audit log'))
      .finally(() => setLoadingAudit(false));
  };

  useEffect(() => { loadUsers(); loadAuditLog(); }, []);

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

  const filtered = sortedUsers.filter(u =>
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
            <h1 className="text-white text-2xl font-bold">Platform Administration</h1>
            <span className="bg-purple-900/50 border border-purple-700 text-purple-300 text-xs px-2 py-0.5 rounded font-medium">ADMIN</span>
          </div>
          <p className="text-gray-500 text-sm">Manage users, view global logs, and configure the platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'users' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'audit' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
        >
          Global Audit Log
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-bold">Users</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-none transition-colors flex items-center gap-2"
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
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-none p-4">
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
              className="w-full max-w-xs bg-gray-900 border border-gray-800 text-gray-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Users table */}
          <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden">
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
                    <SortableHeader label="USER" sortKey="full_name" currentSort={userSortConfig} requestSort={sortUsers} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider" />
                    <SortableHeader label="EMAIL" sortKey="email" currentSort={userSortConfig} requestSort={sortUsers} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider" />
                    <SortableHeader label="ROLE" sortKey="is_admin" currentSort={userSortConfig} requestSort={sortUsers} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider" />
                    <SortableHeader label="STATUS" sortKey="is_active" currentSort={userSortConfig} requestSort={sortUsers} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider" />
                    <SortableHeader label="JOINED" sortKey="created_at" currentSort={userSortConfig} requestSort={sortUsers} className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider" />
                    <th className="px-5 py-3 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">ACTIONS</th>
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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditTarget(u)}
                            className="text-gray-400 hover:text-white text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                          {u.id !== currentUser?.id ? (
                            <>
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
                            </>
                          ) : (
                            <span className="text-gray-700 text-xs ml-2">(You)</span>
                          )}
                        </div>
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

          <EditUserModal
            isOpen={!!editTarget}
            onClose={() => setEditTarget(null)}
            onUpdated={loadUsers}
            user={editTarget}
            currentUser={currentUser}
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
        </>
      )}

      {activeTab === 'audit' && (
        <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-white text-sm font-medium">Global Audit Log</h2>
              <p className="text-gray-500 text-xs mt-0.5">Showing last 500 platform actions</p>
            </div>
            <button onClick={loadAuditLog} className="text-gray-400 hover:text-white transition-colors text-sm">
              Refresh
            </button>
          </div>

          {loadingAudit ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No actions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/50">
                    <SortableHeader label="Timestamp" sortKey="created_at" currentSort={auditSortConfig} requestSort={sortAudit} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-48" />
                    <SortableHeader label="User" sortKey="user" currentSort={auditSortConfig} requestSort={sortAudit} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-40" />
                    <SortableHeader label="Project" sortKey="project_name" currentSort={auditSortConfig} requestSort={sortAudit} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-40" />
                    <SortableHeader label="Action" sortKey="action" currentSort={auditSortConfig} requestSort={sortAudit} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-40" />
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedAudit.map(log => (
                    <tr key={log.id} className="hover:bg-gray-800/30 transition-colors align-top">
                      <td className="px-5 py-4">
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-gray-300 text-sm font-medium">{log.user}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-gray-400 text-xs">{log.project_name || 'Global System'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2.5 py-1 rounded border font-medium whitespace-nowrap text-blue-400 bg-blue-400/10 border-blue-400/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {log.justification && (
                          <div className="mb-2">
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-0.5">Justification</span>
                            <span className="text-gray-300 italic">"{log.justification}"</span>
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-0.5">Payload Data</span>
                            <pre className="text-gray-400 text-xs bg-gray-950 p-2 rounded border border-gray-800 overflow-x-auto max-h-32">
                              {JSON.stringify(log.new_value, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
