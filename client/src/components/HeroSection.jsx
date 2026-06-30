import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import EmergencyHeroAnimation from '../assets/animations/EmergencyHeroAnimation';

function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pt-24 md:px-6 lg:pb-24">
      <div className="absolute -left-24 top-14 h-80 w-80 rounded-full bg-red-500/20 blur-3xl" />
      <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Your Safety.<br />Always One Tap Away.
          </h1>
          <p className="mt-5 max-w-xl text-slate-300 md:text-lg">
            Raksha24x7 helps users quickly access emergency services, SOS alerts, live location and nearby hospitals during emergencies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:bg-red-500">Get Started</Link>
            <Link to="/login" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">Login</Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
          <div className="aspect-[4/3]">
            <EmergencyHeroAnimation />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
