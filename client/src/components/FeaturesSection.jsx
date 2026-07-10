import { motion } from 'framer-motion';
import { BookOpenCheck, ContactRound, LocateFixed, Map, MapPinned, PhoneCall, Siren } from 'lucide-react';

const features = [
  { icon: Siren, title: 'One Tap SOS', description: 'Trigger a location-aware emergency alert in seconds.', accent: 'from-red-500/20' },
  { icon: LocateFixed, title: 'Live Location', description: 'Share your live location with trusted responders.' },
  { icon: MapPinned, title: 'Nearby Emergency Services', description: 'Discover hospitals, police, pharmacies, shelters and more.' },
  { icon: Map, title: 'Interactive Maps', description: 'See your position and emergency resources on a responsive map.' },
  { icon: ContactRound, title: 'Emergency Contacts', description: 'Keep trusted family and guardians ready for an alert.' },
  { icon: PhoneCall, title: 'Emergency Numbers', description: 'Reach essential national helplines without searching.' },
  { icon: BookOpenCheck, title: 'Safety Tips', description: 'Build confidence with clear, practical safety guidance.' }
];

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 px-4 pb-16 md:px-6" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">Safety toolkit</p>
        <h2 id="features-heading" className="mb-8 mt-2 text-2xl font-bold text-white md:text-3xl">Features built for emergencies</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-5 shadow-xl shadow-black/20 backdrop-blur-xl focus-within:ring-2 focus-within:ring-blue-300"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300/50 to-transparent opacity-0 transition group-hover:opacity-100" />
              <f.icon className="mb-4 h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
