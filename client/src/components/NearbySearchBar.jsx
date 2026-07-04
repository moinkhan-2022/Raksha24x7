import { memo, useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export const SORT_OPTIONS = [
  { value: 'nearest', label: 'Nearest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'open', label: 'Open Now' },
  { value: 'name', label: 'A to Z' },
  { value: 'recent', label: 'Recently Loaded' }
];

function NearbySearchBar({ query, onSearchChange, sortBy, onSortChange, resultCount }) {
  const [inputValue, setInputValue] = useState(query);

  useEffect(() => { setInputValue(query); }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => onSearchChange(inputValue.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [inputValue, onSearchChange]);

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <label className="relative block">
        <span className="sr-only">Search nearby services</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Search name, category, city, state or phone..."
          className="w-full rounded-xl border border-white/10 bg-slate-950/55 py-3 pl-10 pr-20 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20"
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          <span className="text-xs text-slate-500">{resultCount}</span>
          {inputValue && <button type="button" aria-label="Clear search" onClick={() => setInputValue('')} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-3.5 w-3.5" /></button>}
        </span>
      </label>

      <label className="relative block">
        <span className="sr-only">Sort nearby services</span>
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-3 text-sm text-slate-200 outline-none focus:border-blue-400/50"
        >
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
  );
}

export default memo(NearbySearchBar);
