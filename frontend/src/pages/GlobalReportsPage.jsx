import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function GlobalReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPropulsion, setFilterPropulsion] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/reports/global')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load global reports');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppLayout breadcrumb={[{ label: 'Global Reports' }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    );
  }

  const summary = data?.summary || {
    total_projects: 0,
    total_threats: 0,
    mitigated_threats: 0,
    open_threats: 0,
    threat_severity: { critical: 0, high: 0, medium: 0, low: 0 },
    avg_compliance: 'N/A'
  };

  const filteredProjects = (data?.projects || []).filter(p => {
    const matchesPropulsion = filterPropulsion === 'All' || p.propulsion === filterPropulsion;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPropulsion && matchesSearch;
  });

  // Calculate mitigation rate
  const mitigationRate = summary.total_threats > 0
    ? Math.round((summary.mitigated_threats / summary.total_threats) * 100)
    : 0;

  return (
    <AppLayout breadcrumb={[{ label: 'Global Reports' }]}>
      <div className="space-y-6">
        {/* Top Banner / Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Avg Compliance */}
          <div className="bg-gray-900 border border-gray-800 rounded-none p-5 relative overflow-hidden group hover:border-gray-700 transition-all">

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Fleet Compliance</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold font-mono text-blue-400">
                {summary.avg_compliance === 'N/A' ? 'N/A' : `${summary.avg_compliance}%`}
              </span>
            </div>
            <p className="text-gray-500 text-[11px] mt-1">Average UNECE R155/156 checks passed</p>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: summary.avg_compliance === 'N/A' ? '0%' : `${summary.avg_compliance}%` }} />
            </div>
          </div>

          {/* Active Projects */}
          <div className="bg-gray-900 border border-gray-800 rounded-none p-5 relative overflow-hidden group hover:border-gray-700 transition-all">

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Active Projects</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold font-mono text-emerald-400">{summary.total_projects}</span>
            </div>
            <p className="text-gray-500 text-[11px] mt-1">Total vehicle profiles under threat analysis</p>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full w-full" />
            </div>
          </div>

          {/* Mitigation Rate */}
          <div className="bg-gray-900 border border-gray-800 rounded-none p-5 relative overflow-hidden group hover:border-gray-700 transition-all">

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Mitigation Rate</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold font-mono text-purple-400">{mitigationRate}%</span>
            </div>
            <p className="text-gray-500 text-[11px] mt-1">{summary.mitigated_threats} of {summary.total_threats} threats mitigated</p>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${mitigationRate}%` }} />
            </div>
          </div>

          {/* Open Critical Risks */}
          <div className="bg-gray-900 border border-gray-800 rounded-none p-5 relative overflow-hidden group hover:border-gray-700 transition-all">

            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Open Critical Threats</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold font-mono text-red-500">{summary.threat_severity.critical}</span>
            </div>
            <p className="text-gray-500 text-[11px] mt-1">Immediate mitigation actions required</p>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-red-500 h-full rounded-full" style={{ width: `${summary.total_threats > 0 ? (summary.threat_severity.critical / summary.total_threats) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Filtering and Projects List */}
        <div className="bg-gray-900 border border-gray-800 rounded-none overflow-hidden">
          {/* Header controls */}
          <div className="p-5 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-950/50">
            <div>
              <h2 className="text-base font-semibold text-white">Fleet Security</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time audit monitoring and UNECE R155 compliance readiness tracking.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-44"
              />

              {/* Propulsion Filter */}
              <select
                value={filterPropulsion}
                onChange={(e) => setFilterPropulsion(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Propulsion</option>
                <option value="ICE">ICE</option>
                <option value="EV">EV</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-medium bg-gray-950/20">
                  <th className="p-4">Project Name</th>
                  <th className="p-4 text-center">Propulsion</th>
                  <th className="p-4 text-center">SAE Level</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Open Critical</th>
                  <th className="p-4 text-center">Total Threats</th>
                  <th className="p-4 text-center">Compliance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-4 font-medium text-white">{p.name}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800">
                        {p.propulsion}
                      </span>
                    </td>
                    <td className="p-4 text-center text-gray-300">{p.sae_level}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${p.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        p.status === 'in_analysis' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                          'bg-gray-900 text-gray-400 border border-gray-700'
                        }`}>
                        {p.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-mono font-bold ${p.open_critical > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {p.open_critical}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-gray-300">{p.total_threats}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {p.compliance_score === 'N/A' ? (
                          <span className="font-mono font-medium text-gray-500">N/A</span>
                        ) : (
                          <>
                            <div className="w-12 bg-gray-800 h-1.5 rounded-none overflow-hidden">
                              <div
                                className={`h-full rounded-none ${p.compliance_score >= 80 ? 'bg-emerald-500' : p.compliance_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${p.compliance_score}%` }}
                              />
                            </div>
                            <span className="font-mono font-medium text-gray-300">{p.compliance_score}%</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/projects/${p.id}/editor`)}
                        className="px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        Open Project
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      No projects found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
