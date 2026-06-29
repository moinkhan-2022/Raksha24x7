import { motion } from 'framer-motion';

function SOSButton() {
  return (
    <div className="flex justify-center py-8">
      <motion.button
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="relative h-40 w-40 rounded-full bg-red-600 text-3xl font-extrabold text-white shadow-2xl shadow-red-600/40"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
        <span className="relative">SOS</span>
      </motion.button>
    </div>
  );
}

export default SOSButton;
