import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

function AdminSettingsPage() {
  const [form, setForm] = useState({ applicationName: 'Raksha24x7', version: '1.0.0', maintenanceMode: false, supportEmail: 'support@raksha24x7.com' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const isLight = localStorage.getItem('raksha_theme') === 'light';

  useEffect(() => {
    adminApi.settings()
      .then((response) => setForm((current) => ({ ...current, ...(response.data.settings || {}) })))
      .catch(() => setMessage('Could not load settings. Showing defaults.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await adminApi.updateSettings(form);
      setForm(data.settings);
      setMessage(data.message || 'Settings saved.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Admin Settings" subtitle="Application settings and future-ready controls.">
      <section className={`mx-auto max-w-3xl rounded-3xl border p-6 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        {message ? <div className="mb-5 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">{message}</div> : null}
        {loading ? <div className={`h-72 animate-pulse rounded-3xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} /> : (
          <div className="space-y-4">
            <Field label="Application Name" value={form.applicationName} onChange={(value) => setForm({ ...form, applicationName: value })} isLight={isLight} />
            <Field label="Version" value={form.version} onChange={(value) => setForm({ ...form, version: value })} isLight={isLight} />
            <Field label="Support Email" value={form.supportEmail} onChange={(value) => setForm({ ...form, supportEmail: value })} isLight={isLight} />
            <label className={`flex items-center justify-between rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}>
              <span>
                <span className="block font-semibold">Maintenance Mode</span>
                <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Future-ready toggle for deployment maintenance.</span>
              </span>
              <input type="checkbox" checked={form.maintenanceMode} onChange={(event) => setForm({ ...form, maintenanceMode: event.target.checked })} className="h-5 w-5" />
            </label>
            <button type="button" onClick={save} disabled={saving} className="w-full rounded-2xl bg-red-600 px-5 py-4 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">
              <Save className="mr-2 inline h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, isLight }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-12 w-full rounded-2xl border px-4 outline-none focus:border-red-400 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950' : 'border-white/10 bg-slate-950 text-white'}`} />
    </label>
  );
}

export default AdminSettingsPage;
