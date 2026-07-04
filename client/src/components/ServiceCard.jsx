import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Ambulance,
  ClipboardCopy,
  Droplets,
  Flame,
  Heart,
  HeartHandshake,
  Hospital,
  MapPin,
  Navigation,
  Phone,
  Pill,
  Share2,
  Shield,
  Star
} from 'lucide-react';

const CATEGORY_ICONS = {
  hospital: Hospital,
  police: Shield,
  fire: Flame,
  pharmacy: Pill,
  ambulance: Ambulance,
  blood_bank: Droplets,
  women_police: HeartHandshake,
  women_help: HeartHandshake
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed');
};

function ServiceCard({ service, isFavorite, selected, emergency, etaLabel, onToggleFavorite, onView, onNavigate, onNotify }) {
  const Icon = CATEGORY_ICONS[service.categoryId] || MapPin;
  const phone = String(service.phone || '').replace(/[^\d+]/g, '');
  const hasOrigin = Number.isFinite(service.userLatitude) && Number.isFinite(service.userLongitude);
  const origin = hasOrigin ? `&origin=${service.userLatitude},${service.userLongitude}` : '';
  const directionsLink = `https://www.google.com/maps/dir/?api=1${origin}&destination=${service.latitude},${service.longitude}&travelmode=driving`;

  const recordView = () => onView?.(service);
  const handleAction = (event, callback) => {
    event.stopPropagation();
    recordView();
    callback?.();
  };

  const shareService = async (event) => {
    event.stopPropagation();
    recordView();
    const text = `${service.name}\n${service.categoryLabel}\n${service.address}\n${service.googleMapsLink}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: service.name, text, url: service.googleMapsLink });
        onNotify('Service shared');
      } else {
        await copyText(text);
        onNotify('Sharing is unavailable, so service details were copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') onNotify('Unable to share service details', 'error');
    }
  };

  const copyAddress = async (event) => {
    event.stopPropagation();
    recordView();
    try {
      await copyText(service.address);
      onNotify('Address copied');
    } catch {
      onNotify('Clipboard failure: address could not be copied', 'error');
    }
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      onClick={recordView}
      className={`rounded-2xl border bg-slate-950/45 p-4 shadow-lg backdrop-blur-xl transition ${emergency ? 'border-amber-300/60 shadow-amber-950/40' : selected ? 'border-blue-400/60 shadow-blue-950/50' : 'border-white/10 hover:border-white/20'}`}
    >
      {emergency && <div className="mb-3 inline-flex rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">Nearest emergency service</div>}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${service.color}25`, color: service.color }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={(event) => handleAction(event)} className="line-clamp-2 text-left font-semibold leading-snug text-white hover:text-blue-200">{service.name}</button>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider" style={{ color: service.color }}>{service.categoryLabel}</p>
        </div>
        <button
          type="button"
          aria-label={isFavorite ? 'Remove favorite' : 'Save favorite'}
          title={isFavorite ? 'Remove favorite' : 'Save favorite'}
          onClick={(event) => { event.stopPropagation(); onToggleFavorite(service); }}
          className={`rounded-xl border p-2 transition ${isFavorite ? 'border-rose-400/30 bg-rose-500/15 text-rose-300' : 'border-white/10 bg-white/5 text-slate-400 hover:text-rose-300'}`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{service.address}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-200">{service.distanceLabel}{etaLabel ? ` • ${etaLabel}` : ''}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-200"><Star className="h-3 w-3 fill-current" />{service.rating == null ? 'No rating' : service.rating.toFixed(1)}{service.totalReviews != null ? ` (${service.totalReviews})` : ''}</span>
        <OpenStatus openNow={service.openNow} />
      </div>

      <p className="mt-3 text-xs text-slate-400">{service.phone || 'Phone number not available'}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <a href={directionsLink} target="_blank" rel="noreferrer" onClick={(event) => handleAction(event, () => onNavigate?.(service))} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2 py-2 font-semibold text-white hover:bg-blue-500"><Navigation className="h-3.5 w-3.5" /> Navigate</a>
        {phone ? (
          <a href={`tel:${phone}`} onClick={(event) => handleAction(event)} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 font-semibold text-white hover:bg-emerald-500"><Phone className="h-3.5 w-3.5" /> Call</a>
        ) : (
          <button type="button" onClick={(event) => handleAction(event, () => onNotify('Phone number not available', 'error'))} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-2 py-2 font-semibold text-slate-300"><Phone className="h-3.5 w-3.5" /> Call</button>
        )}
        <button type="button" onClick={shareService} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-2 py-2 font-semibold text-white hover:bg-slate-600"><Share2 className="h-3.5 w-3.5" /> Share</button>
        <button type="button" onClick={copyAddress} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-700 px-2 py-2 font-semibold text-white hover:bg-slate-600"><ClipboardCopy className="h-3.5 w-3.5" /> Address</button>
      </div>
    </motion.article>
  );
}

function OpenStatus({ openNow }) {
  if (openNow === true) return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-200">Open now</span>;
  if (openNow === false) return <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-200">Closed</span>;
  return <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-slate-300">Hours unavailable</span>;
}

export default memo(ServiceCard);
