import React from 'react';

export default function TablePagination({ limit, setLimit, total, baseLimit = 25 }) {
  if (total <= baseLimit) return null;

  return (
    <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/50 flex justify-center gap-4 shrink-0">
      {limit < total ? (
        <>
          <button
            onClick={() => setLimit(prev => prev + baseLimit)}
            className="text-xs font-medium uppercase tracking-wider px-6 py-2 rounded border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            View {baseLimit} More
          </button>
          <button
            onClick={() => setLimit(total)}
            className="text-xs font-medium uppercase tracking-wider px-6 py-2 rounded border border-blue-900/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
          >
            View All {total}
          </button>
        </>
      ) : (
        <button
          onClick={() => setLimit(baseLimit)}
          className="text-xs font-medium uppercase tracking-wider px-6 py-2 rounded border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          Show Less
        </button>
      )}
    </div>
  );
}
