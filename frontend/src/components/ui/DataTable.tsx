import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | ((item: T) => string);
  onRowClick?: (item: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria in the registry.',
  className = '',
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Sorting
  let sortedData = [...data];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    });
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentItems = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const getKey = (item: T, idx: number): string => {
    if (typeof keyField === 'function') return keyField(item);
    return (item[keyField] as string) || `row_${idx}`;
  };

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={`glass-panel rounded-xl border border-slate-800/80 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`py-3.5 px-4 ${col.sortable ? 'cursor-pointer select-none hover:text-white' : ''} ${col.className || ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable && <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {currentItems.map((item, idx) => (
              <tr
                key={getKey(item, idx)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-slate-800/40' : 'hover:bg-slate-800/20'}`}
              >
                {columns.map(col => (
                  <td key={col.key} className={`py-3.5 px-4 font-normal text-slate-200 ${col.className || ''}`}>
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-200">{Math.min(currentPage * pageSize, data.length)}</strong> of{' '}
            <strong className="text-slate-200">{data.length}</strong> items
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
