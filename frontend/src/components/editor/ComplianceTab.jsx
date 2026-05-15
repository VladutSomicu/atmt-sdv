import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ComplianceTab({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reevaluating, setReevaluating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadCompliance = useCallback(() => {
    setLoading(true);
    api.get(`/api/compliance/${projectId}`)
      .then(res => setData(res.data.compliance))
      .catch(() => toast.error('Failed to load compliance data'))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { loadCompliance(); }, [loadCompliance]);

  const reevaluate = async () => {
    setReevaluating(true);
    try {
      await api.post(`/api/compliance/${projectId}/evaluate`);
      await loadCompliance();
      toast.success('Compliance re-evaluated');
    } catch {
      toast.error('Re-evaluation failed — ensure analysis has been run first');
    } finally {
      setReevaluating(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    setExporting(true);
    try {
      const { checks } = data;
      const headers = ['ID', 'Regulation', 'Title', 'Status', 'Details', 'Reference'];
      const rows = checks.map(c => [
        c.id, c.regulation, `"${c.title}"`, c.status.toUpperCase(),
        `"${(c.details || '').replace(/"/g, "'")}"`, c.reference
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Compliance_${projectId}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading compliance data...</span>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex-1 flex items-center justify-center text-gray-500 p-8 flex-col gap-3">
      <p>No compliance data yet.</p>
      <p className="text-gray-600 text-sm">Run analysis first, then re-evaluate compliance.</p>
      <button
        onClick={reevaluate}
        disabled={reevaluating}
        className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {reevaluating ? 'Evaluating...' : 'Run Compliance Check'}
      </button>
    </div>
  );

  const { checks, summary } = data;
  const pct = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

  const statusBadge = (status) => {
    if (status === 'pass') return 'bg-green-900 text-green-300 border-green-800';
    if (status === 'fail') return 'bg-red-900 text-red-300 border-red-800';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const statusIcon = (status) => {
    if (status === 'pass') return '✓';
    if (status === 'fail') return '✗';
    return '—';
  };

  const grouped = checks.reduce((acc, c) => {
    if (!acc[c.regulation]) acc[c.regulation] = [];
    acc[c.regulation].push(c);
    return acc;
  }, {});

  return (
    <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-sm font-semibold">Compliance Check</h2>
          <p className="text-gray-500 text-xs mt-0.5">ISO 21434 / UNECE R155 / R156</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reevaluate}
            disabled={reevaluating}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${reevaluating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {reevaluating ? 'Evaluating...' : 'Re-evaluate'}
          </button>
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 col-span-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Overall</p>
          <p className={`text-3xl font-bold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {pct}%
          </p>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {[
          { label: 'Passed', value: summary.passed, color: 'text-green-400' },
          { label: 'Failed', value: summary.failed, color: 'text-red-400' },
          { label: 'N/A', value: summary.not_applicable, color: 'text-gray-400' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Checks by regulation */}
      {Object.entries(grouped).map(([regulation, items]) => (
        <div key={regulation} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              {regulation}
              <span className="text-gray-600 text-xs font-normal">
                {items.filter(i => i.status === 'pass').length} / {items.length} pass
              </span>
            </h3>
            {/* Mini progress bar for each regulation */}
            <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-1 bg-green-500 rounded-full"
                style={{ width: `${Math.round((items.filter(i => i.status === 'pass').length / items.length) * 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {items.map(check => (
              <div key={check.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-blue-400 text-xs font-mono">{check.id}</span>
                    <p className="text-white text-sm">{check.title}</p>
                  </div>
                  <p className="text-gray-500 text-xs">{check.details}</p>
                  {check.reference && (
                    <p className="text-gray-700 text-xs mt-0.5">Ref: {check.reference}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border font-mono flex-shrink-0 flex items-center gap-1 ${statusBadge(check.status)}`}>
                  <span>{statusIcon(check.status)}</span>
                  {check.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}