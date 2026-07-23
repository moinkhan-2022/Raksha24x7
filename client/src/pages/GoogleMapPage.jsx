import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import {
  Clipboard,
  Crosshair,
  ExternalLink,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Share2
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import locationService from '../services/locationService';

const DEFAULT_CENTER = [20.5937, 78.9629];
const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const userIcon = L.divIcon({
  className: '',
  html: '<div style="display:grid;place-items:center;width:44px;height:44px;border-radius:9999px;background:#2563eb;border:4px solid #fff;box-shadow:0 18px 40px rgba(37,99,235,.45);color:white;font-weight:800;">●</div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

const normalizeLocation = (value) => {
  if (!value) return null;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    ...value,
    latitude,
    longitude,
    accuracy: value.accuracy == null ? null : Number(value.accuracy),
    timestamp: value.timestamp || value.createdAt || new Date().toISOString(),
    googleMapLink: value.googleMapLink || `https://maps.google.com/?q=${latitude},${longitude}`
  };
};

const apiErrorMessage = (error, fallback) => {
  if (error?.response?.status === 401) return 'Your session has expired. Please log in again.';
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request) return 'Backend unavailable. Your location can still be viewed but could not be synchronized.';
  return error?.message || fallback;
};

const geolocationErrorMessage = (error) => {
  if (error?.code === 1) return 'Location permission denied. Enable location access in your browser settings.';
  if (error?.code === 2) return 'Your current location is unavailable.';
  if (error?.code === 3) return 'The location request timed out. Please try again.';
  return 'Unable to detect your current location.';
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

function GoogleMapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <Navbar dashboard />
      <MapExperience />
    </div>
  );
}

function MapExperience() {
  const routeLocation = useLocation();
  const routedLocation = useMemo(
    () => normalizeLocation(routeLocation.state?.location),
    [routeLocation.state]
  );
  const [currentLocation, setCurrentLocation] = useState(routedLocation);
  const [locating, setLocating] = useState(!routedLocation);
  const [locationError, setLocationError] = useState('');
  const [backendError, setBackendError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const mapRef = useRef(null);
  const mountedRef = useRef(true);
  const freshLocationRef = useRef(Boolean(routedLocation));

  const showToast = (message, type = 'success') => setToast({ message, type });

  const setAndCenterLocation = useCallback((value) => {
    const normalized = normalizeLocation(value);
    if (!normalized || !mountedRef.current) return;
    setCurrentLocation(normalized);
    mapRef.current?.setView([normalized.latitude, normalized.longitude], 17, { animate: true });
  }, []);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLocating(false);
      return;
    }

    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp || Date.now()).toISOString(),
          trackingMode: 'current'
        };
        freshLocationRef.current = true;
        setAndCenterLocation(payload);
        if (mountedRef.current) setLocating(false);

        try {
          await locationService.saveLocation(payload);
          if (mountedRef.current) setBackendError('');
        } catch (error) {
          if (mountedRef.current) setBackendError(apiErrorMessage(error, 'Location could not be saved.'));
        }
      },
      (error) => {
        if (mountedRef.current) {
          setLocationError(geolocationErrorMessage(error));
          setLocating(false);
        }
      },
      GEOLOCATION_OPTIONS
    );
  }, [setAndCenterLocation]);

  useEffect(() => {
    mountedRef.current = true;
    const initialize = () => {
      if (routedLocation) {
        setLocating(false);
        return;
      }

      locationService.getLatestLocation()
        .then(({ data }) => {
          if (mountedRef.current && !freshLocationRef.current && data.location) {
            setAndCenterLocation(data.location);
          }
        })
        .catch((error) => {
          if (mountedRef.current) setBackendError(apiErrorMessage(error, 'Latest location could not be loaded.'));
        });
      refreshLocation();
    };
    initialize();
    return () => { mountedRef.current = false; };
  }, [refreshLocation, routedLocation, setAndCenterLocation]);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ message: '', type: 'success' }), 2500);
    return () => window.clearTimeout(timer);
  }, [toast.message]);

  const center = currentLocation ? [currentLocation.latitude, currentLocation.longitude] : DEFAULT_CENTER;

  const centerMap = () => {
    mapRef.current?.setView(center, currentLocation ? 17 : 5, { animate: true });
  };

  const changeZoom = (amount) => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom() || 15;
    mapRef.current.setZoom(Math.min(19, Math.max(3, zoom + amount)));
  };

  const copyLocation = async () => {
    if (!currentLocation) return;
    try {
      await copyText(currentLocation.googleMapLink);
      showToast('Google Maps link copied');
    } catch {
      showToast('Could not copy the location link', 'error');
    }
  };

  const shareLocation = async () => {
    if (!currentLocation) return;
    const text = `🚨 Raksha24x7 Live Location\nMy current location:\n${currentLocation.googleMapLink}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Raksha24x7 Live Location', text, url: currentLocation.googleMapLink });
        showToast('Location shared');
      } else {
        await copyText(text);
        showToast('Sharing is unavailable, so the location was copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Could not share location', 'error');
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-3 py-3 md:px-5 md:py-5">
      <Toast message={toast.message} type={toast.type} />
      <div className="relative h-[calc(100vh-5.5rem)] min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/50">
        <MapContainer center={center} zoom={currentLocation ? 17 : 5} minZoom={3} maxZoom={19} scrollWheelZoom className="h-full w-full" zoomControl={false}>
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
          <MapBinder onReady={(map) => { mapRef.current = map; }} />
          <RecenterMap center={center} zoom={currentLocation ? 17 : 5} />
          {currentLocation && (
            <>
              <CircleMarker center={center} radius={24} pathOptions={{ color: '#38bdf8', fillColor: '#2563eb', fillOpacity: 0.25, weight: 2 }} />
              <Marker position={center} icon={userIcon}>
                <Tooltip direction="top" offset={[0, -22]}>Your current location</Tooltip>
              </Marker>
            </>
          )}
        </MapContainer>

        <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute left-3 right-3 top-3 z-[800] rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-xl backdrop-blur-xl md:left-5 md:right-auto md:top-5 md:w-[390px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-300">Interactive Safety Map</p>
              <h1 className="mt-1 text-xl font-bold">Your Current Location</h1>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><MapPin className="h-5 w-5" /></span>
          </div>

          {locationError && <Alert message={locationError} />}
          {backendError && <Alert message={backendError} warning />}

          {locating && !currentLocation ? (
            <div className="mt-4 grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
          ) : currentLocation ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Latitude" value={currentLocation.latitude.toFixed(6)} />
              <Metric label="Longitude" value={currentLocation.longitude.toFixed(6)} />
              <Metric label="Accuracy" value={currentLocation.accuracy == null ? 'Unavailable' : `±${Math.round(currentLocation.accuracy)} m`} />
              <Metric label="Timestamp" value={new Date(currentLocation.timestamp).toLocaleString()} />
            </div>
          ) : <p className="mt-4 text-sm text-slate-300">No location is available yet.</p>}
        </motion.section>

        <div className="absolute right-3 top-[11.5rem] z-[800] flex flex-col gap-2 md:right-5 md:top-5">
          <MapControl icon={Plus} label="Zoom in" onClick={() => changeZoom(1)} />
          <MapControl icon={Minus} label="Zoom out" onClick={() => changeZoom(-1)} />
          <MapControl icon={Crosshair} label="Center location" onClick={centerMap} />
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-[800] grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/85 p-3 shadow-xl backdrop-blur-xl sm:grid-cols-4 md:bottom-5 md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2">
          <ActionButton icon={RefreshCw} label={locating ? 'Locating...' : 'Refresh'} onClick={refreshLocation} disabled={locating} spin={locating} />
          <ActionButton icon={Clipboard} label="Copy Link" onClick={copyLocation} disabled={!currentLocation} />
          <ActionButton icon={Share2} label="Share" onClick={shareLocation} disabled={!currentLocation} />
          <a href={currentLocation?.googleMapLink || '#'} target={currentLocation ? '_blank' : undefined} rel="noreferrer" aria-disabled={!currentLocation} className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium transition hover:bg-blue-500 ${!currentLocation ? 'pointer-events-none opacity-40' : ''}`}><ExternalLink className="h-4 w-4" /> Open Maps</a>
        </div>
      </div>
    </main>
  );
}

function MapBinder({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, map, zoom]);
  return null;
}

function Alert({ message, warning = false }) {
  return <p className={`mt-3 rounded-xl border p-3 text-xs ${warning ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-100'}`}>{message}</p>;
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 break-words font-medium text-slate-100">{value}</p></div>;
}

function MapControl({ icon: Icon, label, onClick }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/85 text-slate-100 shadow-lg backdrop-blur-xl transition hover:bg-slate-800"><Icon className="h-5 w-5" /></button>;
}

function ActionButton({ icon: Icon, label, onClick, disabled, spin = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3 text-sm font-medium transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"><Icon className={`h-4 w-4 ${spin ? 'animate-spin' : ''}`} />{label}</button>;
}

export default GoogleMapPage;
