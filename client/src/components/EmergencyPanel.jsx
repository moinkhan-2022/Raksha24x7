import { Ambulance, ExternalLink, Flame, Hospital, MapPin, Phone, Radio, Share2, Shield, Siren } from 'lucide-react';
import { memo } from 'react';
import { estimateEtaMinutes, formatEta } from '../utils/etaCalculator';

const CORE_SERVICES = [
  { id: 'hospital', label: 'Hospital', icon: Hospital },
  { id: 'police', label: 'Police', icon: Shield },
  { id: 'ambulance', label: 'Ambulance', icon: Ambulance },
  { id: 'fire', label: 'Fire', icon: Flame }
];

function EmergencyPanel({ active, onToggle, nearestByCategory, onSelect, onNavigate, onShareLocation }) {
  if (!active) {
    return <button type="button" onClick={onToggle} className="absolute bottom-3 left-3 z-20 flex min-h-12 items-center gap-2 rounded-2xl border border-red-400/40 bg-red-600/95 px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-red-950/50 transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"><Siren className="h-5 w-5" /> Emergency Mode</button>;
  }

  return (
    <section className="absolute left-3 top-16 z-20 max-h-[38%] w-[calc(100%-1.5rem)] max-w-sm overflow-y-auto rounded-2xl border border-red-400/30 bg-slate-950/95 p-3 shadow-2xl shadow-red-950/40 backdrop-blur-xl lg:bottom-3 lg:top-auto lg:max-h-[70%]" aria-label="Emergency assistant panel">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="relative"><Radio className="h-5 w-5 text-red-400" /><span className="absolute inset-0 animate-ping rounded-full bg-red-400/20" /></span><div><p className="font-bold text-white">Emergency Mode Active</p><p className="text-[10px] text-red-200">Nearest critical services prioritized</p></div></div><button type="button" onClick={onToggle} className="min-h-10 rounded-lg bg-white/10 px-3 text-xs text-slate-200 hover:bg-white/15">Exit</button></div>
      <div className="mt-3 space-y-2">
        {CORE_SERVICES.map(({ id, label, icon: Icon }) => {
          const service = nearestByCategory[id];
          return <button key={id} type="button" disabled={!service} onClick={() => onSelect(service)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2 text-left transition hover:bg-white/10 disabled:opacity-40"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-300"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{service?.name || `No ${label} found`}</span><span className="mt-0.5 block text-[10px] text-slate-400">{service ? `${service.distanceLabel} • ${formatEta(estimateEtaMinutes(service.distanceMeters))}` : 'Unavailable'}</span></span>{service && <MapPin className="h-4 w-4 text-blue-300" />}</button>;
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <a href="tel:112" className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-500"><Phone className="h-4 w-4" /> Call 112</a>
        <button type="button" disabled={!nearestByCategory.hospital} onClick={() => onNavigate(nearestByCategory.hospital)} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-blue-600 font-semibold text-white disabled:opacity-40"><ExternalLink className="h-4 w-4" /> Navigate</button>
        <button type="button" onClick={onShareLocation} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-700 font-semibold text-white hover:bg-slate-600"><Share2 className="h-4 w-4" /> Share</button>
      </div>
    </section>
  );
}

export default memo(EmergencyPanel);
