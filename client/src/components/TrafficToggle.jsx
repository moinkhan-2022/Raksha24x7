import { Car } from 'lucide-react';
import { memo } from 'react';

function TrafficToggle({ enabled, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={enabled} className={`absolute left-3 top-3 z-20 flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-xl backdrop-blur-xl transition ${enabled ? 'border-emerald-400/40 bg-emerald-600/90 text-white' : 'border-white/10 bg-slate-950/90 text-slate-200 hover:bg-slate-800'}`}>
      <Car className="h-4 w-4" /> Traffic {enabled ? 'On' : 'Off'}
    </button>
  );
}

export default memo(TrafficToggle);
