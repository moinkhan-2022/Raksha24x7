function EditProfileModal({ open, form, setForm, onSave, onClose, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-5">
        <h3 className="mb-4 text-lg font-semibold">Edit Profile</h3>
        <div className="space-y-3">
          <input className="w-full rounded-lg bg-slate-800 p-3" placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
          <input className="w-full rounded-lg bg-slate-800 p-3" placeholder="Email" value={form.email} disabled />
          <input className="w-full rounded-lg bg-slate-800 p-3" placeholder="Phone" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} />
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onSave} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2">Save</button>
          <button onClick={onClose} className="rounded-lg border border-white/20 px-4 py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;
