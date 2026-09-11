import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (val: string) => void;
  }[];
  activeFilterCount?: number;
  onClearFilters?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Search by Batch ID, Medicine, or GTIN...',
  searchValue,
  onSearchChange,
  filters = [],
  activeFilterCount = 0,
  onClearFilters,
  actions,
  className = '',
}) => {
  return (
    <div className={`glass-panel p-3 rounded-xl border border-slate-800/80 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between ${className}`}>
      {/* Search Bar */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f, idx) => (
          <div key={idx} className="relative">
            <select
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              className="appearance-none bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-slate-300 py-2 pl-3 pr-8 focus:outline-none focus:border-cyan-500/60 cursor-pointer font-medium"
            >
              {f.options.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        ))}

        {activeFilterCount > 0 && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-slate-400 hover:text-cyan-400 underline decoration-slate-600 underline-offset-2 px-1 py-1"
          >
            Reset
          </button>
        )}

        {actions && (
          <div className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
