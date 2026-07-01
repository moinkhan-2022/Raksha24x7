import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, OverlayViewF, useJsApiLoader } from '@react-google-maps/api';
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
import { DARK_MAP_OPTIONS, GOOGLE_MAP_LIBRARIES, GOOGLE_MAP_LOADER_ID } from '../utils/googleMapConfig';

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

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
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <Navbar dashboard />
      {!apiKey ? (
        <MapErrorState
          title="Google Maps API key is missing"
          message="Add VITE_GOOGLE_MAPS_API_KEY to client/.env, then restart the Vite development server."
        />
      ) : <GoogleMapExperience apiKey={apiKey} />}
    </div>
  );
}

function GoogleMapExperience({ apiKey }) {
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

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAP_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAP_LIBRARIES
  });

  const showToast = (message, type = 'success') => setToast({ message, type });

  const setAndCenterLocation = useCallback((value) => {
    const normalized = normalizeLocation(value);
    if (!normalized || !mountedRef.current) return;
    setCurrentLocation(normalized);
    mapRef.current?.panTo({ lat: normalized.latitude, lng: normalized.longitude });
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

  const center = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : DEFAULT_CENTER;

  const centerMap = () => {
    mapRef.current?.panTo(center);
    mapRef.current?.setZoom(currentLocation ? 17 : 5);
  };

  const changeZoom = (amount) => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom() || 15;
    mapRef.current.setZoom(Math.min(21, Math.max(2, zoom + amount)));
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

  if (loadError) {
    return <MapErrorState title="Google Maps failed to load" message="Check the API key, Maps JavaScript API access, billing configuration, and network connection." />;
  }

  if (!isLoaded) return <MapLoadingState />;

  return (
    <main className="mx-auto max-w-[1600px] px-3 py-3 md:px-5 md:py-5">
      <Toast message={toast.message} type={toast.type} />
      <div className="relative h-[calc(100vh-5.5rem)] min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/50">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={center}
          zoom={currentLocation ? 17 : 5}
          options={DARK_MAP_OPTIONS}
          onLoad={(map) => { mapRef.current = map; }}
          onUnmount={() => { mapRef.current = null; }}
        >
          {currentLocation && (
            <OverlayViewF position={center} mapPaneName="overlayMouseTarget">
              <div className="relative -translate-x-1/2 -translate-y-1/2">
                <span className="absolute -inset-4 animate-ping rounded-full bg-blue-400/35" />
                <span className="absolute -inset-2 rounded-full bg-blue-400/20" />
                <div className="relative grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-blue-600 shadow-xl shadow-blue-500/50">
                  <LocateFixed className="h-5 w-5 text-white" />
                </div>
              </div>
            </OverlayViewF>
          )}
        </GoogleMap>

        <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="absolute left-3 right-3 top-3 rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-xl backdrop-blur-xl md:left-5 md:right-auto md:top-5 md:w-[390px]">
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

        <div className="absolute right-3 top-[11.5rem] flex flex-col gap-2 md:right-5 md:top-5">
          <MapControl icon={Plus} label="Zoom in" onClick={() => changeZoom(1)} />
          <MapControl icon={Minus} label="Zoom out" onClick={() => changeZoom(-1)} />
          <MapControl icon={Crosshair} label="Center location" onClick={centerMap} />
        </div>

        <div className="absolute bottom-3 left-3 right-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/85 p-3 shadow-xl backdrop-blur-xl sm:grid-cols-4 md:bottom-5 md:left-1/2 md:right-auto md:w-auto md:-translate-x-1/2">
          <ActionButton icon={RefreshCw} label={locating ? 'Locating...' : 'Refresh'} onClick={refreshLocation} disabled={locating} spin={locating} />
          <ActionButton icon={Clipboard} label="Copy Link" onClick={copyLocation} disabled={!currentLocation} />
          <ActionButton icon={Share2} label="Share" onClick={shareLocation} disabled={!currentLocation} />
          <a href={currentLocation?.googleMapLink || '#'} target={currentLocation ? '_blank' : undefined} rel="noreferrer" aria-disabled={!currentLocation} className={`flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium transition hover:bg-blue-500 ${!currentLocation ? 'pointer-events-none opacity-40' : ''}`}><ExternalLink className="h-4 w-4" /> Open Maps</a>
        </div>
      </div>
    </main>
  );
}

function MapLoadingState() {
  return <main className="mx-auto max-w-[1600px] px-3 py-3 md:px-5 md:py-5"><div className="grid h-[calc(100vh-5.5rem)] min-h-[620px] place-items-center rounded-3xl border border-white/10 bg-white/5"><div className="text-center"><RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-300" /><p className="mt-3 text-slate-300">Loading secure map...</p></div></div></main>;
}

function MapErrorState({ title, message }) {
  return <main className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-3xl place-items-center px-4 py-10"><div className="w-full rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center backdrop-blur-xl"><MapPin className="mx-auto h-10 w-10 text-rose-300" /><h1 className="mt-4 text-2xl font-bold">{title}</h1><p className="mx-auto mt-3 max-w-xl text-slate-300">{message}</p></div></main>;
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
