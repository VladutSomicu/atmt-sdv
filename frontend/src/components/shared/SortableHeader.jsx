import React from 'react';

export default function SortableHeader({ label, sortKey, currentSort, requestSort, className = '' }) {
  const isSorted = currentSort && currentSort.key === sortKey;
  
  return (
    <th 
      onClick={() => requestSort(sortKey)}
      className={`cursor-pointer hover:text-gray-400 transition-colors select-none ${className}`}
    >
      <div className={`w-full flex items-center gap-1.5 ${className.includes('text-center') ? 'justify-center' : className.includes('text-right') ? 'justify-end' : 'justify-start'}`}>
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
