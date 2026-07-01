import { SERVICE_FILTERS } from '../utils/serviceCategories';

function NearbyFilterBar({ activeFilter, counts, onFilterChange, disabled = false }) {
  return (
    <div className="overflow-x-auto pb-1" aria-label="Emergency service filters">
      <div className="flex min-w-max gap-2">
        {SERVICE_FILTERS.map((filter) => {
          const active = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              disabled={disabled}
              onClick={() => onFilterChange(filter.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? 'border-blue-400/50 bg-blue-500/20 text-white shadow-lg shadow-blue-950/30' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: filter.color }} />
              {filter.label}
              <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-xs text-slate-300">{counts[filter.id] || 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default NearbyFilterBar;
