import { useState } from 'react';

const PROTOCOLS = ['CAN', 'CAN-FD', 'LIN', 'FlexRay', 'Ethernet', 'Bluetooth', 'Wi-Fi', 'Cellular', 'V2X', 'USB', 'ISO-15118', 'SOME/IP'];

export default function InspectorPanel({ selectedCell, threats, onUpdate }) {
  const [tick, setTick] = useState(0);
  const refresh = () => { setTick(t => t + 1); onUpdate?.(); };

  if (!selectedCell) {
    return (
      <div className="w-56 bg-gray-900 border-l border-gray-800 flex-shrink-0 flex flex-col">
        <div className="px-3 py-2 border-b border-gray-800">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Inspector</span>
        </div>
        <div className="px-3 py-4 text-gray-600 text-xs">Click a node or edge to inspect its properties.</div>
      </div>
    );
  }

  const isLink = selectedCell.isLink();
  const data = selectedCell.get('data') || {};
  const isTB = data.is_trust_boundary;

  // Count threats for this node
  const nodeThreats = !isLink && !isTB ? threats.filter(t => t.asset_id === data.asset_ref_id) : [];

  return (
    <div className="w-56 bg-gray-900 border-l border-gray-800 flex-shrink-0 flex flex-col overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-800">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Inspector</span>
      </div>
      <div className="px-3 py-3 space-y-4">
        {isLink ? (
          /* ── Edge Inspector ── */
          <>
            <p className="text-white text-sm font-medium">Connection</p>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Protocol</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                value={selectedCell.get('protocol') || 'CAN'}
                onChange={(e) => {
                  selectedCell.set('protocol', e.target.value);
                  selectedCell.label(0, { attrs: { text: { text: e.target.value, fill: '#9ca3af', fontSize: 10 } } });
                  refresh();
                }}
              >
                {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded bg-gray-800 border-gray-700 text-green-600"
                  checked={selectedCell.get('has_security_control') || false}
                  onChange={(e) => {
                    selectedCell.set('has_security_control', e.target.checked);
                    selectedCell.attr('line/stroke', e.target.checked ? '#22c55e' : '#4b5563');
                    refresh();
                  }}
                />
                <span className={`text-xs ${selectedCell.get('has_security_control') ? 'text-green-400' : 'text-gray-300'}`}>
                  Security Control
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded bg-gray-800 border-gray-700 text-red-600"
                  checked={selectedCell.get('crosses_trust_boundary') || false}
                  onChange={(e) => {
                    const crosses = e.target.checked;
                    selectedCell.set('crosses_trust_boundary', crosses);
                    const hasControl = selectedCell.get('has_security_control');
                    if (crosses && !hasControl) {
                      selectedCell.attr('line/stroke', '#ef4444');
                      selectedCell.attr('line/strokeDasharray', '8 4');
                    } else {
                      selectedCell.attr('line/strokeDasharray', '');
                      if (!hasControl) selectedCell.attr('line/stroke', '#4b5563');
                    }
                    refresh();
                  }}
                />
                <span className={`text-xs ${selectedCell.get('crosses_trust_boundary') ? 'text-red-400' : 'text-gray-300'}`}>
                  Crosses Trust Boundary
                </span>
              </label>
            </div>

            {selectedCell.get('crosses_trust_boundary') && !selectedCell.get('has_security_control') && (
              <div className="bg-red-950 border border-red-800 rounded-none p-2">
                <p className="text-red-300 text-xs font-medium">Unsecured boundary crossing</p>
                <p className="text-red-500 text-[10px] mt-0.5">This connection will be flagged as a threat vector.</p>
              </div>
            )}
          </>
        ) : isTB ? (
          /* ── Trust Boundary Inspector ── */
          <>
            <p className="text-white text-sm font-medium">Trust Boundary</p>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Label</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                value={data.label || ''}
                onChange={(e) => {
                  selectedCell.set('data', { ...data, label: e.target.value });
                  selectedCell.attr('label/text', e.target.value);
                  refresh();
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-gray-400 text-[10px] uppercase">Width</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs outline-none" value={selectedCell.size().width}
                  onChange={(e) => { selectedCell.resize(parseInt(e.target.value) || 100, selectedCell.size().height); refresh(); }} />
              </div>
              <div>
                <label className="text-gray-400 text-[10px] uppercase">Height</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs outline-none" value={selectedCell.size().height}
                  onChange={(e) => { selectedCell.resize(selectedCell.size().width, parseInt(e.target.value) || 100); refresh(); }} />
              </div>
            </div>
          </>
        ) : (
          /* ── Node Inspector ── */
          <>
            <div>
              <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Label</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:border-blue-500 outline-none"
                value={data.label || ''}
                onChange={(e) => {
                  selectedCell.set('data', { ...data, label: e.target.value });
                  selectedCell.attr('label/textWrap/text', e.target.value);
                  refresh();
                }}
              />
            </div>

            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Category</p>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300">{data.category || 'N/A'}</span>
            </div>

            {data.interface_types?.length > 0 && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Interfaces</p>
                <div className="flex flex-wrap gap-1">
                  {data.interface_types.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800">{t}</span>)}
                </div>
              </div>
            )}

            {data.data_types?.length > 0 && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Data Types</p>
                <div className="flex flex-wrap gap-1">
                  {data.data_types.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800">{t}</span>)}
                </div>
              </div>
            )}

            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider">Accessibility</p>
              <p className="text-gray-300 text-xs mt-0.5">{data.physical_accessibility || 'Internal'}</p>
            </div>

            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider">ASIL</p>
              <p className="text-gray-300 text-xs mt-0.5">{data.asil_level || 'N/A'}</p>
            </div>

            {data.flags?.length > 0 && (
              <div>
                <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Flags</p>
                <div className="flex flex-wrap gap-1">
                  {data.flags.map(f => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{f}</span>)}
                </div>
              </div>
            )}

            {nodeThreats.length > 0 && (
              <div className="bg-red-950/50 border border-red-900 rounded-none p-2">
                <p className="text-red-300 text-xs font-medium">Open threats: {nodeThreats.length}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
