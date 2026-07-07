import { Search, X } from 'lucide-react';
import { SUPPORTED_COUNTRIES } from '../data/emergencyNumbers';

export const SIMPLE_EMERGENCY_FILTERS = [
  ['all', 'All'],
  ['police', 'Police'],
  ['ambulance', 'Ambulance'],
  ['fire', 'Fire'],
  ['women', 'Women'],
  ['child', 'Child'],
  ['cyber', 'Cyber']
];

const countryOrder = ['IN', 'US', 'GB', 'CA', 'AU'];
const countries = countryOrder
  .map((code) => SUPPORTED_COUNTRIES.find((country) => country.code === code))
  .filter(Boolean);

function EmergencyNumbersControls({ query, onQuery, country, onCountry, category, onCategory }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <span className="sr-only">Search emergency numbers</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search service, number, or category"
            className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-300/50 focus:ring-4 focus:ring-red-500/10"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <label>
          <span className="sr-only">Country</span>
          <select
            value={country}
            onChange={(event) => onCountry(event.target.value)}
            className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm font-medium text-slate-100 outline-none transition focus:border-red-300/50 focus:ring-4 focus:ring-red-500/10"
          >
            {countries.map((item) => (
              <option key={item.code} value={item.code} className="bg-slate-950">
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Emergency category filters">
        {SIMPLE_EMERGENCY_FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => onCategory(id)}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition ${
              category === id
                ? 'border-red-300/40 bg-red-500/20 text-white shadow-lg shadow-red-950/20'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmergencyNumbersControls;
