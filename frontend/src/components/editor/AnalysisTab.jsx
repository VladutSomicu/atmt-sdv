import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import ThreatDetailPanel from './ThreatDetailPanel';
import toast from 'react-hot-toast';

export default function AnalysisTab({ projectId, onThreatsLoaded, onSelectAsset }) {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [controls, setControls] = useState([]);

  // Filtering & Sorting
  const [filterStride, setFilterStride] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'risk_score', direction: 'desc' });

  const loadThreats = () => {
    api.get(`/api/threats/${projectId}`)
      .then(res => {
        setThreats(res.data.threats);
        if (onThreatsLoaded) onThreatsLoaded(res.data.threats);
      })
      .catch(() => toast.error('Failed to load threats'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadThreats(); }, [projectId]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.post('/api/analyze', { project_id: projectId });
      loadThreats();
      toast.success('Analysis complete');
    } catch {
      toast.error('Analysis failed — ensure a diagram is saved first');
    } finally {
      setAnalyzing(false);
    }
  };

  const selectThreat = async (threat) => {
    setSelected(threat);
    try {
      const res = await api.get(`/api/threats/detail/${threat.id}`);
      setControls(res.data.available_controls || []);
    } catch {
      toast.error('Failed to load threat details');
    }
  };

  const riskColor = (score) => {
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
    return 'NEGLIGIBLE';
  };

  const strideColor = {
    'Spoofing': 'bg-red-900/50 text-red-300',
    'Tampering': 'bg-orange-900/50 text-orange-300',
    'Repudiation': 'bg-yellow-900/50 text-yellow-300',
    'Information Disclosure': 'bg-blue-900/50 text-blue-300',
    'Denial of Service': 'bg-purple-900/50 text-purple-300',
    'Elevation of Privilege': 'bg-pink-900/50 text-pink-300',
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const filteredAndSortedThreats = useMemo(() => {
    let result = [...threats];
    if (filterStride !== 'All') result = result.filter(t => t.stride_category === filterStride);
    if (filterStatus !== 'All') result = result.filter(t => t.status === filterStatus);
    
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [threats, filterStride, filterStatus, sortConfig]);

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Threats list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">
              {threats.length} threats identified
            </span>
            {threats.length > 0 && (
              <div className="flex gap-2 text-xs">
                <span className="text-red-400">{threats.filter(t => t.risk_score >= 16 && t.status !== 'mitigated').length} critical open</span>
              </div>
            )}
            
            {/* Filters */}
            <div className="flex items-center gap-2 ml-4">
              <select value={filterStride} onChange={e => setFilterStride(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 text-xs">
                <option value="All">All STRIDE</option>
                <option value="Spoofing">Spoofing</option>
                <option value="Tampering">Tampering</option>
                <option value="Repudiation">Repudiation</option>
                <option value="Information Disclosure">Information Disclosure</option>
                <option value="Denial of Service">Denial of Service</option>
                <option value="Elevation of Privilege">Elevation of Privilege</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 text-xs">
                <option value="All">All Status</option>
                <option value="open">Open</option>
                <option value="mitigated">Mitigated</option>
                <option value="accepted">Accepted</option>
              </select>
            </div>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Run analysis'}
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">Loading...</div>
        ) : threats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No threats identified yet</p>
              <p className="text-gray-600 text-sm">Save a diagram and run analysis</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-950">
                <tr className="border-b border-gray-800">
                  {[
                    { label: 'THREAT', key: 'title' },
                    { label: 'STRIDE', key: 'stride_category' },
                    { label: 'SOURCE', key: 'source_ref' },
                    { label: 'ASSET', key: 'asset_id' },
                    { label: 'SFOP', key: 'impact_safety' },
                    { label: 'RISK', key: 'risk_score' },
                    { label: 'STATUS', key: 'status' }
                  ].map(h => (
                    <th 
                      key={h.key} 
                      onClick={() => handleSort(h.key)}
                      className="px-4 py-2 text-left text-xs text-gray-600 font-medium uppercase tracking-wider cursor-pointer hover:text-gray-400 transition-colors"
                    >
                      {h.label} {sortConfig.key === h.key ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedThreats.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => selectThreat(t)}
                    className={`border-b border-gray-800 cursor-pointer transition-colors ${
                      selected?.id === t.id ? 'bg-blue-900/20' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-xs font-medium">{t.title}</p>
                        {onSelectAsset && t.asset_id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onSelectAsset(t.asset_id); }}
                            title="Show on canvas"
                            className="text-gray-600 hover:text-blue-400 transition-colors ml-auto flex-shrink-0"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${strideColor[t.stride_category] || 'bg-gray-800 text-gray-400'}`}>
                        {t.stride_category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.source_ref || t.source || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{t.asset_id}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">
                      {t.impact_safety}-{t.impact_financial}-{t.impact_operational}-{t.impact_privacy}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${riskColor(t.risk_score)}`}>
                        {t.risk_score} {riskLabel(t.risk_score)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${
                        t.status === 'mitigated' ? 'text-green-400' :
                        t.status === 'accepted' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Threat detail panel */}
      {selected && (
        <ThreatDetailPanel
          threat={selected}
          controls={controls}
          projectId={projectId}
          onUpdate={() => { loadThreats(); setSelected(null); }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}