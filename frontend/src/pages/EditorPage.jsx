import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/shared/Modal';
import DiagramTab from '../components/editor/DiagramTab';
import AnalysisTab from '../components/editor/AnalysisTab';
import ComplianceTab from '../components/editor/ComplianceTab';
import ReportTab from '../components/editor/ReportTab';
import ProjectAuditLogTab from '../components/editor/ProjectAuditLogTab';
import ProjectMembersTab from '../components/editor/ProjectMembersTab';
import { useAuth } from '../store/AuthContext';

export default function EditorPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [project, setProject] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isDiagramDirty, setIsDiagramDirty] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(`editor_tab_${projectId}`) || 'diagram';
  });
  
  useEffect(() => {
    localStorage.setItem(`editor_tab_${projectId}`, activeTab);
  }, [activeTab, projectId]);
  const [loading, setLoading] = useState(true);
  // Threats lifted here so DiagramTab can react to analysis results
  const [threats, setThreats] = useState([]);
  // Asset selected in Analysis tab → highlight on canvas
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const [myRole, setMyRole] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/projects/${projectId}`),
      api.get(`/api/threats/${projectId}`)
    ])
      .then(([projRes, threatsRes]) => {
        setProject(projRes.data.project);
        const member = projRes.data.members?.find(m => m.user_id === user?.id);
        setMyRole(user?.is_admin ? 'admin' : (member?.role || 'auditor'));
        setThreats(threatsRes.data.threats || []);
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
  const canEditDiagram = ['admin', 'architect'].includes(myRole);
  const canRunAnalysis = ['admin', 'engineer'].includes(myRole);
  const canRunCompliance = ['admin', 'engineer', 'manager'].includes(myRole);

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div 
          className="h-12 flex items-center gap-2 px-4 shrink-0 cursor-pointer hover:bg-gray-800 transition-colors"
          onClick={() => navigate('/dashboard')}
          title="Return to Dashboard"
        >
          <img src="/atmt_logo.png" alt="ATMT Logo" className="w-6 h-6 object-contain" />
          <span className="text-white font-bold text-sm tracking-wide">ATMT-SDV</span>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <p className="text-gray-600 text-xs font-medium uppercase tracking-widest px-2 mb-2">Project</p>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm mb-0.5 transition-colors text-left ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-gray-200 border-l-2 border-blue-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <p className="text-gray-600 text-xs font-medium uppercase tracking-widest px-2 mb-2 mt-6">Context</p>
          {user?.is_admin && (
            <a href="/assets" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent transition-colors text-left">Asset library</a>
          )}
          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm mb-0.5 transition-colors text-left ${
              activeTab === 'audit'
                ? 'bg-gray-800 text-gray-200 border-l-2 border-blue-500'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
            }`}
          >
            Audit log
          </button>
          {['admin', 'manager'].includes(myRole) && (
            <button
              onClick={() => setActiveTab('members')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm mb-0.5 transition-colors text-left ${
                activeTab === 'members'
                  ? 'bg-gray-800 text-gray-200 border-l-2 border-blue-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
              }`}
            >
              Members
            </button>
          )}
        </nav>

        <div className="px-3 pb-3">
          <div className="bg-gray-800 rounded-none px-3 py-2">
            <div className="flex items-center mb-1">
              <p className="text-white text-xs font-medium line-clamp-2 break-words leading-snug" title={project.name}>{project.name}</p>
            </div>
            {vp.category && (
              <p className="text-gray-400 text-[10px] uppercase font-medium tracking-tight mb-0.5 truncate" title={vp.category}>{vp.category}</p>
            )}
            <p className="text-gray-500 text-[9px] uppercase font-mono tracking-tighter mb-1 whitespace-nowrap overflow-hidden text-ellipsis" title={vpLabel}>{vpLabel}</p>
            <p className="text-blue-400 text-[10px] uppercase font-mono tracking-wide capitalize">Role: {myRole}</p>
          </div>
        </div>

        {/* Bottom Status Area */}
        <div className="mt-auto shrink-0">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="text-gray-300 text-xs font-medium truncate" title={user?.full_name}>
                {user?.full_name}
              </span>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors rounded-sm"
              title="Disconnect"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <Modal
        isOpen={showLogoutConfirm}
        title="Sign Out"
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        confirmText="Sign out"
        confirmDanger
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to sign out? Any unsaved changes will be lost.
        </p>
      </Modal>

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
            {activeTab === 'diagram' && (
              isDiagramDirty ? (
                <span className="text-amber-400 text-xs flex items-center gap-1.5" title="You have unsaved changes">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Unsaved
                </span>
              ) : (
                <span className="text-green-400 text-xs flex items-center gap-1.5">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  Saved
                </span>
              )
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'diagram' && <DiagramTab projectId={projectId} project={project} threats={threats} onDiagramSaved={() => setIsDiagramDirty(false)} onDiagramChanged={() => setIsDiagramDirty(true)} canEdit={canEditDiagram} />}
          {activeTab === 'analysis' && <AnalysisTab projectId={projectId} onThreatsLoaded={setThreats} onSelectAsset={(id) => { setSelectedAssetId(id); setActiveTab('diagram'); }} isReadOnly={!canRunAnalysis} />}
          {activeTab === 'compliance' && <ComplianceTab projectId={projectId} isReadOnly={!canRunCompliance} />}
          {activeTab === 'report' && <ReportTab projectId={projectId} project={project} threats={threats} />}
          {activeTab === 'audit' && <ProjectAuditLogTab projectId={projectId} />}
          {activeTab === 'members' && <ProjectMembersTab projectId={projectId} user={user} />}
        </main>
      </div>
    </div>
  );
}