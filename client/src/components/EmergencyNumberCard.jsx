import { memo } from 'react';
import { motion } from 'framer-motion';
import { Ambulance, Clipboard, Flame, Heart, MessageCircle, Phone, Shield, Siren, UserRound, Baby, LockKeyhole } from 'lucide-react';
import { categoryById } from '../data/emergencyNumbers';

const categoryIcon = {
  police: Shield,
  ambulance: Ambulance,
  fire: Flame,
  women: UserRound,
  child: Baby,
  cyber: LockKeyhole
};

const copyText = async (value) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('Copy failed');
};

function EmergencyNumberCard({ record, favorite, onFavorite, onCall, onWhatsApp, onViewed, notify, compact = false }) {
  const category = categoryById(record.category);
  const Icon = categoryIcon[record.category] || Siren;

  const copy = async () => {
    try {
      await copyText(record.number);
      notify?.('Number copied.');
    } catch {
      notify?.('Copy failed.', 'error');
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      onClick={() => onViewed?.(record)}
      className={`group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl transition hover:border-red-300/25 hover:bg-white/[0.09] ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/12 text-red-200 ring-1 ring-red-300/10">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{record.service}</p>
            <p className="mt-0.5 text-xs text-slate-400">{category.label}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={favorite ? 'Remove favorite' : 'Save favorite'}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite?.(record);
          }}
          className={`rounded-full p-2 transition ${favorite ? 'bg-rose-500/15 text-rose-300' : 'text-slate-500 hover:bg-white/10 hover:text-rose-300'}`}
        >
          <Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <a
        href={`tel:${record.number}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCall?.(record);
        }}
        className="mt-4 rounded-2xl bg-slate-950/55 px-4 py-4 text-center text-4xl font-black tracking-wide text-white ring-1 ring-white/10 transition group-hover:ring-red-300/20"
      >
        {record.number}
      </a>

      <p className="mt-3 text-sm font-medium text-emerald-300">{record.availability || 'Available 24×7'}</p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-xs font-semibold">
        <Action icon={Phone} label="Call" onClick={() => onCall?.(record)} className="bg-red-600 text-white hover:bg-red-500" />
        <Action icon={MessageCircle} label="WhatsApp" onClick={() => onWhatsApp?.(record)} className="bg-emerald-600 text-white hover:bg-emerald-500" />
        <Action icon={Clipboard} label="Copy" onClick={copy} className="bg-white/10 text-slate-100 hover:bg-white/15" />
      </div>
    </motion.article>
  );
}

function Action({ icon: Icon, label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-2 transition ${className}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default memo(EmergencyNumberCard);
