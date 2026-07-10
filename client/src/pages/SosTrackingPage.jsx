import { useEffect, useState } from 'react';
import { ExternalLink, LocateFixed, Navigation, RefreshCw, ShieldAlert } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Toast from '../components/Toast';
import sosService from '../services/sosService';

function SosTrackingPage() {
  const { token } = useParams();
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await sosService.tracking(token);
      setTracking(data.tracking);
    } catch (error) {
      setToast(error.response?.data?.message || 'Tracking link is invalid or expired.');
      setTracking(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const latest = tracking?.locationUpdates?.at?.(-1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 text-white">
      <Toast message={toast} type="error" />
      <main className="mx-auto flex min-h-screen max-w-2xl items-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15 text-red-300">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Raksha24x7 SOS Tracking</h1>
              <p className="text-sm text-slate-300">Secure emergency location link</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 h-56 animate-pulse rounded-2xl bg-white/10" />
          ) : tracking ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-red-200">Emergency Active</p>
                <p className="mt-1 text-lg font-semibold">{tracking.user?.name || 'Raksha24x7 user'} may need help.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Latitude" value={tracking.latitude} />
                <Info label="Longitude" value={tracking.longitude} />
                <Info label="Accuracy" value={tracking.accuracy ? `${Math.round(tracking.accuracy)} m` : 'Unavailable'} />
                <Info label="Last Updated" value={new Date(latest?.timestamp || tracking.updatedAt).toLocaleString()} />
              </div>

              {tracking.address ? <p className="rounded-2xl bg-white/5 p-4 text-sm text-slate-300">{tracking.address}</p> : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <a href={tracking.googleMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold hover:bg-blue-500">
                  <ExternalLink className="h-4 w-4" /> Maps
                </a>
                <a href={tracking.directionsLink || tracking.googleMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500">
                  <Navigation className="h-4 w-4" /> Navigate
                </a>
                <button type="button" onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-center">
              <LocateFixed className="mx-auto h-8 w-8 text-amber-200" />
              <h2 className="mt-3 text-lg font-semibold">Tracking unavailable</h2>
              <p className="mt-1 text-sm text-slate-300">This link may be expired, stopped, or invalid.</p>
              <button type="button" onClick={load} className="mt-4 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold hover:bg-red-500">Try Again</button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value || 'Unavailable'}</p>
    </div>
  );
}

export default SosTrackingPage;
