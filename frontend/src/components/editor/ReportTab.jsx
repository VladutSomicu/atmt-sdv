import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ReportTab({ projectId, project, threats = [] }) {
  const [generating, setGenerating] = useState(false);

  // Compute blocking threats: critical (score >= 16) and still open
  const blockingThreats = threats.filter(t => t.risk_score >= 16 && t.status === 'open');
  const isBlocked = blockingThreats.length > 0;

  const generateReport = async () => {
    if (isBlocked) return; // Safety guard — button should already be disabled
    setGenerating(true);
    try {
      const res = await api.post(`/api/reports/${projectId}/generate`, {}, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TARA_Report_${project.name.replace(/ /g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report generated successfully');
    } catch (err) {
      let message = 'Failed to generate report';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          message = JSON.parse(text).error || message;
        } catch { /* keep default */ }
      } else {
        message = err.response?.data?.error || message;
      }
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const vp = project.vehicle_profile || {};

  // Risk summary from threats prop
  const critical = threats.filter(t => t.risk_score >= 16).length;
  const high     = threats.filter(t => t.risk_score >= 12 && t.risk_score < 16).length;
  const medium   = threats.filter(t => t.risk_score >= 8  && t.risk_score < 12).length;
  const mitigated = threats.filter(t => t.status === 'mitigated').length;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Left — Report preview */}
      <div className="flex-1 flex flex-col items-center justify-start bg-gray-950 p-8 overflow-y-auto gap-4">

        {/* ⚠️ Critical open threats banner */}
        {isBlocked && (
          <div className="w-full max-w-lg bg-red-950 border border-red-700 rounded-xl p-4 flex gap-3 items-start">
            <span className="text-red-400 text-xl mt-0.5">⚠️</span>
            <div>
              <p className="text-red-300 text-sm font-semibold mb-1">
                Report blocked — {blockingThreats.length} critical threat{blockingThreats.length !== 1 ? 's' : ''} still open
              </p>
              <p className="text-red-500 text-xs mb-2">
                ISO 21434 requires all CRITICAL risks to be mitigated or formally accepted before a TARA report can be issued.
              </p>
              <ul className="space-y-1">
                {blockingThreats.slice(0, 5).map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-xs text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="font-mono">{t.title}</span>
                    <span className="text-red-600 ml-auto">score {t.risk_score}</span>
                  </li>
                ))}
                {blockingThreats.length > 5 && (
                  <li className="text-red-600 text-xs">+ {blockingThreats.length - 5} more...</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Report mock-up card */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">TARA Report — ISO 21434</p>
              <h2 className="text-gray-900 text-2xl font-bold mt-1">{project.name}</h2>
              <p className="text-gray-500 text-sm">Threat Analysis and Risk Assessment</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
          </div>

          {/* Vehicle profile */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              ['Propulsion',   vp.propulsion   || 'N/A'],
              ['Architecture', vp.architecture || 'N/A'],
              ['SAE Level',    vp.sae_level !== undefined ? `L${vp.sae_level}` : 'N/A'],
              ['OTA Support',  vp.ota_support ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">{k}</p>
                <p className="text-gray-900 text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>

          {/* Risk summary (populated from threats prop) */}
          {threats.length > 0 ? (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Risk Summary</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Critical', count: critical, color: 'text-red-600' },
                  { label: 'High',     count: high,     color: 'text-orange-500' },
                  { label: 'Medium',   count: medium,   color: 'text-yellow-600' },
                  { label: 'Mitigated',count: mitigated,color: 'text-green-600' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{count}</p>
                    <p className="text-gray-400 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-xs text-center border-t border-gray-100 pt-4">
              Run analysis to populate risk summary.
            </p>
          )}
        </div>
      </div>

      {/* Right — Export panel */}
      <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0 p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-4">Export</p>

        {/* Blocked state indicator */}
        {isBlocked ? (
          <div className="bg-red-950 border border-red-800 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-xs font-medium mb-1">🔒 Blocked</p>
            <p className="text-red-500 text-xs">
              Resolve {blockingThreats.length} critical threat{blockingThreats.length !== 1 ? 's' : ''} to unlock export.
            </p>
          </div>
        ) : threats.length > 0 ? (
          <div className="bg-green-950 border border-green-800 rounded-lg p-3 mb-4">
            <p className="text-green-300 text-xs font-medium">✅ Ready to export</p>
            <p className="text-green-600 text-xs mt-0.5">No blocking risks detected.</p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
            <p className="text-gray-400 text-xs">Run analysis first to validate report readiness.</p>
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={generating || isBlocked || threats.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors mb-3"
        >
          {generating ? 'Generating...' : 'Generate PDF'}
        </button>

        <p className="text-gray-600 text-xs">
          Per ISO 21434, all CRITICAL risks must be mitigated or formally accepted before report generation.
        </p>

        <div className="mt-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Project status</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className="text-white capitalize">{project.status?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Standards</span>
              <span className="text-white">R155 / R156</span>
            </div>
            {threats.length > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total threats</span>
                <span className="text-white">{threats.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}