import { useEffect, useState } from 'react';
import { ArrowRight, Heart, Phone, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import emergencyNumbersService from '../services/emergencyNumbersService';

function EmergencyNumbersDashboardCard() {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState([]);
  const favorites = emergencyNumbersService.getFavorites();
  const recentCalls = emergencyNumbersService.getRecents().filter((item) => item.action === 'called');
  useEffect(() => { emergencyNumbersService.getEmergencyNumbers().then((items) => setNumbers(items.filter((item) => item.country === 'IN'))).catch(() => {}); }, []);
  const top = [...numbers.filter((item) => favorites.includes(item.id)), ...numbers.filter((item) => ['112', '100', '108'].includes(item.number) && !favorites.includes(item.id))].slice(0, 3);
  return <div className="rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/10 to-white/[0.03] p-4"><div className="flex items-center justify-between"><div><p className="flex items-center gap-2 font-semibold text-white"><PhoneCall className="h-4 w-4 text-red-300" />Emergency Numbers</p><p className="mt-1 text-xs text-slate-400">{favorites.length} favorites · {recentCalls.length} recent calls</p></div><button type="button" onClick={() => navigate('/emergency-numbers')} className="rounded-xl bg-red-600 p-2 text-white" aria-label="Open Emergency Numbers"><ArrowRight className="h-4 w-4" /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{top.map((item) => <a key={item.id} href={`tel:${item.number}`} className="rounded-xl bg-slate-950/40 p-3"><p className="truncate text-xs text-slate-400">{favorites.includes(item.id) && <Heart className="mr-1 inline h-3 w-3 fill-rose-400 text-rose-400" />}{item.service}</p><p className="mt-1 flex items-center gap-1 font-bold text-red-200"><Phone className="h-3.5 w-3.5" />{item.number}</p></a>)}</div></div>;
}

export default EmergencyNumbersDashboardCard;
