import { useEffect, useState } from 'react';
import { ExternalLink, Map, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import sosService from '../services/sosService';

function SosHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = async () => {
    try {
      const { data } = await sosService.history();
      setItems(data.items || []);
    } catch (e) { setToast(e.response?.data?.message || 'Failed to load history'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Delete this SOS history item?')) return;
    await sosService.remove(id);
    await load();
  };

  const retry = async (id) => {
    try {
      await sosService.retry(id);
      setToast('Failed SOS communications retried.');
      await load();
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not retry SOS communications.');
    }
  };

  const stop = async (id) => {
    try {
      await sosService.stop(id);
      setToast('SOS marked as resolved.');
      await load();
    } catch (error) {
      setToast(error.response?.data?.message || 'Could not stop SOS tracking.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type={/failed|could not|invalid/i.test(toast) ? 'error' : 'success'} />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <h1 className="mb-4 text-2xl font-bold text-white">SOS History</h1>
        {loading ? <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" /> : items.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">No SOS history yet.</div> : (
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-white">{new Date(i.createdAt).toLocaleString()}</p>
                    <p className="mt-1 text-sm text-slate-300">Emergency ID: {i.emergencyId || i._id}</p>
                    <span className="mt-2 inline-flex rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold capitalize text-red-200">Status: {i.status}</span>
                  </div>
                  <DeliverySummary summary={i.deliverySummary} />
                </div>

                {i.statusTimeline?.length ? (
                  <div className="mt-4 rounded-2xl bg-slate-950/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Delivery Timeline</p>
                    <div className="space-y-2">
                      {i.statusTimeline.slice(-4).map((event, index) => (
                        <div key={`${event.status}-${event.at}-${index}`} className="flex gap-2 text-sm text-slate-300">
                          <span className="mt-1 h-2 w-2 rounded-full bg-red-400" />
                          <span><span className="capitalize text-white">{event.status}</span> - {event.message} <span className="text-slate-500">{event.at ? new Date(event.at).toLocaleTimeString() : ''}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={i.googleMapLink} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-3 py-1 text-sm"><ExternalLink className="inline h-3 w-3" /> Google Maps</a>
                  {i.liveTrackingLink && <a href={i.liveTrackingLink} target="_blank" rel="noreferrer" className="rounded bg-red-600 px-3 py-1 text-sm"><ExternalLink className="inline h-3 w-3" /> Live Tracking</a>}
                  {Number.isFinite(Number(i.latitude)) && Number.isFinite(Number(i.longitude)) && (
                    <button onClick={() => navigate('/google-map', { state: { location: { ...i, timestamp: i.createdAt } } })} className="rounded bg-indigo-600 px-3 py-1 text-sm"><Map className="inline h-3 w-3" /> View on Map</button>
                  )}
                  {i.status !== 'resolved' && <button onClick={() => stop(i._id)} className="rounded bg-emerald-600 px-3 py-1 text-sm"><ShieldCheck className="inline h-3 w-3" /> Resolve</button>}
                  <button onClick={() => retry(i._id)} className="rounded bg-amber-600 px-3 py-1 text-sm"><RotateCcw className="inline h-3 w-3" /> Retry</button>
                  <button onClick={() => remove(i._id)} className="rounded bg-rose-600 px-3 py-1 text-sm"><Trash2 className="inline h-3 w-3" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DeliverySummary({ summary = {} }) {
  const items = [
    ['Delivered', summary.delivered || 0, 'text-emerald-300'],
    ['Sent', summary.sent || 0, 'text-blue-300'],
    ['Failed', summary.failed || 0, 'text-red-300'],
    ['Skipped', summary.skipped || 0, 'text-slate-400']
  ];
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-950/40 p-2">
      {items.map(([label, value, color]) => (
        <div key={label} className="text-center">
          <p className={`text-sm font-bold ${color}`}>{value}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

export default SosHistoryPage;
