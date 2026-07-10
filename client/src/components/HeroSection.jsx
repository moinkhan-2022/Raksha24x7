import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import EmergencyHeroAnimation from '../assets/animations/EmergencyHeroAnimation';
import { HeartPulse, MapPin, ShieldCheck } from 'lucide-react';

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pt-24 md:px-6 lg:pb-24" aria-labelledby="landing-heading">
      <motion.div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-blue-900/20" animate={{ opacity: [0.45, 0.8, 0.45] }} transition={{ duration: 7, repeat: Infinity }} />
      <div className="absolute -left-24 top-14 h-80 w-80 rounded-full bg-red-500/20 blur-3xl" />
      <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="mb-4 inline-flex rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-200">Emergency support, always ready</p>
          <h1 id="landing-heading" className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Your Safety.<br />Always One Tap Away.
          </h1>
          <p className="mt-5 max-w-xl text-slate-300 md:text-lg">
            Raksha24x7 helps users quickly access emergency services, SOS alerts, live location and nearby hospitals during emergencies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">Get Started Free</Link>
            <a href="#how-it-works" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">See How It Works</a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
          <div className="aspect-[4/3]">
            <EmergencyHeroAnimation />
          </div>
          {[{ Icon: ShieldCheck, className: '-left-4 top-8 text-blue-300' }, { Icon: HeartPulse, className: '-right-3 top-1/3 text-red-300' }, { Icon: MapPin, className: 'bottom-3 left-1/3 text-emerald-300' }].map(({ Icon, className }, index) => <motion.span key={index} aria-hidden="true" className={`absolute hidden h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-slate-950/80 shadow-xl backdrop-blur-xl sm:grid ${className}`} animate={{ y: [0, -10, 0], rotate: [0, index % 2 ? 4 : -4, 0] }} transition={{ duration: 3.5 + index, repeat: Infinity }}><Icon className="h-5 w-5" /></motion.span>)}
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
