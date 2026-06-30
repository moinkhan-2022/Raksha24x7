import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';

const empty = { name: '', relationship: '', phone: '' };

function EmergencyContacts({ contacts, onAdd, onUpdate, onDelete }) {
  const [draft, setDraft] = useState(empty);
  const [editId, setEditId] = useState(null);

  return (
    <div className="space-y-3">
      {contacts.map((c) => (
        <div key={c._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
          {editId === c._id ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="rounded bg-slate-800 p-2" value={c.name} onChange={(e)=>onUpdate(c._id,{...c,name:e.target.value})} />
              <input className="rounded bg-slate-800 p-2" value={c.relationship} onChange={(e)=>onUpdate(c._id,{...c,relationship:e.target.value})} />
              <input className="rounded bg-slate-800 p-2" value={c.phone} onChange={(e)=>onUpdate(c._id,{...c,phone:e.target.value})} />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p>{c.name} • {c.relationship} • {c.phone}</p>
              <div className="flex gap-2">
                <button onClick={()=>setEditId(c._id)}><Pencil className="h-4 w-4"/></button>
                <button onClick={()=>window.confirm('Delete this contact?') && onDelete(c._id)}><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-3">
        <input className="rounded bg-slate-800 p-2" placeholder="Name" value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})} />
        <input className="rounded bg-slate-800 p-2" placeholder="Relationship" value={draft.relationship} onChange={(e)=>setDraft({...draft,relationship:e.target.value})} />
        <div className="flex gap-2">
          <input className="w-full rounded bg-slate-800 p-2" placeholder="Phone" value={draft.phone} onChange={(e)=>setDraft({...draft,phone:e.target.value})} />
          <button onClick={()=>{onAdd(draft);setDraft(empty);}} className="rounded bg-blue-600 px-3"><Plus className="h-4 w-4"/></button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyContacts;
