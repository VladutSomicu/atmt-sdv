import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../shared/Modal';
import UserSelect from '../shared/UserSelect';

export default function ProjectMembersTab({ projectId, user }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('engineer');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [userToRemove, setUserToRemove] = useState(null);

  useEffect(() => {
    api.get(`/api/projects/${projectId}`)
      .then(res => {
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
        full_name: res.data.member.full_name,
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

  const confirmRemove = async () => {
    if (!userToRemove) return;
    const userId = userToRemove.user_id;
    setRemovingId(userId);
    try {
      await api.delete(`/api/projects/${projectId}/members/${userId}`);
      toast.success('Member removed successfully');
      setMembers(members.filter(m => m.user_id !== userId));
      setUserToRemove(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-500 h-full">Loading members...</div>;

  return (
    <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 48px)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-xl font-bold">Team Members</h1>
          <p className="text-gray-500 text-sm">Manage who has access to this project</p>
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
                {canManageMembers && <th className="px-5 py-3 text-right text-xs text-gray-500 font-medium uppercase">Actions</th>}
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
                  {canManageMembers && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setUserToRemove(m)}
                        disabled={removingId === m.user_id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs transition-colors"
                      >
                        {removingId === m.user_id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  )}
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
              <UserSelect 
                value={inviteEmail} 
                onChange={setInviteEmail} 
                placeholder="User's email address" 
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

      <Modal
        isOpen={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={confirmRemove}
        title="Remove Member"
        confirmText={removingId ? "Removing..." : "Remove"}
        confirmDanger={true}
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to remove <strong>{userToRemove?.email}</strong> from this project? 
          They will lose access immediately.
        </p>
      </Modal>
    </div>
  );
}
