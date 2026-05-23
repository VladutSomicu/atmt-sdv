import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import DiagramTab from '../components/editor/DiagramTab';
import AnalysisTab from '../components/editor/AnalysisTab';
import ComplianceTab from '../components/editor/ComplianceTab';
import ReportTab from '../components/editor/ReportTab';
import { useAuth } from '../store/AuthContext';

export default function EditorPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('diagram');
  const [loading, setLoading] = useState(true);
  // Threats lifted here so DiagramTab can react to analysis results
  const [threats, setThreats] = useState([]);
  // Asset selected in Analysis tab → highlight on canvas
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const [myRole, setMyRole] = useState(null);

  useEffect(() => {
    api.get(`/api/projects/${projectId}`)
      .then(res => {
        setProject(res.data.project);
        const member = res.data.members?.find(m => m.user_id === user?.id);
        setMyRole(user?.is_admin ? 'admin' : (member?.role || 'auditor'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, user]);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
      Loading project...
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">
      Project not found
    </div>
  );

  const vp = project.vehicle_profile || {};
  const vpLabel = [
    vp.propulsion,
    vp.architecture,
    vp.sae_level !== undefined && `SAE ${vp.sae_level}`,
    vp.ota_support && 'OTA'
  ].filter(Boolean).join(' / ');

  const tabs = [
    { id: 'diagram', label: 'Diagram' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'report', label: 'Report' },
  ];

  // RBAC Flags
  const canEditDiagram = ['admin', 'engineer', 'architect'].includes(myRole);
  const canRunAnalysis = ['admin', 'engineer'].includes(myRole);
  const canApproveReport = ['admin', 'manager'].includes(myRole);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">ATMT-SDV</span>
          <span className="text-gray-600 text-xs ml-auto">v0.9</span>
        </div>

        <div className="px-3 py-3 border-b border-gray-800">
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {vp.propulsion?.slice(0, 2) || 'P'}
              </div>
              <p className="text-white text-xs font-medium truncate">{project.name}</p>
            </div>
            <p className="text-gray-500 text-xs">{vpLabel}</p>
            <p className="text-blue-400 text-xs mt-1 capitalize">Role: {myRole}</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
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
          {user?.is_admin && (
            <a href="/assets" className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Asset library</a>
          )}
          <a href={`/projects/${projectId}/audit`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Audit log</a>
          {['admin', 'manager'].includes(myRole) && (
            <a href={`/projects/${projectId}/members`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Members</a>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-gray-800">
          <div className="flex gap-1.5">
            <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">ISO 21434</span>
            <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">R155</span>
            <span className="bg-gray-800 text-gray-500 text-xs px-1.5 py-0.5 rounded">R156</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Navbar */}
        <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-sm">
            <a href="/projects" className="text-gray-400 hover:text-white transition-colors">Projects</a>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">{project.name}</span>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-xs">Saved</span>

          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'diagram' && <DiagramTab projectId={projectId} project={project} threats={threats} onDiagramSaved={() => {}} canEdit={canEditDiagram} />}
          {activeTab === 'analysis' && <AnalysisTab projectId={projectId} onThreatsLoaded={setThreats} onSelectAsset={(id) => { setSelectedAssetId(id); setActiveTab('diagram'); }} isReadOnly={!canRunAnalysis} />}
          {activeTab === 'compliance' && <ComplianceTab projectId={projectId} />}
          {activeTab === 'report' && <ReportTab projectId={projectId} project={project} threats={threats} canApprove={canApproveReport} />}
        </main>
      </div>
    </div>
  );
}