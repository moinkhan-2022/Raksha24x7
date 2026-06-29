import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 md:px-6">
      <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />
      <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 className="text-4xl font-extrabold leading-tight text-white md:text-6xl">
            Your Safety.<br />Always One Tap Away.
          </h1>
          <p className="mt-5 max-w-xl text-slate-300 md:text-lg">
            Raksha24x7 helps users quickly access emergency services, SOS alerts, live location and nearby hospitals during emergencies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-500">Get Started</Link>
            <Link to="/login" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10">Login</Link>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative mx-auto w-full max-w-lg rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur-2xl">
          <div className="aspect-[4/3] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
            <div className="grid h-full place-content-center text-center text-slate-300">Emergency Illustration</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
