import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ambulance, CloudSun, ContactRound, Flame, Hospital, LocateFixed, MapPinned,
  Moon, PhoneCall, ShieldCheck, Siren, Sun
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
  const { user } = useAuth();
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
        const payload = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: new Date().toISOString() };
        const { data } = await sosService.send(payload);
        const locationLink = data?.sos?.googleMapLink || `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`;
        setCurrentLocation(payload);
        emergencyNotify(buildSosNotification({
          userName: user?.name,
          locationLink,
          emergencyStatus: data?.sos?.status || 'Active'
        }));
        setToast('SOS alert sent successfully');
      } catch (error) {
        setToast(error?.code === 1 ? 'Location permission denied' : error?.response?.data?.message || error?.message || 'Failed to send SOS');
      } finally {
        setSending(false);
        setCountOpen(false);
        setCount(5);
      }
    };
    send();
  }, [count, countOpen, emergencyNotify, user?.name]);

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
