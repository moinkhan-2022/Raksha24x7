import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageSquare, MapPinned, Siren, Star, Trash2, Pencil, Upload, Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import contactService from '../services/contactService';

const REL = ['Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Guardian', 'Spouse', 'Other'];

function EmergencyContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [form, setForm] = useState({ name: '', phone: '', relationship: 'Friend' });
  const [editing, setEditing] = useState(null);

  const fetchData = async () => {
    try { const { data } = await contactService.getAll(); setContacts(data.contacts || []); } catch (e) { setToast(e.response?.data?.message || 'Failed to load contacts'); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = contacts.filter((c) => [c.name, c.phone, c.relationship].some((v) => String(v || '').toLowerCase().includes(q)));
    if (sortBy === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'relationship') list = [...list].sort((a, b) => a.relationship.localeCompare(b.relationship));
    if (sortBy === 'recent') list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [contacts, search, sortBy]);

  const submit = async () => {
    try {
      if (!form.name.trim() || !/^\d{10}$/.test(form.phone) || !form.relationship) return setToast('Enter valid contact details');
      if (!editing && contacts.length >= 5) return setToast('Maximum 5 contacts allowed');
      if (editing) await contactService.update(editing, form); else await contactService.create(form);
      setForm({ name: '', phone: '', relationship: 'Friend' });
      setEditing(null);
      await fetchData();
      setToast(editing ? 'Contact updated' : 'Contact added');
    } catch (e) { setToast(e.response?.data?.message || 'Action failed'); }
  };

  const onEdit = (c) => { setEditing(c._id); setForm({ name: c.name, phone: c.phone, relationship: c.relationship }); };
  const onDelete = async (id) => { if (!window.confirm('Delete this contact?')) return; await contactService.remove(id); await fetchData(); setToast('Contact deleted'); };
  const onPrimary = async (id) => { await contactService.setPrimary(id); await fetchData(); setToast('Primary contact updated'); };

  const onExport = () => {
    const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'emergency-contacts.json'; a.click(); URL.revokeObjectURL(url);
  };

  const onImport = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return setToast('Invalid JSON format');
      for (const c of parsed) {
        if (!c.name || !/^\d{10}$/.test(c.phone || '') || !c.relationship) continue;
        try { await contactService.create({ name: c.name, phone: c.phone, relationship: c.relationship }); } catch {}
      }
      await fetchData();
      setToast('Contacts imported');
    } catch { setToast('Import failed'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar dashboard />
      <Toast message={toast} type={toast.toLowerCase().includes('failed') || toast.toLowerCase().includes('invalid') ? 'error' : 'success'} />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Emergency Contacts</h1>
          <div className="flex gap-2">
            <button onClick={onExport} className="rounded-lg bg-slate-700 px-3 py-2 text-sm"><Download className="inline h-4 w-4" /> Export</button>
            <label className="rounded-lg bg-slate-700 px-3 py-2 text-sm cursor-pointer"><Upload className="inline h-4 w-4" /> Import<input type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files?.[0] && onImport(e.target.files[0])} /></label>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="grid gap-3 md:grid-cols-5">
            <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Full Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
            <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Mobile Number" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} />
            <select className="rounded-lg bg-slate-900/70 p-3" value={form.relationship} onChange={(e)=>setForm({...form,relationship:e.target.value})}>{REL.map((r)=><option key={r}>{r}</option>)}</select>
            <button onClick={submit} className="rounded-lg bg-red-600 px-4 py-3 font-semibold">{editing ? 'Update Contact' : '+ Add Contact'}</button>
            <input className="rounded-lg bg-slate-900/70 p-3" placeholder="Search name/phone/relationship" value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div className="mt-3">
            <select className="rounded-lg bg-slate-900/70 p-2" value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
              <option value="recent">Recently Added</option>
              <option value="name">Alphabetically</option>
              <option value="relationship">Relationship</option>
            </select>
          </div>
        </section>

        {loading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i)=><div key={i} className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}</div> : (
          filtered.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-slate-300">No contacts found.</div> :
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <motion.div key={c._id} whileHover={{ y: -4 }} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600/30">{(c.name || 'U')[0]}</div><div><p className="font-semibold text-white">{c.name}</p><p className="text-sm text-slate-300">{c.relationship}</p></div></div>
                    {c.isPrimary && <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-200">Primary</span>}
                  </div>
                  <p className="mt-3 text-slate-200">{c.phone}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <a href={`tel:${c.phone}`} className="rounded bg-slate-700 px-2 py-1"><Phone className="inline h-3 w-3" /> Call</a>
                    <a href={`sms:${c.phone}`} className="rounded bg-slate-700 px-2 py-1"><MessageSquare className="inline h-3 w-3" /> SMS</a>
                    <button className="rounded bg-slate-700 px-2 py-1"><MapPinned className="inline h-3 w-3" /> Share Location</button>
                    <button className="rounded bg-red-600 px-2 py-1"><Siren className="inline h-3 w-3" /> SOS</button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={()=>onEdit(c)} className="rounded bg-blue-600 px-3 py-1 text-sm"><Pencil className="inline h-3 w-3" /> Edit</button>
                    <button onClick={()=>onDelete(c._id)} className="rounded bg-rose-600 px-3 py-1 text-sm"><Trash2 className="inline h-3 w-3" /> Delete</button>
                    <button onClick={()=>onPrimary(c._id)} className="rounded bg-amber-600 px-3 py-1 text-sm"><Star className="inline h-3 w-3" /> Primary</button>
                  </div>
                </motion.div>
              ))}
            </div>
        )}
      </main>
    </div>
  );
}

export default EmergencyContactsPage;
