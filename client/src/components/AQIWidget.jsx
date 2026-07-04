import { Activity } from 'lucide-react';
import { memo } from 'react';

const statusClasses = {
  Good: 'text-emerald-300 bg-emerald-500/10',
  Moderate: 'text-amber-300 bg-amber-500/10',
  Poor: 'text-rose-300 bg-rose-500/10'
};

function AQIWidget({ airQuality, loading }) {
  if (loading) return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  if (!airQuality) return <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">Air quality unavailable</div>;
  const status = airQuality.status || 'Unavailable';
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-wider text-blue-300">Air Quality</p><p className="mt-1 text-2xl font-bold">AQI {Math.round(airQuality.aqi)}</p></div><Activity className="h-9 w-9 text-blue-300" /></div>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status] || 'bg-slate-500/10 text-slate-300'}`}>{status}</span>
      <p className="mt-2 text-[9px] text-slate-600">AQI data: Open-Meteo/CAMS</p>
    </div>
  );
}

export default memo(AQIWidget);
