import { motion } from 'framer-motion';
import { LifeBuoy, LocateFixed, MapPinned, PhoneCall, ShieldCheck, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const cards = [
  { icon: LifeBuoy, title: 'SOS', subtitle: 'Trigger immediate emergency alert' },
  { icon: LocateFixed, title: 'Live Location', subtitle: 'Share real-time location with contacts' },
  { icon: Users, title: 'Contacts', subtitle: 'Manage emergency contact list' },
  { icon: MapPinned, title: 'Nearby Services', subtitle: 'Locate hospitals and police nearby' },
  { icon: PhoneCall, title: 'Emergency Numbers', subtitle: 'Quick access to helplines' },
  { icon: ShieldCheck, title: 'Safety Tips', subtitle: 'Read practical safety guidance' }
];

function CardSkeleton() {
  return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
}

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.name || 'User'}</h1>
          <p className="mt-2 text-slate-300">Stay Safe. Emergency help is always available.</p>
        </motion.section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <motion.button key={c.title} whileHover={{ y: -4 }} className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-xl hover:bg-white/10">
              <c.icon className="mb-3 h-6 w-6 text-blue-300" />
              <p className="font-semibold text-white">{c.title}</p>
              <p className="mt-1 text-sm text-slate-300">{c.subtitle}</p>
            </motion.button>
          ))}
        </section>

        <div className="flex justify-center py-8">
          <motion.button animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="relative h-40 w-40 rounded-full bg-red-600 text-3xl font-extrabold text-white shadow-2xl shadow-red-600/40">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
            <span className="relative">SOS</span>
          </motion.button>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <p className="mt-3 text-slate-300">No emergency activity yet.</p>
          </div>
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 backdrop-blur-xl">
            <p className="text-red-100">If you feel unsafe, press SOS immediately.</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
