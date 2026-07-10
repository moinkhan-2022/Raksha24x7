import { useState } from 'react';
import { Check, Pencil, Phone, Plus, Trash2, UserPlus, X } from 'lucide-react';

const empty = { name: '', relationship: '', phone: '' };

const contactInitial = (name = 'C') => name.trim().charAt(0).toUpperCase() || 'C';

function EmergencyContacts({ contacts = [], onAdd, onUpdate, onDelete, theme = 'dark' }) {
  const isLight = theme === 'light';
  const [draft, setDraft] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(empty);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const valid = (contact) => contact.name?.trim() && contact.relationship?.trim() && /^\d{10}$/.test(contact.phone || '');

  const submitNew = async () => {
    if (!valid(draft)) {
      setError('Enter name, relationship, and a valid 10-digit phone number.');
      return;
    }
    await onAdd(draft);
    setDraft(empty);
    setError('');
    setFormOpen(false);
  };

  const submitEdit = async (id) => {
    if (!valid(editDraft)) {
      setError('Enter name, relationship, and a valid 10-digit phone number.');
      return;
    }
    await onUpdate(id, editDraft);
    setEditId(null);
    setEditDraft(empty);
    setError('');
  };

  return (
    <div className="relative flex min-h-[410px] flex-col">
      {contacts.length ? (
        <div className="space-y-3 pb-20">
          {contacts.map((contact) => (
            <div key={contact._id} className={`rounded-2xl border p-3 transition hover:-translate-y-0.5 ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-white/10 bg-slate-950/35 hover:bg-white/[0.07]'}`}>
              {editId === contact._id ? (
                <div className="grid gap-2">
                  <ContactInput label="Name" value={editDraft.name} onChange={(value) => setEditDraft({ ...editDraft, name: value })} isLight={isLight} />
                  <ContactInput label="Relationship" value={editDraft.relationship} onChange={(value) => setEditDraft({ ...editDraft, relationship: value })} isLight={isLight} />
                  <ContactInput label="Phone Number" value={editDraft.phone} onChange={(value) => setEditDraft({ ...editDraft, phone: value })} isLight={isLight} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditId(null); setError(''); }} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'border-slate-200 text-slate-700' : 'border-white/10 text-slate-200'}`}><X className="h-4 w-4" /></button>
                    <button type="button" onClick={() => submitEdit(contact._id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white"><Check className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-500/15 text-lg font-bold text-red-300">
                    {contactInitial(contact.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{contact.name}</h3>
                    <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{contact.relationship}</p>
                    <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}><Phone className="h-3.5 w-3.5" />{contact.phone}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Edit ${contact.name}`} onClick={() => { setEditId(contact._id); setEditDraft({ name: contact.name, relationship: contact.relationship, phone: contact.phone }); }} className={`grid h-9 w-9 place-items-center rounded-xl transition ${isLight ? 'text-slate-600 hover:bg-white' : 'text-slate-300 hover:bg-white/10'}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Delete ${contact.name}`} onClick={() => window.confirm('Delete this contact?') && onDelete(contact._id)} className="grid h-9 w-9 place-items-center rounded-xl text-rose-400 transition hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid flex-1 place-items-center rounded-3xl border border-dashed p-8 text-center ${isLight ? 'border-slate-300 bg-slate-50' : 'border-white/10 bg-slate-950/25'}`}>
          <div>
            <UserPlus className="mx-auto h-10 w-10 text-red-300" />
            <h3 className="mt-4 text-lg font-semibold">No emergency contacts yet</h3>
            <p className={`mx-auto mt-2 max-w-sm text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Add trusted people so they are ready when you need them most.</p>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

      <button type="button" onClick={() => { setFormOpen(true); setError(''); }} aria-label="Add emergency contact" className="absolute bottom-0 right-0 grid h-14 w-14 place-items-center rounded-full bg-red-600 text-white shadow-xl shadow-red-950/30 transition hover:scale-105 hover:bg-red-500">
        <Plus className="h-6 w-6" />
      </button>

      {formOpen && (
        <ContactModal
          draft={draft}
          setDraft={setDraft}
          onClose={() => { setFormOpen(false); setDraft(empty); setError(''); }}
          onSave={submitNew}
          isLight={isLight}
          error={error}
        />
      )}
    </div>
  );
}

function ContactInput({ label, value, onChange, isLight }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-red-400 ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`} />
    </label>
  );
}

function ContactModal({ draft, setDraft, onClose, onSave, isLight, error }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`}>
        <h3 className="text-lg font-bold">Add Emergency Contact</h3>
        <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Keep it simple: name, relationship, and phone number.</p>
        <div className="mt-5 grid gap-3">
          <ContactInput label="Name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} isLight={isLight} />
          <ContactInput label="Relationship" value={draft.relationship} onChange={(value) => setDraft({ ...draft, relationship: value })} isLight={isLight} />
          <ContactInput label="Phone Number" value={draft.phone} onChange={(value) => setDraft({ ...draft, phone: value })} isLight={isLight} />
        </div>
        {error && <p className="mt-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onClose} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isLight ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-slate-200 hover:bg-white/10'}`}>Cancel</button>
          <button type="button" onClick={onSave} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500">Save Contact</button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyContacts;
