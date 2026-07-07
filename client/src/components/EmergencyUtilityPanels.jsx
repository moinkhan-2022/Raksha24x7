import { Phone } from 'lucide-react';

export function QuickEmergencyPanel({ numbers, onCall }) {
  const quick = [
    ['112', '112', (item) => item.number === '112' || item.number === '911' || item.number === '999' || item.number === '000'],
    ['Police', 'Police', (item) => item.category === 'police'],
    ['Ambulance', 'Ambulance', (item) => item.category === 'ambulance'],
    ['Fire', 'Fire', (item) => item.category === 'fire']
  ]
    .map(([key, label, predicate]) => ({ key, label, record: numbers.find(predicate) }))
    .filter((item) => item.record);

  return (
    <aside className="fixed bottom-4 right-4 z-30 flex flex-col gap-2" aria-label="Quick emergency calls">
      {quick.map(({ key, label, record }) => (
        <button
          key={key}
          type="button"
          onClick={() => onCall(record)}
          className="flex min-h-12 min-w-24 items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-sm font-bold text-white shadow-2xl shadow-red-950/40 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-red-500"
        >
          <Phone className="h-4 w-4" />
          {label}
        </button>
      ))}
    </aside>
  );
}

export function CompactEmergencyStrip({ title, records, emptyText, favorites, onFavorite, onCall, onWhatsApp, notify }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <span className="text-xs text-slate-500">{records.length}</span>
      </div>
      {records.length ? (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <div key={`${title}-${record.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/45 p-3 ring-1 ring-white/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{record.service}</p>
                <p className="text-xs text-slate-400">{record.number}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => onCall(record)} className="rounded-full bg-red-600 p-2 text-white hover:bg-red-500" aria-label={`Call ${record.service}`}>
                  <Phone className="h-4 w-4" />
                </button>
                {onFavorite ? (
                  <button
                    type="button"
                    onClick={() => onFavorite(record)}
                    className={`rounded-full px-3 text-xs font-semibold ${favorites?.includes(record.id) ? 'bg-rose-500/20 text-rose-200' : 'bg-white/10 text-slate-200'}`}
                  >
                    {favorites?.includes(record.id) ? 'Saved' : 'Save'}
                  </button>
                ) : null}
                {onWhatsApp ? (
                  <button type="button" onClick={() => { onWhatsApp(record); notify?.('Opening WhatsApp.'); }} className="rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-500">
                    WhatsApp
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}
