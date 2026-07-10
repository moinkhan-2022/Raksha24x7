import { ArrowRight, Phone, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const numbers = [
  { label: 'Emergency', number: '112' },
  { label: 'Police', number: '100' },
  { label: 'Ambulance', number: '108' }
];

function EmergencyNumbersDashboardCard({ theme = 'dark' }) {
  const navigate = useNavigate();
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-red-400/20 bg-white/[0.05]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`flex items-center gap-2 font-semibold ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>
            <PhoneCall className="h-4 w-4 text-red-300" />
            Emergency Numbers
          </p>
          <p className={`mt-1 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>One-tap emergency helplines</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/emergency-numbers')}
          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500"
        >
          View All
          <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {numbers.map((item) => (
          <a key={item.number} href={`tel:${item.number}`} className={`rounded-xl p-3 text-center transition ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-950/40 hover:bg-slate-900/70'}`}>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
            <p className="mt-1 flex items-center justify-center gap-1 font-bold text-red-200">
              <Phone className="h-3.5 w-3.5" />
              {item.number}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

export default EmergencyNumbersDashboardCard;
