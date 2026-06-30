import { motion } from 'framer-motion';
import { Ambulance, Crosshair, ShieldCheck, Siren, ShieldAlert, MapPin } from 'lucide-react';

function Glow({ className }) {
  return <div className={`absolute rounded-full blur-3xl ${className}`} />;
}

function EmergencyHeroAnimation() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-800/90">
      <Glow className="-left-10 top-10 h-40 w-40 bg-red-500/25" />
      <Glow className="right-0 top-0 h-44 w-44 bg-blue-500/20" />
      <Glow className="bottom-0 left-1/2 h-40 w-40 -translate-x-1/2 bg-emerald-500/10" />

      <motion.div
        className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-400/25"
        animate={{ rotate: 360 }}
        transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-red-500/15 p-4 shadow-2xl shadow-red-500/35 backdrop-blur"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ShieldAlert className="h-10 w-10 text-red-400" />
      </motion.div>

      <motion.button
        type="button"
        className="absolute bottom-7 left-1/2 z-10 h-16 w-16 -translate-x-1/2 rounded-full bg-red-600 text-sm font-bold text-white shadow-xl shadow-red-500/40"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        SOS
      </motion.button>

      <motion.div
        className="absolute right-12 top-14 rounded-xl border border-white/15 bg-white/5 p-2 backdrop-blur"
        animate={{ x: [0, 14, 0], y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <MapPin className="h-5 w-5 text-blue-300" />
      </motion.div>

      <motion.div
        className="absolute left-8 top-16 rounded-xl border border-white/15 bg-white/5 p-2 backdrop-blur"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Siren className="h-5 w-5 text-red-400" />
      </motion.div>

      <motion.div
        className="absolute right-6 bottom-10 rounded-xl border border-white/15 bg-white/5 p-2 backdrop-blur"
        animate={{ x: [0, -26, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Ambulance className="h-5 w-5 text-emerald-300" />
      </motion.div>

      <div className="absolute bottom-5 left-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 backdrop-blur">
        <ShieldCheck className="h-4 w-4 text-emerald-300" /> Protected
      </div>
      <div className="absolute top-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 backdrop-blur">
        <Crosshair className="h-4 w-4 text-blue-300" /> GPS Tracking
      </div>
    </div>
  );
}

export default EmergencyHeroAnimation;
