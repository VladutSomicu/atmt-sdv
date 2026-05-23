import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/shared/Modal';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const scoreLabel = (n) => {
  if (n === 1) return '1 – Negligible';
  if (n === 2) return '2 – Low';
  if (n === 3) return '3 – Medium';
  if (n === 4) return '4 – High';
  if (n === 5) return '5 – Critical';
  return n ?? '—';
};

const scoreColor = (n) => {
  if (n >= 5) return 'text-red-400';
  if (n >= 4) return 'text-orange-400';
  if (n >= 3) return 'text-yellow-400';
  if (n >= 2) return 'text-blue-400';
  return 'text-gray-400';
};

export default function AssetLibraryPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add/Edit Asset State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Connectivity',
    interface_types: [],
    data_types: [],
    physical_accessibility: 'Internal',
    asil_level: 'None',
    default_safety: 3,
    default_financial: 3,
    default_operational: 3,
    default_privacy: 3,
    flags: [],
    vehicle_types: ['ICE', 'EV']
  });

  const loadAssets = () => {
    setLoading(true);
    api.get('/api/admin/public/assets')
      .then(res => setAssets(res.data.assets || []))
      .catch(() => toast.error('Failed to load asset library'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleSaveAsset = async () => {
    if (!form.name || !form.category) {
      toast.error('Name and category are required');
      return;
    }
    
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/admin/library/assets/${editingId}`, form);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/api/admin/library/assets', form);
        toast.success('Asset added to library');
      }
      setShowAssetModal(false);
      setEditingId(null);
      setForm({
        name: '',
        category: 'Connectivity',
        interface_types: [],
        data_types: [],
        physical_accessibility: 'Internal',
        asil_level: 'None',
        default_safety: 3,
        default_financial: 3,
        default_operational: 3,
        default_privacy: 3,
        flags: [],
        vehicle_types: ['ICE', 'EV']
      });
      loadAssets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (asset) => {
    setForm({
      name: asset.name,
      category: asset.category,
      interface_types: asset.interface_types || [],
      data_types: asset.data_types || [],
      physical_accessibility: asset.physical_accessibility || 'Internal',
      asil_level: asset.asil_level || 'None',
      default_safety: asset.default_safety || 3,
      default_financial: asset.default_financial || 3,
      default_operational: asset.default_operational || 3,
      default_privacy: asset.default_privacy || 3,
      flags: asset.flags || [],
      vehicle_types: asset.vehicle_types || ['ICE', 'EV']
    });
    setEditingId(asset.id);
    setShowAssetModal(true);
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Are you sure you want to delete ${asset.name}?`)) return;
    try {
      await api.delete(`/api/admin/library/assets/${asset.id}`);
      toast.success('Asset deleted successfully');
      loadAssets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete asset');
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Asset Library</h1>
            <p className="text-gray-400 text-sm">
              Manage the global library of automotive components and their default security profiles.
            </p>
          </div>
          {user?.is_admin && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: '', category: 'Connectivity', interface_types: [], data_types: [],
                  physical_accessibility: 'Internal', asil_level: 'None', default_safety: 3,
                  default_financial: 3, default_operational: 3, default_privacy: 3, flags: [], vehicle_types: ['ICE', 'EV']
                });
                setShowAssetModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Asset
            </button>
          )}
        </div>

        {/* Database Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
            <div>
              <h2 className="text-white text-lg font-medium">Global Components</h2>
              <p className="text-gray-500 text-xs mt-1">Building blocks available for TARA diagrams</p>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search components..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950">
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Category</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/4">Name</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">ASIL</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Interfaces</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Safety (S)</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Financial (F)</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Operational (O)</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Privacy (P)</th>
                    {user?.is_admin && <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-sm">
                        No components found.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-300 text-xs font-medium">
                            {a.category}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-gray-300 text-sm font-medium">{a.name}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-blue-400 text-xs font-bold">{a.asil_level || '-'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {a.interface_types?.map(t => (
                              <span key={t} className="text-gray-500 text-xs bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(a.default_safety)}`}>{scoreLabel(a.default_safety)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(a.default_financial)}`}>{scoreLabel(a.default_financial)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(a.default_operational)}`}>{scoreLabel(a.default_operational)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(a.default_privacy)}`}>{scoreLabel(a.default_privacy)}</span>
                        </td>
                        {user?.is_admin && (
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEdit(a)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors" title="Edit Asset">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(a)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" title="Delete Asset">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAssetModal}
        title={editingId ? "Edit Reference Asset" : "Add New Reference Asset"}
        onClose={() => setShowAssetModal(false)}
        onConfirm={handleSaveAsset}
        confirmText={saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Asset')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Asset Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g., Telematics Control Unit"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Connectivity">Connectivity</option>
                <option value="Infotainment">Infotainment</option>
                <option value="Powertrain">Powertrain</option>
                <option value="Perception">Perception</option>
                <option value="Safety-Critical">Safety-Critical</option>
                <option value="Diagnostic">Diagnostic</option>
                <option value="Cloud">Cloud</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">ASIL Level</label>
              <select
                value={form.asil_level}
                onChange={(e) => setForm({ ...form, asil_level: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="None">None</option>
                <option value="A">ASIL A</option>
                <option value="B">ASIL B</option>
                <option value="C">ASIL C</option>
                <option value="D">ASIL D</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Physical Accessibility</label>
              <select
                value={form.physical_accessibility}
                onChange={(e) => setForm({ ...form, physical_accessibility: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Internal">Internal (Locked)</option>
                <option value="External">External Facing</option>
                <option value="OBD-II">OBD-II / Diagnostic Port</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Safety</label>
              <select
                value={form.default_safety}
                onChange={(e) => setForm({ ...form, default_safety: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Financial</label>
              <select
                value={form.default_financial}
                onChange={(e) => setForm({ ...form, default_financial: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Operational</label>
              <select
                value={form.default_operational}
                onChange={(e) => setForm({ ...form, default_operational: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Privacy</label>
              <select
                value={form.default_privacy}
                onChange={(e) => setForm({ ...form, default_privacy: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          
          <p className="text-gray-500 text-[10px] italic">
            * Interfaces and data types can be refined in the editor after placement.
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}
