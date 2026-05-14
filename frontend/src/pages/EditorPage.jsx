import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';

export default function EditorPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('diagram');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/projects/${projectId}`)
      .then(res => setProject(res.data.project))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <AppLayout>
      <div className="text-center py-20 text-gray-500">Loading project...</div>
    </AppLayout>
  );

  if (!project) return (
    <AppLayout>
      <div className="text-center py-20 text-red-400">Project not found</div>
    </AppLayout>
  );

  const vp = project.vehicle_profile || {};
  const vpLabel = [vp.propulsion, vp.architecture, vp.sae_level !== undefined && `SAE ${vp.sae_level}`, vp.ota_support && 'OTA']
    .filter(Boolean).join(' / ');

  const tabs = [
    { id: 'diagram', label: 'Diagram' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar — project context */}
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">ATMT-SDV</span>
          <span className="text-gray-600 text-xs ml-auto">v0.9</span>
        </div>

        {/* Project info */}
        <div className="px-3 py-3 border-b border-gray-800">
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">
                {vp.propulsion?.slice(0,2) || 'P'}
              </div>
              <p className="text-white text-xs font-medium truncate">{project.name}</p>
            </div>
            <p className="text-gray-500 text-xs">{vpLabel}</p>
          </div>
        </div>

        {/* Project nav */}
        <nav className="flex-1 px-2 py-3">
          <p className="text-gray-600 text-xs uppercase tracking-widest px-2 mb-2">Project</p>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm mb-0.5 transition-colors text-left ${
                activeTab === tab.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <p className="text-gray-600 text-xs uppercase tracking-widest px-2 mb-2 mt-4">Context</p>
          <a href="/assets" className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Asset library
          </a>
          <a href={`/projects/${projectId}/history`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            History
          </a>
          <a href={`/projects/${projectId}/members`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Members
          </a>
          <a href={`/projects/${projectId}/audit`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Audit log
          </a>
        </nav>

        {/* Bottom badges */}
        <div className="px-3 py-3 border-t border-gray-800">
          <div className="flex gap-1.5">
            <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">ISO 21434</span>
            <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">R155</span>
            <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">R156</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Navbar */}
        <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-sm">
            <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Projects</a>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">{project.name}</span>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-green-400 text-xs">Saved</span>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Run analysis
            </button>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1">
          {activeTab === 'diagram' && <DiagramTab projectId={projectId} project={project} />}
          {activeTab === 'analysis' && <AnalysisTab projectId={projectId} />}
          {activeTab === 'compliance' && <ComplianceTab projectId={projectId} />}
          {activeTab === 'report' && <ReportTab projectId={projectId} project={project} />}
        </main>
      </div>
    </div>
  );
}

// ── Placeholder tabs ──────────────────────────────────────────────────────────

function DiagramTab({ projectId, project }) {
  return (
    <div className="flex h-full">
      <div className="flex-1 flex items-center justify-center text-gray-600">
        <div className="text-center">
          <p className="text-lg mb-2">JointJS Canvas</p>
          <p className="text-sm">Diagram editor coming next</p>
        </div>
      </div>
    </div>
  );
}

function AnalysisTab({ projectId }) {
  return (
    <div className="p-6 text-gray-600 text-center py-20">
      Analysis tab — coming next
    </div>
  );
}

function ComplianceTab({ projectId }) {
  return (
    <div className="p-6 text-gray-600 text-center py-20">
      Compliance tab — coming next
    </div>
  );
}

function ReportTab({ projectId, project }) {
  return (
    <div className="p-6 text-gray-600 text-center py-20">
      Report tab — coming next
    </div>
  );
}