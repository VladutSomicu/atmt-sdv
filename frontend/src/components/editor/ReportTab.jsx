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
  const high = threats.filter(t => t.risk_score >= 12 && t.risk_score < 16).length;
  const medium = threats.filter(t => t.risk_score >= 8 && t.risk_score < 12).length;
  const mitigated = threats.filter(t => t.status === 'mitigated').length;

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Left — Report preview */}
      <div className="flex-1 flex flex-col items-center justify-start bg-gray-950 p-8 overflow-y-auto gap-6">

        {/* ⚠️ Critical open threats banner */}
        {isBlocked && (
          <div className="w-full max-w-2xl bg-red-950/40 border border-red-500/30 rounded-none p-5 flex gap-4 items-start shadow-[0_0_30px_rgba(239,68,68,0.1)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 border border-red-500/30">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-red-300 text-base font-semibold mb-1">
                Report blocked — {blockingThreats.length} critical threat{blockingThreats.length !== 1 ? 's' : ''} open
              </p>
              <p className="text-red-400/80 text-xs mb-3 leading-relaxed">
                ISO 21434 mandates that all CRITICAL risks must be mitigated or formally accepted prior to report generation. Please resolve these before proceeding.
              </p>
              <ul className="space-y-1.5 bg-red-950/30 rounded-none p-3 border border-red-900/50">
                {blockingThreats.slice(0, 5).map(t => (
                  <li key={t.id} className="flex items-center gap-3 text-xs text-red-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] flex-shrink-0" />
                    <span className="font-mono truncate">{t.title}</span>
                    <span className="text-red-500 font-bold ml-auto bg-red-500/10 px-2 py-0.5 rounded">
                      score {t.risk_score}
                    </span>
                  </li>
                ))}
                {blockingThreats.length > 5 && (
                  <li className="text-red-500/80 text-xs pl-4 pt-1 font-medium italic">
                    + {blockingThreats.length - 5} more critical threats...
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Report mock-up card (Professional Dark Theme) */}
        <div className="bg-gray-900 border border-gray-800 rounded-none shadow-none w-full max-w-2xl p-8 relative overflow-hidden">
          <div className="flex items-start justify-between mb-6 border-b border-gray-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-gray-800 border border-gray-700 rounded mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">ISO 21434 TARA Report</span>
              </div>
              <h2 className="text-gray-100 text-2xl font-bold tracking-tight">
                {project.name}
              </h2>
              <p className="text-gray-500 text-xs mt-1">Threat Analysis and Risk Assessment</p>
            </div>
          </div>

          {/* Vehicle profile Grid */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              ['Category', vp.category || 'N/A'],
              ['Propulsion', vp.propulsion || 'N/A'],
              ['Architecture', vp.architecture || 'N/A'],
              ['SAE Level', vp.sae_level !== undefined ? `L${vp.sae_level}` : 'N/A'],
              ['OTA Support', vp.ota_support ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-950/50 border border-gray-800/80 rounded-none p-3 flex flex-col items-start justify-center">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">{k}</p>
                <p className="text-gray-200 text-xs font-bold mt-1">{v}</p>
              </div>
            ))}
          </div>

          {/* Risk summary */}
          {threats.length > 0 ? (
            <div className="bg-gray-950/30 rounded-none p-4 border border-gray-800/50">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-3 font-semibold">Risk Landscape Summary</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Critical', count: critical, color: 'text-red-500' },
                  { label: 'High', count: high, color: 'text-orange-500' },
                  { label: 'Medium', count: medium, color: 'text-yellow-500' },
                  { label: 'Mitigated', count: mitigated, color: 'text-emerald-500' },
                ].map(({ label, count, color }) => (
                  <div key={label} className={`flex flex-col items-center justify-center py-3 rounded-none border border-gray-800/50 bg-gray-900/50`}>
                    <p className={`text-xl font-bold ${color}`}>{count}</p>
                    <p className={`text-[10px] uppercase tracking-wider mt-1 font-medium text-gray-500`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-gray-950/30 rounded-none border border-gray-800/50 border-dashed">
              <p className="text-gray-500 text-xs text-center">
                Run an analysis to populate the risk landscape summary.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right — Export panel */}
      <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0 p-5">
        <div className="mb-5 border-b border-gray-800 pb-3">
          <p className="text-gray-400 text-xs uppercase tracking-wider font-bold">Export Engine</p>
        </div>

        {/* Blocked state indicator */}
        {isBlocked ? (
          <div className="bg-red-950/40 border border-red-900/50 rounded-none p-3 mb-4">
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Blocked
            </p>
            <p className="text-red-300/80 text-[11px] leading-relaxed">
              Resolve <strong className="text-red-400">{blockingThreats.length} critical threats</strong> to unlock export functionality.
            </p>
          </div>
        ) : threats.length > 0 ? (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-none p-3 mb-4">
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ready
            </p>
            <p className="text-emerald-300/80 text-[11px] leading-relaxed">
              All compliance checks passed.
            </p>
          </div>
        ) : (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-none p-3 mb-4">
            <p className="text-gray-500 text-[11px] leading-relaxed">
              Run analysis first to validate report readiness.
            </p>
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={generating || isBlocked || threats.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:bg-blue-900 disabled:text-blue-300 disabled:cursor-not-allowed text-white text-xs font-semibold py-2.5 rounded-none transition-colors mb-2 flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Compiling PDF...</span>
            </>
          ) : (
            'Generate PDF'
          )}
        </button>

        <p className="text-gray-500 text-[10px] text-center mb-6">
          Standardized ISO 21434 Format
        </p>

        <div className="mt-auto pt-4 border-t border-gray-800">
          <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 font-semibold">Summary</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className="text-gray-300 capitalize">{project.status?.replace('_', ' ')}</span>
            </div>
            {threats.length > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Total Risks</span>
                <span className="text-gray-300">{threats.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}