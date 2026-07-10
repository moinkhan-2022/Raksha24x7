import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { AlertTriangle, MapPin, RefreshCw, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import NearbyFilterBar from '../components/NearbyFilterBar';
import NearbyMap from '../components/NearbyMap';
import ServiceList from '../components/ServiceList';
import Toast from '../components/Toast';
import { useNotifications } from '../context/NotificationContext';
import useNearbyServices from '../hooks/useNearbyServices';
import { buildNearbyServiceNotification } from '../services/emergencyNotificationService';
import { buildGoogleMapsNavigationUrl } from '../services/navigationService';
import { buildSearchIndex, searchIndex } from '../services/searchIndex';
import { getServiceDistance } from '../utils/distance';
import { GOOGLE_MAP_LIBRARIES, GOOGLE_MAP_LOADER_ID } from '../utils/googleMapConfig';
import { ALLOWED_SEARCH_RADII } from '../utils/overpassQuery';
import { sortServices } from '../utils/serviceResults';

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

const locationErrorMessage = (error) => {
  if (error?.code === 1) return 'Location access required.';
  if (error?.code === 2) return 'Your current location is unavailable.';
  if (error?.code === 3) return 'Getting your location timed out.';
  return 'Unable to detect your current location.';
};

function NearbyServicesPage() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const [theme] = useState(() => localStorage.getItem('raksha_theme') === 'light' ? 'light' : 'dark');
  const isLight = theme === 'light';

  useEffect(() => {
    document.documentElement.dataset.rakshaTheme = theme;
  }, [theme]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-950 text-white'}`}>
      <Navbar dashboard />
      {!apiKey ? <PageError title="Google Maps API key is missing" message="Add VITE_GOOGLE_MAPS_API_KEY to client/.env and restart Vite." theme={theme} /> : <NearbyServicesExperience apiKey={apiKey} theme={theme} />}
    </div>
  );
}

function NearbyServicesExperience({ apiKey, theme }) {
  const isLight = theme === 'light';
  const [userLocation, setUserLocation] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRadius, setSearchRadius] = useState(5000);
  const [selectedService, setSelectedService] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const notifiedCategoriesRef = useRef(new Set());
  const { emergencyNotify } = useNotifications();

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAP_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAP_LIBRARIES
  });

  const { services, loading: servicesLoading } = useNearbyServices({
    location: userLocation,
    radius: searchRadius,
    enabled: Boolean(userLocation),
    online: navigator.onLine,
    refreshVersion
  });

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ message: '', type: 'success' }), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Location access required.');
      setLocationLoading(false);
      return;
    }
    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp || Date.now()).toISOString()
        });
        setRefreshVersion((version) => version + 1);
        setLocationLoading(false);
      },
      (error) => {
        setLocationError(locationErrorMessage(error));
        setLocationLoading(false);
      },
      GEO_OPTIONS
    );
  }, []);

  useEffect(() => { requestCurrentLocation(); }, [requestCurrentLocation]);

  const servicesWithDistance = useMemo(() => services.map((service) => ({
    ...service,
    ...getServiceDistance(userLocation, service),
    userLatitude: userLocation?.latitude,
    userLongitude: userLocation?.longitude
  })), [services, userLocation]);

  const filteredServices = useMemo(() => {
    const base = activeFilter === 'all' ? servicesWithDistance : servicesWithDistance.filter((service) => service.filterId === activeFilter);
    return sortServices(searchIndex(buildSearchIndex(base), searchQuery), 'nearest');
  }, [activeFilter, searchQuery, servicesWithDistance]);

  useEffect(() => {
    if (!servicesWithDistance.length || servicesLoading) return;
    const priorityCategories = ['hospital', 'police', 'fire', 'pharmacy', 'ambulance'];
    priorityCategories.forEach((filterId) => {
      if (notifiedCategoriesRef.current.has(filterId)) return;
      const nearest = servicesWithDistance
        .filter((service) => service.filterId === filterId)
        .sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER))[0];
      if (!nearest) return;
      notifiedCategoriesRef.current.add(filterId);
      emergencyNotify(buildNearbyServiceNotification(nearest));
    });
  }, [emergencyNotify, servicesLoading, servicesWithDistance]);

  const navigateToService = (service) => {
    window.open(buildGoogleMapsNavigationUrl(userLocation, service, 'DRIVING'), '_blank', 'noopener,noreferrer');
  };

  const shareService = async (service) => {
    const text = `${service.name}\n${service.categoryLabel}\n${service.address}\n${service.googleMapsLink}`;
    try {
      if (navigator.share) await navigator.share({ title: service.name, text, url: service.googleMapsLink });
      else await navigator.clipboard.writeText(text);
      showToast(navigator.share ? 'Service shared' : 'Service details copied');
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Unable to share service details', 'error');
    }
  };

  if (loadError) return <PageError title="Google Maps failed to load" message="Check your API key, connection, and Maps JavaScript API status." theme={theme} />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 md:px-6">
      <Toast message={toast.message} type={toast.type} />

      <section className={`rounded-3xl border p-5 shadow-sm ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">Nearby Emergency Services</h1>
            <p className={`mt-1 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Find emergency help around your current location.</p>
          </div>
          <div className="flex gap-2">
            <label className={`rounded-2xl border px-3 text-sm ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-slate-950 text-slate-300'}`}>
              <span className="sr-only">Search radius</span>
              <select value={searchRadius} onChange={(event) => setSearchRadius(Number(event.target.value))} className={`h-11 bg-transparent outline-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {ALLOWED_SEARCH_RADII.map((radius) => <option key={radius} value={radius} className={isLight ? 'bg-white' : 'bg-slate-900'}>{radius < 1000 ? `${radius} m` : `${radius / 1000} km`}</option>)}
              </select>
            </label>
            <button type="button" onClick={requestCurrentLocation} disabled={locationLoading} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              <RefreshCw className={`mr-2 inline h-4 w-4 ${locationLoading || servicesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <label className="relative mt-5 block">
          <span className="sr-only">Search nearby services</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search hospitals, police, pharmacies..." className={`h-12 w-full rounded-2xl border px-11 text-sm outline-none focus:border-blue-400/60 ${isLight ? 'border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400' : 'border-white/10 bg-slate-950 text-white placeholder:text-slate-500'}`} />
        </label>

        <div className="mt-4"><NearbyFilterBar activeFilter={activeFilter} onFilterChange={setActiveFilter} disabled={!userLocation} theme={theme} /></div>
      </section>

      {locationError ? (
        <PermissionState message={locationError} onRefresh={requestCurrentLocation} theme={theme} />
      ) : (
        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className={`h-[55vh] min-h-[420px] overflow-hidden rounded-3xl border shadow-sm lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-900'}`}>
            {userLocation && isLoaded ? (
              <NearbyMap
                userLocation={userLocation}
                services={filteredServices}
                selectedService={selectedService}
                onSelectService={setSelectedService}
                onMapLoad={() => {}}
                onMapUnmount={() => {}}
                trafficEnabled={false}
                onTrafficToggle={() => {}}
                showTrafficToggle={false}
                emergencyServiceIds={null}
                onNotify={showToast}
                onNavigate={navigateToService}
                onShare={shareService}
              />
            ) : (
              <MapSkeleton text={locationLoading ? 'Getting location...' : 'Loading map...'} theme={theme} />
            )}
          </div>

          <aside className={`rounded-3xl border p-3 shadow-sm lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.05]'}`}>
            <ServiceList
              services={filteredServices}
              loading={servicesLoading}
              theme={theme}
              selectedServiceId={selectedService?.id}
              onView={setSelectedService}
              onNavigate={navigateToService}
              onShare={shareService}
              onNotify={showToast}
              emptyMessage={searchQuery ? 'No services match your search.' : 'No nearby services found.'}
            />
          </aside>
        </section>
      )}
    </main>
  );
}

function PermissionState({ message, onRefresh, theme }) {
  const isLight = theme === 'light';
  return (
    <section className={`mt-5 grid min-h-[360px] place-items-center rounded-3xl border border-dashed p-8 text-center ${isLight ? 'border-slate-300 bg-white' : 'border-white/10 bg-white/[0.03]'}`}>
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

function MapSkeleton({ text, theme }) {
  const isLight = theme === 'light';
  return <div className={`grid h-full place-items-center text-center ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-slate-400'}`}><div><RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-300" /><p className="mt-3 text-sm">{text}</p></div></div>;
}

function PageError({ title, message, theme }) {
  const isLight = theme === 'light';
  return <main className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-3xl place-items-center px-4 py-10"><div className="w-full rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-rose-300" /><h1 className="mt-4 text-2xl font-bold">{title}</h1><p className={`mx-auto mt-3 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{message}</p></div></main>;
}

export default NearbyServicesPage;
