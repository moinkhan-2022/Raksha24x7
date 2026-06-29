import { motion } from 'framer-motion';
import { Ambulance, Hospital, LocateFixed, ShieldAlert, Siren, Users } from 'lucide-react';

const features = [
  { icon: Siren, title: 'One Tap SOS', description: 'Instantly trigger SOS in critical situations.' },
  { icon: LocateFixed, title: 'Live Location', description: 'Share your live location with trusted responders.' },
  { icon: Users, title: 'Emergency Contacts', description: 'Reach family and guardians quickly.' },
  { icon: Hospital, title: 'Nearby Hospitals', description: 'Find nearest healthcare facilities fast.' },
  { icon: ShieldAlert, title: 'Police Helpline', description: 'Connect to police support instantly.' },
  { icon: Ambulance, title: 'Ambulance', description: 'Request medical emergency help without delay.' }
];

function FeaturesSection() {
  return (
    <section className="px-4 pb-16 md:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-2xl font-bold text-white md:text-3xl">Features built for emergencies</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl"
            >
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
