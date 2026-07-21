import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Eye, EyeOff, Mail, Palette, RefreshCw,
  Save, Settings, Shield, SlidersHorizontal, Wrench, X
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../services/api';

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

function AdminSettingsPage() {
  const isLight = localStorage.getItem('raksha_theme') === 'light';
  const { admin } = useAdminAuth();
  const canWrite = ['super_admin', 'admin'].includes(String(admin?.role || '').toLowerCase());
  const [settings, setSettings] = useState(null);
  const [forms, setForms] = useState({});
  const [templates, setTemplates] = useState([]);
  const [templateDraft, setTemplateDraft] = useState(null);
  const [backup, setBackup] = useState({});
  const [history, setHistory] = useState([]);
  const [active, setActive] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.settings();
      setSettings(data.settings);
      setForms({
        general: clone(data.settings.general),
        smtp: clone(data.settings.smtp),
        application: clone(data.settings.application),
        theme: clone(data.settings.theme),
        maintenance: clone(data.settings.maintenance),
        security: clone(data.settings.security)
      });
      setTemplates(data.emailTemplates || []);
      setBackup(data.backup || {});
      setHistory(data.history || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const tabs = useMemo(() => [
    ['general', 'General', Settings],
    ['smtp', 'SMTP & Email', Mail],
    ['templates', 'Email Templates', Mail],
    ['application', 'Application', SlidersHorizontal],
    ['theme', 'Theme', Palette],
    ['maintenance', 'Maintenance', Wrench],
    ['security', 'Security', Shield],
    ['backup', 'Backup Info', CheckCircle2],
    ['history', 'Change History', RefreshCw]
  ], []);

  const updateForm = (section, key, value) => setForms((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));

  const saveSection = async (section, fn) => {
    if (!canWrite) return setMessage('Your admin role has read-only settings access.');
    setSaving(section);
    try {
      const { data } = await fn(forms[section]);
      setSettings(data.settings);
      setMessage(data.message || 'Settings saved.');
      await loadSettings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save settings.');
    } finally {
      setSaving('');
    }
  };

  const testSmtp = async () => {
    if (!canWrite) return setMessage('Your admin role has read-only settings access.');
    setSaving('smtp-test');
    try {
      const { data } = await adminApi.testSmtpSettings();
      setMessage(data.message || 'SMTP test completed.');
      await loadSettings();
    } catch (error) {
      setMessage(error.response?.data?.message || 'SMTP test failed.');
    } finally {
      setSaving('');
    }
  };

  const saveTemplate = async () => {
    if (!templateDraft) return;
    if (!canWrite) return setMessage('Your admin role has read-only settings access.');
    setSaving('template');
    try {
      await adminApi.updateEmailTemplate(templateDraft.templateId, templateDraft);
      setMessage('Email template saved.');
      setTemplateDraft(null);
      const { data } = await adminApi.emailTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save template.');
    } finally {
      setSaving('');
    }
  };

  const testTemplate = async (templateId) => {
    if (!canWrite) return setMessage('Your admin role has read-only settings access.');
    try {
      const { data } = await adminApi.testEmailTemplate({ templateId, to: admin.email });
      setMessage(data.message || 'Test email sent.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not send test email.');
    }
  };

  return (
    <AdminLayout title="System Settings" subtitle="Central configuration for Raksha24x7 application, security, email, theme and maintenance.">
      {message ? <div className={`mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm ${isLight ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-blue-400/30 bg-blue-500/10 text-blue-100'}`}><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage('')} className="rounded-lg p-1 hover:bg-white/10"><X className="h-4 w-4" /></button></div> : null}
      {loading ? <div className={`h-96 animate-pulse rounded-3xl ${isLight ? 'bg-white' : 'bg-white/5'}`} /> : (
        <div className="grid items-start gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className={`sticky top-24 rounded-3xl border p-2 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.045]'}`}>
            <div className="grid gap-1">
              {tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setActive(key)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${active === key ? 'bg-red-600 text-white shadow-lg shadow-red-950/20' : isLight ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</button>)}
            </div>
          </aside>

          <main className="space-y-5">
            {active === 'general' ? <SettingsCard title="General Settings" icon={Settings} isLight={isLight}><Grid><Field label="Application Name" value={forms.general.applicationName} onChange={(v) => updateForm('general', 'applicationName', v)} isLight={isLight} /><Field label="Application Logo" value={forms.general.applicationLogo} onChange={(v) => updateForm('general', 'applicationLogo', v)} isLight={isLight} /><Field label="Support Email" value={forms.general.supportEmail} onChange={(v) => updateForm('general', 'supportEmail', v)} isLight={isLight} /><Field label="Support Phone" value={forms.general.supportPhone} onChange={(v) => updateForm('general', 'supportPhone', v)} isLight={isLight} /><Field label="Company Name" value={forms.general.companyName} onChange={(v) => updateForm('general', 'companyName', v)} isLight={isLight} /><Field label="Copyright" value={forms.general.copyright} onChange={(v) => updateForm('general', 'copyright', v)} isLight={isLight} /><Field label="Timezone" value={forms.general.timezone} onChange={(v) => updateForm('general', 'timezone', v)} isLight={isLight} /><Field label="Date Format" value={forms.general.dateFormat} onChange={(v) => updateForm('general', 'dateFormat', v)} isLight={isLight} /><Select label="Time Format" value={forms.general.timeFormat} options={['12h', '24h']} onChange={(v) => updateForm('general', 'timeFormat', v)} isLight={isLight} /><Field label="Default Language" value={forms.general.defaultLanguage} onChange={(v) => updateForm('general', 'defaultLanguage', v)} isLight={isLight} /><Field label="Default Country" value={forms.general.defaultCountry} onChange={(v) => updateForm('general', 'defaultCountry', v)} isLight={isLight} /></Grid><SaveButton disabled={!canWrite || saving === 'general'} onClick={() => saveSection('general', adminApi.updateGeneralSettings)} saving={saving === 'general'} /></SettingsCard> : null}

            {active === 'smtp' ? <SettingsCard title="SMTP & Email" icon={Mail} isLight={isLight}><Grid><Select label="Email Provider" value={forms.smtp.provider} options={['resend', 'smtp', 'gmail', 'sendgrid', 'mailgun', 'ses']} onChange={(v) => updateForm('smtp', 'provider', v)} isLight={isLight} /><Field label="SMTP Host" value={forms.smtp.host} onChange={(v) => updateForm('smtp', 'host', v)} isLight={isLight} /><Field label="SMTP Port" type="number" value={forms.smtp.port} onChange={(v) => updateForm('smtp', 'port', v)} isLight={isLight} /><Field label="SMTP Username" value={forms.smtp.username} onChange={(v) => updateForm('smtp', 'username', v)} isLight={isLight} /><PasswordField show={showPassword} setShow={setShowPassword} value={forms.smtp.password || ''} onChange={(v) => updateForm('smtp', 'password', v)} isLight={isLight} placeholder={forms.smtp.passwordConfigured ? 'Password configured' : 'SMTP password'} /><Field label="Sender Email" value={forms.smtp.senderEmail} onChange={(v) => updateForm('smtp', 'senderEmail', v)} isLight={isLight} /><Field label="Sender Name" value={forms.smtp.senderName} onChange={(v) => updateForm('smtp', 'senderName', v)} isLight={isLight} /><Select label="Encryption" value={forms.smtp.encryption} options={['none', 'tls', 'ssl', 'starttls']} onChange={(v) => updateForm('smtp', 'encryption', v)} isLight={isLight} /><Field label="Connection Timeout" type="number" value={forms.smtp.connectionTimeout} onChange={(v) => updateForm('smtp', 'connectionTimeout', v)} isLight={isLight} /></Grid><div className="mt-4 rounded-2xl bg-white/5 p-3 text-sm text-slate-500">Provider status: {forms.smtp.lastTestStatus || 'untested'} • {forms.smtp.lastTestMessage || 'Not tested yet'}</div><div className="mt-4 flex flex-wrap gap-3"><SaveButton disabled={!canWrite || saving === 'smtp'} onClick={() => saveSection('smtp', adminApi.updateSmtpSettings)} saving={saving === 'smtp'} /><button type="button" onClick={testSmtp} disabled={!canWrite || saving === 'smtp-test'} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold disabled:opacity-40"><RefreshCw className={`mr-2 inline h-4 w-4 ${saving === 'smtp-test' ? 'animate-spin' : ''}`} />Test Connection</button></div></SettingsCard> : null}

            {active === 'templates' ? <SettingsCard title="Email Templates" icon={Mail} isLight={isLight}><div className="grid gap-4 lg:grid-cols-[320px_1fr]"><div className="space-y-2">{templates.map((template) => <button key={template.templateId} type="button" onClick={() => setTemplateDraft(clone(template))} className={`w-full rounded-2xl border p-3 text-left ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><b>{template.name}</b><p className="mt-1 text-xs text-slate-500">v{template.version} • {template.enabled ? 'Enabled' : 'Disabled'}</p></button>)}</div><div>{templateDraft ? <div className="space-y-3"><Field label="Subject" value={templateDraft.subject} onChange={(v) => setTemplateDraft({ ...templateDraft, subject: v })} isLight={isLight} /><label className="block"><span className="text-sm font-semibold">Body</span><textarea value={templateDraft.body} onChange={(e) => setTemplateDraft({ ...templateDraft, body: e.target.value })} rows="9" className={`mt-2 w-full rounded-2xl border p-4 text-sm outline-none ${isLight ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-slate-900 text-white'}`} /></label><div className="rounded-2xl bg-white p-3 text-slate-950"><iframe title="Template preview" srcDoc={templateDraft.body} className="h-72 w-full rounded-xl" /></div><div className="flex flex-wrap gap-2"><SaveButton disabled={!canWrite || saving === 'template'} onClick={saveTemplate} saving={saving === 'template'} /><button type="button" onClick={() => testTemplate(templateDraft.templateId)} disabled={!canWrite} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold disabled:opacity-40">Send Test</button><button type="button" onClick={() => setTemplateDraft(null)} className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold">Close</button></div></div> : <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Select a template to preview or edit.</p>}</div></div></SettingsCard> : null}

            {active === 'application' ? <SettingsCard title="Application Configuration" icon={SlidersHorizontal} isLight={isLight}><Grid>{Object.keys(forms.application).map((key) => <Field key={key} label={labelize(key)} value={forms.application[key]} onChange={(v) => updateForm('application', key, v)} isLight={isLight} />)}</Grid><SaveButton disabled={!canWrite || saving === 'application'} onClick={() => saveSection('application', adminApi.updateApplicationSettings)} saving={saving === 'application'} /></SettingsCard> : null}
            {active === 'theme' ? <SettingsCard title="Theme Settings" icon={Palette} isLight={isLight}><Grid><Select label="Default Theme" value={forms.theme.defaultTheme} options={['light', 'dark', 'system']} onChange={(v) => updateForm('theme', 'defaultTheme', v)} isLight={isLight} /><Field label="Primary Color" value={forms.theme.primaryColor} onChange={(v) => updateForm('theme', 'primaryColor', v)} isLight={isLight} /><Field label="Accent Color" value={forms.theme.accentColor} onChange={(v) => updateForm('theme', 'accentColor', v)} isLight={isLight} /><Select label="Sidebar Style" value={forms.theme.sidebarStyle} options={['compact', 'comfortable']} onChange={(v) => updateForm('theme', 'sidebarStyle', v)} isLight={isLight} /><Field label="Card Radius" type="number" value={forms.theme.cardRadius} onChange={(v) => updateForm('theme', 'cardRadius', v)} isLight={isLight} /><Field label="Animation Speed" type="number" value={forms.theme.animationSpeed} onChange={(v) => updateForm('theme', 'animationSpeed', v)} isLight={isLight} /></Grid><div className="mt-4 rounded-3xl border border-white/10 p-5" style={{ borderRadius: Number(forms.theme.cardRadius || 24), transitionDuration: `${forms.theme.animationSpeed || 250}ms` }}><div className="h-3 w-24 rounded-full" style={{ background: forms.theme.primaryColor }} /><p className="mt-3 text-sm text-slate-500">Live preview card</p></div><SaveButton disabled={!canWrite || saving === 'theme'} onClick={() => saveSection('theme', adminApi.updateThemeSettings)} saving={saving === 'theme'} /></SettingsCard> : null}
            {active === 'maintenance' ? <SettingsCard title="Maintenance Mode" icon={Wrench} isLight={isLight}><Grid><Toggle label="Enable Maintenance Mode" checked={forms.maintenance.enabled} onChange={(v) => updateForm('maintenance', 'enabled', v)} isLight={isLight} /><Toggle label="Allowed Admin Access" checked={forms.maintenance.allowedAdminAccess} onChange={(v) => updateForm('maintenance', 'allowedAdminAccess', v)} isLight={isLight} /><Toggle label="Public API Blocking" checked={forms.maintenance.publicApiBlocking} onChange={(v) => updateForm('maintenance', 'publicApiBlocking', v)} isLight={isLight} /><Field label="Expected End Time" type="datetime-local" value={forms.maintenance.expectedEndTime ? String(forms.maintenance.expectedEndTime).slice(0, 16) : ''} onChange={(v) => updateForm('maintenance', 'expectedEndTime', v)} isLight={isLight} /></Grid><Field label="Maintenance Message" value={forms.maintenance.message} onChange={(v) => updateForm('maintenance', 'message', v)} isLight={isLight} /><Field label="Maintenance Banner" value={forms.maintenance.banner} onChange={(v) => updateForm('maintenance', 'banner', v)} isLight={isLight} /><Field label="Allowed IPs (comma separated)" value={(forms.maintenance.allowedIps || []).join(', ')} onChange={(v) => updateForm('maintenance', 'allowedIps', v.split(',').map((item) => item.trim()).filter(Boolean))} isLight={isLight} /><SaveButton disabled={!canWrite || saving === 'maintenance'} onClick={() => saveSection('maintenance', adminApi.updateMaintenanceSettings)} saving={saving === 'maintenance'} /></SettingsCard> : null}
            {active === 'security' ? <SettingsCard title="Security Settings" icon={Shield} isLight={isLight}><Grid>{Object.keys(forms.security).map((key) => Array.isArray(forms.security[key]) ? <Field key={key} label={labelize(key)} value={forms.security[key].join(', ')} onChange={(v) => updateForm('security', key, v.split(',').map((item) => item.trim()).filter(Boolean))} isLight={isLight} /> : typeof forms.security[key] === 'boolean' ? <Toggle key={key} label={labelize(key)} checked={forms.security[key]} onChange={(v) => updateForm('security', key, v)} isLight={isLight} /> : <Field key={key} label={labelize(key)} value={forms.security[key]} onChange={(v) => updateForm('security', key, v)} isLight={isLight} />)}</Grid><SaveButton disabled={!canWrite || saving === 'security'} onClick={() => saveSection('security', adminApi.updateSecuritySettings)} saving={saving === 'security'} /></SettingsCard> : null}
            {active === 'backup' ? <SettingsCard title="Backup Information" icon={CheckCircle2} isLight={isLight}><div className="grid gap-3 md:grid-cols-2">{Object.entries(backup).map(([key, value]) => <Info key={key} label={labelize(key)} value={value || 'N/A'} />)}</div></SettingsCard> : null}
            {active === 'history' ? <SettingsCard title="Change History" icon={RefreshCw} isLight={isLight}><div className="space-y-3">{history.length ? history.map((item) => <div key={item._id} className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><b>{item.module}</b><p className="text-sm text-slate-500">{item.adminId?.fullName || item.adminId?.email || 'Admin'} • {item.browser}</p></div><span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span></div></div>) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">No settings changes recorded yet.</p>}</div></SettingsCard> : null}
          </main>
        </div>
      )}
    </AdminLayout>
  );
}

const labelize = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());

function SettingsCard({ title, icon: Icon, children, isLight }) {
  return <section className={`rounded-3xl border p-5 shadow-sm transition md:p-6 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.045]'}`}><div className="mb-6 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Icon className="h-5 w-5" /></span><div><h2 className="text-lg font-black tracking-tight">{title}</h2><p className="mt-0.5 text-xs text-slate-500">Keep this section simple, accurate and production-ready.</p></div></div>{children}</section>;
}

function Grid({ children }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, value, onChange, isLight, type = 'text' }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><input type={type} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} className={`mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950 hover:bg-white' : 'border-white/10 bg-slate-950/70 text-white hover:border-white/20'}`} /></label>;
}

function PasswordField({ show, setShow, value, onChange, isLight, placeholder }) {
  return <label className="block"><span className="text-sm font-bold">SMTP Password</span><span className="relative mt-2 block"><input type={show ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-12 w-full rounded-2xl border px-4 pr-12 text-sm outline-none transition placeholder:text-slate-500 focus:border-red-400 focus:ring-4 focus:ring-red-500/10 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950 hover:bg-white' : 'border-white/10 bg-slate-950/70 text-white hover:border-white/20'}`} /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-red-300">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}

function Select({ label, value, options, onChange, isLight }) {
  return <label className="block"><span className="text-sm font-bold">{label}</span><select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={`mt-2 h-12 w-full rounded-2xl border px-4 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950 hover:bg-white' : 'border-white/10 bg-slate-950/70 text-white hover:border-white/20'}`}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Toggle({ label, checked, onChange, isLight }) {
  return <label className={`flex min-h-12 items-center justify-between rounded-2xl border px-4 transition ${isLight ? 'border-slate-200 bg-slate-50 hover:bg-white' : 'border-white/10 bg-slate-950/70 hover:border-white/20'}`}><span className="text-sm font-bold">{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-red-500" /></label>;
}

function SaveButton({ onClick, disabled, saving, label = 'Save Settings' }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="mt-5 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-950/20 transition hover:-translate-y-0.5 hover:bg-red-500 disabled:translate-y-0 disabled:opacity-40"><Save className="mr-2 inline h-4 w-4" />{saving ? 'Saving...' : label}</button>;
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-white/5 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-bold">{String(value)}</p></div>;
}

export default AdminSettingsPage;
