import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ThreatDetailPanel({ threat, controls, onUpdate, onClose, isReadOnly = false }) {
  const [safety, setSafety] = useState(threat.impact_safety);
  const [financial, setFinancial] = useState(threat.impact_financial);
  const [operational, setOperational] = useState(threat.impact_operational);
  const [privacy, setPrivacy] = useState(threat.impact_privacy);
  const [feasibility, setFeasibility] = useState(threat.feasibility);
  const [status, setStatus] = useState(threat.status);
  const [treatment, setTreatment] = useState(threat.treatment || '');
  const [justification, setJustification] = useState(threat.justification || '');
  const [selectedControls, setSelectedControls] = useState(threat.control_ids || []);
  const [saving, setSaving] = useState(false);

  const riskScore = Math.max(safety, financial, operational, privacy) * feasibility;

  const riskColor = (score) => {
    if (score >= 16) return 'text-red-400';
    if (score >= 12) return 'text-orange-400';
    if (score >= 8)  return 'text-yellow-400';
    if (score >= 4)  return 'text-blue-400';
    return 'text-green-400';
  };

  const toggleControl = (id) => {
    if (isReadOnly) return;
    setSelectedControls(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/api/threats/detail/${threat.id}`, {
        impact_safety: safety,
        impact_financial: financial,
        impact_operational: operational,
        impact_privacy: privacy,
        feasibility,
        status,
        treatment: treatment || null,
        justification: justification || null,
        control_ids: selectedControls,
      });
      onUpdate();
      toast.success('Threat updated');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to save threat changes';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <span className="text-white text-sm font-medium">Threat detail</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">x</button>
      </div>

      <div className="px-4 py-3 flex-1">
        {/* Title + risk */}
        <div className="mb-4">
          <p className="text-white text-sm font-medium mb-1">{threat.title}</p>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">{threat.stride_category}</span>
            <span className="text-gray-600 text-xs">|</span>
            <span className="text-gray-500 text-xs">{threat.source_ref || threat.source}</span>
          </div>
          <p className={`text-xl font-bold mt-2 ${riskColor(riskScore)}`}>
            Risk: {riskScore}
          </p>
          {threat.description && (
            <p className="text-gray-500 text-xs mt-2">{threat.description}</p>
          )}
        </div>

        {/* SFOP sliders */}
        <div className="mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">SFOP Impact</p>
          {[
            ['Safety', safety, setSafety],
            ['Financial', financial, setFinancial],
            ['Operational', operational, setOperational],
            ['Privacy', privacy, setPrivacy],
          ].map(([label, val, setter]) => (
            <div key={label} className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{label}</span>
                <span className="text-white font-mono">{val} / 4</span>
              </div>
              <input
                type="range" min="1" max="4" value={val}
                onChange={e => setter(parseInt(e.target.value))}
                disabled={isReadOnly}
                className="w-full accent-blue-500 disabled:opacity-50"
              />
            </div>
          ))}

          <div className="mb-2 mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Feasibility</span>
              <span className="text-white font-mono">{feasibility} / 5</span>
            </div>
            <input
              type="range" min="1" max="5" value={feasibility}
              onChange={e => setFeasibility(parseInt(e.target.value))}
              disabled={isReadOnly}
              className="w-full accent-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Controls */}
        {controls.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Suggested controls</p>
            {controls.map(c => (
              <div
                key={c.id}
                onClick={() => toggleControl(c.id)}
                className={`p-2 rounded-lg border mb-1.5 transition-colors ${
                  isReadOnly ? '' : 'cursor-pointer'
                } ${
                  selectedControls.includes(c.id)
                    ? 'border-green-700 bg-green-900/20'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-medium">{c.title}</p>
                  <span className="text-green-400 text-[10px] ml-1 font-mono">
                    -{c.reduction_value || c.feasibility_reduction} {c.reduction_target || 'Feasibility'}
                  </span>
                </div>
                <p className="text-gray-600 text-xs mt-0.5">{c.source_ref}</p>
              </div>
            ))}
          </div>
        )}

        {/* Treatment */}
        <div className="mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Treatment</p>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {['mitigate', 'accept', 'transfer', 'avoid'].map(t => (
              <button
                key={t}
                onClick={() => !isReadOnly && setTreatment(t)}
                disabled={isReadOnly}
                className={`py-1 rounded text-xs font-medium transition-colors capitalize disabled:opacity-50 ${
                  treatment === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 mb-3">
            {['open', 'mitigated', 'accepted'].map(s => (
              <button
                key={s}
                onClick={() => !isReadOnly && setStatus(s)}
                disabled={isReadOnly}
                className={`py-1 rounded text-xs font-medium transition-colors capitalize disabled:opacity-50 ${
                  status === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Justification (required for Accept)..."
            rows={3}
            disabled={isReadOnly}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
          />
        </div>

        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        )}
      </div>
    </div>
  );
}