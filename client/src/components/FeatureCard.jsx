import { motion } from 'framer-motion';

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <motion.div whileHover={{ y: -6 }} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <Icon className="mb-4 h-6 w-6 text-red-400" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </motion.div>
  );
}

export default FeatureCard;
