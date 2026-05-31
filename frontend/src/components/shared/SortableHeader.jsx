import React from 'react';

export default function SortableHeader({ label, sortKey, currentSort, requestSort, className = '' }) {
  const isSorted = currentSort && currentSort.key === sortKey;
  
  return (
    <th 
      onClick={() => requestSort(sortKey)}
      className={`cursor-pointer hover:text-gray-400 transition-colors select-none ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isSorted && (
          <span className="text-blue-400">
            {currentSort.direction === 'ascending' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
}
