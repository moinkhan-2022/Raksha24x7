import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, LocateFixed, MapPin, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import { useNotifications } from '../context/NotificationContext';
import { buildLiveLocationNotification } from '../services/emergencyNotificationService';
import locationService from '../services/locationService';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

const getGeoError = (error) => {
  if (error?.code === 1) return 'Location permission denied. Enable location access in your browser settings.';
  if (error?.code === 2) return 'Your current location is unavailable.';
  if (error?.code === 3) return 'Location request timed out. Please try again.';
  return 'Unable to detect your location.';
};

const getApiError = (error, fallback) => {
  if (error?.response?.status === 401) return 'Your session has expired. Please log in again.';
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request) return 'Backend unavailable. Your location was detected locally.';
  return error?.message || fallback;
};

function LiveLocationPage() {
  const [theme] = useState(() => localStorage.getItem('raksha_theme') === 'light' ? 'light' : 'dark');
  const isLight = theme === 'light';
  const [location, setLocation] = useState(null);
  const notifiedRef = useRef(false);
  const { emergencyNotify } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ message: '', type: 'success' }), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.dataset.rakshaTheme = theme;
  }, [theme]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.onLine) {
      setError('Internet connection required.');
      setLoading(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp || Date.now()).toISOString(),
          trackingMode: 'current'
        };
        const localLocation = {
          ...payload,
          googleMapLink: `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`
        };
        setLocation(localLocation);
        setLoading(false);
        try {
          const { data } = await locationService.saveLocation(payload);
          if (data.location) setLocation(data.location);
          if (!notifiedRef.current) {
            emergencyNotify(buildLiveLocationNotification(true));
            notifiedRef.current = true;
          }
        } catch (requestError) {
          setToast({ message: getApiError(requestError, 'Location detected but could not be saved'), type: 'error' });
        }
      },
      (geoError) => {
        setError(getGeoError(geoError));
        setLoading(false);
      },
      GEO_OPTIONS
    );
  }, [emergencyNotify]);

  useEffect(() => { requestCurrentLocation(); }, [requestCurrentLocation]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
      <Navbar dashboard />
      <Toast message={toast.message} type={toast.type} />

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Raksha24x7</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">Live Location</h1>
          <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>View your current location quickly and open it in Google Maps.</p>
        </header>

        {error ? (
          <PermissionState message={error} onRefresh={requestCurrentLocation} theme={theme} />
        ) : (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl border p-5 shadow-sm md:p-6 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                <LocateFixed className={`h-6 w-6 ${loading ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Current Location</h2>
                <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Latest detected coordinates</p>
              </div>
            </div>

            {loading && !location ? (
              <LocationSkeleton theme={theme} />
            ) : location ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Metric label="Latitude" value={Number(location.latitude).toFixed(6)} theme={theme} />
                  <Metric label="Longitude" value={Number(location.longitude).toFixed(6)} theme={theme} />
                  <Metric label="Accuracy" value={location.accuracy == null ? 'Unavailable' : `±${Math.round(location.accuracy)} m`} theme={theme} />
                  <Metric label="Last Updated" value={new Date(location.timestamp || location.createdAt).toLocaleString()} theme={theme} />
                </div>

                <div className={`mt-5 overflow-hidden rounded-2xl border ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-slate-900'}`}>
                  <iframe
                    title="Current location map preview"
                    src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15&output=embed`}
                    className="h-64 w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={requestCurrentLocation} disabled={loading} className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
                    <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Location
                  </button>
                  <a href={location.googleMapLink} target="_blank" rel="noreferrer" className="rounded-2xl bg-red-600 px-5 py-4 text-center text-sm font-semibold text-white hover:bg-red-500">
                    <ExternalLink className="mr-2 inline h-4 w-4" />
                    Open in Google Maps
                  </a>
                </div>
              </>
            ) : (
              <div className={`mt-6 rounded-2xl border border-dashed p-8 text-center ${isLight ? 'border-slate-300 text-slate-600' : 'border-white/10 text-slate-400'}`}>No location detected yet.</div>
            )}
          </motion.section>
        )}
      </main>
    </div>
  );
}

function PermissionState({ message, onRefresh, theme }) {
  const isLight = theme === 'light';
  return (
    <section className={`grid min-h-[360px] place-items-center rounded-3xl border border-dashed p-8 text-center ${isLight ? 'border-slate-300 bg-white' : 'border-white/10 bg-white/[0.03]'}`}>
      <div>
        <MapPin className="mx-auto h-10 w-10 text-blue-300" />
        <h2 className="mt-4 text-xl font-semibold">Location access required.</h2>
        <p className={`mx-auto mt-2 max-w-md text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onRefresh} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500">Enable Location</button>
          <button type="button" onClick={onRefresh} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}>Refresh</button>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, theme }) {
  const isLight = theme === 'light';
  return <div className={`rounded-2xl border p-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-950/40'}`}><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 break-words font-medium ${isLight ? 'text-slate-950' : 'text-slate-100'}`}>{value}</p></div>;
}

function LocationSkeleton({ theme }) {
  const isLight = theme === 'light';
  return <div className="mt-6 grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`h-24 animate-pulse rounded-2xl ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />)}</div>;
}

export default LiveLocationPage;
