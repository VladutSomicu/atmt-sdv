import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { dia, shapes } from '@joint/core';
import Modal from '../shared/Modal';
import InspectorPanel from './InspectorPanel';
import toast from 'react-hot-toast';

// Define a custom shape for Trust Boundaries so the router can exclude it by type
const TrustBoundaryShape = dia.Element.define('atmt.TrustBoundary', {
  markup: [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'text', selector: 'label' },
    { tagName: 'rect', selector: 'resizeHandle' }
  ],
  attrs: {
    body: { refWidth: '100%', refHeight: '100%', fill: 'rgba(217,119,6,0.05)', stroke: '#d97706', strokeWidth: 2, strokeDasharray: '8 4', rx: 0, ry: 0, magnet: false },
    label: { text: 'Trust Boundary', fill: '#fcd34d', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', refY: 14 },
    resizeHandle: {
      x: 'calc(w - 6)', y: 'calc(h - 6)',
      width: 10, height: 10, fill: '#d97706', cursor: 'nwse-resize',
      event: 'element:resize'
    }
  }
});
// Register it in the shapes namespace
Object.assign(shapes, {
  atmt: {
    TrustBoundary: TrustBoundaryShape
  }
});

/* ── Category Colors ── */
const CAT_COLORS = {
  'Safety-Critical': { fill: '#1c1917', stroke: '#dc2626', text: '#fca5a5' },
  'Connectivity': { fill: '#0f172a', stroke: '#2563eb', text: '#93c5fd' },
  'User Interface': { fill: '#0f172a', stroke: '#7c3aed', text: '#c4b5fd' },
  'Infotainment': { fill: '#0f172a', stroke: '#7c3aed', text: '#c4b5fd' },
  'Powertrain': { fill: '#1c1917', stroke: '#d97706', text: '#fcd34d' },
  'Perception': { fill: '#0f172a', stroke: '#059669', text: '#6ee7b7' },
  'Diagnostic': { fill: '#1c1917', stroke: '#6b7280', text: '#d1d5db' },
  'Cloud': { fill: '#0f172a', stroke: '#0891b2', text: '#67e8f9' },
  'ECU': { fill: '#1c1917', stroke: '#d97706', text: '#fcd34d' },
  'Gateway': { fill: '#1c1917', stroke: '#dc2626', text: '#fca5a5' },
};

const riskStroke = (score) => {
  if (score >= 16) return '#dc2626';
  if (score >= 12) return '#ea580c';
  if (score >= 8) return '#ca8a04';
  if (score >= 4) return '#2563eb';
  return '#16a34a';
};

export default function DiagramTab({ projectId, project, threats = [], onDiagramSaved, canEdit = true }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);
  const selectedRef = useRef(null);

  const [selectedCell, setSelectedCell] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [assets, setAssets] = useState([]);
  const [tick, setTick] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [riskColors, setRiskColors] = useState(true);

  // Undo/Redo
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isRestoringRef = useRef(false);
  const undoFnRef = useRef(null);
  const redoFnRef = useRef(null);
  const saveFnRef = useRef(null);

  // Lock state — start optimistic (no read-only flash while awaiting lock response)
  const [lockError, setLockError] = useState(null);
  const lockAcquiredRef = useRef(false);
  const hadConflictRef = useRef(false);

  const vp = project.vehicle_profile || {};

  // Keep selectedRef in sync
  useEffect(() => { selectedRef.current = selectedCell; }, [selectedCell]);

  // Editable = user has edit rights AND no lock conflict with another user
  const editable = canEdit && !lockError;
  const editableRef = useRef(editable);

  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);

  // Dynamically update paper interactivity when editable state changes
  useEffect(() => {
    if (paperRef.current) {
      if (editable) {
        paperRef.current.setInteractivity({
          linkMove: true,
          elementMove: true,
          arrowheadMove: true,
          addLinkFromMagnet: true,
        });
      } else {
        paperRef.current.setInteractivity(false);
      }
    }
  }, [editable]);

  // Auto lock/unlock/polling for edit mode
  useEffect(() => {
    if (!canEdit) return;

    setLockError(null);

    const acquireLock = async () => {
      try {
        await api.put(`/api/projects/${projectId}/lock`);
        if (hadConflictRef.current) {
          toast.success('Diagram is now unlocked. You can edit.');
          hadConflictRef.current = false;
        }
        lockAcquiredRef.current = true;
        setLockError(null);
      } catch (err) {
        const msg = err.response?.data?.error || 'Could not acquire diagram lock';
        setLockError(msg);
        lockAcquiredRef.current = false;
        hadConflictRef.current = true;
      }
    };

    acquireLock();

    // Poll every 5 seconds to either refresh the lock (heartbeat) or attempt to acquire it
    const intervalId = setInterval(acquireLock, 5000);

    const releaseLock = () => {
      if (lockAcquiredRef.current) {
        const token = localStorage.getItem('access_token');
        const baseUrl = api.defaults.baseURL || 'http://localhost:5000';

        // 1. Use modern keepalive fetch (extremely reliable during unload and supports query string authentication)
        if (token) {
          const url = `${baseUrl}/api/projects/${projectId}/unlock?jwt=${token}`;
          fetch(url, {
            method: 'POST',
            keepalive: true
          }).catch(() => { });
        } else if (navigator.sendBeacon) {
          const url = `${baseUrl}/api/projects/${projectId}/unlock`;
          navigator.sendBeacon(url, '');
        }

        // 2. Also try normal axios request (for standard in-app navigation)
        api.put(`/api/projects/${projectId}/unlock`).catch(() => { });

        lockAcquiredRef.current = false;
      }
    };

    window.addEventListener('beforeunload', releaseLock);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', releaseLock);
      releaseLock();
    };
  }, [projectId, canEdit]);

  useEffect(() => {
    const vehicleType = vp.propulsion || 'ICE';
    const architecture = vp.architecture || 'Classic';
    const ext = vp.external_interfaces || [];

    api.get(`/api/admin/public/assets?vehicle_type=${vehicleType}&architecture=${architecture}`)
      .then(res => {
        let fetched = res.data.assets || [];
        
        if (!ext.includes('Cloud') && !ext.includes('Cellular') && !ext.includes('Wi-Fi')) {
          fetched = fetched.filter(a => a.category !== 'Cloud');
        }
        if (!ext.includes('V2X')) {
          fetched = fetched.filter(a => !(a.interface_types?.includes('V2X') && a.interface_types?.length === 1));
        }
        
        setAssets(fetched);
      })
      .catch(() => toast.error('Failed to load component library'));
  }, []);

  // Color nodes by risk score
  useEffect(() => {
    if (!graphRef.current || !riskColors) return;
    const riskByAsset = {};
    const countByAsset = {};
    threats.forEach(t => {
      if (!t.asset_id) return;
      riskByAsset[t.asset_id] = Math.max(riskByAsset[t.asset_id] || 0, t.risk_score || 0);
      countByAsset[t.asset_id] = (countByAsset[t.asset_id] || 0) + 1;
    });
    graphRef.current.getCells().forEach(cell => {
      if (cell.isLink()) return;
      const d = cell.get('data') || {};
      if (d.is_trust_boundary) return;
      const aid = d.asset_ref_id;
      if (!aid) return;
      if (aid in riskByAsset) {
        cell.attr('body/stroke', riskStroke(riskByAsset[aid]));
        cell.attr('body/strokeWidth', riskByAsset[aid] >= 16 ? 2.5 : 1.5);
      }
    });
  }, [threats, riskColors]);

  const loadDiagram = useCallback(async () => {
    if (!graphRef.current) return;
    try {
      const res = await api.get(`/api/diagrams/${projectId}`);
      isRestoringRef.current = true;
      graphRef.current.clear();
      if (res.data.diagram?.graph_json?._joint_raw) {
        const raw = res.data.diagram.graph_json._joint_raw;
        // Migrate existing elements
        if (raw.cells) {
          raw.cells.forEach(cell => {
            if (cell.data && cell.data.is_trust_boundary) {
              cell.type = 'atmt.TrustBoundary';
            }
            if (cell.type === 'standard.Link') {
              cell.router = { name: 'manhattan', args: { excludeTypes: ['atmt.TrustBoundary'] } };
            }
          });
        }
        graphRef.current.fromJSON(raw);
      }
      isRestoringRef.current = false;

      // Ensure all standard nodes have their ports correctly defined on load
      graphRef.current.getElements().forEach(cell => {
        const d = cell.get('data') || {};
        if (d.is_trust_boundary) return;

        const colors = CAT_COLORS[d.category] || { fill: '#111827', stroke: '#374151', text: '#9ca3af' };
        cell.prop('ports', {
          groups: {
            top: {
              position: { name: 'top' },
              markup: [{ tagName: 'circle', selector: 'portBody' }],
              attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
            },
            bottom: {
              position: { name: 'bottom' },
              markup: [{ tagName: 'circle', selector: 'portBody' }],
              attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
            },
            left: {
              position: { name: 'left' },
              markup: [{ tagName: 'circle', selector: 'portBody' }],
              attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
            },
            right: {
              position: { name: 'right' },
              markup: [{ tagName: 'circle', selector: 'portBody' }],
              attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
            }
          },
          items: [
            { group: 'top', id: 'top' },
            { group: 'bottom', id: 'bottom' },
            { group: 'left', id: 'left' },
            { group: 'right', id: 'right' }
          ]
        });
      });

      historyRef.current = [JSON.stringify(graphRef.current.toJSON())];
      setCanUndo(false);
      setCanRedo(false);
      setSelectedCell(null);
    } catch (err) {
      console.error('Error loading diagram:', err);
    }
  }, [projectId]);


  // ── Init JointJS ──
  useEffect(() => {
    if (!canvasRef.current) return;

    const handleKeyDown = (e) => {
      if (!editableRef.current) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRef.current) {
        e.preventDefault();
        setDeleteTarget(selectedRef.current);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoFnRef.current?.(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoFnRef.current?.(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFnRef.current?.(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    let wheelHandler = null;
    let resizeObs = null;

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
        interactive: { linkMove: true, elementMove: true, arrowheadMove: true, addLinkFromMagnet: true },
        defaultLink: () => {
          const lnk = new shapes.standard.Link({
            attrs: {
              line: { stroke: '#4b5563', strokeWidth: 1.5, targetMarker: { type: 'path', fill: '#4b5563', stroke: 'none', d: 'M 7 -3 0 0 7 3 z' } }
            },
            protocol: 'CAN',
            has_security_control: false,
            crosses_trust_boundary: false,
            labels: [{ attrs: { text: { text: 'CAN', fill: '#9ca3af', fontSize: 10 } }, position: 0.5 }],
            connector: { name: 'rounded' }
          });
          lnk.router('manhattan', { excludeTypes: ['atmt.TrustBoundary'] });
          return lnk;
        },
        linkPinning: false,
        snapLinks: { radius: 30 },
        defaultConnectionPoint: { name: 'boundary' },
        validateMagnet: (cellView, magnet) => {
          if (!magnet) return false;
          if (cellView.model.get('data')?.is_trust_boundary) return false;
          const val = magnet.getAttribute('magnet');
          return val && val !== 'false';
        },
        validateConnection: (srcView, srcMag, tgtView, tgtMag) => {
          if (srcView === tgtView) return false;
          if (tgtView.model.get('data')?.is_trust_boundary) return false;
          if (!tgtMag) return false;
          const val = tgtMag.getAttribute('magnet');
          return val && val !== 'false';
        },
      });
      paperRef.current = paper;

      // Auto-resize paper when container resizes
      resizeObs = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) paper.setDimensions(width, height);
        }
      });
      resizeObs.observe(container);

      // ── Canvas panning & resizing ──
      let isPanning = false;
      let panStart = { x: 0, y: 0 };
      let panOrigin = { x: 0, y: 0 };
      let activeResizeView = null;
      let resizeStartSize = null;
      let resizeStartPos = null;

      paper.on('blank:pointerdown', (evt, x, y) => {
        setContextMenu(null);
        isPanning = true;
        panStart = { x: evt.clientX, y: evt.clientY };
        panOrigin = paper.translate();
        container.style.cursor = 'grabbing';
      });

      paper.on('element:resize', (elementView, evt) => {
        evt.stopPropagation();
        if (!editableRef.current) return;
        activeResizeView = elementView;
        resizeStartSize = elementView.model.size();
        resizeStartPos = { x: evt.clientX, y: evt.clientY };
        container.style.cursor = 'nwse-resize';
      });

      const onGlobalMouseMove = (e) => {
        if (isPanning) {
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          paper.translate(panOrigin.x + dx, panOrigin.y + dy);
        } else if (activeResizeView) {
          const scale = paper.scale().sx;
          const dx = (e.clientX - resizeStartPos.x) / scale;
          const dy = (e.clientY - resizeStartPos.y) / scale;
          activeResizeView.model.resize(
            Math.max(100, resizeStartSize.width + dx),
            Math.max(50, resizeStartSize.height + dy)
          );
        }
      };

      const onGlobalMouseUp = () => {
        if (isPanning) {
          isPanning = false;
          container.style.cursor = '';
        }
        if (activeResizeView) {
          activeResizeView = null;
          container.style.cursor = '';
          pushSnap();
        }
      };
      document.addEventListener('mousemove', onGlobalMouseMove);
      document.addEventListener('mouseup', onGlobalMouseUp);

      // Selection
      paper.on('cell:pointerclick', (cv) => {
        // Deselect previous
        if (selectedRef.current && selectedRef.current !== cv.model) {
          try {
            const prev = selectedRef.current;
            if (!prev.isLink() && prev.graph) {
              const d = prev.get('data') || {};
              if (!d.is_trust_boundary) {
                const cat = d.category || '';
                const origStroke = CAT_COLORS[cat]?.stroke || '#374151';
                prev.attr('body/stroke', origStroke);
                prev.attr('body/strokeWidth', 1.5);
              }
            }
          } catch (e) { }
        }
        // Highlight new
        if (!cv.model.isLink()) {
          const d = cv.model.get('data') || {};
          if (!d.is_trust_boundary) {
            cv.model.attr('body/stroke', '#3b82f6');
            cv.model.attr('body/strokeWidth', 2);
          }
        }
        setSelectedCell(cv.model);
        setContextMenu(null);
      });

      paper.on('blank:pointerclick', () => {
        // Deselect current
        if (selectedRef.current && !selectedRef.current.isLink()) {
          try {
            const prev = selectedRef.current;
            if (prev.graph) {
              const d = prev.get('data') || {};
              if (!d.is_trust_boundary) {
                const cat = d.category || '';
                const origStroke = CAT_COLORS[cat]?.stroke || '#374151';
                prev.attr('body/stroke', origStroke);
                prev.attr('body/strokeWidth', 1.5);
              }
            }
          } catch (e) { }
        }
        setSelectedCell(null);
        setContextMenu(null);
      });

      // Context menu
      paper.on('cell:contextmenu', (cv, evt) => {
        evt.preventDefault();
        if (!editableRef.current) return;
        setSelectedCell(cv.model);
        setContextMenu({ cell: cv.model, x: evt.clientX, y: evt.clientY });
      });
      paper.on('blank:contextmenu', (evt) => { evt.preventDefault(); setContextMenu(null); });

      // Double-click inline rename
      paper.on('cell:pointerdblclick', (cv) => {
        if (!editableRef.current) return;
        if (cv.model.isLink()) return;
        const d = cv.model.get('data') || {};
        const label = d.is_trust_boundary ? (d.label || 'Trust Boundary') : (d.label || cv.model.attr('label/text') || '');
        setRenameValue(label);
        setRenameTarget(cv.model);
      });

      // Mouse wheel zoom
      wheelHandler = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const cur = paper.scale().sx;
        const next = Math.max(0.2, Math.min(3, cur + delta));
        paper.scale(next, next);
        setZoom(next);
      };
      container.addEventListener('wheel', wheelHandler, { passive: false });

      // History snapshots
      const pushSnap = () => {
        if (isRestoringRef.current) return;
        const snap = JSON.stringify(graph.toJSON());
        const stack = historyRef.current;
        if (stack.length > 0 && stack[stack.length - 1] === snap) return;
        historyRef.current = [...stack.slice(-49), snap];
        redoStackRef.current = [];
        setCanUndo(historyRef.current.length > 1);
        setCanRedo(false);
      };
      graph.on('add', pushSnap);
      graph.on('remove', pushSnap);
      paper.on('cell:pointerup', pushSnap);

      // Load the diagram now that the graph is ready
      loadDiagram();

      // Store event handlers for cleanup
      container._panCleanup = () => {
        document.removeEventListener('mousemove', onGlobalMouseMove);
        document.removeEventListener('mouseup', onGlobalMouseUp);
      };
    }, 150);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (canvasRef.current?.removeEventListener && wheelHandler) canvasRef.current.removeEventListener('wheel', wheelHandler);
      if (canvasRef.current?._panCleanup) canvasRef.current._panCleanup();
      if (resizeObs) resizeObs.disconnect();
      if (paperRef.current) { paperRef.current.remove(); paperRef.current = null; }
      if (graphRef.current) { graphRef.current.clear(); graphRef.current = null; }
    };
  }, [projectId]);

  // ── Add Node ──
  const addNode = useCallback((asset) => {
    if (!graphRef.current || !editableRef.current) return;
    const colors = CAT_COLORS[asset.category] || { fill: '#111827', stroke: '#374151', text: '#9ca3af' };
    const cell = new shapes.standard.Rectangle({
      ports: {
        groups: {
          top: {
            position: { name: 'top' },
            markup: [{ tagName: 'circle', selector: 'portBody' }],
            attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
          },
          bottom: {
            position: { name: 'bottom' },
            markup: [{ tagName: 'circle', selector: 'portBody' }],
            attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
          },
          left: {
            position: { name: 'left' },
            markup: [{ tagName: 'circle', selector: 'portBody' }],
            attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
          },
          right: {
            position: { name: 'right' },
            markup: [{ tagName: 'circle', selector: 'portBody' }],
            attrs: { portBody: { magnet: true, r: 5, fill: '#1f2937', stroke: colors.stroke, strokeWidth: 1.5 } }
          }
        },
        items: [
          { group: 'top', id: 'top' }, 
          { group: 'bottom', id: 'bottom' }, 
          { group: 'left', id: 'left' }, 
          { group: 'right', id: 'right' }
        ]
      }
    });
    cell.position(80 + Math.random() * 400, 80 + Math.random() * 300);
    cell.resize(140, 60);
    cell.attr({
      body: { fill: colors.fill, stroke: colors.stroke, strokeWidth: 1.5, rx: 6, ry: 6, magnet: false },
      label: { 
        textWrap: { text: asset.name, width: -10 }, 
        fill: colors.text, 
        fontSize: 10, 
        fontFamily: 'monospace', 
        fontWeight: 'bold' 
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

  // ── Add Trust Boundary ──
  const addTrustBoundary = useCallback(() => {
    if (!graphRef.current || !editableRef.current) return;
    const cell = new TrustBoundaryShape();
    cell.position(50 + Math.random() * 100, 50 + Math.random() * 100);
    cell.resize(320, 220);
    cell.set('data', { is_trust_boundary: true, label: 'Trust Boundary' });
    graphRef.current.addCell(cell);
    cell.toBack();
  }, []);

  // ── Save Diagram ──
  const saveDiagram = useCallback(async () => {
    if (!graphRef.current) return;
    setSaving(true);
    try {
      const jointJson = graphRef.current.toJSON();
      const nodes = [];
      const edges = [];
      const trust_boundaries = [];

      // Collect TBs first for containment calc
      const tbCells = [];
      graphRef.current.getCells().forEach(cell => {
        if (!cell.isLink() && cell.get('data')?.is_trust_boundary) {
          tbCells.push(cell);
        }
      });

      graphRef.current.getCells().forEach(cell => {
        if (cell.isLink()) {
          const src = cell.getSourceElement();
          const tgt = cell.getTargetElement();
          edges.push({
            id: cell.id,
            source: src?.id || '',
            target: tgt?.id || '',
            protocol: cell.get('protocol') || 'CAN',
            label: cell.get('protocol') || 'CAN',
            crosses_trust_boundary: cell.get('crosses_trust_boundary') || false,
            has_security_control: cell.get('has_security_control') || false,
          });
        } else {
          const pos = cell.position();
          const sz = cell.size();
          const data = cell.get('data') || {};
          if (data.is_trust_boundary) {
            // Find contained nodes
            const contained = [];
            graphRef.current.getCells().forEach(other => {
              if (other.isLink() || other === cell) return;
              const od = other.get('data') || {};
              if (od.is_trust_boundary) return;
              const op = other.position();
              const os = other.size();
              const cx = op.x + os.width / 2;
              const cy = op.y + os.height / 2;
              if (cx >= pos.x && cx <= pos.x + sz.width && cy >= pos.y && cy <= pos.y + sz.height) {
                contained.push(other.id);
              }
            });
            trust_boundaries.push({
              id: cell.id,
              label: data.label || 'Trust Boundary',
              contains_node_ids: contained,
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
          nodes, edges, trust_boundaries,
          external_entities: [],
          dfd_level: 1,
          vehicle_profile: vp,
          _joint_raw: jointJson,
        },
        dfd_level: 1,
      });

      setSaveMsg('Saved');
      toast.success('Diagram saved');
      onDiagramSaved?.();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      console.error('Error saving diagram:', err);
      setSaveMsg('Failed');
      const apiErr = err.response?.data?.error || err.response?.data?.details || err.message;
      toast.error(`Failed to save diagram: ${typeof apiErr === 'object' ? JSON.stringify(apiErr) : apiErr}`);
    } finally {
      setSaving(false);
    }
  }, [projectId, vp, onDiagramSaved]);

  // ── Undo / Redo ──
  const undoHistory = useCallback(() => {
    if (historyRef.current.length <= 1 || !graphRef.current) return;
    const cur = historyRef.current.pop();
    redoStackRef.current = [cur, ...redoStackRef.current];
    const prev = historyRef.current[historyRef.current.length - 1];
    isRestoringRef.current = true;
    graphRef.current.fromJSON(JSON.parse(prev));
    isRestoringRef.current = false;
    setSelectedCell(null);
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(true);
  }, []);

  const redoHistory = useCallback(() => {
    if (redoStackRef.current.length === 0 || !graphRef.current) return;
    const next = redoStackRef.current.shift();
    historyRef.current = [...historyRef.current, next];
    isRestoringRef.current = true;
    graphRef.current.fromJSON(JSON.parse(next));
    isRestoringRef.current = false;
    setSelectedCell(null);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  undoFnRef.current = undoHistory;
  redoFnRef.current = redoHistory;
  saveFnRef.current = saveDiagram;

  // ── Toolbar helpers ──
  const handleZoom = (delta) => {
    if (!paperRef.current) return;
    const next = Math.max(0.2, Math.min(3, zoom + delta));
    setZoom(next);
    paperRef.current.scale(next, next);
  };

  const fitToScreen = () => {
    if (!paperRef.current) return;
    paperRef.current.scaleContentToFit({ padding: 40, maxScale: 2 });
    const s = paperRef.current.scale();
    setZoom(s.sx);
  };

  const toggleGrid = () => {
    if (!paperRef.current) return;
    const next = !showGrid;
    setShowGrid(next);
    paperRef.current.setGridSize(next ? 10 : 1);
    if (next) paperRef.current.drawGrid({ name: 'mesh', args: { color: '#1f2937', thickness: 1 } });
    else paperRef.current.clearGrid();
  };

  // Group assets by category
  const grouped = assets.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <div className="flex" style={{ height: 'calc(100vh - 48px)' }}>
      {/* ── Components Sidebar ── */}
      {editable && (
        <div className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Components</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="mb-3">
              <button
                onClick={addTrustBoundary}
                className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded border border-dashed border-amber-700 text-amber-400 hover:bg-amber-900/20 hover:border-amber-500 transition-colors text-xs font-medium"
              >
                + Trust Boundary
              </button>
            </div>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-3">
                <p className="text-gray-600 text-[10px] uppercase tracking-widest px-1 mb-1">{category}</p>
                {items.map(asset => (
                  <div
                    key={asset.id}
                    onClick={() => addNode(asset)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-800 active:bg-gray-700 transition-colors mb-0.5 group"
                    title="Click to add to canvas"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[asset.category]?.stroke || '#6b7280' }} />
                    <span className="text-gray-300 text-xs truncate flex-1">{asset.name}</span>
                    <span className="text-gray-600 group-hover:text-gray-400 text-[10px]">+</span>
                  </div>
                ))}
              </div>
            ))}
            {assets.length === 0 && (
              <p className="text-gray-600 text-xs px-2 py-4">No components. Add assets in the Asset Library.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Lock / Read-only banner */}
        {!editable && (
          <div className="bg-yellow-900/30 border-b border-yellow-800/50 px-3 py-1.5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-yellow-300 text-xs">
              {lockError || (!canEdit ? 'Read-only — your role does not have edit permissions.' : 'Waiting for diagram lock...')}
            </span>
          </div>
        )}
        {/* Toolbar */}
        <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={saveDiagram} disabled={saving || !editable} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-1 rounded transition-colors font-medium">
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveMsg && <span className={`text-xs ${saveMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</span>}
          </div>

          <div className="flex items-center gap-1">
            {/* Undo/Redo */}
            <div className="flex items-center bg-gray-800 p-0.5 rounded mr-1">
              <button onClick={undoHistory} disabled={!canUndo} title="Undo (Ctrl+Z)" className="text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 px-1.5 rounded text-xs h-6 transition-colors">&#x21A9;</button>
              <button onClick={redoHistory} disabled={!canRedo} title="Redo (Ctrl+Y)" className="text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 px-1.5 rounded text-xs h-6 transition-colors">&#x21AA;</button>
            </div>
            {/* Zoom */}
            <div className="flex items-center bg-gray-800 p-0.5 rounded mr-1">
              <button onClick={() => handleZoom(-0.15)} className="text-gray-400 hover:text-white hover:bg-gray-700 px-1.5 rounded text-xs h-6" title="Zoom Out">-</button>
              <span className="text-gray-400 text-[10px] w-9 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button onClick={() => handleZoom(0.15)} className="text-gray-400 hover:text-white hover:bg-gray-700 px-1.5 rounded text-xs h-6" title="Zoom In">+</button>
            </div>
            {/* Fit */}
            <button onClick={fitToScreen} className="text-gray-400 hover:text-white hover:bg-gray-700 bg-gray-800 px-2 rounded text-xs h-7 transition-colors" title="Fit to screen">Fit</button>
            {/* Grid */}
            <button onClick={toggleGrid} className={`px-2 rounded text-xs h-7 transition-colors ${showGrid ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Toggle Grid">Grid</button>
            {/* Risk colors */}
            <button onClick={() => setRiskColors(r => !r)} className={`px-2 rounded text-xs h-7 transition-colors ${riskColors ? 'bg-red-600/20 text-red-400' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`} title="Color by Risk">Risk</button>
          </div>
        </div>

        <div ref={canvasRef} style={{ flex: 1, overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()} />
      </div>

      {/* ── Inspector ── */}
      <InspectorPanel selectedCell={selectedCell} threats={threats} onUpdate={() => setTick(t => t + 1)} />

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x, width: 160 }}
          onClick={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              const c = contextMenu.cell;
              const d = c.get('data') || {};
              const label = c.isLink() ? (c.get('protocol') || 'CAN') : (d.label || c.attr('label/text') || '');
              setRenameValue(label);
              setRenameTarget(c);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Rename
          </button>
          {!contextMenu.cell.isLink() && !contextMenu.cell.get('data')?.is_trust_boundary && (
            <button
              onClick={() => {
                const c = contextMenu.cell;
                const d = c.get('data') || {};
                const isExt = d.physical_accessibility === 'External-Facing';
                c.set('data', { ...d, physical_accessibility: isExt ? 'Internal' : 'External-Facing' });
                c.attr('body/strokeDasharray', isExt ? '' : '4 2');
                setContextMenu(null);
                setTick(t => t + 1);
                toast.success(isExt ? 'Marked as internal' : 'Marked as external entity');
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 transition-colors border-t border-gray-800"
            >
              {contextMenu.cell.get('data')?.physical_accessibility === 'External-Facing' ? 'Mark Internal' : 'Mark External'}
            </button>
          )}
          <button
            onClick={() => { setDeleteTarget(contextMenu.cell); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
          >
            Delete
          </button>
        </div>
      )}

      {/* ── Delete Modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        title="Confirm Deletion"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteTarget?.remove(); setSelectedCell(null); setDeleteTarget(null); }}
        confirmText="Delete"
        confirmDanger
      >
        <p className="text-gray-300 text-sm">Delete this element? You can use <span className="text-white font-medium">Undo (Ctrl+Z)</span> to restore it before saving.</p>
      </Modal>

      {/* ── Rename Modal ── */}
      <Modal
        isOpen={!!renameTarget}
        title="Rename Element"
        onClose={() => setRenameTarget(null)}
        onConfirm={() => {
          if (!renameTarget || !renameValue.trim()) return;
          if (renameTarget.isLink()) {
            renameTarget.set('protocol', renameValue.trim());
            renameTarget.label(0, { attrs: { text: { text: renameValue.trim(), fill: '#9ca3af', fontSize: 10 } } });
          } else {
            const d = renameTarget.get('data') || {};
            renameTarget.set('data', { ...d, label: renameValue.trim() });
            renameTarget.attr('label/text', renameValue.trim());
          }
          setSelectedCell(renameTarget);
          setTick(t => t + 1);
          setRenameTarget(null);
        }}
        confirmText="Rename"
      >
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') document.querySelector('[data-confirm-btn]')?.click(); }}
          autoFocus
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          placeholder="New name..."
        />
      </Modal>
    </div>
  );
}
