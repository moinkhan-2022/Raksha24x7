import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { AlertTriangle, ExternalLink, Heart, History, MapPin, RefreshCw, Route, Search } from 'lucide-react';
import AQIWidget from '../components/AQIWidget';
import EmergencyPanel from '../components/EmergencyPanel';
import Navbar from '../components/Navbar';
import NearbyFilterBar from '../components/NearbyFilterBar';
import NearbyMap from '../components/NearbyMap';
import NearbySearchBar from '../components/NearbySearchBar';
import RouteInfo from '../components/RouteInfo';
import ServiceList from '../components/ServiceList';
import Toast from '../components/Toast';
import WeatherWidget from '../components/WeatherWidget';
import useEmergencyMode from '../hooks/useEmergencyMode';
import useRouteNavigation from '../hooks/useRouteNavigation';
import { getEnvironmentData } from '../services/environmentService';
import { fetchNearbyServices } from '../services/osmApi';
import { buildGoogleMapsNavigationUrl, getRecentRoutes, saveRecentRoute } from '../services/navigationService';
import { calculateDistanceMeters, getServiceDistance } from '../utils/distance';
import { estimateEtaMinutes, formatEta } from '../utils/etaCalculator';
import { GOOGLE_MAP_LIBRARIES, GOOGLE_MAP_LOADER_ID } from '../utils/googleMapConfig';
import { ALLOWED_SEARCH_RADII } from '../utils/overpassQuery';
import {
  addRecentlyViewedService,
  getFavoriteServices,
  getRecentlyViewedServices,
  storedServiceToNearby,
  toggleFavoriteService
} from '../utils/nearbyStorage';
import { filterServicesByQuery, sortServices } from '../utils/serviceResults';

const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
const EMPTY_SERVICE_IDS = new Set();

const locationErrorMessage = (error) => {
  if (error?.code === 1) return 'Location permission denied. Enable location access in your browser settings.';
  if (error?.code === 2) return 'Your current location is unavailable.';
  if (error?.code === 3) return 'Getting your location timed out. Please try again.';
  return 'Unable to detect your current location.';
};

const enrichWithDistance = (service, userLocation) => ({
  ...service,
  ...getServiceDistance(userLocation, service),
  userLatitude: userLocation?.latitude,
  userLongitude: userLocation?.longitude
});

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard copy failed');
};

function NearbyServicesPage() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
      <Navbar dashboard />
      {!apiKey ? (
        <PageError
          title="Google Maps API key is missing"
          message="Add VITE_GOOGLE_MAPS_API_KEY to client/.env and restart the Vite server."
        />
      ) : <NearbyServicesExperience apiKey={apiKey} />}
    </div>
  );
}

function NearbyServicesExperience({ apiKey }) {
  const [userLocation, setUserLocation] = useState(null);
  const [serviceSearchLocation, setServiceSearchLocation] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [services, setServices] = useState([]);
  const [favorites, setFavorites] = useState(() => getFavoriteServices());
  const [recentlyViewed, setRecentlyViewed] = useState(() => getRecentlyViewedServices());
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('nearest');
  const [searchRadius, setSearchRadius] = useState(5000);
  const [selectedService, setSelectedService] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [servicesError, setServicesError] = useState('');
  const [searchWarnings, setSearchWarnings] = useState([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [environment, setEnvironment] = useState({ weather: null, airQuality: null });
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environmentError, setEnvironmentError] = useState('');
  const [recentRoutes, setRecentRoutes] = useState(() => getRecentRoutes());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const mountedRef = useRef(true);
  const searchIdRef = useRef(0);
  const liveLocationRef = useRef(null);
  const serviceSearchLocationRef = useRef(null);
  const locationDebounceRef = useRef(null);
  const lastLocationToastRef = useRef(0);
  const forceRefreshRef = useRef(false);
  const emergencyNotifiedRef = useRef(new Set());

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAP_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAP_LIBRARIES
  });

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), []);

  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(() => setToast({ message: '', type: 'success' }), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const updateNetworkStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const applyPosition = useCallback((position, { forceSearch = false, notify = true } = {}) => {
    if (!mountedRef.current) return;
    const next = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp || Date.now()).toISOString()
    };
    const previous = liveLocationRef.current;
    liveLocationRef.current = next;
    setUserLocation(next);
    setLocationError('');
    setLocationLoading(false);

    const movedFromPrevious = previous ? calculateDistanceMeters(previous, next) : null;
    if (notify && Number.isFinite(movedFromPrevious) && movedFromPrevious >= 15 && Date.now() - lastLocationToastRef.current > 10000) {
      lastLocationToastRef.current = Date.now();
      showToast('Live location updated');
    }

    const movedFromSearch = serviceSearchLocationRef.current
      ? calculateDistanceMeters(serviceSearchLocationRef.current, next)
      : Infinity;
    if (forceSearch || movedFromSearch >= 50) {
      window.clearTimeout(locationDebounceRef.current);
      locationDebounceRef.current = window.setTimeout(() => {
        serviceSearchLocationRef.current = next;
        setServiceSearchLocation(next);
      }, forceSearch ? 0 : 1200);
    }
  }, [showToast]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        forceRefreshRef.current = true;
        applyPosition(position, { forceSearch: true, notify: false });
        setRefreshVersion((version) => version + 1);
      },
      (error) => {
        if (!mountedRef.current) return;
        setLocationError(locationErrorMessage(error));
        setLocationLoading(false);
      },
      GEOLOCATION_OPTIONS
    );
  }, [applyPosition]);

  useEffect(() => {
    mountedRef.current = true;
    requestCurrentLocation();
    return () => {
      mountedRef.current = false;
      searchIdRef.current += 1;
      window.clearTimeout(locationDebounceRef.current);
    };
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (position) => applyPosition(position),
      (error) => {
        if (mountedRef.current) setLocationError(locationErrorMessage(error));
      },
      { ...GEOLOCATION_OPTIONS, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [applyPosition]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshVersion((version) => version + 1);
    }, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoaded || !serviceSearchLocation) return undefined;
    if (!isOnline) {
      setServicesError('No Internet connection. Nearby services will refresh when you reconnect.');
      return undefined;
    }

    const searchId = ++searchIdRef.current;
    const force = forceRefreshRef.current;
    forceRefreshRef.current = false;
    setServicesLoading(true);
    setServicesError('');
    setSearchWarnings([]);
    setSelectedService(null);

    const controller = new AbortController();
    fetchNearbyServices(serviceSearchLocation.latitude, serviceSearchLocation.longitude, {
      radius: searchRadius,
      force,
      signal: controller.signal
    })
      .then(({ services: nearbyServices, warnings }) => {
        if (!mountedRef.current || searchId !== searchIdRef.current) return;
        setServices(nearbyServices);
        setSearchWarnings(warnings);
      })
      .catch((error) => {
        if (!mountedRef.current || searchId !== searchIdRef.current) return;
        setServices([]);
        setServicesError(error?.message || 'Unable to load nearby emergency services.');
      })
      .finally(() => {
        if (mountedRef.current && searchId === searchIdRef.current) setServicesLoading(false);
      });

    return () => { controller.abort(); searchIdRef.current += 1; };
  }, [isLoaded, isOnline, refreshVersion, searchRadius, serviceSearchLocation]);

  useEffect(() => {
    if (!serviceSearchLocation || !isOnline) return undefined;
    const controller = new AbortController();
    setEnvironmentLoading(true);
    setEnvironmentError('');
    getEnvironmentData(serviceSearchLocation.latitude, serviceSearchLocation.longitude, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setEnvironment({ weather: data.weather, airQuality: data.airQuality });
          if (data.warnings.length) setEnvironmentError(data.warnings.join(' '));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setEnvironmentError(error.message || 'Environmental information is unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setEnvironmentLoading(false);
      });
    return () => controller.abort();
  }, [isOnline, serviceSearchLocation]);

  const nearbyWithDistance = useMemo(
    () => services.map((service) => enrichWithDistance(service, userLocation)),
    [services, userLocation]
  );

  const favoriteServices = useMemo(
    () => favorites.map(storedServiceToNearby).map((service) => enrichWithDistance(service, userLocation)),
    [favorites, userLocation]
  );

  const recentServices = useMemo(
    () => recentlyViewed.map(storedServiceToNearby).map((service) => enrichWithDistance(service, userLocation)),
    [recentlyViewed, userLocation]
  );

  const favoriteIds = useMemo(() => new Set(favorites.map((service) => service.placeId)), [favorites]);
  const emergencyMode = useEmergencyMode(nearbyWithDistance);
  const currentSelectedService = useMemo(() => {
    if (!selectedService) return null;
    return nearbyWithDistance.find((service) => service.placeId === selectedService.placeId)
      || favoriteServices.find((service) => service.placeId === selectedService.placeId)
      || selectedService;
  }, [favoriteServices, nearbyWithDistance, selectedService]);
  const routeNavigation = useRouteNavigation(userLocation, currentSelectedService);

  const visibleServices = useMemo(() => {
    const categoryServices = activeFilter === 'favorites'
      ? favoriteServices
      : activeFilter === 'all'
        ? nearbyWithDistance
        : nearbyWithDistance.filter((service) => service.filterId === activeFilter);
    const searched = filterServicesByQuery(categoryServices, searchQuery);
    const sorted = sortServices(searched, sortBy);
    if (!emergencyMode.enabled || activeFilter !== 'all') return sorted;
    const priority = emergencyMode.priorityServices;
    return [...priority, ...sorted.filter((service) => !emergencyMode.priorityIds.has(service.placeId))];
  }, [activeFilter, emergencyMode.enabled, emergencyMode.priorityIds, emergencyMode.priorityServices, favoriteServices, nearbyWithDistance, searchQuery, sortBy]);

  const filterCounts = useMemo(() => nearbyWithDistance.reduce((counts, service) => ({
    ...counts,
    all: (counts.all || 0) + 1,
    favorites: favorites.length,
    [service.filterId]: (counts[service.filterId] || 0) + 1
  }), { favorites: favorites.length }), [favorites.length, nearbyWithDistance]);

  useEffect(() => {
    if (!emergencyMode.enabled) {
      emergencyNotifiedRef.current.clear();
      return;
    }
    setActiveFilter('all');
    setSearchQuery('');
    setSortBy('nearest');
    if (!emergencyNotifiedRef.current.has('active')) {
      emergencyNotifiedRef.current.add('active');
      showToast('Emergency mode activated');
    }
  }, [emergencyMode.enabled, showToast]);

  useEffect(() => {
    if (!emergencyMode.enabled) return undefined;
    const timers = [];
    if (emergencyMode.nearestByCategory.hospital && !emergencyNotifiedRef.current.has('hospital')) {
      emergencyNotifiedRef.current.add('hospital');
      timers.push(window.setTimeout(() => showToast('Nearest hospital found'), 900));
    }
    if (emergencyMode.nearestByCategory.police && !emergencyNotifiedRef.current.has('police')) {
      emergencyNotifiedRef.current.add('police');
      timers.push(window.setTimeout(() => showToast('Nearest police station found'), 1800));
    }
    return () => timers.forEach(window.clearTimeout);
  }, [emergencyMode.enabled, emergencyMode.nearestByCategory.hospital, emergencyMode.nearestByCategory.police, showToast]);

  useEffect(() => {
    if (selectedService && !visibleServices.some((service) => service.placeId === selectedService.placeId)) {
      setSelectedService(null);
    }
  }, [selectedService, visibleServices]);

  const recordRecentlyViewed = useCallback((service) => {
    if (!service) return;
    try {
      setRecentlyViewed(addRecentlyViewedService(service));
    } catch {
      showToast('Recently viewed services could not be saved', 'error');
    }
  }, [showToast]);

  const selectService = useCallback((service) => {
    setSelectedService(service);
    if (!service) return;
    recordRecentlyViewed(service);
    if (mapInstance) {
      mapInstance.panTo({ lat: service.latitude, lng: service.longitude });
      mapInstance.setZoom(16);
    }
  }, [mapInstance, recordRecentlyViewed]);

  const toggleFavorite = useCallback((service) => {
    try {
      const result = toggleFavoriteService(service);
      setFavorites(result.favorites);
      showToast(result.isFavorite ? 'Service saved to favorites' : 'Service removed from favorites');
    } catch {
      showToast('Favorite could not be saved to this browser', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (routeNavigation.routeInfo) setRecentRoutes(getRecentRoutes());
  }, [routeNavigation.routeInfo]);

  const etaForService = useCallback(
    (service) => formatEta(estimateEtaMinutes(service.distanceMeters, 'DRIVING')),
    []
  );

  const recordNavigation = useCallback((service) => {
    if (!service) return;
    const exactRoute = currentSelectedService?.placeId === service.placeId ? routeNavigation.routeInfo : null;
    try {
      const next = saveRecentRoute({
        placeId: service.placeId,
        name: service.name,
        category: service.categoryLabel,
        latitude: service.latitude,
        longitude: service.longitude,
        travelMode: routeNavigation.travelMode,
        distanceText: exactRoute?.distanceText || service.distanceLabel,
        distanceMeters: exactRoute?.distanceMeters || service.distanceMeters,
        durationText: exactRoute?.durationText || etaForService(service),
        durationSeconds: exactRoute?.durationSeconds || null
      });
      setRecentRoutes(next);
    } catch {
      showToast('Navigation history could not be saved', 'error');
    }
  }, [currentSelectedService?.placeId, etaForService, routeNavigation.routeInfo, routeNavigation.travelMode, showToast]);

  const navigateToService = useCallback((service) => {
    if (!service) return;
    selectService(service);
    recordNavigation(service);
    const url = buildGoogleMapsNavigationUrl(userLocation, service, routeNavigation.travelMode);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [recordNavigation, routeNavigation.travelMode, selectService, userLocation]);

  const shareCurrentLocation = useCallback(async () => {
    if (!userLocation) {
      showToast('Current location is unavailable', 'error');
      return;
    }
    const url = `https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`;
    const text = `Raksha24x7 Emergency Location\n${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Raksha24x7 Emergency Location', text, url });
      else await copyText(text);
      showToast(navigator.share ? 'Location shared' : 'Location copied to clipboard');
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Location could not be shared', 'error');
    }
  }, [showToast, userLocation]);

  const shareService = useCallback(async (service) => {
    if (!service) return;
    recordRecentlyViewed(service);
    const text = `${service.name}\n${service.categoryLabel}\n${service.address}\n${service.googleMapsLink}`;
    try {
      if (navigator.share) await navigator.share({ title: service.name, text, url: service.googleMapsLink });
      else await copyText(text);
      showToast(navigator.share ? 'Service shared' : 'Service details copied');
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Unable to share service details', 'error');
    }
  }, [recordRecentlyViewed, showToast]);

  const selectedNavigationUrl = useMemo(
    () => currentSelectedService ? buildGoogleMapsNavigationUrl(userLocation, currentSelectedService, routeNavigation.travelMode) : '',
    [currentSelectedService, routeNavigation.travelMode, userLocation]
  );

  const commonListProps = {
    favoriteIds,
    selectedServiceId: currentSelectedService?.id,
    onToggleFavorite: toggleFavorite,
    onNavigate: recordNavigation,
    emergencyServiceIds: emergencyMode.enabled ? emergencyMode.priorityIds : EMPTY_SERVICE_IDS,
    etaForService,
    onNotify: showToast
  };

  if (loadError) {
    return <PageError title="Google Maps failed to load" message="Check your network, API key restrictions, and that Maps JavaScript API is enabled." />;
  }

  if (!isLoaded) return <PageLoading message="Loading Google Maps..." />;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
      <Toast message={toast.message} type={toast.type} />
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-blue-950/30 backdrop-blur-xl md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">OpenStreetMap Emergency Intelligence</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Nearby Emergency Services</h1>
            <p className="mt-2 text-sm text-slate-300">Search, compare, save, and contact emergency support around you.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 text-xs text-slate-300">Radius
              <select value={searchRadius} onChange={(event) => setSearchRadius(Number(event.target.value))} className="bg-transparent py-3 font-semibold text-white outline-none">
                {ALLOWED_SEARCH_RADII.map((radius) => <option key={radius} value={radius} className="bg-slate-900">{radius < 1000 ? `${radius} m` : `${radius / 1000} km`}</option>)}
              </select>
            </label>
            <button type="button" onClick={requestCurrentLocation} disabled={locationLoading || servicesLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${locationLoading || servicesLoading ? 'animate-spin' : ''}`} />
              {locationLoading ? 'Getting location...' : servicesLoading ? 'Loading services...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <CoordinateCard label="Latitude" value={userLocation ? userLocation.latitude.toFixed(6) : 'Detecting...'} />
          <CoordinateCard label="Longitude" value={userLocation ? userLocation.longitude.toFixed(6) : 'Detecting...'} />
          <CoordinateCard label="Visible Results" value={servicesLoading ? 'Loading...' : String(visibleServices.length)} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <WeatherWidget weather={environment.weather} loading={environmentLoading} />
          <AQIWidget airQuality={environment.airQuality} loading={environmentLoading} />
        </div>

        <div className="mt-5"><NearbyFilterBar activeFilter={activeFilter} counts={filterCounts} onFilterChange={setActiveFilter} disabled={servicesLoading} /></div>
        <div className="mt-4"><NearbySearchBar query={searchQuery} onSearchChange={setSearchQuery} sortBy={sortBy} onSortChange={setSortBy} resultCount={visibleServices.length} /></div>
      </section>

      {locationError && <InlineAlert message={locationError} />}
      {servicesError && <InlineAlert message={servicesError} />}
      {environmentError && <InlineAlert message={environmentError} warning />}
      {searchWarnings.length > 0 && <InlineAlert message={`Some service categories could not be loaded: ${searchWarnings.join(' ')}`} warning />}

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="relative h-[58vh] min-h-[460px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/40 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:min-h-[590px]">
          {userLocation ? (
            <NearbyMap
              userLocation={userLocation}
              services={visibleServices}
              selectedService={currentSelectedService}
              onSelectService={selectService}
              onMapLoad={setMapInstance}
              onMapUnmount={() => setMapInstance(null)}
              trafficEnabled={trafficEnabled}
              onTrafficToggle={() => setTrafficEnabled((enabled) => !enabled)}
              emergencyServiceIds={emergencyMode.enabled ? emergencyMode.priorityIds : null}
              onNotify={showToast}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onNavigate={navigateToService}
              onShare={shareService}
            />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center"><div><MapPin className="mx-auto h-10 w-10 text-blue-300" /><p className="mt-4 font-semibold">{locationLoading ? 'Getting your current location...' : 'Location is required to search nearby services.'}</p><p className="mt-2 text-sm text-slate-400">Allow location access, then use Refresh.</p></div></div>
          )}
          {servicesLoading && userLocation && <div className="absolute inset-x-3 top-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm shadow-xl backdrop-blur-xl md:left-1/2 md:right-auto md:w-72 md:-translate-x-1/2"><div className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-blue-300" /> Loading OpenStreetMap services...</div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-1/2 animate-pulse rounded-full bg-blue-400" /></div></div>}
          {userLocation && <EmergencyPanel active={emergencyMode.enabled} onToggle={emergencyMode.toggle} nearestByCategory={emergencyMode.nearestByCategory} onSelect={selectService} onNavigate={navigateToService} onShareLocation={shareCurrentLocation} />}
          {userLocation && <RouteInfo service={currentSelectedService} travelMode={routeNavigation.travelMode} onModeChange={routeNavigation.setTravelMode} routeInfo={routeNavigation.routeInfo} loading={routeNavigation.loading} error={routeNavigation.error} onClear={() => { setSelectedService(null); routeNavigation.clearRoute(); }} onNavigate={() => recordNavigation(currentSelectedService)} navigationUrl={selectedNavigationUrl} />}
        </div>

        <aside className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
          <SectionHeader icon={Search} title="Service Results" subtitle={`${visibleServices.length} matching service${visibleServices.length === 1 ? '' : 's'}`} />
          <div className="p-3 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
            <ServiceList services={visibleServices} loading={servicesLoading} onView={selectService} emptyMessage={searchQuery ? 'No results found after search.' : 'No nearby results found for this filter.'} {...commonListProps} />
          </div>
        </aside>
      </section>

      <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:p-6">
        <SectionHeader icon={Heart} title="Favorite Services" subtitle={`${favoriteServices.length} saved for quick access`} />
        <div className="mt-4"><ServiceList services={favoriteServices} layout="grid" onView={recordRecentlyViewed} emptyMessage="Save a service and it will remain available here after refresh." {...commonListProps} /></div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:p-6">
        <SectionHeader icon={History} title="Recently Viewed" subtitle="Your latest service card and marker selections" />
        <div className="mt-4"><ServiceList services={recentServices} layout="grid" onView={recordRecentlyViewed} emptyMessage="Services you view will appear here." {...commonListProps} /></div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:p-6">
        <SectionHeader icon={Route} title="Recent Routes & Navigation" subtitle="Visited emergency destinations stored on this device" />
        {recentRoutes.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentRoutes.map((route) => (
              <a key={`${route.key}-${route.navigatedAt}`} href={buildGoogleMapsNavigationUrl(userLocation, route, route.travelMode)} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:border-blue-400/40 hover:bg-white/10">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-white">{route.name}</p><p className="mt-1 text-xs uppercase tracking-wider text-blue-300">{route.category} • {route.travelMode?.toLowerCase()}</p></div><ExternalLink className="h-4 w-4 shrink-0 text-slate-400" /></div>
                <div className="mt-3 flex gap-3 text-xs text-slate-300"><span>{route.distanceText || 'Distance unavailable'}</span><span>{route.durationText || 'ETA unavailable'}</span></div>
                <p className="mt-2 text-[10px] text-slate-500">{new Date(route.navigatedAt).toLocaleString()}</p>
              </a>
            ))}
          </div>
        ) : <div className="mt-4 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">Routes you calculate or open will appear here.</div>}
      </section>
    </main>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return <div className="flex items-center gap-3 border-b border-white/10 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><Icon className="h-5 w-5" /></span><div><h2 className="font-semibold">{title}</h2><p className="text-xs text-slate-400">{subtitle}</p></div></div>;
}

function CoordinateCard({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-medium text-slate-200">{value}</p></div>;
}

function InlineAlert({ message, warning = false }) {
  return <div className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 text-sm ${warning ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-100'}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>{message}</p></div>;
}

function PageLoading({ message }) {
  return <main className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-3xl place-items-center px-4"><div className="text-center"><RefreshCw className="mx-auto h-9 w-9 animate-spin text-blue-300" /><p className="mt-4 text-slate-300">{message}</p></div></main>;
}

function PageError({ title, message }) {
  return <main className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-3xl place-items-center px-4 py-10"><div className="w-full rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center backdrop-blur-xl"><AlertTriangle className="mx-auto h-10 w-10 text-rose-300" /><h1 className="mt-4 text-2xl font-bold">{title}</h1><p className="mx-auto mt-3 max-w-xl text-slate-300">{message}</p></div></main>;
}

export default NearbyServicesPage;
