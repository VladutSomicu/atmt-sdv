import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

export default function ProjectMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('engineer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    api.get(`/api/projects/${projectId}`)
      .then(res => {
        setProject(res.data.project);
        setMembers(res.data.members || []);
      })
      .catch(() => toast.error('Failed to load project members'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      const res = await api.post(`/api/projects/${projectId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole
      });
      toast.success(res.data.message || 'Member invited successfully');
      setMembers([...members, {
        user_id: res.data.member.user_id,
        email: res.data.member.email,
        full_name: 'Pending invite...',
        role: res.data.member.role,
        joined_at: new Date().toISOString()
      }]);
      setInviteEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const myRole = user?.is_admin ? 'admin' : members.find(m => m.user_id === user?.id)?.role;
  const canManageMembers = ['admin', 'manager'].includes(myRole);

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Loading members...</div>;

  return (
    <AppLayout breadcrumb={[
      { label: 'Projects', href: '/dashboard' },
      { label: project?.name || 'Project', href: `/projects/${projectId}/editor` },
      { label: 'Members' }
    ]}>
      <div className="max-w-4xl mx-auto mt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">Team Members</h1>
            <p className="text-gray-500 text-sm">Manage who has access to {project?.name}</p>
          </div>
          <button onClick={() => navigate(`/projects/${projectId}/editor`)} className="text-gray-400 hover:text-white transition-colors text-sm">
            Back to Editor
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-white text-sm font-medium">Current Members</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase">User</th>
                <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase">Role</th>
                <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium uppercase">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.user_id} className="border-b border-gray-800">
                  <td className="px-5 py-3">
                    <p className="text-white text-sm font-medium">{m.full_name || 'N/A'}</p>
                    <p className="text-gray-500 text-xs">{m.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="bg-gray-800 text-blue-400 text-xs px-2 py-1 rounded font-medium capitalize">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canManageMembers && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-white text-sm font-medium mb-1">Invite New Member</h2>
            <p className="text-gray-500 text-xs mb-4">Add a new user to this project. They will receive access immediately.</p>
            
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                required
                placeholder="User's email address"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-40 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="engineer">Engineer</option>
                <option value="architect">Architect</option>
                <option value="manager">Manager</option>
                <option value="auditor">Auditor</option>
              </select>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {inviting ? 'Inviting...' : 'Invite Member'}
              </button>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
