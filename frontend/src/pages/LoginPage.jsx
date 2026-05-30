import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../store/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      login(res.data.user, res.data.access_token, res.data.refresh_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/demo');
      login(res.data.user, res.data.access_token, res.data.refresh_token);
      navigate('/dashboard');
    } catch (err) {
      setError('Demo unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* LEFT — Marketing panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 border-r border-gray-800 flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/atmt_logo.png" alt="ATMT Logo" className="w-7 h-7 object-contain" />
          <span className="text-white font-bold text-lg tracking-wide">ATMT-SDV</span>
        </div>

        {/* Headline */}
        <div>
          <p className="text-blue-400 text-xs font-mono tracking-widest uppercase mb-4">
            // Automotive Threat Modeling Tool
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Security engineering for software-defined vehicles.
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Accelerate automotive cybersecurity compliance with traceable threat analysis, risk
            assessments, and audit-ready documentation for ISO/SAE 21434 and UNECE R155/R156.
          </p>
        </div>

        {/* Canvas preview */}
        <div className="bg-gray-950 rounded-none border border-gray-800 p-5 flex flex-col shadow-none w-full">
          <div className="flex items-center justify-between mb-5 z-10">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs font-mono font-bold">VEHICLE_ARCHITECTURE.DFD</span>
            </div>
            <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-400/10 border border-green-400/20">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
              LIVE ANALYSIS
            </span>
          </div>

          {/* Realistic automotive DFD */}
          <div className="relative w-full aspect-[21/9] lg:aspect-[3/1] bg-gray-900/30 rounded-none border border-gray-800/50 overflow-hidden">
            <svg viewBox="0 0 700 220" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.4" opacity="0.25" />
                </pattern>
                {/* Glow filter for threat path */}
                <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* Trust boundary dash */}
                <marker id="arrow-gray" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#4B5563" />
                </marker>
                <marker id="arrow-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#EF4444" />
                </marker>
                <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#3B82F6" />
                </marker>
                <marker id="arrow-yellow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#F59E0B" />
                </marker>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* ── Trust Boundary: External Zone ── */}
              <rect x="6" y="8" width="108" height="204" rx="4"
                fill="none" stroke="#6B7280" strokeWidth="1" strokeDasharray="5,3" opacity="0.5" />
              <text x="10" y="18" fill="#6B7280" fontSize="6" fontFamily="monospace" opacity="0.8">External Zone</text>

              {/* ── Trust Boundary: In-Vehicle Network ── */}
              <rect x="130" y="8" width="430" height="204" rx="4"
                fill="none" stroke="#3B82F6" strokeWidth="1" strokeDasharray="5,3" opacity="0.35" />
              <text x="134" y="18" fill="#3B82F6" fontSize="6" fontFamily="monospace" opacity="0.7">In-Vehicle Network (IVN) — Trust Boundary</text>

              {/* ── Trust Boundary: Safety-Critical Domain ── */}
              <rect x="570" y="8" width="122" height="204" rx="4"
                fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="5,3" opacity="0.35" />
              <text x="574" y="18" fill="#F59E0B" fontSize="6" fontFamily="monospace" opacity="0.7">Safety-Critical Domain</text>

              {/* ════════════════════════════════
                  EDGES / DATA FLOWS
              ════════════════════════════════ */}

              {/* OEM Cloud → TCU: TLS 1.3 / MQTT (dashed = external) */}
              <line x1="107" y1="110" x2="148" y2="110"
                stroke="#6B7280" strokeWidth="1.5" strokeDasharray="4,3"
                markerEnd="url(#arrow-gray)" />
              <text x="113" y="106" fill="#6B7280" fontSize="5" fontFamily="monospace">TLS 1.3</text>

              {/* TCU → CGW: Automotive Ethernet / DoIP — THREAT PATH */}
              <line x1="222" y1="110" x2="298" y2="110"
                stroke="#EF4444" strokeWidth="2"
                markerEnd="url(#arrow-red)" filter="url(#redGlow)" />
              <line x1="222" y1="110" x2="298" y2="110"
                stroke="#EF4444" strokeWidth="8" opacity="0.12" />
              <text x="232" y="105" fill="#EF4444" fontSize="5" fontFamily="monospace">Eth / DoIP</text>
              {/* STRIDE label on threat path */}
              <rect x="237" y="112" width="42" height="9" rx="2" fill="#7F1D1D" opacity="0.9" />
              <text x="239" y="119" fill="#FCA5A5" fontSize="5" fontFamily="monospace" fontWeight="bold">SPOOFING · T</text>

              {/* CGW → IVI: SOME/IP over Automotive Ethernet */}
              <line x1="370" y1="96" x2="430" y2="58"
                stroke="#4B5563" strokeWidth="1.5"
                markerEnd="url(#arrow-gray)" />
              <text x="378" y="75" fill="#6B7280" fontSize="5" fontFamily="monospace">SOME/IP</text>

              {/* CGW → ADAS ECU: CAN FD (safety-critical) */}
              <line x1="370" y1="122" x2="430" y2="155"
                stroke="#F59E0B" strokeWidth="1.5"
                markerEnd="url(#arrow-yellow)" />
              <text x="376" y="148" fill="#F59E0B" fontSize="5" fontFamily="monospace">CAN FD</text>

              {/* CGW → BCM: CAN 2.0B */}
              <line x1="338" y1="132" x2="338" y2="172"
                stroke="#4B5563" strokeWidth="1.5"
                markerEnd="url(#arrow-gray)" />
              <text x="342" y="155" fill="#6B7280" fontSize="5" fontFamily="monospace">CAN 2.0B</text>

              {/* ADAS → EPS (safety path) */}
              <line x1="560" y1="155" x2="600" y2="130"
                stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,2"
                markerEnd="url(#arrow-yellow)" />

              {/* ════════════════════════════════
                  NODES
              ════════════════════════════════ */}

              {/* OEM Cloud Backend */}
              <rect x="10" y="88" width="96" height="44" rx="4" fill="#111827" stroke="#4B5563" strokeWidth="1" />
              <text x="24" y="104" fill="#9CA3AF" fontSize="6.5" fontFamily="monospace" fontWeight="bold">OEM BACKEND</text>
              <text x="18" y="115" fill="#6B7280" fontSize="5" fontFamily="monospace">V2C / OTA Server</text>
              <text x="18" y="124" fill="#6B7280" fontSize="5" fontFamily="monospace">UNECE R156 SUMS</text>

              {/* TCU — Compromised */}
              <rect x="150" y="88" width="70" height="44" rx="4" fill="#450A0A" stroke="#EF4444" strokeWidth="1.5" />
              <rect x="150" y="88" width="70" height="44" rx="4" fill="#EF4444" opacity="0.07" />
              <text x="162" y="104" fill="#FCA5A5" fontSize="6.5" fontFamily="monospace" fontWeight="bold">TCU</text>
              <text x="155" y="115" fill="#F87171" fontSize="5" fontFamily="monospace">Telematics ECU</text>
              <text x="155" y="124" fill="#F87171" fontSize="5" fontFamily="monospace">▲ CAL: HIGH</text>

              {/* Central Gateway */}
              <rect x="300" y="88" width="68" height="44" rx="4" fill="#1E3A5F" stroke="#3B82F6" strokeWidth="1.5" />
              <text x="308" y="104" fill="#93C5FD" fontSize="6.5" fontFamily="monospace" fontWeight="bold">CGW</text>
              <text x="305" y="115" fill="#60A5FA" fontSize="5" fontFamily="monospace">Central Gateway</text>
              <text x="305" y="124" fill="#60A5FA" fontSize="5" fontFamily="monospace">SecOC / VLAN</text>

              {/* IVI */}
              <rect x="432" y="36" width="80" height="40" rx="4" fill="#111827" stroke="#4B5563" strokeWidth="1" />
              <text x="440" y="52" fill="#D1D5DB" fontSize="6.5" fontFamily="monospace" fontWeight="bold">IVI SYSTEM</text>
              <text x="440" y="63" fill="#6B7280" fontSize="5" fontFamily="monospace">Infotainment HU</text>
              <text x="440" y="72" fill="#6B7280" fontSize="5" fontFamily="monospace">Android Auto / HMI</text>

              {/* ADAS */}
              <rect x="432" y="136" width="80" height="40" rx="4" fill="#1C1917" stroke="#F59E0B" strokeWidth="1.5" />
              <text x="440" y="152" fill="#FCD34D" fontSize="6.5" fontFamily="monospace" fontWeight="bold">ADAS ECU</text>
              <text x="440" y="163" fill="#D97706" fontSize="5" fontFamily="monospace">ASIL-D · LiDAR Fusion</text>
              <text x="440" y="172" fill="#D97706" fontSize="5" fontFamily="monospace">ISO 26262</text>

              {/* BCM */}
              <rect x="300" y="174" width="70" height="36" rx="4" fill="#111827" stroke="#4B5563" strokeWidth="1" />
              <text x="308" y="189" fill="#9CA3AF" fontSize="6.5" fontFamily="monospace" fontWeight="bold">BCM</text>
              <text x="305" y="200" fill="#6B7280" fontSize="5" fontFamily="monospace">Body Control Module</text>

              {/* EPS */}
              <rect x="578" y="108" width="72" height="38" rx="4" fill="#1C1917" stroke="#F59E0B" strokeWidth="1" />
              <text x="586" y="124" fill="#FCD34D" fontSize="6.5" fontFamily="monospace" fontWeight="bold">EPS ECU</text>
              <text x="582" y="135" fill="#D97706" fontSize="5" fontFamily="monospace">Electric Power Steering</text>
              <text x="582" y="144" fill="#D97706" fontSize="5" fontFamily="monospace">ASIL-D</text>

              {/* ════════════════════════════════
                  THREAT ANNOTATIONS
              ════════════════════════════════ */}

              {/* CAPEC badge on TCU */}
              <rect x="152" y="76" width="66" height="10" rx="2" fill="#991B1B" />
              <text x="155" y="84" fill="#FEE2E2" fontSize="5" fontFamily="monospace">CAPEC-657 · CAPEC-21</text>

              {/* Risk score badge on CGW */}
              <rect x="302" y="76" width="64" height="10" rx="2" fill="#1D4ED8" />
              <text x="305" y="84" fill="#BFDBFE" fontSize="5" fontFamily="monospace">RISK: 8.7 · UNACCEPTABLE</text>

            </svg>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs">
          © 2026 ATMT · ISO/SAE 21434:2021 · UNECE R155 / R156
        </p>
      </div>

      {/* RIGHT — Sign in form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/atmt_logo.png" alt="ATMT Logo" className="w-7 h-7 object-contain" />
            <span className="text-white font-bold text-lg">ATMT-SDV</span>
          </div>

          <h2 className="text-white text-2xl font-bold mb-1">Welcome back.</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in with your organisation credentials.</p>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-none mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-600"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300 focus:outline-none"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-none text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : (
                <>Sign in <span>→</span></>
              )}
            </button>
          </form>

          <div className="flex items-center my-5">
            <div className="flex-1 border-t border-gray-800" />
            <span className="px-3 text-gray-600 text-xs">or</span>
            <div className="flex-1 border-t border-gray-800" />
          </div>

          {/* Demo box */}
          <div className="bg-gray-900 border border-gray-800 rounded-none p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white text-sm font-medium">Explore the demo workspace</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Read-only project with pre-loaded threats and a finalised TARA report.
                </p>
              </div>
              <button
                onClick={handleDemo}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-400 text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap ml-4"
              >
                Launch demo →
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            Accounts are provisioned by your system administrator.
          </p>
        </div>
      </div>

    </div>
  );
}