import { useEffect, useState } from 'react';
import { Monitor, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

function AdminSessionsPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSessions = () => {
    setLoading(true);
    adminApi.sessions()
      .then((response) => setSessions(response.data.sessions || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load admin sessions.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revoke = async (id) => {
    await adminApi.revokeSession(id);
    loadSessions();
  };

  return (
    <AdminLayout title="Active Sessions" subtitle="Review and revoke administrator sessions.">
      <section className={`mx-auto max-w-4xl rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        {error ? <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
        <div className="space-y-3">
          {loading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className={`h-24 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />)
            : sessions.length ? sessions.map((session) => (
              <article key={session.id} className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
                <div className="flex gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-300"><Monitor className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold">{session.browser} • {session.operatingSystem}</p>
                    <p className="mt-1 text-sm text-slate-500">{session.device} • {session.ipAddress || 'IP unavailable'}</p>
                    <p className="mt-1 text-xs text-slate-500">Login: {new Date(session.loginTime).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {session.current ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">Current</span> : null}
                  <button type="button" onClick={() => revoke(session.id)} disabled={session.current || !session.isActive} className="rounded-xl border border-red-400/30 p-2 text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Revoke session">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            )) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No admin sessions found.</p>}
        </div>
      </section>
    </AdminLayout>
  );
}

export default AdminSessionsPage;
