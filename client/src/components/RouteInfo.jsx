import { Bike, Car, ExternalLink, Footprints, LoaderCircle, Route, X } from 'lucide-react';
import { memo } from 'react';
import { estimateEtaMinutes, formatEta } from '../utils/etaCalculator';

const MODES = [
  { id: 'DRIVING', label: 'Driving', icon: Car },
  { id: 'WALKING', label: 'Walking', icon: Footprints },
  { id: 'BICYCLING', label: 'Cycling', icon: Bike }
];

function RouteInfo({ service, travelMode, onModeChange, routeInfo, loading, error, onClear, onNavigate, navigationUrl }) {
  if (!service) return null;
  const fallbackEta = formatEta(estimateEtaMinutes(service.distanceMeters, travelMode));

  return (
    <section className="absolute bottom-3 right-3 z-20 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border border-white/10 bg-slate-950/92 p-3 shadow-2xl backdrop-blur-xl" aria-label="Route information">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-blue-300">Route to</p><h3 className="truncate text-sm font-semibold text-white">{service.name}</h3></div>
        <button type="button" aria-label="Clear route" onClick={onClear} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1">
        {MODES.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onModeChange(id)} aria-pressed={travelMode === id} className={`flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 text-xs ${travelMode === id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3 text-xs">
        {loading ? <span className="flex items-center gap-2 text-blue-200"><LoaderCircle className="h-4 w-4 animate-spin" /> Calculating route...</span> : <><span className="flex items-center gap-1 text-slate-200"><Route className="h-4 w-4 text-blue-300" />{routeInfo?.distanceText || service.distanceLabel}</span><span className="font-semibold text-emerald-300">{routeInfo?.durationText || fallbackEta}</span></>}
      </div>
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      <a href={navigationUrl} target="_blank" rel="noreferrer" onClick={onNavigate} className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"><ExternalLink className="h-4 w-4" /> Open Google Maps Navigation</a>
    </section>
  );
}

export default memo(RouteInfo);
