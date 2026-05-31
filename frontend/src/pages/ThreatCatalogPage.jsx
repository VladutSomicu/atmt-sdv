import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/shared/Modal';
import { useAuth } from '../store/AuthContext';
import useSortableData from '../hooks/useSortableData';
import SortableHeader from '../components/shared/SortableHeader';
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

const threatSources = [
  {
    source: 'UNECE R155 – Annex 5',
    type: 'Legal Regulation',
    relevantContent: '>31 threat categories (7 vehicle, 24 backend).',
    usage: 'Main citation source. Direct citation in reports.'
  },
  {
    source: 'MITRE CAPEC',
    type: 'Attack Dictionary',
    relevantContent: 'CAPEC-596, CAPEC-167 (Bus Sniffing), CAPEC-158.',
    usage: 'Automatic Protocol Mapping based on flow type.'
  },
  {
    source: 'OWASP ASVS',
    type: 'Web/Cloud Standard',
    relevantContent: 'Checks for Cloud Backend and Mobile App.',
    usage: 'Activated for assets with is_cloud / mobile flags.'
  },
  {
    source: 'OWASP IoT Top 10',
    type: 'IoT Standard',
    relevantContent: 'Vulnerabilities for connected sensors and TCUs.',
    usage: 'Activated for assets with Wireless interface.'
  },
  {
    source: 'LINDDUN',
    type: 'Privacy threats',
    relevantContent: 'Unlinkability, Detectability, Non-repudiation.',
    usage: 'Activated when Data Type = PII or V2X present.'
  },
  {
    source: 'MITRE ATT&CK ICS',
    type: 'ICS Attack Techniques',
    relevantContent: 'Lateral Movement, Inhibit Response Function.',
    usage: 'Reference for Attack Path Visualization.'
  },
  {
    source: 'UNECE R156',
    type: 'Legal Regulation',
    relevantContent: 'Software Update Management System (SUMS).',
    usage: 'Checks OTA mechanisms and update threats.'
  },
  {
    source: 'ISO/SAE 21434',
    type: 'Industry Standard',
    relevantContent: 'Cybersecurity engineering for road vehicles.',
    usage: 'Framework for component-level TARA.'
  }
];

export default function ThreatCatalogPage() {
  const { user } = useAuth();
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { items: sortedThreats, requestSort, sortConfig } = useSortableData(threats);

  // Add/Edit Threat State
  const [showThreatModal, setShowThreatModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    stride_category: 'Spoofing',
    title: '',
    description: '',
    source: 'MITRE CAPEC',
    source_ref: '',
    default_impact_safety: 3,
    default_impact_financial: 3,
    default_impact_operational: 3,
    default_impact_privacy: 3,
    default_feasibility: 3
  });

  const loadThreats = () => {
    setLoading(true);
    api.get('/api/admin/public/threats')
      .then(res => setThreats(res.data.threats || []))
      .catch(() => toast.error('Failed to load threats'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadThreats();
  }, []);

  const handleSaveThreat = async () => {
    if (!form.title || !form.description) {
      toast.error('Title and description are required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/admin/library/threats/${editingId}`, form);
        toast.success('Threat updated successfully');
      } else {
        await api.post('/api/admin/library/threats', form);
        toast.success('Threat added to catalog');
      }
      setShowThreatModal(false);
      setEditingId(null);
      setForm({
        stride_category: 'Spoofing',
        title: '',
        description: '',
        source: 'MITRE CAPEC',
        source_ref: '',
        default_impact_safety: 3,
        default_impact_financial: 3,
        default_impact_operational: 3,
        default_impact_privacy: 3,
        default_feasibility: 3
      });
      loadThreats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save threat');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (threat) => {
    setForm({
      stride_category: threat.stride_category,
      title: threat.title,
      description: threat.description || '',
      source: threat.source || 'MITRE CAPEC',
      source_ref: threat.source_ref || '',
      default_impact_safety: threat.default_impact_safety || 3,
      default_impact_financial: threat.default_impact_financial || 3,
      default_impact_operational: threat.default_impact_operational || 3,
      default_impact_privacy: threat.default_impact_privacy || 3,
      default_feasibility: threat.default_feasibility || 3
    });
    setEditingId(threat.id);
    setShowThreatModal(true);
  };

  const handleDelete = async (threat) => {
    if (!window.confirm(`Are you sure you want to delete ${threat.title}?`)) return;
    try {
      await api.delete(`/api/admin/library/threats/${threat.id}`);
      toast.success('Threat deleted successfully');
      loadThreats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete threat');
    }
  };

  const filteredThreats = sortedThreats.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.stride_category.toLowerCase().includes(search.toLowerCase()) ||
    (t.source_ref && t.source_ref.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppLayout breadcrumb={[{ label: 'Threat Catalog' }]}>
      <div className="max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Global Threat Catalog</h1>
            <p className="text-gray-400 text-sm">
              The platform integrates a hybrid security model (STRIDE, LINDDUN) with automatic mapping to automotive regulations and industry standards.
            </p>
          </div>
          {user?.is_admin && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm({
                  stride_category: 'Spoofing', title: '', description: '',
                  source: 'MITRE CAPEC', source_ref: '', default_impact_safety: 3,
                  default_impact_financial: 3, default_impact_operational: 3,
                  default_impact_privacy: 3, default_feasibility: 3
                });
                setShowThreatModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-none transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Threat
            </button>
          )}
        </div>

        {/* Sources Map */}
        <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden mb-12">
          <div className="px-5 py-4 border-b border-gray-800 bg-gray-900/50">
            <h2 className="text-white text-lg font-medium">Sources</h2>
            <p className="text-gray-500 text-xs mt-1">How ATMT-SDV leverages external sources to generate the TARA diagnosis</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950">
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/4">Source</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/6">Type</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/4">Relevant Content</th>
                  <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/3">Usage in ATMT-SDV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {threatSources.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-blue-400 font-medium text-sm">{s.source}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-gray-300 text-sm">{s.type}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-gray-400 text-sm">{s.relevantContent}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-emerald-400/90 text-sm">{s.usage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Search */}
        <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
            <div>
              <h2 className="text-white text-lg font-medium">Current Database</h2>
              <p className="text-gray-500 text-xs mt-1">Threats currently available for project mapping</p>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search threats, categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-none px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
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
                    <SortableHeader label="Category" sortKey="stride_category" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    <SortableHeader label="Title / Description" sortKey="title" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase w-1/3" />
                    <SortableHeader label="Source" sortKey="source" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    <SortableHeader label="Safety (S)" sortKey="default_impact_safety" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    <SortableHeader label="Financial (F)" sortKey="default_impact_financial" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    <SortableHeader label="Operational (O)" sortKey="default_impact_operational" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    <SortableHeader label="Privacy (P)" sortKey="default_impact_privacy" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    <SortableHeader label="Feasibility" sortKey="default_feasibility" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-xs text-gray-500 font-medium uppercase" />
                    {user?.is_admin && <th className="px-5 py-3 text-xs text-gray-500 font-medium uppercase text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredThreats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-500 text-sm">
                        No threats found.
                      </td>
                    </tr>
                  ) : (
                    filteredThreats.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded border border-gray-700 bg-gray-800 text-gray-300 text-xs font-medium whitespace-nowrap">
                            {t.stride_category}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-gray-300 text-sm font-medium">{t.title}</p>
                          {t.description && (
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2" title={t.description}>
                              {t.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col">
                            <span className="text-gray-400 text-xs">{t.source}</span>
                            {t.source_ref && (
                              <span className="text-blue-400 text-xs font-mono">{t.source_ref}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(t.default_impact_safety)}`}>{scoreLabel(t.default_impact_safety)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(t.default_impact_financial)}`}>{scoreLabel(t.default_impact_financial)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(t.default_impact_operational)}`}>{scoreLabel(t.default_impact_operational)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(t.default_impact_privacy)}`}>{scoreLabel(t.default_impact_privacy)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${scoreColor(t.default_feasibility)}`}>{scoreLabel(t.default_feasibility)}</span>
                        </td>
                        {user?.is_admin && (
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleEdit(t)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors" title="Edit Threat">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDelete(t)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" title="Delete Threat">
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
        isOpen={showThreatModal}
        title={editingId ? "Edit Reference Threat" : "Add New Threat"}
        onClose={() => setShowThreatModal(false)}
        onConfirm={handleSaveThreat}
        confirmText={saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Add Threat')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">STRIDE Category</label>
              <select
                value={form.stride_category}
                onChange={(e) => setForm({ ...form, stride_category: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Spoofing">Spoofing</option>
                <option value="Tampering">Tampering</option>
                <option value="Repudiation">Repudiation</option>
                <option value="Information Disclosure">Information Disclosure</option>
                <option value="Denial of Service">Denial of Service</option>
                <option value="Elevation of Privilege">Elevation of Privilege</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="MITRE CAPEC">MITRE CAPEC</option>
                <option value="UNECE R155">UNECE R155</option>
                <option value="UNECE R156">UNECE R156</option>
                <option value="ISO/SAE 21434">ISO/SAE 21434</option>
                <option value="OWASP">OWASP</option>
                <option value="LINDDUN">LINDDUN</option>
                <option value="Custom">Custom / Internal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Threat Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g., CAN Bus Message Injection"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-24 resize-none"
              placeholder="Describe the threat pattern and its potential impact..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Source Ref</label>
              <input
                type="text"
                value={form.source_ref}
                onChange={(e) => setForm({ ...form, source_ref: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="e.g., CAPEC-123"
              />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Safety</label>
              <select
                value={form.default_impact_safety}
                onChange={(e) => setForm({ ...form, default_impact_safety: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Financial</label>
              <select
                value={form.default_impact_financial}
                onChange={(e) => setForm({ ...form, default_impact_financial: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Operational</label>
              <select
                value={form.default_impact_operational}
                onChange={(e) => setForm({ ...form, default_impact_operational: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Privacy</label>
              <select
                value={form.default_impact_privacy}
                onChange={(e) => setForm({ ...form, default_impact_privacy: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-2 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Default Feasibility (1-5)</label>
              <select
                value={form.default_feasibility}
                onChange={(e) => setForm({ ...form, default_feasibility: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1 – Negligible</option>
                <option value={2}>2 – Low</option>
                <option value={3}>3 – Medium</option>
                <option value={4}>4 – High</option>
                <option value={5}>5 – Critical</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
