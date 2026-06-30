import { motion } from 'framer-motion';

function SOSCountdownModal({ open, count, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-950/90 p-8 text-center backdrop-blur-xl">
        <p className="text-slate-300">Sending SOS in</p>
        <motion.div key={count} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="my-6 text-8xl font-extrabold text-red-500">{count}</motion.div>
        <button onClick={onCancel} className="rounded-xl border border-white/20 bg-white/5 px-5 py-2 text-white hover:bg-white/10">Cancel</button>
      </div>
    </div>
  );
}

export default SOSCountdownModal;
