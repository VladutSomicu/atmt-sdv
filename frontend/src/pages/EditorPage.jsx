import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { dia, shapes } from '@joint/core';

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
          <a href="/assets" className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Asset library</a>
          <a href={`/projects/${projectId}/audit`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Audit log</a>
          <a href={`/projects/${projectId}/members`} className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">Members</a>
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
            <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Projects</a>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium">{project.name}</span>
            <span className="text-gray-600">/</span>
            <span className="text-white font-medium capitalize">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-xs">Saved</span>
            <button
              onClick={() => setActiveTab('analysis')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Run analysis
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'diagram' && <DiagramTab projectId={projectId} project={project} />}
          {activeTab === 'analysis' && <AnalysisTab projectId={projectId} />}
          {activeTab === 'compliance' && <ComplianceTab projectId={projectId} />}
          {activeTab === 'report' && <ReportTab projectId={projectId} project={project} />}
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DIAGRAM TAB
══════════════════════════════════════════════════════ */
function DiagramTab({ projectId, project }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [assets, setAssets] = useState([]);

  const vp = project.vehicle_profile || {};

  useEffect(() => {
    const vehicleType = vp.propulsion || 'ICE';
    api.get(`/api/admin/public/assets?vehicle_type=${vehicleType}`)
      .then(res => setAssets(res.data.assets))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Delete selected cell with Delete or Backspace key
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA') return;
        if (selectedCell) {
          selectedCell.remove();
          setSelectedCell(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      const container = canvasRef.current;
      if (!container) return;

      const graph = new dia.Graph({}, { cellNamespace: shapes });
      graphRef.current = graph;

      const paper = new dia.Paper({
        el: container,
        model: graph,
        width: container.offsetWidth || 800,
        height: container.offsetHeight || 600,
        gridSize: 10,
        drawGrid: { name: 'mesh', args: { color: '#1f2937', thickness: 1 } },
        background: { color: '#030712' },
        cellViewNamespace: shapes,
        interactive: true,
        defaultLink: () => new shapes.standard.Link({
          attrs: { 
            line: { stroke: '#374151', strokeWidth: 1.5, targetMarker: { type: 'path', fill: '#374151', stroke: 'none', d: 'M 7 -3 0 0 7 3 z' } }
          },
          protocol: 'CAN'
        }),
        validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
          // Prevent linking to self
          return sourceView !== targetView;
        },
      });

      paperRef.current = paper;

      paper.on('cell:pointerclick', (cellView) => {
        setSelectedCell(cellView.model);
        setContextMenu(null);
      });

      paper.on('blank:pointerclick', () => {
        setSelectedCell(null);
        setContextMenu(null);
      });

      paper.on('cell:contextmenu', (cellView, evt) => {
        evt.preventDefault();
        setSelectedCell(cellView.model);
        setContextMenu({
          cell: cellView.model,
          x: evt.clientX,
          y: evt.clientY
        });
      });

      paper.on('blank:contextmenu', (evt) => {
        evt.preventDefault();
        setContextMenu(null);
      });

      paper.on('blank:pointerdown', () => setContextMenu(null));
      paper.on('cell:pointerdown', () => setContextMenu(null));

      // Load existing diagram
      api.get(`/api/diagrams/${projectId}`)
        .then(res => {
          if (res.data.diagram?.graph_json?._joint_raw) {
            graph.fromJSON(res.data.diagram.graph_json._joint_raw);
          }
        })
        .catch(() => {});
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (paperRef.current) {
        paperRef.current.remove();
        paperRef.current = null;
      }
      if (graphRef.current) {
        graphRef.current.clear();
        graphRef.current = null;
      }
    };
  }, [projectId]);

  const addNode = useCallback((asset) => {
    if (!graphRef.current) return;

    const categoryColors = {
      'Safety-Critical': { fill: '#1c1917', stroke: '#dc2626', text: '#fca5a5' },
      'Connectivity':    { fill: '#0f172a', stroke: '#2563eb', text: '#93c5fd' },
      'Infotainment':    { fill: '#0f172a', stroke: '#7c3aed', text: '#c4b5fd' },
      'Powertrain':      { fill: '#1c1917', stroke: '#d97706', text: '#fcd34d' },
      'Perception':      { fill: '#0f172a', stroke: '#059669', text: '#6ee7b7' },
      'Diagnostic':      { fill: '#1c1917', stroke: '#6b7280', text: '#d1d5db' },
      'Cloud':           { fill: '#0f172a', stroke: '#0891b2', text: '#67e8f9' },
    };

    const colors = categoryColors[asset.category] || { fill: '#111827', stroke: '#374151', text: '#9ca3af' };

    const cell = new shapes.standard.Rectangle({
      ports: {
        groups: {
          'in': {
            position: 'left',
            attrs: { circle: { r: 4, magnet: true, stroke: colors.stroke, fill: '#030712', strokeWidth: 1.5 } }
          },
          'out': {
            position: 'right',
            attrs: { circle: { r: 4, magnet: true, stroke: colors.stroke, fill: '#030712', strokeWidth: 1.5 } }
          }
        },
        items: [{ id: 'in', group: 'in' }, { id: 'out', group: 'out' }]
      }
    });
    cell.position(80 + Math.random() * 300, 80 + Math.random() * 200);
    cell.resize(150, 60);
    cell.attr({
      body: {
        fill: colors.fill,
        stroke: colors.stroke,
        strokeWidth: 1.5,
        rx: 6,
        ry: 6,
      },
      label: {
        text: asset.name,
        fill: colors.text,
        fontSize: 11,
        fontFamily: 'monospace',
        fontWeight: 'bold',
      },
    });
    cell.set('data', {
      asset_ref_id: asset.id,
      label: asset.name,
      category: asset.category,
      interface_types: asset.interface_types || [],
      data_types: asset.data_types || [],
      physical_accessibility: asset.physical_accessibility || 'Internal',
      asil_level: asset.asil_level,
      flags: asset.flags || [],
    });

    graphRef.current.addCell(cell);
  }, []);

  const saveDiagram = useCallback(async () => {
    if (!graphRef.current) return;
    setSaving(true);

    try {
      await api.put(`/api/projects/${projectId}/lock`).catch(() => {});

      const jointJson = graphRef.current.toJSON();
      const nodes = [];
      const edges = [];

      graphRef.current.getCells().forEach(cell => {
        if (cell.isLink()) {
          const source = cell.getSourceElement();
          const target = cell.getTargetElement();
          edges.push({
            id: cell.id,
            source: source?.id || '',
            target: target?.id || '',
            protocol: cell.get('protocol') || 'CAN',
            label: '',
            crosses_trust_boundary: false,
            has_security_control: false,
          });
        } else {
          const pos = cell.position();
          const data = cell.get('data') || {};
          nodes.push({
            id: cell.id,
            label: data.label || cell.attr('label/text') || '',
            asset_ref_id: data.asset_ref_id || null,
            category: data.category || 'Connectivity',
            interface_types: data.interface_types || [],
            data_types: data.data_types || [],
            physical_accessibility: data.physical_accessibility || 'Internal',
            asil_level: data.asil_level || null,
            flags: data.flags || [],
            sdv_meta: null,
            position: { x: pos.x, y: pos.y },
          });
        }
      });

      await api.post('/api/diagrams', {
        project_id: projectId,
        graph_json: {
          nodes,
          edges,
          trust_boundaries: [],
          external_entities: [],
          dfd_level: 1,
          vehicle_profile: vp,
          _joint_raw: jointJson,
        },
        dfd_level: 1,
      });

      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg('Save failed');
    } finally {
      setSaving(false);
      await api.put(`/api/projects/${projectId}/unlock`).catch(() => {});
    }
  }, [projectId]);

  const grouped = assets.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Components sidebar */}
      <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Components</span>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-3">
              <p className="text-gray-600 text-xs uppercase tracking-widest px-1 mb-1">{category}</p>
              {items.map(asset => (
                <div
                  key={asset.id}
                  onDoubleClick={() => addNode(asset)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-800 transition-colors mb-0.5"
                  title="Double-click to add to canvas"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-gray-300 text-xs">{asset.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center gap-3 px-3 flex-shrink-0">
          <button
            onClick={saveDiagram}
            disabled={saving}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded transition-colors"
          >
            {saving ? 'Saving...' : 'Save diagram'}
          </button>
          {saveMsg && (
            <span className={`text-xs ${saveMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>
              {saveMsg}
            </span>
          )}
          <span className="text-gray-600 text-xs">Double-click an asset to add it</span>
        </div>

        <div
          ref={canvasRef}
          style={{ flex: 1, overflow: 'hidden' }}
        />
      </div>

      {/* Inspector */}
      <div className="w-56 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Inspector</span>
        </div>
        {selectedCell ? (
          <div className="px-3 py-4 text-gray-600 text-xs">
            {/* Same inspector as before */}
          <div className="px-3 py-3">
            <p className="text-white text-sm font-medium mb-3">
              {selectedCell.isLink() ? 'Connection (Edge)' : (selectedCell.get('data')?.label || 'Node')}
            </p>
            {selectedCell.isLink() ? (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Protocol</label>
                  <select
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                    value={selectedCell.get('protocol') || 'CAN'}
                    onChange={(e) => {
                      selectedCell.set('protocol', e.target.value);
                      selectedCell.label(0, { attrs: { text: { text: e.target.value } } });
                      setSelectedCell(selectedCell.clone()); // trigger re-render hack
                    }}
                  >
                    <option value="CAN">CAN</option>
                    <option value="LIN">LIN</option>
                    <option value="Ethernet">Ethernet</option>
                    <option value="Bluetooth">Bluetooth</option>
                    <option value="Wi-Fi">Wi-Fi</option>
                    <option value="Cellular">Cellular</option>
                    <option value="UWB">UWB</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded bg-gray-800 border-gray-700 text-blue-600"
                      checked={selectedCell.get('has_security_control') || false}
                      onChange={(e) => {
                        selectedCell.set('has_security_control', e.target.checked);
                        selectedCell.attr('line/stroke', e.target.checked ? '#10b981' : '#374151');
                        setSelectedCell(selectedCell.clone());
                      }}
                    />
                    <span className="text-gray-300 text-xs">Security Control (SecOC/TLS)</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded bg-gray-800 border-gray-700 text-blue-600"
                      checked={selectedCell.get('crosses_trust_boundary') || false}
                      onChange={(e) => {
                        selectedCell.set('crosses_trust_boundary', e.target.checked);
                        selectedCell.attr('line/strokeDasharray', e.target.checked ? '5 5' : '');
                        setSelectedCell(selectedCell.clone());
                      }}
                    />
                    <span className="text-gray-300 text-xs">Crosses Trust Boundary</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Category', selectedCell.get('data')?.category],
                  ['Interfaces', selectedCell.get('data')?.interface_types?.join(', ')],
                  ['Data types', selectedCell.get('data')?.data_types?.join(', ')],
                  ['Accessibility', selectedCell.get('data')?.physical_accessibility],
                  ['ASIL', selectedCell.get('data')?.asil_level || 'N/A'],
                  ['Flags', selectedCell.get('data')?.flags?.join(', ')],
                ].map(([k, v]) => v && (
                  <div key={k}>
                    <p className="text-gray-600 text-xs uppercase tracking-wider">{k}</p>
                    <p className="text-gray-300 text-xs mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-3 py-4 text-gray-600 text-xs">
            Click a node or edge to inspect its properties.
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded shadow-lg overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x, width: 140 }}
          onClick={() => setContextMenu(null)}
        >
          <button 
            onClick={() => {
              const currentName = contextMenu.cell.isLink() ? contextMenu.cell.get('protocol') : (contextMenu.cell.get('data')?.label || contextMenu.cell.attr('label/text'));
              const newLabel = prompt('Rename:', currentName);
              if (newLabel) {
                if (contextMenu.cell.isLink()) {
                  contextMenu.cell.set('protocol', newLabel);
                  contextMenu.cell.label(0, { attrs: { text: { text: newLabel } } });
                } else {
                  const data = contextMenu.cell.get('data');
                  contextMenu.cell.set('data', { ...data, label: newLabel });
                  contextMenu.cell.attr('label/text', newLabel);
                }
                setSelectedCell(contextMenu.cell.clone()); // force update
              }
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Rename
          </button>
          <button 
            onClick={() => {
              contextMenu.cell.remove();
              setSelectedCell(null);
            }}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ANALYSIS TAB
══════════════════════════════════════════════════════ */
function AnalysisTab({ projectId }) {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [controls, setControls] = useState([]);

  const loadThreats = () => {
    api.get(`/api/threats/${projectId}`)
      .then(res => setThreats(res.data.threats))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadThreats(); }, [projectId]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.post('/api/analyze', { project_id: projectId });
      loadThreats();
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectThreat = async (threat) => {
    setSelected(threat);
    try {
      const res = await api.get(`/api/threats/detail/${threat.id}`);
      setControls(res.data.available_controls || []);
    } catch (err) {
      console.error(err);
    }
  };

  const riskColor = (score) => {
    if (score >= 16) return 'bg-red-900 text-red-300 border-red-800';
    if (score >= 12) return 'bg-orange-900 text-orange-300 border-orange-800';
    if (score >= 8)  return 'bg-yellow-900 text-yellow-300 border-yellow-800';
    if (score >= 4)  return 'bg-blue-900 text-blue-300 border-blue-800';
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const riskLabel = (score) => {
    if (score >= 16) return 'CRITICAL';
    if (score >= 12) return 'HIGH';
    if (score >= 8)  return 'MEDIUM';
    if (score >= 4)  return 'LOW';
    return 'NEGLIGIBLE';
  };

  const strideColor = {
    'Spoofing': 'bg-red-900/50 text-red-300',
    'Tampering': 'bg-orange-900/50 text-orange-300',
    'Repudiation': 'bg-yellow-900/50 text-yellow-300',
    'Information Disclosure': 'bg-blue-900/50 text-blue-300',
    'Denial of Service': 'bg-purple-900/50 text-purple-300',
    'Elevation of Privilege': 'bg-pink-900/50 text-pink-300',
  };

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Threats list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">
              {threats.length} threats identified
            </span>
            {threats.length > 0 && (
              <div className="flex gap-2 text-xs">
                <span className="text-red-400">{threats.filter(t => t.risk_score >= 16).length} critical</span>
                <span className="text-orange-400">{threats.filter(t => t.risk_score >= 12 && t.risk_score < 16).length} high</span>
                <span className="text-yellow-400">{threats.filter(t => t.risk_score >= 8 && t.risk_score < 12).length} medium</span>
              </div>
            )}
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Run analysis'}
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">Loading...</div>
        ) : threats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-2">No threats identified yet</p>
              <p className="text-gray-600 text-sm">Save a diagram and run analysis</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-950">
                <tr className="border-b border-gray-800">
                  {['THREAT', 'STRIDE', 'SOURCE', 'ASSET', 'SFOP', 'RISK', 'STATUS'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-gray-600 font-medium uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {threats.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => selectThreat(t)}
                    className={`border-b border-gray-800 cursor-pointer transition-colors ${
                      selected?.id === t.id ? 'bg-blue-900/20' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-white text-xs font-medium">{t.title}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${strideColor[t.stride_category] || 'bg-gray-800 text-gray-400'}`}>
                        {t.stride_category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{t.source_ref || t.source || '-'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{t.asset_id}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">
                      {t.impact_safety}-{t.impact_financial}-{t.impact_operational}-{t.impact_privacy}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${riskColor(t.risk_score)}`}>
                        {t.risk_score} {riskLabel(t.risk_score)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${
                        t.status === 'mitigated' ? 'text-green-400' :
                        t.status === 'accepted' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Threat detail panel */}
      {selected && (
        <ThreatDetailPanel
          threat={selected}
          controls={controls}
          projectId={projectId}
          onUpdate={() => { loadThreats(); setSelected(null); }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   THREAT DETAIL PANEL
══════════════════════════════════════════════════════ */
function ThreatDetailPanel({ threat, controls, onUpdate, onClose }) {
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
    } catch (err) {
      console.error(err);
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
                className="w-full accent-blue-500"
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
              className="w-full accent-blue-500"
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
                className={`p-2 rounded-lg border mb-1.5 cursor-pointer transition-colors ${
                  selectedControls.includes(c.id)
                    ? 'border-green-700 bg-green-900/20'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-medium">{c.title}</p>
                  <span className="text-green-400 text-xs ml-1">-{c.feasibility_reduction}</span>
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
                onClick={() => setTreatment(t)}
                className={`py-1 rounded text-xs font-medium transition-colors capitalize ${
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
                onClick={() => setStatus(s)}
                className={`py-1 rounded text-xs font-medium transition-colors capitalize ${
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
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COMPLIANCE TAB
══════════════════════════════════════════════════════ */
function ComplianceTab({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/compliance/${projectId}`)
      .then(res => setData(res.data.compliance))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-600 p-8">Loading...</div>;
  if (!data) return <div className="flex-1 flex items-center justify-center text-red-400 p-8">Failed to load compliance data</div>;

  const { checks, summary } = data;
  const pct = Math.round((summary.passed / summary.total) * 100);

  const statusBadge = (status) => {
    if (status === 'pass') return 'bg-green-900 text-green-300';
    if (status === 'fail') return 'bg-red-900 text-red-300';
    return 'bg-gray-800 text-gray-400';
  };

  const grouped = checks.reduce((acc, c) => {
    if (!acc[c.regulation]) acc[c.regulation] = [];
    acc[c.regulation].push(c);
    return acc;
  }, {});

  return (
    <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 col-span-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Overall compliance</p>
          <p className={`text-3xl font-bold ${pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {pct}%
          </p>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {[
          { label: 'Passed', value: summary.passed, color: 'text-green-400' },
          { label: 'Failed', value: summary.failed, color: 'text-red-400' },
          { label: 'N/A', value: summary.not_applicable, color: 'text-gray-400' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{card.label}</p>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Checks by regulation */}
      {Object.entries(grouped).map(([regulation, items]) => (
        <div key={regulation} className="mb-6">
          <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            {regulation}
            <span className="text-gray-600 text-xs font-normal">
              {items.filter(i => i.status === 'pass').length} / {items.length} pass
            </span>
          </h3>
          <div className="space-y-2">
            {items.map(check => (
              <div key={check.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-blue-400 text-xs font-mono">{check.id}</span>
                    <p className="text-white text-sm">{check.title}</p>
                  </div>
                  <p className="text-gray-500 text-xs">{check.details}</p>
                  <p className="text-gray-700 text-xs mt-0.5">Ref: {check.reference}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${statusBadge(check.status)}`}>
                  {check.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   REPORT TAB
══════════════════════════════════════════════════════ */
function ReportTab({ projectId, project }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    setGenerating(true);
    setError('');
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
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          setError(json.error || 'Failed to generate report');
        } catch {
          setError('Failed to generate report');
        }
      } else {
        setError(err.response?.data?.error || 'Failed to generate report');
      }
    } finally {
      setGenerating(false);
    }
  };

  const vp = project.vehicle_profile || {};

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Report preview placeholder */}
      <div className="flex-1 flex items-center justify-center bg-gray-950 p-8">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">TARA Report - ISO 21434</p>
              <h2 className="text-gray-900 text-2xl font-bold mt-1">{project.name}</h2>
              <p className="text-gray-500 text-sm">Threat Analysis and Risk Assessment</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">A</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              ['Propulsion', vp.propulsion || 'N/A'],
              ['Architecture', vp.architecture || 'N/A'],
              ['SAE Level', vp.sae_level !== undefined ? `L${vp.sae_level}` : 'N/A'],
              ['OTA Support', vp.ota_support ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs">{k}</p>
                <p className="text-gray-900 text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>

          <p className="text-gray-400 text-xs text-center">
            PDF will be generated with full threat catalog, compliance evidence, and audit trail.
          </p>
        </div>
      </div>

      {/* Export panel */}
      <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0 p-4">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-4">Export</p>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 text-xs p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors mb-3"
        >
          {generating ? 'Generating...' : 'Generate PDF'}
        </button>

        <p className="text-gray-600 text-xs">
          Report will be blocked if critical risks are still open. Resolve all critical threats before generating.
        </p>

        <div className="mt-6">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Project status</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Status</span>
              <span className="text-white capitalize">{project.status.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Standards</span>
              <span className="text-white">R155 / R156</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}