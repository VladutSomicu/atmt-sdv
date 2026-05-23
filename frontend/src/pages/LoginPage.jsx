import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../store/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
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
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-white font-bold text-lg tracking-wide">ATMT-SDV</span>
        </div>

        {/* Headline */}
        <div>
          <p className="text-blue-400 text-xs font-mono tracking-widest uppercase mb-4">
            // Automotive Threat Modeling Tool
          </p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            TARA analysis for the next generation of software-defined vehicles.
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Model your vehicle topology, run STRIDE + CAPEC against the graph,
            and produce ISO 21434 / UNECE R155–R156 evidence — all in one workspace.
          </p>
        </div>

        {/* Canvas preview */}
        <div className="bg-gray-950 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-xs font-mono">VEHICLE_DFD.GRAPH</span>
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
              LIVE
            </span>
          </div>
          {/* Simplified DFD mockup */}
          <div className="relative h-32">
            {/* Nodes */}
            <div className="absolute top-2 left-4 bg-gray-800 border border-blue-700 rounded px-2 py-1 text-xs text-blue-300">TCU</div>
            <div className="absolute top-2 right-4 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300">Cloud BE</div>
            <div className="absolute bottom-2 left-16 bg-gray-800 border border-red-700 rounded px-2 py-1 text-xs text-red-300">BMS</div>
            <div className="absolute bottom-2 right-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300">Gateway</div>
            {/* Lines */}
            <svg className="absolute inset-0 w-full h-full">
              <line x1="80" y1="20" x2="220" y2="20" stroke="#374151" strokeWidth="1" strokeDasharray="4,2" />
              <line x1="80" y1="20" x2="100" y2="100" stroke="#374151" strokeWidth="1" strokeDasharray="4,2" />
              <line x1="220" y1="20" x2="200" y2="100" stroke="#374151" strokeWidth="1" strokeDasharray="4,2" />
              <line x1="100" y1="100" x2="200" y2="100" stroke="#1d4ed8" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs">
          © 2026 ATMT · ISO 21434 · UNECE R155 / R156
        </p>
      </div>

      {/* RIGHT — Sign in form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="text-white font-bold text-lg">ATMT-SDV</span>
          </div>

          <h2 className="text-white text-2xl font-bold mb-1">Welcome back!</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in with your organization credentials.</p>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-600"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : (
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
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white text-sm font-medium">Try the demo workspace</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  Read-only EV · SDV project · threats · finalized report.
                </p>
              </div>
              <button
                onClick={handleDemo}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-400 text-xs font-medium px-3 py-1.5 rounded transition-colors whitespace-nowrap ml-4"
              >
                Try demo →
              </button>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            Accounts are provisioned by your administrator.
          </p>
        </div>
      </div>

    </div>
  );
}