import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clipboard,
  ExternalLink,
  LocateFixed,
  MapPin,
  Radio,
  RefreshCw,
  Share2,
  Square,
  Trash2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import locationService from '../services/locationService';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

const getApiError = (error, fallback) => {
  if (error?.response?.status === 401) return 'Your session has expired. Please log in again.';
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request) return 'Backend unavailable. Check your connection and try again.';
  return error?.message || fallback;
};

const getGeoError = (error) => {
  if (error?.code === 1) return 'Location permission denied. Enable location access in your browser settings.';
  if (error?.code === 2) return 'Your current location is unavailable.';
  if (error?.code === 3) return 'Location request timed out. Please try again.';
  return 'Unable to detect your location.';
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

function LiveLocationPage() {
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const watchIdRef = useRef(null);
  const mountedRef = useRef(true);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await locationService.getLocationHistory();
      if (mountedRef.current) setHistory(data.locations || []);
    } catch (requestError) {
      if (mountedRef.current) showToast(getApiError(requestError, 'Failed to load location history'), 'error');
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  }, []);

  const savePosition = useCallback(async (position, trackingMode) => {
    const payload = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp || Date.now()).toISOString(),
      trackingMode
    };

    const localLocation = {
      ...payload,
      googleMapLink: `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`
    };
    if (mountedRef.current) {
      setLocation(localLocation);
      setError('');
    }

    try {
      const { data } = await locationService.saveLocation(payload);
      if (mountedRef.current && data.location) {
        setHistory((items) => [data.location, ...items.filter((item) => item._id !== data.location._id)]);
      }
    } catch (requestError) {
      if (mountedRef.current) showToast(getApiError(requestError, 'Location detected but could not be saved'), 'error');
    }
  }, []);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await savePosition(position, 'current');
        if (mountedRef.current) setLoading(false);
      },
      (geoError) => {
        if (mountedRef.current) {
          setError(getGeoError(geoError));
          setLoading(false);
        }
      },
      GEO_OPTIONS
    );
  }, [savePosition]);

  const stopTracking = useCallback((notify = true) => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (mountedRef.current) {
      setTracking(false);
      if (notify) showToast('Live tracking stopped');
    }
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }
    if (watchIdRef.current !== null) return;

    setError('');
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => savePosition(position, 'live'),
      (geoError) => {
        setError(getGeoError(geoError));
        stopTracking(false);
      },
      GEO_OPTIONS
    );
    showToast('Live tracking started');
  };

  useEffect(() => {
    mountedRef.current = true;
    loadHistory();
    requestCurrentLocation();
    return () => {
      mountedRef.current = false;
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [loadHistory, requestCurrentLocation]);

  const shareText = location
    ? `🚨 Raksha24x7 Live Location\nMy current location:\n${location.googleMapLink}`
    : '';

  const copyLocation = async () => {
    if (!location) return;
    try {
      await copyText(shareText);
      showToast('Location copied to clipboard');
    } catch {
      showToast('Could not copy location', 'error');
    }
  };

  const shareLocation = async () => {
    if (!location) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Raksha24x7 Live Location', text: shareText });
        showToast('Location shared');
      } else {
        await copyText(shareText);
        showToast('Sharing is unavailable, so the location was copied');
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') showToast('Could not share location', 'error');
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this saved location?')) return;
    try {
      await locationService.deleteLocationHistory(id);
      setHistory((items) => items.filter((item) => item._id !== id));
      showToast('Saved location deleted');
    } catch (requestError) {
      showToast(getApiError(requestError, 'Failed to delete location'), 'error');
    }
  };

  const clearHistory = async () => {
    if (!history.length || !window.confirm('Delete all saved location history?')) return;
    try {
      await locationService.deleteLocationHistory();
      setHistory([]);
      showToast('Location history cleared');
    } catch (requestError) {
      showToast(getApiError(requestError, 'Failed to clear location history'), 'error');
    }
  };

  const accuracy = location?.accuracy === null || location?.accuracy === undefined
    ? 'Unavailable'
    : `±${Math.round(location.accuracy)} m`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <Navbar dashboard />
      <Toast message={toast.message} type={toast.type} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-300">Raksha24x7</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Live Location</h1>
            <p className="mt-2 text-sm text-slate-300">Detect, track, and securely share your current position.</p>
          </div>
          {tracking && (
            <span className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live tracking active
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100" role="alert">
            <p className="font-semibold">Location unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-blue-950/40 backdrop-blur-xl md:p-7">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
              <LocateFixed className={`h-6 w-6 ${tracking ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Current Location</h2>
              <p className="text-sm text-slate-400">{tracking ? 'Updating as your position changes' : 'Latest detected coordinates'}</p>
            </div>
          </div>

          {loading && !location ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}
            </div>
          ) : location ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <LocationMetric label="Latitude" value={Number(location.latitude).toFixed(6)} />
                <LocationMetric label="Longitude" value={Number(location.longitude).toFixed(6)} />
                <LocationMetric label="Accuracy" value={accuracy} />
                <LocationMetric label="Timestamp" value={new Date(location.timestamp || location.createdAt).toLocaleString()} />
              </div>

              <a href={location.googleMapLink} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-100 transition hover:bg-blue-500/20">
                <span className="flex min-w-0 items-center gap-2"><MapPin className="h-5 w-5 shrink-0" /><span className="truncate">{location.googleMapLink}</span></span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-300">No location detected yet.</div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <ActionButton onClick={copyLocation} disabled={!location} icon={Clipboard} label="Copy Location" />
            <ActionButton onClick={shareLocation} disabled={!location} icon={Share2} label="Share Location" />
            <ActionButton onClick={requestCurrentLocation} disabled={loading} icon={RefreshCw} label={loading ? 'Locating...' : 'Refresh Location'} spin={loading} />
            <ActionButton onClick={startTracking} disabled={tracking} icon={Radio} label="Start Tracking" accent="emerald" />
            <ActionButton onClick={() => stopTracking()} disabled={!tracking} icon={Square} label="Stop Tracking" accent="rose" />
          </div>
        </motion.section>

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recent Saved Locations</h2>
              <p className="mt-1 text-sm text-slate-400">Only you can access this protected history.</p>
            </div>
            {history.length > 0 && <button onClick={clearHistory} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20">Clear all</button>}
          </div>

          {historyLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />)}</div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-slate-400">Your saved locations will appear here.</div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const date = new Date(item.timestamp || item.createdAt);
                return (
                  <div key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <HistoryValue label="Date" value={date.toLocaleDateString()} />
                        <HistoryValue label="Time" value={date.toLocaleTimeString()} />
                        <HistoryValue label="Latitude" value={Number(item.latitude).toFixed(6)} />
                        <HistoryValue label="Longitude" value={Number(item.longitude).toFixed(6)} />
                        <HistoryValue label="Accuracy" value={item.accuracy == null ? 'Unavailable' : `±${Math.round(item.accuracy)} m`} />
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <a href={item.googleMapLink} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500"><ExternalLink className="mr-1 inline h-4 w-4" /> Maps</a>
                        <button onClick={() => deleteItem(item._id)} className="rounded-xl bg-rose-600 px-3 py-2 text-sm hover:bg-rose-500"><Trash2 className="mr-1 inline h-4 w-4" /> Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function LocationMetric({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 break-words font-medium text-slate-100">{value}</p></div>;
}

function HistoryValue({ label, value }) {
  return <div><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{value}</p></div>;
}

function ActionButton({ onClick, disabled, icon: Icon, label, accent = 'blue', spin = false }) {
  const accents = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    rose: 'bg-rose-600 hover:bg-rose-500'
  };
  return <button type="button" onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${accents[accent]}`}><Icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />{label}</button>;
}

export default LiveLocationPage;
