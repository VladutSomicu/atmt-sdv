import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../store/AuthContext';
import Modal from '../components/shared/Modal';
import useSortableData from '../hooks/useSortableData';
import SortableHeader from '../components/shared/SortableHeader';
import toast from 'react-hot-toast';
import TablePagination from '../components/shared/TablePagination';
import { formatDateTime, formatDate } from '../utils/date';

/* ── Helpers ─────────────────────────────────────────── */
const riskBadge = (score) => {
  if (score >= 16) return 'bg-red-900 text-red-300 border-red-800';
  if (score >= 12) return 'bg-orange-900 text-orange-300 border-orange-800';
  if (score >= 8) return 'bg-yellow-900 text-yellow-300 border-yellow-800';
  if (score >= 4) return 'bg-blue-900 text-blue-300 border-blue-800';
  return 'bg-gray-800 text-gray-400 border-gray-700';
};

const riskLabel = (score) => {
  if (score >= 16) return 'CRITICAL';
  if (score >= 12) return 'HIGH';
  if (score >= 8) return 'MEDIUM';
  if (score >= 4) return 'LOW';
  return 'DRAFT';
};

const statusColor = {
  draft: 'text-gray-400',
  in_analysis: 'text-blue-400',
  completed: 'text-emerald-400',
};

const roleColor = {
  engineer: 'bg-blue-900 text-blue-300',
  manager: 'bg-green-900 text-green-300',
  architect: 'bg-purple-900 text-purple-300',
  auditor: 'bg-yellow-900 text-yellow-300',
};

/* ── Context Menu ─────────────────────────────────────── */
function ProjectContextMenu({ menu, onRename, onDelete, onClose, canManage }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!menu) return null;

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-none  overflow-hidden"
      style={{ top: menu.y, left: menu.x, minWidth: 160 }}
    >
      {canManage ? (
        <>
          <button
            onClick={onRename}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <div className="border-t border-gray-800" />
          <button
            onClick={onDelete}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete project
          </button>
        </>
      ) : (
        <p className="px-3 py-2 text-xs text-gray-500">No actions available for your role</p>
      )}
    </div>
  );
}

/* ── Recent Project Card (shared) ─────────────────────── */
function ProjectCard({ project, onClick }) {
  const vp = project.vehicle_profile || {};
  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 p-4 cursor-pointer hover:border-gray-700 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {vp.propulsion?.slice(0, 2) || 'PR'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition-colors">{project.name}</p>
            <p className="text-gray-600 text-[10px] truncate">{project.description || 'No description'}</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium whitespace-nowrap ml-2 ${riskBadge(project.max_risk_score || 0)}`}>
          {project.max_risk_score ? riskLabel(project.max_risk_score) : 'DRAFT'}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px] mt-2">
        <div className="flex items-center gap-2 min-w-0">
          {vp.category && (
            <span className="text-gray-400 truncate">
              {vp.category.split('(')[0].trim()}
            </span>
          )}
          <span className={`font-medium whitespace-nowrap ${statusColor[project.status] || 'text-gray-500'}`}>
            {project.status?.replace('_', ' ')}
          </span>
        </div>
        <span className="text-gray-600 font-mono whitespace-nowrap ml-2">
          {formatDate(project.updated_at)}
        </span>
      </div>
    </div>
  );
}

/* ── Progress Bar Row ─────────────────────────────────── */
function ProgressRow({ label, count, total, color, textColor }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className={`font-medium ${textColor}`}>{label}</span>
        <span className="text-gray-500 font-mono text-[10px]">{count} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-800 h-1.5 overflow-hidden">
        <div className={`${color} h-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Hoverable Progress Row ───────────────────────────── */
function HoverableProgressRow({ item, total, isHovered, isDimmed, onHover, onLeave }) {
  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
  
  return (
    <div 
      className={`transition-all duration-300 cursor-pointer ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
       <div className={`flex justify-between text-xs mb-1 transition-all ${isHovered ? 'font-bold scale-[1.02] origin-left' : ''}`}>
           <span className={`${item.textTw}`}>{item.label}</span>
           <span className={`${isHovered ? 'text-white' : 'text-gray-500'} font-mono text-[10px] transition-colors`}>
              {item.value} ({pct}%)
           </span>
       </div>
       <div className="w-full bg-gray-800 h-1.5 overflow-hidden">
           <div className={`${item.twColor} h-full transition-all duration-700`} style={{ width: `${pct}%` }} />
       </div>
    </div>
  );
}

/* ── Risk Distribution Card (Merged) ──────────────────── */
function RiskDistributionCard({ stats, className = "md:row-span-2" }) {
  const [hoveredLevel, setHoveredLevel] = useState(null);

  const riskData = [
    { label: 'Critical', value: stats.critical, color: '#ef4444', twColor: 'bg-red-500', textTw: 'text-red-400' }, 
    { label: 'High', value: stats.high, color: '#f97316', twColor: 'bg-orange-500', textTw: 'text-orange-400' },
    { label: 'Medium', value: stats.medium, color: '#eab308', twColor: 'bg-yellow-500', textTw: 'text-yellow-400' },
    { label: 'Low', value: stats.low, color: '#3b82f6', twColor: 'bg-blue-500', textTw: 'text-blue-400' },
    { label: 'Draft', value: stats.draft, color: '#4b5563', twColor: 'bg-gray-600', textTw: 'text-gray-400' }
  ];

  const total = riskData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className={`md:col-span-1 bg-gray-900 border border-gray-800 p-5 flex flex-col ${className}`}>
      <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-6">Risk Distribution</h2>
      
      <div className="flex-1 flex flex-col justify-start">
        <div className="flex items-center justify-center mb-6 mt-4">
           <RiskDonutChart data={riskData} total={total} hoveredLevel={hoveredLevel} setHoveredLevel={setHoveredLevel} />
        </div>

        <div className="space-y-2.5">
          {riskData.map(item => (
            <HoverableProgressRow 
              key={item.label}
              item={item}
              total={total}
              isHovered={hoveredLevel === item.label}
              isDimmed={hoveredLevel !== null && hoveredLevel !== item.label}
              onHover={() => setHoveredLevel(item.label)}
              onLeave={() => setHoveredLevel(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Risk Donut Chart ─────────────────────────────────── */
function RiskDonutChart({ data, total, hoveredLevel, setHoveredLevel }) {
  if (total === 0) {
    return <span className="text-gray-600 text-xs">No data</span>;
  }

  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const hoveredItem = hoveredLevel ? data.find(d => d.label === hoveredLevel) : null;

  const hasCriticalOrHigh = data.some(d => (d.label === 'Critical' || d.label === 'High') && d.value > 0);
  const hasMedium = data.some(d => d.label === 'Medium' && d.value > 0);
  const hasLow = data.some(d => d.label === 'Low' && d.value > 0);

  let FaceIcon;
  if (hasCriticalOrHigh) {
    FaceIcon = (
      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M15 16a4 4 0 00-6 0m12-4a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  } else if (hasMedium) {
    FaceIcon = (
      <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M10 14h4m4-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  } else if (hasLow) {
    FaceIcon = (
      <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  } else {
    FaceIcon = (
      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M12 14v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full max-w-[220px]">
      <svg className="w-full h-auto transform -rotate-90 overflow-visible" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#1f2937" strokeWidth={strokeWidth} />
        {data.map((item, index) => {
          if (item.value === 0) return null;
          const segmentLength = (item.value / total) * circumference;
          const strokeDasharray = `${segmentLength} ${circumference}`;
          const strokeDashoffset = -currentOffset;
          currentOffset += segmentLength;
          
          const isHovered = hoveredLevel === item.label;
          const isDimmed = hoveredLevel !== null && !isHovered;

          return (
            <circle
              key={index}
              cx="90" cy="90" r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={`transition-all duration-300 cursor-pointer ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
              onMouseEnter={() => setHoveredLevel(item.label)}
              onMouseLeave={() => setHoveredLevel(null)}
            />
          );
        })}
      </svg>
      {hoveredItem && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-300">
          <span className={`text-2xl font-bold font-mono ${hoveredItem.textTw}`}>{hoveredItem.value}</span>
          <span className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">{hoveredItem.label}</span>
        </div>
      )}
      {!hoveredItem && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          {FaceIcon}
        </div>
      )}
    </div>
  );
}

/* ── Admin Dashboard ──────────────────────────────────── */
function AdminDashboard({ projects }) {
  const navigate = useNavigate();

  const stats = {
    total: projects.length,
    critical: projects.filter(p => (p.max_risk_score || 0) >= 16).length,
    high: projects.filter(p => (p.max_risk_score || 0) >= 12 && (p.max_risk_score || 0) < 16).length,
    medium: projects.filter(p => (p.max_risk_score || 0) >= 8 && (p.max_risk_score || 0) < 12).length,
    low: projects.filter(p => (p.max_risk_score || 0) > 0 && (p.max_risk_score || 0) < 8).length,
    draft: projects.filter(p => !p.max_risk_score || p.max_risk_score === 0).length,
    inAnalysis: projects.filter(p => p.status === 'in_analysis').length,
    completed: projects.filter(p => p.status === 'completed').length,
    otaCapable: projects.filter(p => p.vehicle_profile?.ota_support).length,
  };

  const healthPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const recentProjects = [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-white text-2xl font-bold tracking-tight">Fleet Security Overview</h1>
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 uppercase font-bold tracking-wider">System Admin</span>
        </div>
        <p className="text-gray-500 text-sm">Organization-wide threat analysis and compliance monitoring</p>
      </div>

      {/* Row 1: KPI Header */}
      <div className="bg-gray-900 border border-gray-800 p-4 flex items-center justify-between font-mono text-xs uppercase tracking-widest">
        <div className="flex w-full items-center justify-between">
          <span>
            <span className="text-gray-500 mr-2">Total Projects:</span>
            <span className="text-white font-bold">{stats.total}</span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">In Analysis:</span>
            <span className="text-blue-400 font-bold">{stats.inAnalysis}</span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">Critical Risk:</span>
            <span className={`font-bold ${stats.critical > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.critical}
            </span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">Completed TARA:</span>
            <span className="text-emerald-400 font-bold">{stats.completed}</span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">Organization Health:</span>
            <span className={`font-bold ${healthPct > 70 ? 'text-emerald-400' : healthPct > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {healthPct}%
            </span>
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 grid-rows-[auto_auto]">
        {/* Left Column (spans 2 rows): Merged Risk Distribution */}
        <RiskDistributionCard stats={stats} />

        {/* Middle Column, Top Row: Fleet Breakdown */}
        <div className="md:col-span-1 bg-gray-900 border border-gray-800 p-5">
          <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Fleet Breakdown</h2>
          <h3 className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-3">Architecture</h3>
          <div className="space-y-2.5 mb-5">
            {['Classic', 'SDV'].map(type => {
              const count = projects.filter(p => p.vehicle_profile?.architecture === type).length;
              return <ProgressRow key={type} label={type} count={count} total={stats.total} color="bg-blue-500" textColor="text-gray-300" />;
            })}
          </div>
          <h3 className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-3">Propulsion</h3>
          <div className="space-y-2.5 mb-5">
            {['EV', 'ICE', 'Hybrid'].map(type => {
              const count = projects.filter(p => p.vehicle_profile?.propulsion === type).length;
              return <ProgressRow key={type} label={type} count={count} total={stats.total} color="bg-purple-500" textColor="text-gray-300" />;
            })}
          </div>
          <h3 className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-3">Features</h3>
          <div className="space-y-2.5">
            <ProgressRow label="OTA Capable" count={stats.otaCapable} total={stats.total} color="bg-emerald-500" textColor="text-gray-300" />
          </div>
        </div>

        {/* Right Column, Top Row: Quick Actions */}
        <div className="md:col-span-1 bg-gray-900 border border-gray-800 p-5">
          <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="space-y-1">
            {[
              { label: 'All Projects', href: '/projects', desc: 'Browse and manage TARA projects', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
              { label: 'Asset Library', href: '/assets', desc: 'Manage reference assets catalog', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
              { label: 'Threat Catalog', href: '/threats-catalog', desc: 'Browse threat definitions', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
              { label: 'Security Controls', href: '/controls-library', desc: 'View mitigation controls', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
              { label: 'User Management', href: '/admin', desc: 'Manage users and permissions', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
            ].map(link => (
              <a key={link.label} href={link.href} className="flex items-center justify-between px-3 py-3 hover:bg-gray-800 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="text-gray-500 group-hover:text-white transition-colors">
                    {link.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{link.label}</p>
                    <p className="text-gray-600 text-[10px]">{link.desc}</p>
                  </div>
                </div>
                <span className="text-gray-700 group-hover:text-gray-400 transition-colors">→</span>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Row, remaining 2 columns: Recent Project Updates */}
        <div className="md:col-span-2 bg-gray-900 border border-gray-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xs font-bold uppercase tracking-wider">Recent Project Updates</h2>
            <a href="/projects" className="text-blue-400 hover:text-blue-300 text-xs transition-colors">View all →</a>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {[...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 2).map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}/editor`)} />
            ))}
            {projects.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-600 text-sm">
                No active projects in the organization.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── User Dashboard ───────────────────────────────────── */
function UserDashboard({ projects, user }) {
  const navigate = useNavigate();

  const stats = {
    total: projects.length,
    critical: projects.filter(p => (p.max_risk_score || 0) >= 16).length,
    high: projects.filter(p => (p.max_risk_score || 0) >= 12 && (p.max_risk_score || 0) < 16).length,
    medium: projects.filter(p => (p.max_risk_score || 0) >= 8 && (p.max_risk_score || 0) < 12).length,
    low: projects.filter(p => (p.max_risk_score || 0) > 0 && (p.max_risk_score || 0) < 8).length,
    inAnalysis: projects.filter(p => p.status === 'in_analysis').length,
    completed: projects.filter(p => p.status === 'completed').length,
    draft: projects.filter(p => p.status === 'draft').length,
  };

  const evaluatedProjects = projects.filter(p => typeof p.compliance_score === 'number');
  const compliantProjects = evaluatedProjects.filter(p => p.compliance_score === 100).length;
  const compliancePct = evaluatedProjects.length > 0 ? Math.round((compliantProjects / evaluatedProjects.length) * 100) : 'N/A';

  const recentProjects = [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 4);

  const roleCounts = {};
  projects.forEach(p => {
    const role = p.my_role || 'unknown';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight mb-1">
          Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-gray-500 text-sm">Your workspace overview and project status</p>
      </div>

      {/* Row 1: KPI Header */}
      <div className="bg-gray-900 border border-gray-800 p-4 flex items-center justify-between font-mono text-xs uppercase tracking-widest">
        <div className="flex w-full items-center justify-between">
          <span>
            <span className="text-gray-500 mr-2">My Projects:</span>
            <span className="text-white font-bold">{stats.total}</span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">Critical Risks:</span>
            <span className={`font-bold ${stats.critical > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {stats.critical}
            </span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">Compliance:</span>
            <span className={`font-bold ${
              compliancePct === 'N/A' ? 'text-gray-500' : compliancePct > 80 ? 'text-emerald-400' : compliancePct > 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {compliancePct === 'N/A' ? 'N/A' : `${compliancePct}%`}
            </span>
          </span>
          <span>
            <span className="text-gray-500 mr-2">In Analysis:</span>
            <span className="text-blue-400 font-bold">{stats.inAnalysis}</span>
          </span>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left Column (spans 1 col): Merged Risk Distribution */}
        <RiskDistributionCard stats={stats} className="h-full" />

        {/* Right Columns (span 2 cols): Stacked vertically without forced stretching */}
        <div className="col-span-2 flex flex-col justify-start gap-4">
          
          {/* Top Row: My Roles & Status Breakdown */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            {/* My Roles */}
            <div className="bg-gray-900 border border-gray-800 p-5 flex flex-col">
              <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-4">My Roles</h2>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                {[
                  { role: 'engineer', label: 'Engineer', badge: 'bg-blue-900 text-blue-300' },
                  { role: 'manager', label: 'Manager', badge: 'bg-green-900 text-green-300' },
                  { role: 'architect', label: 'Architect', badge: 'bg-purple-900 text-purple-300' },
                  { role: 'auditor', label: 'Auditor', badge: 'bg-yellow-900 text-yellow-300' },
                  { role: 'admin', label: 'Admin', badge: 'bg-red-900 text-red-300' },
                ].map(r => {
                  const count = roleCounts[r.role] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={r.role} className="flex items-center justify-between py-2 px-3 bg-gray-800/30">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.badge}`}>{r.label}</span>
                      <span className="text-white font-mono text-sm font-bold">{count} {count === 1 ? 'project' : 'projects'}</span>
                    </div>
                  );
                }).filter(Boolean)}
                {Object.keys(roleCounts).length === 0 && (
                  <p className="text-gray-600 text-xs">No roles assigned yet</p>
                )}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-gray-900 border border-gray-800 p-5 flex flex-col">
              <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Status Breakdown</h2>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                <ProgressRow label="Draft" count={stats.draft} total={stats.total} color="bg-gray-500" textColor="text-gray-400" />
                <ProgressRow label="In Analysis" count={stats.inAnalysis} total={stats.total} color="bg-blue-500" textColor="text-blue-400" />
                <ProgressRow label="Completed" count={stats.completed} total={stats.total} color="bg-emerald-500" textColor="text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Projects */}
          <div className="bg-gray-900 border border-gray-800 p-5 flex flex-col min-h-[280px]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-white text-xs font-bold uppercase tracking-wider">Recent Projects</h2>
              <a href="/projects" className="text-blue-400 hover:text-blue-300 text-xs transition-colors">View all projects →</a>
            </div>
            <div className="grid grid-cols-2 gap-4 content-start">
              {recentProjects.map(p => (
                <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}/editor`)} />
              ))}
              {recentProjects.length === 0 && (
                <div className="col-span-2 text-center py-12 text-gray-600 text-sm">
                  No projects yet. <a href="/projects" className="text-blue-400 hover:text-blue-300">Create your first project →</a>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Projects Table (shared) ──────────────────────────── */
function ProjectsTable({ projects, showAllColumns = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contextMenu, setContextMenu] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [limit, setLimit] = useState(25);
  const [projects_, setProjects] = useState(projects);
  const { items: sortedProjects, requestSort, sortConfig } = useSortableData(projects_);
  const displayedProjects = sortedProjects.slice(0, limit);

  // Keep in sync with parent
  useEffect(() => setProjects(projects), [projects]);

  const handleContextMenu = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    const canManage = user?.is_admin || ['admin', 'manager'].includes(project.my_role);
    setContextMenu({ x: e.clientX, y: e.clientY, project, canManage });
  };

  const handleRename = async () => {
    if (!newName.trim() || !renameTarget) return;
    try {
      await api.put(`/api/projects/${renameTarget.id}`, { name: newName.trim() });
      setProjects(prev => prev.map(p => p.id === renameTarget.id ? { ...p, name: newName.trim() } : p));
      toast.success('Project renamed successfully');
    } catch {
      toast.error('Failed to rename project');
    } finally {
      setRenameTarget(null);
      setNewName('');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/projects/${deleteTarget.id}`);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (projects_.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No projects yet</p>
        <p className="text-gray-600 text-sm mt-1">Create your first TARA project</p>
      </div>
    );
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 text-gray-600 text-xs font-medium uppercase tracking-wider">
            <SortableHeader label="Project" sortKey="name" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-left" />
            <SortableHeader label="Vehicle Profile" sortKey="vehicle_profile.category" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-left" />
            <SortableHeader label="Risk" sortKey="max_risk_score" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-left" />
            <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-left" />
            <SortableHeader label={showAllColumns ? 'Role' : 'My Role'} sortKey="my_role" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-left" />
            <SortableHeader label="Last Update" sortKey="updated_at" currentSort={sortConfig} requestSort={requestSort} className="px-5 py-3 text-left" />
          </tr>
        </thead>
        <tbody>
          {displayedProjects.map((p) => {
            const vp = p.vehicle_profile || {};
            return (
              <tr
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}/editor`)}
                onContextMenu={(e) => handleContextMenu(e, p)}
                className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {vp.propulsion?.slice(0, 2) || 'PR'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-gray-600 text-xs">{p.description?.slice(0, 40) || ''}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {vp.category && <span className="text-gray-300 text-xs font-bold">{vp.category}</span>}
                    {vp.category && (vp.propulsion || vp.architecture) && <span className="text-gray-600 text-xs">/</span>}
                    {vp.propulsion && <span className="text-gray-400 text-xs">{vp.propulsion}</span>}
                    {vp.architecture && <span className="text-gray-600 text-xs">/ {vp.architecture}</span>}
                    {vp.sae_level !== undefined && <span className="text-gray-600 text-xs">/ SAE {vp.sae_level}</span>}
                    {vp.ota_support && <span className="text-blue-500 text-xs">/ OTA</span>}
                  </div>
                </td>

                <td className="px-5 py-3.5 text-left">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${riskBadge(p.max_risk_score || 0)}`}>
                    {p.max_risk_score ? riskLabel(p.max_risk_score) : 'DRAFT'}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-left">
                  <span className={`text-sm font-medium ${statusColor[p.status] || 'text-gray-400'}`}>
                    {p.status?.replace('_', ' ')}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-left">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${roleColor[p.my_role] || 'bg-gray-800 text-gray-400'}`}>
                    {p.my_role || '—'}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-left text-gray-500 text-xs font-mono">
                  {formatDateTime(p.updated_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {projects_.length > 25 && (
        <TablePagination limit={limit} setLimit={setLimit} total={projects_.length} />
      )}

      {/* Context Menu */}
      <ProjectContextMenu
        menu={contextMenu}
        canManage={contextMenu?.canManage}
        onClose={() => setContextMenu(null)}
        onRename={() => {
          setRenameTarget(contextMenu.project);
          setNewName(contextMenu.project.name);
          setContextMenu(null);
        }}
        onDelete={() => {
          setDeleteTarget(contextMenu.project);
          setContextMenu(null);
        }}
      />

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameTarget}
        title="Rename Project"
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRename}
        confirmText="Rename"
      >
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="Project name..."
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        title="Delete Project"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmText="Delete"
        confirmDanger={true}
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to permanently delete <span className="text-white font-medium">{deleteTarget?.name}</span>?
          This will remove all diagrams, threats, and compliance data. This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}

/* ── Main export ──────────────────────────────────────── */
export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      api.get('/api/projects'),
      api.get('/api/reports/global').catch(() => null)
    ])
      .then(([projectsRes, reportsRes]) => {
        let projectsData = projectsRes.data.projects;
        if (reportsRes?.data?.projects) {
          const reportProjects = reportsRes.data.projects;
          projectsData = projectsData.map(p => {
            const report = reportProjects.find(rp => rp.id === p.id);
            return {
              ...p,
              compliance_score: report ? report.compliance_score : undefined
            };
          });
        }
        setProjects(projectsData);
      })
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout breadcrumb={[{ label: user?.is_admin ? 'Admin Dashboard' : 'Dashboard' }]}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Loading workspace...</span>
          </div>
        </div>
      ) : user?.is_admin ? (
        <AdminDashboard projects={projects} />
      ) : (
        <UserDashboard projects={projects} user={user} />
      )}
    </AppLayout>
  );
}