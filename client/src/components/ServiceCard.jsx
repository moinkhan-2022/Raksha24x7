import { memo } from 'react';
import { motion } from 'framer-motion';
import { Ambulance, Droplets, Flame, HeartHandshake, Hospital, House, MapPin, Navigation, Phone, Pill, Share2, Shield, Stethoscope, UserRound } from 'lucide-react';

const CATEGORY_ICONS = {
  hospital: Hospital,
  police: Shield,
  fire: Flame,
  pharmacy: Pill,
  ambulance: Ambulance,
  blood_bank: Droplets,
  women_police: HeartHandshake,
  women_help: HeartHandshake,
  women_safety: HeartHandshake,
  shelter: House,
  clinic: Stethoscope,
  doctors: UserRound,
  emergency_phone: Phone
};

function ServiceCard({ service, selected, onView, onNavigate, onShare, onNotify, theme = 'dark' }) {
  const isLight = theme === 'light';
  const Icon = CATEGORY_ICONS[service.categoryId] || MapPin;
  const phone = service.phone !== 'N/A' ? String(service.phone || '').replace(/[^\d+]/g, '') : '';
  const openText = service.openNow === true ? 'Open' : service.openNow === false ? 'Closed' : 'Hours unavailable';
  const openClass = service.openNow === true ? 'text-emerald-300 bg-emerald-500/10' : service.openNow === false ? 'text-rose-300 bg-rose-500/10' : 'text-slate-300 bg-slate-500/10';

  const stop = (event, callback) => {
    event.stopPropagation();
    callback?.();
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      onClick={() => onView?.(service)}
      className={`rounded-2xl border p-4 shadow-sm transition ${selected ? (isLight ? 'border-blue-400/60 bg-blue-50' : 'border-blue-400/60 bg-slate-950/45') : isLight ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-white/10 bg-slate-950/45 hover:border-white/20'}`}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${service.color}25`, color: service.color }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={`line-clamp-2 font-semibold leading-snug ${isLight ? 'text-slate-950' : 'text-white'}`}>{service.name}</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: service.color }}>{service.categoryLabel}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-200">{service.distanceLabel || 'Distance unavailable'}</span>
        <span className={`rounded-full px-2.5 py-1 ${openClass}`}>{openText}</span>
      </div>

      <p className={`mt-3 line-clamp-2 text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{service.address || 'Address unavailable'}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <button type="button" onClick={(event) => stop(event, () => onNavigate?.(service))} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-2 py-2.5 font-semibold text-white hover:bg-blue-500">
          <Navigation className="h-3.5 w-3.5" />
          Navigate
        </button>
        {phone ? (
          <a href={`tel:${phone}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2.5 font-semibold text-white hover:bg-emerald-500">
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        ) : (
          <button type="button" onClick={(event) => stop(event, () => onNotify?.('Phone number not available', 'error'))} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 font-semibold ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-slate-300'}`}>
            <Phone className="h-3.5 w-3.5" />
            Call
          </button>
        )}
        <button type="button" onClick={(event) => stop(event, () => onShare?.(service))} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 font-semibold ${isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-700 text-white hover:bg-slate-600'}`}>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </motion.article>
  );
}

export default memo(ServiceCard);
