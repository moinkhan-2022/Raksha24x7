import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, SearchX, Siren } from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import EmergencyNumberCard from '../components/EmergencyNumberCard';
import EmergencyNumbersControls from '../components/EmergencyNumbersControls';
import { CompactEmergencyStrip, QuickEmergencyPanel } from '../components/EmergencyUtilityPanels';
import useEmergencyNumbers from '../hooks/useEmergencyNumbers';

function EmergencyNumbersPage() {
  const emergency = useEmergencyNumbers();
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const notify = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ message: '', type: 'success' }), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const countryNumbers = useMemo(
    () => emergency.numbers.filter((item) => item.country === emergency.filters.country),
    [emergency.filters.country, emergency.numbers]
  );

  const favoriteRecords = useMemo(
    () => countryNumbers.filter((record) => emergency.favorites.includes(record.id)).slice(0, 6),
    [countryNumbers, emergency.favorites]
  );

  const recentCallRecords = useMemo(() => {
    const byId = new Map(emergency.numbers.map((record) => [record.id, record]));
    return emergency.recents
      .filter((item) => item.action === 'called')
      .map((item) => byId.get(item.numberId))
      .filter(Boolean)
      .filter((record, index, array) => array.findIndex((item) => item.id === record.id) === index)
      .slice(0, 6);
  }, [emergency.numbers, emergency.recents]);

  const setCountry = (country) => {
    emergency.setFilters((current) => ({ ...current, country, category: 'all', state: 'all', city: 'all', smart: 'all', favoritesOnly: false }));
  };

  const setCategory = (category) => {
    emergency.setFilters((current) => ({ ...current, category, smart: 'all', favoritesOnly: false }));
  };

  const toggleFavorite = (record) => notify(emergency.toggleFavorite(record) ? 'Saved to favorites.' : 'Removed from favorites.');

  const call = (record) => {
    if (emergency.call(record)) notify(`Calling ${record.number}.`);
  };

  const openWhatsApp = (record) => {
    emergency.shareWhatsApp(record);
    notify('Opening WhatsApp.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/70 pb-32 text-white md:pb-10">
      <Navbar dashboard />
      <Toast message={toast.message} type={toast.type} />

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5 lg:px-6">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-950/30">
              <Siren className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Emergency Numbers</h1>
              <p className="mt-1 text-sm text-slate-400">Quick access to verified emergency helplines.</p>
            </div>
          </div>

          <EmergencyNumbersControls
            query={emergency.query}
            onQuery={emergency.setQuery}
            country={emergency.filters.country}
            onCountry={setCountry}
            category={emergency.filters.category}
            onCategory={setCategory}
          />
        </motion.header>

        <section className="mt-5" aria-labelledby="directory-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 id="directory-heading" className="text-lg font-semibold">Call directory</h2>
              <p className="text-xs text-slate-500">{emergency.filteredNumbers.length} helpline{emergency.filteredNumbers.length === 1 ? '' : 's'} available</p>
            </div>
            <button
              type="button"
              onClick={() => emergency.refresh().then(() => notify('Emergency numbers refreshed.'))}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              aria-label="Refresh emergency numbers"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {emergency.loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-3xl bg-white/[0.06]" />
              ))}
            </div>
          ) : emergency.filteredNumbers.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {emergency.filteredNumbers.map((record) => (
                <EmergencyNumberCard
                  key={record.id}
                  record={record}
                  favorite={emergency.favorites.includes(record.id)}
                  onFavorite={toggleFavorite}
                  onCall={call}
                  onWhatsApp={openWhatsApp}
                  onViewed={(record) => emergency.useRecord(record, 'viewed')}
                  notify={notify}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <SearchX className="mx-auto h-9 w-9 text-slate-500" />
              <h3 className="mt-3 font-semibold">No matching emergency number</h3>
              <p className="mt-1 text-sm text-slate-500">Try another service name, number, category, or country.</p>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <CompactEmergencyStrip
            title="Recent Calls"
            records={recentCallRecords}
            emptyText="Your recent emergency calls will appear here."
            favorites={emergency.favorites}
            onFavorite={toggleFavorite}
            onCall={call}
            notify={notify}
          />
          <CompactEmergencyStrip
            title="Favorites"
            records={favoriteRecords}
            emptyText="Save important helplines for one-tap access."
            favorites={emergency.favorites}
            onFavorite={toggleFavorite}
            onCall={call}
            onWhatsApp={openWhatsApp}
            notify={notify}
          />
        </div>
      </main>

      <QuickEmergencyPanel numbers={countryNumbers} onCall={call} />
    </div>
  );
}

export default EmergencyNumbersPage;
