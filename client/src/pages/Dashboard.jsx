import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Copy, ExternalLink,
  Ambulance, CloudSun, ContactRound, Flame, Hospital, LocateFixed, MapPinned,
  MessageCircle, Moon, PhoneCall, ShieldCheck, Siren, Sun, X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import SOSCountdownModal from '../components/SOSCountdownModal';
import EmergencyNumbersDashboardCard from '../components/EmergencyNumbersDashboardCard';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { buildSosNotification } from '../services/emergencyNotificationService';
import sosService from '../services/sosService';
import locationService from '../services/locationService';
import { getEnvironmentData } from '../services/environmentService';

const THEME_KEY = 'raksha_theme';

const greeting = (hour) => (hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening');
const coordinatesText = (location) => (location ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}` : 'Location updating');

const applyThemePreference = (theme) => {
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.rakshaTheme = safeTheme;
  document.documentElement.style.colorScheme = safeTheme;
};

function Dashboard() {
  const { user, getProfile } = useAuth();
  const { emergencyNotify } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const shortcutHandledRef = useRef(false);
  const [toast, setToast] = useState('');
  const [countOpen, setCountOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [latestLocation, setLatestLocation] = useState(null);
  const [environment, setEnvironment] = useState({ weather: null, airQuality: null });
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [sosSession, setSosSession] = useState(null);
  const [whatsappStatuses, setWhatsappStatuses] = useState({});
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [savingSosHistory, setSavingSosHistory] = useState(false);

  useEffect(() => {
    applyThemePreference(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (user?.isGuest) return;
    locationService.getLatestLocation()
      .then((response) => setLatestLocation(response.data.location || null))
      .catch(() => {});
  }, [user?.isGuest]);

  const weatherLocation = currentLocation || latestLocation;
  useEffect(() => {
    if (!weatherLocation || !navigator.onLine) return undefined;
    const controller = new AbortController();
    setEnvironmentLoading(true);
    getEnvironmentData(weatherLocation.latitude, weatherLocation.longitude, { signal: controller.signal })
      .then((data) => setEnvironment({ weather: data.weather, airQuality: data.airQuality }))
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setEnvironmentLoading(false); });
    return () => controller.abort();
  }, [weatherLocation?.latitude, weatherLocation?.longitude]);

  const notifications = useMemo(() => [
    currentLocation && {
      id: 'location',
      title: 'Location ready',
      message: `Accuracy approximately ${Math.round(currentLocation.accuracy || 0)} metres.`,
      read: false
    }
  ].filter(Boolean), [currentLocation]);

  const triggerSos = useCallback(() => {
    if (sending || countOpen) return;
    if (!window.confirm('Are you sure you want to send an emergency alert?')) return;
    setCountOpen(true);
    setCount(5);
  }, [countOpen, sending]);

  useEffect(() => {
    if (shortcutHandledRef.current) return;
    if (new URLSearchParams(location.search).get('sos') !== 'true') return;
    shortcutHandledRef.current = true;
    triggerSos();
  }, [location.search, triggerSos]);

  useEffect(() => {
    if (!countOpen || count <= 0) return undefined;
    const timer = window.setTimeout(() => setCount((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [count, countOpen]);

  useEffect(() => {
    if (!countOpen || count !== 0) return;
    const send = async () => {
      try {
        setSending(true);
        if (!navigator.geolocation) throw new Error('Geolocation is not supported by your browser');
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
        const contacts = (user?.contacts?.length ? user.contacts : (await getProfile().catch(() => user))?.contacts || []).slice(0, 5);
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          address: 'Address unavailable'
        };
        const locationLink = `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`;
        setCurrentLocation(payload);
        const message = buildWhatsAppEmergencyMessage({ location: payload, user });
        const initialStatuses = Object.fromEntries(contacts.map((contact) => [String(contact._id || contact.phone), 'not_sent']));
        setWhatsappStatuses(initialStatuses);
        setSosSession({ location: payload, locationLink, message, contacts, openedAt: new Date().toISOString() });
        setToast(contacts.length ? 'Choose contacts to notify on WhatsApp.' : 'No emergency contacts added.');
      } catch (error) {
        setToast(error?.code === 1 ? 'Location permission denied' : error?.response?.data?.message || error?.message || 'Failed to send SOS');
      } finally {
        setSending(false);
        setCountOpen(false);
        setCount(5);
      }
    };
    send();
  }, [count, countOpen, getProfile, user]);

  const openWhatsApp = (contact) => {
    if (!sosSession) return;
    const phone = normalizeWhatsAppPhone(contact.phone);
    if (!phone) {
      setToast('Contact phone number is invalid.');
      return;
    }
    setPendingConfirm(contact);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(sosSession.message)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
      setToast('Opening WhatsApp. If it does not open, copy the message manually.');
    }
  };

  const markWhatsAppStatus = (contact, status) => {
    const id = String(contact._id || contact.phone);
    setWhatsappStatuses((current) => ({ ...current, [id]: status }));
    setPendingConfirm(null);
  };

  const copyEmergencyMessage = async () => {
    if (!sosSession?.message) return;
    try {
      await navigator.clipboard.writeText(sosSession.message);
      setToast('Emergency message copied.');
    } catch {
      setToast('Could not copy message. Please copy manually.');
    }
  };

  const saveWhatsappSosHistory = async () => {
    if (!sosSession) return;
    try {
      setSavingSosHistory(true);
      const whatsappContacts = sosSession.contacts.map((contact) => {
        const id = String(contact._id || contact.phone);
        const status = whatsappStatuses[id] === 'sent' ? 'sent' : whatsappStatuses[id] === 'skipped' ? 'skipped' : 'not_sent';
        return { contactId: contact._id, phone: contact.phone, name: contact.name, status };
      });
      const { data } = await sosService.start({
        ...sosSession.location,
        communicationMode: 'whatsapp',
        emergencyType: 'sos_whatsapp',
        message: sosSession.message,
        whatsappContacts
      });
      emergencyNotify(buildSosNotification({
        userName: user?.name,
        locationLink: sosSession.locationLink,
        emergencyStatus: data?.sos?.status || 'WhatsApp'
      }));
      const sent = whatsappContacts.filter((item) => item.status === 'sent').length;
      setToast(sent === sosSession.contacts.length ? 'SOS communication completed.' : 'SOS WhatsApp history saved.');
      setSosSession(null);
      setWhatsappStatuses({});
      setPendingConfirm(null);
    } catch (error) {
      setToast(error?.response?.data?.message || 'Could not save SOS history.');
    } finally {
      setSavingSosHistory(false);
    }
  };

  const cancelCountdown = () => {
    setCountOpen(false);
    setCount(5);
    setToast('SOS cancelled');
  };

  const callEmergency = (number) => {
    window.location.href = `tel:${number}`;
  };

  const toggleTheme = () => setTheme((value) => (value === 'dark' ? 'light' : 'dark'));

  const quickActions = [
    { label: 'SOS', icon: Siren, color: 'bg-red-600 hover:bg-red-500', action: triggerSos },
    { label: 'Live Location', icon: LocateFixed, color: 'bg-cyan-600 hover:bg-cyan-500', action: () => navigate('/live-location') },
    { label: 'Google Maps', icon: MapPinned, color: 'bg-sky-600 hover:bg-sky-500', action: () => navigate('/google-map') },
    { label: 'Nearby Services', icon: MapPinned, color: 'bg-emerald-600 hover:bg-emerald-500', action: () => navigate('/nearby-services') },
    { label: 'Emergency Numbers', icon: PhoneCall, color: 'bg-amber-600 hover:bg-amber-500', action: () => navigate('/emergency-numbers') },
    { label: 'Hospitals', icon: Hospital, color: 'bg-rose-600 hover:bg-rose-500', action: () => navigate('/nearby-services') },
    { label: 'Police', icon: ShieldCheck, color: 'bg-blue-600 hover:bg-blue-500', action: () => callEmergency('112') },
    { label: 'Fire', icon: Flame, color: 'bg-orange-600 hover:bg-orange-500', action: () => callEmergency('101') },
    { label: 'Ambulance', icon: Ambulance, color: 'bg-violet-600 hover:bg-violet-500', action: () => callEmergency('108') },
    { label: 'Emergency Contacts', icon: ContactRound, color: 'bg-fuchsia-600 hover:bg-fuchsia-500', action: () => navigate('/emergency-contacts') }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'light' ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
      <Navbar dashboard notifications={notifications} />
      <Toast message={toast} type={/failed|denied|unavailable/i.test(toast) ? 'error' : 'success'} />
      <SOSCountdownModal open={countOpen} count={count} onCancel={cancelCountdown} />
      <WhatsAppSosSheet
        session={sosSession}
        statuses={whatsappStatuses}
        pendingConfirm={pendingConfirm}
        saving={savingSosHistory}
        onClose={() => { setSosSession(null); setPendingConfirm(null); }}
        onManageContacts={() => navigate('/emergency-contacts')}
        onOpenWhatsApp={openWhatsApp}
        onMarkStatus={markWhatsAppStatus}
        onCopy={copyEmergencyMessage}
        onDone={saveWhatsappSosHistory}
      />

      <main className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <section className={`rounded-3xl border p-5 shadow-sm transition-colors duration-300 md:p-6 ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">{greeting(now.getHours())}</p>
              <h1 className={`mt-2 text-2xl font-bold sm:text-3xl ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>{user?.name || 'Raksha User'}</h1>
              <p className={`mt-2 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className={`mt-3 flex flex-wrap gap-2 text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                <span className={`rounded-full px-3 py-1.5 ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}>📍 {coordinatesText(weatherLocation)}</span>
                <span className={`rounded-full px-3 py-1.5 ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`}>
                  {environment.weather ? `${Math.round(environment.weather.temperature)}°C · ${environment.weather.condition}` : 'Weather updating'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`rounded-xl border p-3 transition duration-300 ${theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button type="button" onClick={triggerSos} disabled={sending || countOpen} className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-red-500 disabled:opacity-50">
                <Siren className="mr-2 inline h-5 w-5" />
                {sending ? 'Sending…' : 'SOS'}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5" aria-labelledby="quick-actions-heading">
          <h2 id="quick-actions-heading" className={`mb-3 text-lg font-semibold ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map(({ label, icon: Icon, color, action }) => (
              <motion.button
                key={label}
                type="button"
                onClick={action}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`min-h-20 rounded-2xl p-3 text-left text-white shadow-sm transition ${color}`}
              >
                <Icon className="h-5 w-5" />
                <p className="mt-3 text-xs font-semibold">{label}</p>
              </motion.button>
            ))}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <WeatherCard weather={environment.weather} loading={environmentLoading} theme={theme} />
          <AQICard airQuality={environment.airQuality} loading={environmentLoading} theme={theme} />
          <EmergencyNumbersDashboardCard theme={theme} />
        </div>
      </main>
    </div>
  );
}

const normalizeWhatsAppPhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return '';
};

const buildWhatsAppEmergencyMessage = ({ location, user }) => {
  const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  return [
    '🚨 EMERGENCY ALERT',
    '',
    'I need immediate help.',
    '',
    'My current location is:',
    mapsLink,
    '',
    'Current Address:',
    location.address || 'Address unavailable',
    '',
    'Coordinates:',
    `${Number(location.latitude).toFixed(6)}, ${Number(location.longitude).toFixed(6)}`,
    '',
    'Time:',
    new Date(location.timestamp || Date.now()).toLocaleString(),
    '',
    user?.phone ? `My phone: ${user.phone}` : '',
    '',
    'Please contact me immediately.',
    '',
    'Sent using Raksha24x7'
  ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n');
};

function WhatsAppSosSheet({ session, statuses, pendingConfirm, saving, onClose, onManageContacts, onOpenWhatsApp, onMarkStatus, onCopy, onDone }) {
  if (!session) return null;
  const contacts = session.contacts || [];
  const sentCount = contacts.filter((contact) => statuses[String(contact._id || contact.phone)] === 'sent').length;
  const progress = contacts.length ? Math.round((sentCount / contacts.length) * 100) : 0;
  const nextContact = contacts.find((contact) => statuses[String(contact._id || contact.phone)] !== 'sent' && statuses[String(contact._id || contact.phone)] !== 'skipped');
  const allSent = contacts.length > 0 && sentCount === contacts.length;

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="whatsapp-sos-title">
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] max-w-3xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-2xl md:inset-y-6 md:rounded-3xl md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">WhatsApp SOS</p>
            <h2 id="whatsapp-sos-title" className="mt-1 text-2xl font-bold">Emergency Contacts</h2>
            <p className="mt-1 text-sm text-slate-400">Choose a contact to notify through WhatsApp.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close SOS workflow" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <section className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-100">{sentCount} / {contacts.length} Contacts Notified</p>
              {nextContact && <p className="mt-1 text-sm text-slate-300">Next Contact 👉 {nextContact.name}</p>}
              {allSent && <p className="mt-1 text-sm font-semibold text-emerald-200">✅ SOS Communication Completed</p>}
            </div>
            <button type="button" onClick={onCopy} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
              <Copy className="mr-1 inline h-4 w-4" /> Copy Message
            </button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </section>

        {pendingConfirm && (
          <section className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="font-semibold text-amber-100">Did you send the message to {pendingConfirm.name}?</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => onMarkStatus(pendingConfirm, 'sent')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Yes</button>
              <button type="button" onClick={() => onMarkStatus(pendingConfirm, 'not_sent')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">No</button>
            </div>
          </section>
        )}

        {!contacts.length ? (
          <section className="mt-5 grid min-h-60 place-items-center rounded-3xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-center">
            <div>
              <ContactRound className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-lg font-bold">No Emergency Contacts Added</h3>
              <p className="mt-1 text-sm text-slate-400">Add trusted contacts before using WhatsApp SOS.</p>
              <button type="button" onClick={onManageContacts} className="mt-4 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500">Manage Contacts</button>
            </div>
          </section>
        ) : (
          <section className="mt-5 grid gap-3">
            {contacts.map((contact) => {
              const id = String(contact._id || contact.phone);
              const status = statuses[id] || 'not_sent';
              const isNext = nextContact && String(nextContact._id || nextContact.phone) === id;
              return (
                <article key={id} className={`rounded-2xl border p-4 transition ${isNext ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-white/[0.04]'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-500/15 text-lg font-bold text-red-200">
                        {String(contact.name || '?').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{contact.name}</p>
                        <p className="text-sm text-slate-400">{contact.relationship || 'Emergency Contact'} • {contact.phone}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={status} />
                      <button type="button" onClick={() => onOpenWhatsApp(contact)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                        <MessageCircle className="mr-1 inline h-4 w-4" /> Send via WhatsApp
                      </button>
                      <button type="button" onClick={() => onMarkStatus(contact, 'skipped')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10">Skip</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {contacts.length > 0 && (
          <footer className="sticky bottom-0 mt-5 flex flex-col gap-2 border-t border-white/10 bg-slate-950/95 pt-4 sm:flex-row">
            <button type="button" onClick={onDone} disabled={saving} className="flex-1 rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">
              {saving ? 'Saving...' : allSent ? `Done • ${sentCount} / ${contacts.length} Contacts Notified Successfully` : 'Finish & Save SOS History'}
            </button>
            {allSent && <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Completed</span>}
            <a href={session.locationLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
              <ExternalLink className="mr-1 h-4 w-4" /> Maps
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'sent') return <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">✓ Sent</span>;
  if (status === 'skipped') return <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">Skipped</span>;
  return <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-300">○ Not Sent</span>;
}

function WeatherCard({ weather, loading, theme }) {
  const card = `rounded-2xl border p-5 shadow-sm ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`;
  if (loading) return <section className={`${card} h-44 animate-pulse`} aria-label="Loading weather" />;
  return (
    <section className={card}>
      <div className="flex items-center gap-3">
        <CloudSun className="h-6 w-6 text-amber-400" />
        <h2 className={`font-semibold ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>Weather</h2>
      </div>
      {weather ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Metric label="Temperature" value={`${Math.round(weather.temperature)}°C`} theme={theme} />
          <Metric label="Weather" value={weather.condition || 'Clear'} theme={theme} />
          <Metric label="Humidity" value={`${Math.round(weather.humidity || 0)}%`} theme={theme} />
          <Metric label="Wind Speed" value={`${Math.round(weather.windSpeed || 0)} km/h`} theme={theme} />
        </div>
      ) : (
        <p className={`mt-4 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Enable location to load weather.</p>
      )}
    </section>
  );
}

function AQICard({ airQuality, loading, theme }) {
  const card = `rounded-2xl border p-5 shadow-sm ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`;
  if (loading) return <section className={`${card} h-44 animate-pulse`} aria-label="Loading air quality" />;
  const status = airQuality?.status || 'Unavailable';
  const aqi = airQuality?.aqi ? Math.round(airQuality.aqi) : '—';
  const color = status === 'Good' ? 'border-emerald-400 text-emerald-400' : status === 'Moderate' ? 'border-amber-400 text-amber-400' : 'border-red-400 text-red-400';
  const advice = status === 'Good' ? 'Air quality is safe for normal activity.' : status === 'Moderate' ? 'Reduce long outdoor exposure if sensitive.' : status === 'Unavailable' ? 'AQI will appear when data is available.' : 'Limit outdoor exposure today.';
  return (
    <section className={card}>
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-400" />
        <h2 className={`font-semibold ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>Air Quality</h2>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className={`grid h-20 w-20 place-items-center rounded-full border-4 ${color}`}>
          <div className="text-center">
            <p className="text-2xl font-bold">{aqi}</p>
            <p className="text-[10px] uppercase">AQI</p>
          </div>
        </div>
        <div>
          <p className={`text-sm font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{status}</p>
          <p className={`mt-1 text-sm ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>{advice}</p>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, theme }) {
  return (
    <div className={`rounded-xl p-3 ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-950/35'}`}>
      <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>{label}</p>
      <p className={`mt-1 font-semibold ${theme === 'light' ? 'text-slate-950' : 'text-white'}`}>{value}</p>
    </div>
  );
}

export default Dashboard;
