import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/shared/Modal';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SecurityControlsPage() {
  const { user } = useAuth();
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add Control State
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    applies_to_stride: [],
    applies_to_protocols: [],
    feasibility_reduction: 2,
    source_ref: ''
  });

  const loadControls = () => {
    setLoading(true);
    api.get('/api/admin/public/controls')
      .then(res => setControls(res.data.controls || []))
      .catch(() => toast.error('Failed to load security controls'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadControls();
  }, []);

  const handleAddControl = async () => {
    if (!form.title) {
      toast.error('Title is required');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/api/admin/library/controls', form);
      toast.success('Security control added');
      setShowAddModal(false);
      setForm({
        title: '',
        description: '',
        applies_to_stride: [],
        applies_to_protocols: [],
        feasibility_reduction: 2,
        source_ref: ''
      });
      loadControls();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add control');
    } finally {
      setSaving(false);
    }
  };

  const strideCategories = [
    'Spoofing', 'Tampering', 'Repudiation', 
    'Information Disclosure', 'Denial of Service', 'Elevation of Privilege'
  ];

  const toggleStride = (cat) => {
    setForm(prev => ({
      ...prev,
      applies_to_stride: prev.applies_to_stride.includes(cat)
        ? prev.applies_to_stride.filter(c => c !== cat)
        : [...prev.applies_to_stride, cat]
    }));
  };

  const filteredControls = controls.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.source_ref && c.source_ref.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Security Controls Library</h1>
            <p className="text-gray-400 text-sm">
              Standardized mitigations used to reduce the feasibility of identified threats.
            </p>
          </div>
          {user?.is_admin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Control
            </button>
          )}
        </div>

        {/* List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
            <div>
              <h2 className="text-white text-lg font-medium">Mitigations & Countermeasures</h2>
              <p className="text-gray-500 text-xs mt-1">Global countermeasures mapped to ISO 21434 requirements</p>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search controls..."
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
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/3">Control Title</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Applies To (STRIDE)</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Reduction</th>
                    <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredControls.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-500 text-sm">
                        No security controls found.
                      </td>
                    </tr>
                  ) : (
                    filteredControls.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-gray-300 text-sm font-medium">{c.title}</p>
                          {c.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{c.description}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {c.applies_to_stride?.map(s => (
                              <span key={s} className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 text-[10px]">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-emerald-400 text-xs font-bold">-{c.feasibility_reduction} Level(s)</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-blue-400 text-xs font-mono">{c.source_ref || 'Internal'}</span>
                        </td>
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
        isOpen={showAddModal}
        title="Add New Security Control"
        onClose={() => setShowAddModal(false)}
        onConfirm={handleAddControl}
        confirmText={saving ? 'Adding...' : 'Add Control'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Control Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g., Secure Boot with Hardware Trust Anchor"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-20 resize-none"
              placeholder="Explain how this control works and what it prevents..."
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Applies to (STRIDE)</label>
            <div className="grid grid-cols-2 gap-2">
              {strideCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleStride(cat)}
                  className={`text-left px-3 py-1.5 rounded border text-xs transition-colors ${
                    form.applies_to_stride.includes(cat)
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                      : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Feasibility Reduction</label>
              <select
                value={form.feasibility_reduction}
                onChange={(e) => setForm({ ...form, feasibility_reduction: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={1}>-1 Level (Partial)</option>
                <option value={2}>-2 Levels (Strong)</option>
                <option value={3}>-3 Levels (Hardware-based)</option>
                <option value={4}>-4 Levels (Maximum/Total)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Source Reference</label>
              <input
                type="text"
                value={form.source_ref}
                onChange={(e) => setForm({ ...form, source_ref: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g., ISO 21434 Annex C"
              />
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
