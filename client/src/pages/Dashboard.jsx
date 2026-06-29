import { LifeBuoy, LocateFixed, MapPinned, PhoneCall, Shield, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import SOSButton from '../components/SOSButton';
import { useAuth } from '../context/AuthContext';

const cards = [
  { icon: LifeBuoy, title: 'SOS', subtitle: 'Trigger immediate emergency alert' },
  { icon: LocateFixed, title: 'Live Location', subtitle: 'Share real-time location with contacts' },
  { icon: Users, title: 'Contacts', subtitle: 'Manage emergency contact list' },
  { icon: MapPinned, title: 'Nearby Services', subtitle: 'Locate hospitals and police nearby' },
  { icon: PhoneCall, title: 'Emergency Numbers', subtitle: 'Quick access to helplines' },
  { icon: ShieldCheck, title: 'Safety Tips', subtitle: 'Read practical safety guidance' }
];

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Hello, {user?.name || 'User'} 👋</h1>
          <p className="mt-2 text-slate-300">Stay Safe. Emergency help is always available.</p>
        </motion.section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => <DashboardCard key={c.title} {...c} />)}
        </section>

        <SOSButton />

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <p className="mt-3 text-slate-300">No emergency activity yet.</p>
          </div>
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <Shield className="mt-1 h-5 w-5 text-red-400" />
              <p className="text-red-100">If you feel unsafe, press SOS immediately.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
