import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, LocateFixed, MapPinned, PhoneCall, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import sosService from '../services/sosService';
import SOSCountdownModal from '../components/SOSCountdownModal';
import locationService from '../services/locationService';

const cards = [
  { icon: LifeBuoy, title: 'SOS', subtitle: 'Trigger immediate emergency alert' },
  { icon: LocateFixed, title: 'Live Location', subtitle: 'Share real-time location with contacts' },
  { icon: Users, title: 'Contacts', subtitle: 'Manage emergency contact list' },
  { icon: MapPinned, title: 'Nearby Services', subtitle: 'Locate hospitals and police nearby' },
  { icon: PhoneCall, title: 'Emergency Numbers', subtitle: 'Quick access to helplines' },
  { icon: ShieldCheck, title: 'Safety Tips', subtitle: 'Read practical safety guidance' }
];

function CardSkeleton() { return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />; }

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [latest, setLatest] = useState(null);
  const [total, setTotal] = useState(0);
  const [countOpen, setCountOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [sending, setSending] = useState(false);
  const [latestLocation, setLatestLocation] = useState(null);
  const timerRef = useRef(null);

  const loadLatest = async () => {
    try {
      const { data } = await sosService.latest();
      setLatest(data.item || null);
      setTotal(data.total || 0);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadLatest();
    if (!user?.isGuest) {
      locationService.getLatestLocation()
        .then(({ data }) => setLatestLocation(data.location || null))
        .catch(() => {});
    }
    return () => clearInterval(timerRef.current);
  }, [user?.isGuest]);

  const cancelCountdown = () => {
    clearInterval(timerRef.current);
    setCountOpen(false);
    setCount(5);
    setToast('SOS cancelled');
  };

  const triggerSos = () => {
    if (sending || countOpen) return;
    const ok = window.confirm('Are you sure you want to send an emergency alert?');
    if (!ok) return;

    setCountOpen(true);
    setCount(5);
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!countOpen || count !== 0) return;
    const send = async () => {
      try {
        setSending(true);
        if (!navigator.geolocation) throw new Error('Geolocation is not supported by your browser');

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });

        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };

        await sosService.send(payload);
        setToast('SOS alert sent successfully');
        setCountOpen(false);
        setCount(5);
        await loadLatest();
      } catch (e) {
        const geoError = e?.code === 1 ? 'Location permission denied' : e?.message;
        setToast(geoError || e.response?.data?.message || 'Failed to send SOS');
        setCountOpen(false);
        setCount(5);
      } finally {
        setSending(false);
      }
    };
    send();
  }, [countOpen, count]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type={toast.toLowerCase().includes('failed') || toast.toLowerCase().includes('denied') ? 'error' : 'success'} />
      <SOSCountdownModal open={countOpen} count={count} onCancel={cancelCountdown} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Welcome, {user?.name || 'User'}</h1>
          <p className="mt-2 text-slate-300">Stay Safe. Emergency help is always available.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200">Total SOS Sent: <span className="font-semibold text-white">{total}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200">Last SOS: <span className="font-semibold text-white">{latest ? new Date(latest.createdAt).toLocaleString() : 'N/A'}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200">Last Location: <span className="font-semibold text-white">{latest ? `${latest.latitude.toFixed(4)}, ${latest.longitude.toFixed(4)}` : 'N/A'}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200">Emergency Status: <span className="font-semibold text-white">{sending ? 'Sending...' : 'Ready'}</span></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200">Last Known Location: <span className="font-semibold text-white">{latestLocation ? `${latestLocation.latitude.toFixed(4)}, ${latestLocation.longitude.toFixed(4)}` : 'N/A'}</span></div>
          </div>
        </motion.section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <motion.button key={c.title} onClick={() => c.title === 'Live Location' && navigate('/live-location')} whileHover={{ y: -4 }} className="w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-xl hover:bg-white/10">
              <c.icon className="mb-3 h-6 w-6 text-blue-300" />
              <p className="font-semibold text-white">{c.title}</p>
              <p className="mt-1 text-sm text-slate-300">{c.title === 'Live Location' && latestLocation ? `Last: ${latestLocation.latitude.toFixed(4)}, ${latestLocation.longitude.toFixed(4)}` : c.subtitle}</p>
            </motion.button>
          ))}
        </section>

        <div className="flex justify-center py-8">
          <motion.button onClick={triggerSos} disabled={sending || countOpen} whileHover={{ scale: 1.04 }} animate={{ boxShadow: ['0 0 20px rgba(239,68,68,.35)', '0 0 40px rgba(239,68,68,.6)', '0 0 20px rgba(239,68,68,.35)'] }} transition={{ duration: 1.6, repeat: Infinity }} className="relative h-44 w-44 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-3xl font-extrabold text-white shadow-2xl disabled:opacity-60">
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
            <span className="relative">SOS</span>
          </motion.button>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <p className="mt-3 text-slate-300">{latest ? `Last SOS sent at ${new Date(latest.createdAt).toLocaleString()}` : 'No emergency activity yet.'}</p>
          </div>
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 backdrop-blur-xl">
            <p className="text-red-100">If you feel unsafe, press SOS immediately.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="tel:112" className="rounded bg-red-700 px-3 py-1 text-white">Call 112</a>
              {latest?.googleMapLink && <a href={latest.googleMapLink} target="_blank" rel="noreferrer" className="rounded bg-slate-700 px-3 py-1 text-white">Open Google Maps</a>}
              {latest?.googleMapLink && <button onClick={() => navigator.clipboard.writeText(latest.googleMapLink)} className="rounded bg-slate-700 px-3 py-1 text-white">Copy Location</button>}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></section>
      </main>
    </div>
  );
}

export default Dashboard;
