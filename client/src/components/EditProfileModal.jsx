function EditProfileModal({ open, form, setForm, onSave, onClose, loading, theme = 'dark' }) {
  if (!open) return null;
  const isLight = theme === 'light';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-3xl border p-5 shadow-2xl ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`}>
        <h3 className="text-lg font-bold">Edit Profile</h3>
        <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Update your basic account details.</p>
        <div className="space-y-3">
          <label className="mt-5 block">
            <span className={`mb-1 block text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Full Name</span>
            <input className={`w-full rounded-2xl border px-4 py-3 outline-none focus:border-red-400 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`} placeholder="Name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
          </label>
          <label className="block">
            <span className={`mb-1 block text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Email Address</span>
            <input className={`w-full rounded-2xl border px-4 py-3 outline-none disabled:opacity-70 ${isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-white/10 bg-slate-950 text-slate-400'}`} placeholder="Email" value={form.email} disabled />
          </label>
          <label className="block">
            <span className={`mb-1 block text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Mobile Number</span>
            <input className={`w-full rounded-2xl border px-4 py-3 outline-none focus:border-red-400 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`} placeholder="Phone" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} />
          </label>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={onClose} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isLight ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-slate-200 hover:bg-white/10'}`}>Cancel</button>
          <button onClick={onSave} disabled={loading} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default EditProfileModal;
