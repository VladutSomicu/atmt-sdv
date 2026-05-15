import { useState } from 'react';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';

const STEPS = [
  { id: 1, label: 'Project', sub: 'Name & objectives' },
  { id: 2, label: 'Vehicle profile', sub: 'Propulsion, architecture, SAE' },
  { id: 3, label: 'Interfaces', sub: 'OTA, OBD, V2X, cellular' },
  { id: 4, label: 'Members', sub: 'Roles per project' },
  { id: 5, label: 'Review', sub: 'Confirm & create' },
];

const OBJECTIVES = [
  { id: 'passenger_safety', label: 'Passenger safety', desc: 'Severe injury must be impossible from a single cybersecurity failure.' },
  { id: 'brake_availability', label: 'Brake system availability', desc: 'Brake-by-wire must remain operational during any signal-injection attack.' },
  { id: 'location_privacy', label: 'Location data confidentiality', desc: 'Vehicle position cannot be inferred by an external observer (LINDDUN).' },
  { id: 'ota_integrity', label: 'OTA update integrity', desc: 'No rollback to vulnerable firmware once a fix has been pushed (R156).' },
  { id: 'data_privacy', label: 'Driver data privacy', desc: 'Personal data must not be accessible without explicit consent (GDPR).' },
  { id: 'operational_continuity', label: 'Operational continuity', desc: 'Vehicle must remain driveable even under active network attack.' },
];

export default function ProjectSetupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedObjectives, setSelectedObjectives] = useState(['passenger_safety', 'brake_availability', 'location_privacy']);

  // Step 2
  const [propulsion, setPropulsion] = useState('');
  const [architecture, setArchitecture] = useState('');
  const [saeLevel, setSaeLevel] = useState(0);

  // Step 3
  const [otaSupport, setOtaSupport] = useState(false);
  const [externalInterfaces, setExternalInterfaces] = useState([]);

  // Step 4
  const [members, setMembers] = useState([{ email: '', role: 'engineer' }]);

  const toggleObjective = (id) => {
    setSelectedObjectives(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const toggleInterface = (iface) => {
    setExternalInterfaces(prev =>
      prev.includes(iface) ? prev.filter(i => i !== iface) : [...prev, iface]
    );
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/projects', {
        name,
        description,
        vehicle_profile: {
          propulsion,
          architecture,
          sae_level: saeLevel,
          ota_support: otaSupport,
          external_interfaces: externalInterfaces,
        },
        business_objectives: selectedObjectives,
      });

      const projectId = res.data.project.id;

      // Invite initial members
      for (const m of members) {
        if (m.email.trim()) {
          try {
            await api.post(`/api/projects/${projectId}/members`, { email: m.email.trim(), role: m.role });
          } catch (e) {
            console.error('Failed to invite', m.email, e);
          }
        }
      }

      window.location.href = `/projects/${projectId}/editor`;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
      setLoading(false);
    }
  };

  return (
    <AppLayout breadcrumb={[
      { label: 'Projects', href: '/dashboard' },
      { label: 'New project' }
    ]}>
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-8">

          {/* Left — Steps */}
          <div className="w-56 flex-shrink-0">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">New Project</p>
            <h2 className="text-white font-bold text-lg mb-6">Create project</h2>
            <p className="text-gray-500 text-xs mb-6">
              ATMT will tailor the asset library and threat catalog to your vehicle profile.
            </p>

            <div className="space-y-1">
              {STEPS.map(s => (
                <div
                  key={s.id}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    step === s.id ? 'bg-blue-600/20 border border-blue-700/50' : 'hover:bg-gray-800'
                  }`}
                  onClick={() => s.id < step && setStep(s.id)}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                    step > s.id ? 'bg-green-600 text-white' :
                    step === s.id ? 'bg-blue-600 text-white' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {step > s.id ? '✓' : s.id}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step === s.id ? 'text-blue-400' : 'text-gray-400'}`}>
                      {s.label}
                    </p>
                    <p className="text-gray-600 text-xs">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Step content */}
          <div className="flex-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-gray-500 text-xs mb-1">STEP {step} / {STEPS.length}</p>

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">Project & business objectives</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Define the operational context. Without it, risk is abstract and cannot be quantified (ISO 21434, Clause 15.3).
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Project name</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="EV-T7 Autonomous"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Description (optional)</label>
                      <input
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Short description"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-3">
                    Business objectives <span className="text-gray-600 normal-case">— at least 1 required</span>
                  </label>
                  <div className="space-y-2">
                    {OBJECTIVES.map(obj => (
                      <div
                        key={obj.id}
                        onClick={() => toggleObjective(obj.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedObjectives.includes(obj.id)
                            ? 'border-blue-700 bg-blue-600/10'
                            : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          selectedObjectives.includes(obj.id) ? 'bg-blue-600' : 'bg-gray-800 border border-gray-600'
                        }`}>
                          {selectedObjectives.includes(obj.id) && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{obj.label}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{obj.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">Vehicle profile</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Defines which assets and threats are relevant for this project.
                  </p>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Propulsion</label>
                      <div className="flex gap-2">
                        {['ICE', 'EV', 'Hybrid'].map(p => (
                          <button
                            key={p}
                            onClick={() => setPropulsion(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              propulsion === p
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Architecture</label>
                      <div className="flex gap-2">
                        {['Classic', 'SDV'].map(a => (
                          <button
                            key={a}
                            onClick={() => setArchitecture(a)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                              architecture === a
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            {a === 'SDV' ? 'SDV / AAOS' : 'Classic'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                        SAE Automation Level — <span className="text-blue-400">Level {saeLevel}</span>
                        {saeLevel >= 3 && <span className="text-yellow-500 ml-2">Safety-Critical: Perception sensors → Severe (4)</span>}
                      </label>
                      <input
                        type="range"
                        min="0" max="5"
                        value={saeLevel}
                        onChange={e => setSaeLevel(parseInt(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between text-gray-600 text-xs mt-1">
                        <span>L0 — No automation</span>
                        <span>L5 — Full automation</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">External interfaces</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Each interface activates specific CAPEC attack patterns and UNECE R155 threat categories.
                  </p>

                  <div className="mb-5">
                    <div
                      onClick={() => setOtaSupport(!otaSupport)}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                        otaSupport ? 'border-blue-700 bg-blue-600/10' : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div>
                        <p className="text-white text-sm font-medium">OTA Software Updates (SUMS)</p>
                        <p className="text-gray-500 text-xs mt-0.5">Activates R156 SUMS requirements and OTA-specific threats.</p>
                      </div>
                      <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${otaSupport ? 'bg-blue-600' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${otaSupport ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </div>

                  <label className="block text-gray-400 text-xs uppercase tracking-wider mb-3">External interfaces</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['OBD-II', 'V2X', 'Cloud', 'USB', 'Bluetooth', 'Wi-Fi', 'Cellular'].map(iface => (
                      <div
                        key={iface}
                        onClick={() => toggleInterface(iface)}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          externalInterfaces.includes(iface)
                            ? 'border-blue-700 bg-blue-600/10'
                            : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${
                          externalInterfaces.includes(iface) ? 'bg-blue-600' : 'bg-gray-800 border border-gray-600'
                        }`}>
                          {externalInterfaces.includes(iface) && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-white text-sm">{iface}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── STEP 4 ── */}
              {step === 4 && (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">Team members</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Invite users to collaborate. You will be automatically assigned as Manager.
                  </p>
                  
                  <div className="space-y-3 mb-4">
                    {members.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="email"
                          placeholder="user@example.com"
                          value={m.email}
                          onChange={(e) => {
                            const newM = [...members];
                            newM[idx].email = e.target.value;
                            setMembers(newM);
                          }}
                          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={m.role}
                          onChange={(e) => {
                            const newM = [...members];
                            newM[idx].role = e.target.value;
                            setMembers(newM);
                          }}
                          className="w-40 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        >
                          <option value="engineer">Engineer</option>
                          <option value="architect">Architect</option>
                          <option value="manager">Manager</option>
                          <option value="auditor">Auditor</option>
                        </select>
                        <button
                          onClick={() => setMembers(members.filter((_, i) => i !== idx))}
                          className="text-gray-500 hover:text-red-400 p-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setMembers([...members, { email: '', role: 'engineer' }])}
                    className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors"
                  >
                    + Add another member
                  </button>
                </>
              )}

              {/* ── STEP 5 — Review ── */}
              {step === 5 && (
                <>
                  <h3 className="text-white text-xl font-bold mb-1">Review & create</h3>
                  <p className="text-gray-500 text-sm mb-6">Confirm project details before creating.</p>

                  {error && (
                    <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    {[
                      { label: 'Project name', value: name || 'Not set' },
                      { label: 'Propulsion', value: propulsion || 'Not set' },
                      { label: 'Architecture', value: architecture || 'Not set' },
                      { label: 'SAE Level', value: `L${saeLevel}` },
                      { label: 'OTA Support', value: otaSupport ? 'Yes' : 'No' },
                      { label: 'External interfaces', value: externalInterfaces.join(', ') || 'None' },
                      { label: 'Business objectives', value: `${selectedObjectives.length} selected` },
                      { label: 'Initial members', value: `${members.filter(m => m.email.trim()).length} invited` },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-800">
                        <span className="text-gray-500 text-sm">{row.label}</span>
                        <span className="text-white text-sm font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => step > 1 ? setStep(step - 1) : window.location.href = '/dashboard'}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {step > 1 ? 'Back' : 'Cancel'}
                </button>

                {step < 5 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 && (!name || selectedObjectives.length === 0)}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                  >
                    Continue: {STEPS[step].label} →
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={loading || !name}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create project →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}