import { motion } from 'framer-motion';

function DashboardCard({ icon: Icon, title, subtitle }) {
  return (
    <motion.button whileHover={{ y: -4 }} className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-xl hover:bg-white/10">
      <Icon className="mb-3 h-6 w-6 text-blue-300" />
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
    </motion.button>
  );
}

export default DashboardCard;
