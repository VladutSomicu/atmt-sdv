import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { dia, shapes } from '@joint/core';
import Modal from '../shared/Modal';
import toast from 'react-hot-toast';

export default function DiagramTab({ projectId, project, threats = [], selectedAssetId = null, isReadOnly = false }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [assets, setAssets] = useState([]);

  // Undo / Redo history stacks (JSON snapshots)
  const historyRef = useRef([]);   // past states
  const redoRef    = useRef([]);   // future states (after undo)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isRestoringRef = useRef(false); // prevent push during restore
  // Stable refs so keyboard handler can call undo/redo without stale closures
  const undoRef = useRef(null);
  const redoFnRef = useRef(null);

  const vp = project.vehicle_profile || {};

  useEffect(() => {
    const vehicleType = vp.propulsion || 'ICE';
    api.get(`/api/admin/public/assets?vehicle_type=${vehicleType}`)
      .then(res => setAssets(res.data.assets))
      .catch(() => toast.error('Failed to load component library'));
  }, []);

  // Color nodes by max risk score whenever threats change
  useEffect(() => {
    if (!graphRef.current || threats.length === 0) return;

    const riskByAsset = {};
    threats.forEach(t => {
      if (!t.asset_id) return;
      const current = riskByAsset[t.asset_id] || 0;
      riskByAsset[t.asset_id] = Math.max(current, t.risk_score || 0);
    });

    const riskStroke = (score) => {
      if (score >= 16) return '#dc2626';
      if (score >= 12) return '#ea580c';
      if (score >= 8)  return '#ca8a04';
      if (score >= 4)  return '#2563eb';
      return '#16a34a';
    };

    graphRef.current.getCells().forEach(cell => {
      if (cell.isLink()) return;
      const data = cell.get('data') || {};
      if (data.is_trust_boundary) return;
      const assetId = data.asset_ref_id;
      if (!assetId || !(assetId in riskByAsset)) return;
      const score = riskByAsset[assetId];
      cell.attr('body/stroke', riskStroke(score));
      cell.attr('body/strokeWidth', score >= 16 ? 2.5 : 1.5);
    });
  }, [threats]);
  // Highlight node when asset is selected from Analysis tab
  useEffect(() => {
    if (!graphRef.current || !selectedAssetId) return;

    graphRef.current.getCells().forEach(cell => {
      if (cell.isLink()) return;
      const data = cell.get('data') || {};
      if (data.is_trust_boundary) return;

      if (data.asset_ref_id === selectedAssetId) {
        // Pulse: briefly increase stroke width + white glow
        cell.attr('body/strokeWidth', 3);
        cell.attr('body/stroke', '#60a5fa'); // blue-400
        // Scroll/center on the node
        if (paperRef.current) {
          const pos = cell.position();
          const size = cell.size();
          paperRef.current.scrollToPoint(
            pos.x + size.width / 2,
            pos.y + size.height / 2
          );
        }
        // Reset after 1.5s
        setTimeout(() => {
          if (cell.graph) { // still on canvas
            cell.attr('body/strokeWidth', 2);
          }
        }, 1500);
      }
    });
  }, [selectedAssetId]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Delete or undo/redo via keyboard
    const handleKeyDown = (e) => {
      // Ignore when typing in inputs
      if (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA') return;

      if (isReadOnly) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCell) setDeleteTarget(selectedCell);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current?.();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoFnRef.current?.();
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
        interactive: !isReadOnly,
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
        if (isReadOnly) return;
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

      // Wire history: push snapshot after structural changes
      const pushSnap = () => {
        if (isRestoringRef.current) return;
        const snap = JSON.stringify(graph.toJSON());
        historyRef.current = [...historyRef.current.slice(-49), snap];
        redoRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
      };

      graph.on('add', pushSnap);
      graph.on('remove', pushSnap);
      // Push on pointer-up to capture moves (not every pixel)
      paper.on('cell:pointerup', pushSnap);

      // Load existing diagram
      api.get(`/api/diagrams/${projectId}`)
        .then(res => {
          if (res.data.diagram?.graph_json?._joint_raw) {
            isRestoringRef.current = true;
            graph.fromJSON(res.data.diagram.graph_json._joint_raw);
            isRestoringRef.current = false;
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

  const addTrustBoundary = useCallback(() => {
    if (!graphRef.current) return;
    const cell = new shapes.standard.Rectangle();
    cell.position(50, 50);
    cell.resize(300, 200);
    cell.attr({
      body: {
        fill: 'transparent',
        stroke: '#dc2626',
        strokeWidth: 2,
        strokeDasharray: '5 5',
        rx: 0,
        ry: 0,
      },
      label: {
        text: 'Trust Boundary',
        fill: '#fca5a5',
        fontSize: 12,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        refY: 10,
        refY2: 0,
      },
    });
    cell.set('data', {
      is_trust_boundary: true,
      label: 'Trust Boundary',
    });
    
    // Send to back so nodes sit on top
    graphRef.current.addCell(cell);
    cell.toBack();
  }, []);

  const saveDiagram = useCallback(async () => {
    if (!graphRef.current || isReadOnly) return;
    setSaving(true);

    try {
      await api.put(`/api/projects/${projectId}/lock`).catch(() => {});

      const jointJson = graphRef.current.toJSON();
      const nodes = [];
      const edges = [];
      const trust_boundaries = [];

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
            crosses_trust_boundary: cell.get('crosses_trust_boundary') || false,
            has_security_control: cell.get('has_security_control') || false,
          });
        } else {
          const pos = cell.position();
          const size = cell.size();
          const data = cell.get('data') || {};
          
          if (data.is_trust_boundary) {
            trust_boundaries.push({
              id: cell.id,
              label: data.label || 'Trust Boundary',
              position: { x: pos.x, y: pos.y, width: size.width, height: size.height }
            });
          } else {
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
        }
      });

      await api.post('/api/diagrams', {
        project_id: projectId,
        graph_json: {
          nodes,
          edges,
          trust_boundaries,
          external_entities: [],
          dfd_level: 1,
          vehicle_profile: vp,
          _joint_raw: jointJson,
        },
        dfd_level: 1,
      });

      setSaveMsg('Saved');
      toast.success('Diagram saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Save failed');
      toast.error('Failed to save diagram');
    } finally {
      setSaving(false);
      await api.put(`/api/projects/${projectId}/unlock`).catch(() => {});
    }
  }, [projectId, isReadOnly]);

  const undoHistory = useCallback(() => {
    if (historyRef.current.length === 0 || !graphRef.current) return;
    // Save current state to redo stack
    redoRef.current = [JSON.stringify(graphRef.current.toJSON()), ...redoRef.current];
    // Restore previous state
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    isRestoringRef.current = true;
    graphRef.current.fromJSON(JSON.parse(prev));
    isRestoringRef.current = false;
    setSelectedCell(null);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redoHistory = useCallback(() => {
    if (redoRef.current.length === 0 || !graphRef.current) return;
    // Save current state to undo stack
    historyRef.current = [...historyRef.current, JSON.stringify(graphRef.current.toJSON())];
    // Restore next state
    const next = redoRef.current[0];
    redoRef.current = redoRef.current.slice(1);
    isRestoringRef.current = true;
    graphRef.current.fromJSON(JSON.parse(next));
    isRestoringRef.current = false;
    setSelectedCell(null);
    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
  }, []);

  // Keep refs in sync with latest function instances
  undoRef.current = undoHistory;
  redoFnRef.current = redoHistory;

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  const handleZoom = (delta) => {
    if (!paperRef.current) return;
    const newZoom = Math.max(0.2, Math.min(3, zoom + delta));
    setZoom(newZoom);
    paperRef.current.scale(newZoom, newZoom);
  };

  const toggleGrid = () => {
    if (!paperRef.current) return;
    const next = !showGrid;
    setShowGrid(next);
    paperRef.current.setGridSize(next ? 10 : 1);
    if (next) {
      paperRef.current.drawGrid({ name: 'mesh', args: { color: '#1f2937', thickness: 1 } });
    } else {
      paperRef.current.clearGrid();
    }
  };

  const grouped = assets.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Components sidebar */}
      {!isReadOnly && (
        <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Components</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="mb-4">
              <button
                onClick={addTrustBoundary}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded border border-dashed border-red-800 text-red-400 hover:bg-red-900/20 hover:border-red-500 transition-colors text-xs font-medium"
              >
                + Add Trust Boundary
              </button>
            </div>
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
      )}

      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
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
              </>
            )}
            {isReadOnly && (
              <span className="text-gray-500 text-xs px-3 py-1 border border-gray-800 rounded bg-gray-900/50">Read Only</span>
            )}
          </div>
          
          <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded">
            <button
              onClick={undoHistory}
              disabled={!canUndo || isReadOnly}
              title="Undo (Ctrl+Z)"
              className="text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed px-2 rounded text-xs leading-none h-6 transition-colors"
            >
              ↩
            </button>
            <button
              onClick={redoHistory}
              disabled={!canRedo || isReadOnly}
              title="Redo (Ctrl+Y)"
              className="text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed px-2 rounded text-xs leading-none h-6 transition-colors"
            >
              ↪
            </button>
          </div>

          <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded">
            <button onClick={() => handleZoom(-0.2)} className="text-gray-400 hover:text-white hover:bg-gray-700 px-2 rounded text-xs leading-none h-6" title="Zoom Out">-</button>
            <span className="text-gray-400 text-xs w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => handleZoom(0.2)} className="text-gray-400 hover:text-white hover:bg-gray-700 px-2 rounded text-xs leading-none h-6" title="Zoom In">+</button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button onClick={toggleGrid} className={`px-2 rounded text-xs leading-none h-6 transition-colors ${showGrid ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Toggle Grid">Grid</button>
          </div>
        </div>

        <div
          ref={canvasRef}
          style={{ flex: 1, overflow: 'hidden' }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Inspector */}
      <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Inspector</span>
        </div>
        {selectedCell ? (
          <div className="px-3 py-3">
            <p className="text-white text-sm font-medium mb-3">
              {selectedCell.isLink() ? 'Connection (Edge)' : (selectedCell.get('data')?.label || 'Node')}
            </p>
            {selectedCell.isLink() ? (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Protocol</label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:border-blue-500 outline-none disabled:opacity-50"
                        value={selectedCell.get('protocol') || 'CAN'}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          selectedCell.set('protocol', e.target.value);
                          selectedCell.label(0, { attrs: { text: { text: e.target.value } } });
                          setSelectedCell(selectedCell.clone());
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
                      <label className={`flex items-center gap-2 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          className="rounded bg-gray-800 border-gray-700 text-blue-600 disabled:opacity-50"
                          checked={selectedCell.get('has_security_control') || false}
                          disabled={isReadOnly}
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
                      <label className={`flex items-center gap-2 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          className="rounded bg-gray-800 border-gray-700 text-blue-600 disabled:opacity-50"
                          checked={selectedCell.get('crosses_trust_boundary') || false}
                          disabled={isReadOnly}
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
              const currentName = contextMenu.cell.isLink()
                ? contextMenu.cell.get('protocol')
                : (contextMenu.cell.get('data')?.label || contextMenu.cell.attr('label/text'));
              setRenameValue(currentName || '');
              setRenameTarget(contextMenu.cell);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Rename
          </button>
          <button 
            onClick={() => {
              setDeleteTarget(contextMenu.cell);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!deleteTarget}
        title="Confirm Deletion"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTarget.remove();
            setSelectedCell(null);
            setDeleteTarget(null);
          }
        }}
        confirmText="Delete"
        confirmDanger={true}
      >
        <p className="text-gray-300 text-sm">
          Are you sure you want to delete this element? This action cannot be undone.
        </p>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={!!renameTarget}
        title="Rename Element"
        onClose={() => setRenameTarget(null)}
        onConfirm={() => {
          if (!renameTarget || !renameValue.trim()) return;
          if (renameTarget.isLink()) {
            renameTarget.set('protocol', renameValue.trim());
            renameTarget.label(0, { attrs: { text: { text: renameValue.trim() } } });
          } else {
            const data = renameTarget.get('data');
            renameTarget.set('data', { ...data, label: renameValue.trim() });
            renameTarget.attr('label/text', renameValue.trim());
          }
          setSelectedCell(renameTarget.clone());
          setRenameTarget(null);
        }}
        confirmText="Rename"
      >
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (renameTarget && renameValue.trim()) {
                if (renameTarget.isLink()) {
                  renameTarget.set('protocol', renameValue.trim());
                  renameTarget.label(0, { attrs: { text: { text: renameValue.trim() } } });
                } else {
                  const data = renameTarget.get('data');
                  renameTarget.set('data', { ...data, label: renameValue.trim() });
                  renameTarget.attr('label/text', renameValue.trim());
                }
                setSelectedCell(renameTarget.clone());
                setRenameTarget(null);
              }
            }
          }}
          autoFocus
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="New name..."
        />
      </Modal>
    </div>
  );
}
