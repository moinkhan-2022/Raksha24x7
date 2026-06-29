import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function CTASection() {
  return (
    <section className="px-4 pb-20 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-7xl rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-600/20 to-blue-600/20 p-8 text-center backdrop-blur-xl"
      >
        <h3 className="text-2xl font-bold text-white md:text-3xl">If you feel unsafe, press SOS immediately.</h3>
        <p className="mx-auto mt-3 max-w-2xl text-slate-200">Be prepared before an emergency happens. Join Raksha24x7 and keep help one tap away.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/register" className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-500">Get Started</Link>
          <Link to="/login" className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white hover:bg-white/10">Login</Link>
        </div>
      </motion.div>
    </section>
  );
}

export default CTASection;
