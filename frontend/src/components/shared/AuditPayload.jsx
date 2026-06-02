import React from 'react';

export default function AuditPayload({ oldValue, newValue }) {
  if (!newValue) return null;

  // If there's no old value, show the new value cleanly
  if (!oldValue) {
    if (typeof newValue === 'object') {
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {Object.entries(newValue).map(([k, v]) => (
            <div key={k} className="flex items-center text-[11px] font-mono bg-gray-950 border border-gray-800 px-2 py-1 rounded-sm">
              <span className="text-gray-500 mr-1.5">{k}:</span>
              <span className="text-blue-400">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <pre className="text-blue-400 text-[11px] bg-gray-950 p-2 rounded-sm border border-gray-800 overflow-x-auto">
        {String(newValue)}
      </pre>
    );
  }

  // If there's an old value, compute the diff
  if (typeof oldValue === 'object' && typeof newValue === 'object') {
    const allKeys = Array.from(new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]));
    const diffs = allKeys.map(key => {
      const o = oldValue[key];
      const n = newValue[key];
      const oStr = typeof o === 'object' ? JSON.stringify(o) : String(o);
      const nStr = typeof n === 'object' ? JSON.stringify(n) : String(n);
      
      if (oStr === nStr) return null;
      
      return (
        <div key={key} className="flex items-center text-[11px] font-mono bg-gray-950 border border-gray-800 px-2 py-1.5 rounded-sm">
          <span className="text-gray-500 w-24 flex-shrink-0 truncate" title={key}>{key}:</span>
          <span className="text-red-400 line-through mr-2 flex-1 truncate" title={oStr}>{oStr === 'undefined' ? '(empty)' : oStr}</span>
          <span className="text-gray-600 mr-2">➜</span>
          <span className="text-green-400 flex-1 truncate" title={nStr}>{nStr === 'undefined' ? '(empty)' : nStr}</span>
        </div>
      );
    }).filter(Boolean);

    if (diffs.length > 0) {
      return (
        <div className="flex flex-col gap-1.5 mt-1">
          {diffs}
        </div>
      );
    }
  }

  // Fallback for primitive or identical values that weren't caught
  return (
    <pre className="text-gray-400 text-[11px] bg-gray-950 p-2 rounded-sm border border-gray-800 overflow-x-auto">
      {JSON.stringify(newValue, null, 2)}
    </pre>
  );
}
