import { useEffect, useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

function PWAStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [toast, setToast] = useState(() => (navigator.onLine ? '' : "You're offline."));
  const [updateRegistration, setUpdateRegistration] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const clearToast = () => window.setTimeout(() => setToast(''), 2600);
    const handleOnline = () => {
      setOnline(true);
      setToast("You're back online.");
      clearToast();
      window.dispatchEvent(new CustomEvent('raksha:pwa-background-sync'));
    };
    const handleOffline = () => {
      setOnline(false);
      setToast("You're offline.");
    };
    const handleUpdate = (event) => setUpdateRegistration(event.detail?.registration || null);
    const handleError = (event) => {
      setError(event.detail?.message || 'Offline support is temporarily unavailable.');
      window.setTimeout(() => setError(''), 3500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('raksha:pwa-update', handleUpdate);
    window.addEventListener('raksha:pwa-error', handleError);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('raksha:pwa-update', handleUpdate);
      window.removeEventListener('raksha:pwa-error', handleError);
    };
  }, []);

  const updateNow = () => {
    if (!updateRegistration?.waiting) return;
    sessionStorage.setItem('raksha_sw_update_confirmed', '1');
    updateRegistration.waiting.postMessage({ type: 'RAKSHA_SKIP_WAITING' });
    setUpdateRegistration(null);
  };

  return (
    <>
      {toast && (
        <div className={`fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-xl ${online ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100' : 'border-rose-400/30 bg-rose-500/15 text-rose-100'}`} role="status" aria-live="polite">
          <span className="inline-flex items-center gap-2">
            {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {online ? `🟢 ${toast}` : `🔴 ${toast}`}
          </span>
        </div>
      )}

      {error && (
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] mx-auto max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 shadow-xl backdrop-blur-xl" role="status" aria-live="polite">
          {error}
        </div>
      )}

      {updateRegistration && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pwa-update-title">
          <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-black/40">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/15 text-orange-300">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h2 id="pwa-update-title" className="mt-4 text-xl font-bold">New Version Available</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">Update Raksha24x7 now?</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={updateNow} className="rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500">
                Update
              </button>
              <button type="button" onClick={() => setUpdateRegistration(null)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Later
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default PWAStatus;
