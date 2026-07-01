import { useEffect, useState } from 'react';
import { ExternalLink, Map, Trash2 } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type="error" />
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <h1 className="mb-4 text-2xl font-bold text-white">SOS History</h1>
        {loading ? <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" /> : items.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-300">No SOS history yet.</div> : (
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <p className="text-white">{new Date(i.createdAt).toLocaleString()}</p>
                <p className="text-slate-300">Status: {i.status}</p>
                <div className="mt-3 flex gap-2">
                  <a href={i.googleMapLink} target="_blank" rel="noreferrer" className="rounded bg-blue-600 px-3 py-1 text-sm"><ExternalLink className="inline h-3 w-3" /> Google Maps</a>
                  {Number.isFinite(Number(i.latitude)) && Number.isFinite(Number(i.longitude)) && (
                    <button onClick={() => navigate('/google-map', { state: { location: { ...i, timestamp: i.createdAt } } })} className="rounded bg-indigo-600 px-3 py-1 text-sm"><Map className="inline h-3 w-3" /> View on Map</button>
                  )}
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

export default SosHistoryPage;
