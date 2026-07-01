import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { AlertTriangle, ExternalLink, MapPin, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import Navbar from '../components/Navbar';
import NearbyFilterBar from '../components/NearbyFilterBar';
import NearbyMap from '../components/NearbyMap';
import { getNearbyEmergencyServices } from '../services/googlePlacesService';
import { GOOGLE_MAP_LIBRARIES, GOOGLE_MAP_LOADER_ID } from '../utils/googleMapConfig';

const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

const locationErrorMessage = (error) => {
  if (error?.code === 1) return 'Location permission denied. Enable location access in your browser settings.';
  if (error?.code === 2) return 'Your current location is unavailable.';
  if (error?.code === 3) return 'Getting your location timed out. Please try again.';
  return 'Unable to detect your current location.';
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
  const [mapInstance, setMapInstance] = useState(null);
  const [services, setServices] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedService, setSelectedService] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [servicesError, setServicesError] = useState('');
  const [searchWarnings, setSearchWarnings] = useState([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const mountedRef = useRef(true);
  const searchIdRef = useRef(0);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAP_LOADER_ID,
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAP_LIBRARIES
  });

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
        if (!mountedRef.current) return;
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
        if (!mountedRef.current) return;
        setLocationError(locationErrorMessage(error));
        setLocationLoading(false);
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    requestCurrentLocation();
    return () => {
      mountedRef.current = false;
      searchIdRef.current += 1;
    };
  }, [requestCurrentLocation]);

  useEffect(() => {
    if (!isLoaded || !mapInstance || !userLocation) return undefined;

    // Each refresh gets an ID so an older Places response cannot replace newer results.
    const searchId = ++searchIdRef.current;
    setServicesLoading(true);
    setServicesError('');
    setSearchWarnings([]);
    setSelectedService(null);

    getNearbyEmergencyServices(mapInstance, {
      lat: userLocation.latitude,
      lng: userLocation.longitude
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

    return () => { searchIdRef.current += 1; };
  }, [isLoaded, mapInstance, refreshVersion, userLocation]);

  const visibleServices = useMemo(
    () => activeFilter === 'all' ? services : services.filter((service) => service.filterId === activeFilter),
    [activeFilter, services]
  );

  const filterCounts = useMemo(() => services.reduce((counts, service) => ({
    ...counts,
    all: (counts.all || 0) + 1,
    [service.filterId]: (counts[service.filterId] || 0) + 1
  }), {}), [services]);

  useEffect(() => {
    if (selectedService && !visibleServices.some((service) => service.id === selectedService.id)) {
      setSelectedService(null);
    }
  }, [selectedService, visibleServices]);

  const selectService = (service) => {
    setSelectedService(service);
    if (service && mapInstance) {
      mapInstance.panTo({ lat: service.latitude, lng: service.longitude });
      mapInstance.setZoom(16);
    }
  };

  if (loadError) {
    return <PageError title="Google Maps failed to load" message="Check your network, API key restrictions, and that Maps JavaScript API and Places API are enabled." />;
  }

  if (!isLoaded) return <PageLoading message="Loading Google Maps and Places..." />;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-blue-950/30 backdrop-blur-xl md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">5 km Safety Radius</p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Nearby Emergency Services</h1>
            <p className="mt-2 text-sm text-slate-300">Hospitals, responders, pharmacies, and women-focused support around you.</p>
          </div>
          <button
            type="button"
            onClick={requestCurrentLocation}
            disabled={locationLoading || servicesLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${locationLoading || servicesLoading ? 'animate-spin' : ''}`} />
            {locationLoading ? 'Getting location...' : servicesLoading ? 'Loading services...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <CoordinateCard label="Latitude" value={userLocation ? userLocation.latitude.toFixed(6) : 'Detecting...'} />
          <CoordinateCard label="Longitude" value={userLocation ? userLocation.longitude.toFixed(6) : 'Detecting...'} />
          <CoordinateCard label="Visible Results" value={servicesLoading ? 'Loading...' : String(visibleServices.length)} />
        </div>

        <div className="mt-5">
          <NearbyFilterBar
            activeFilter={activeFilter}
            counts={filterCounts}
            onFilterChange={setActiveFilter}
            disabled={servicesLoading}
          />
        </div>
      </section>

      {locationError && <InlineAlert message={locationError} />}
      {servicesError && <InlineAlert message={servicesError} />}
      {searchWarnings.length > 0 && (
        <InlineAlert message={`Some service categories could not be loaded: ${searchWarnings.join(' ')}`} warning />
      )}

      <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="relative h-[58vh] min-h-[460px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-blue-950/40 lg:h-[calc(100vh-15rem)] lg:min-h-[590px]">
          {userLocation ? (
            <NearbyMap
              userLocation={userLocation}
              services={visibleServices}
              selectedService={selectedService}
              onSelectService={selectService}
              onMapLoad={setMapInstance}
              onMapUnmount={() => setMapInstance(null)}
            />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <MapPin className="mx-auto h-10 w-10 text-blue-300" />
                <p className="mt-4 font-semibold">{locationLoading ? 'Getting your current location...' : 'Location is required to search nearby services.'}</p>
                <p className="mt-2 text-sm text-slate-400">Allow location access, then use Refresh.</p>
              </div>
            </div>
          )}

          {servicesLoading && userLocation && (
            <div className="absolute inset-x-3 top-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/90 px-4 py-3 text-sm shadow-xl backdrop-blur-xl md:left-1/2 md:right-auto md:-translate-x-1/2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-300" /> Loading nearby services...
            </div>
          )}
        </div>

        <aside className="max-h-[590px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl lg:max-h-[calc(100vh-15rem)] lg:min-h-[590px]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <h2 className="font-semibold">Visible Services</h2>
              <p className="text-xs text-slate-400">{visibleServices.length} result{visibleServices.length === 1 ? '' : 's'}</p>
            </div>
            <Search className="h-5 w-5 text-blue-300" />
          </div>

          <div className="max-h-[520px] space-y-2 overflow-y-auto p-3 lg:max-h-[calc(100vh-20rem)]">
            {!servicesLoading && visibleServices.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <ShieldAlert className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3">No nearby results found for this filter.</p>
              </div>
            ) : visibleServices.map((service) => (
              <div
                key={service.id}
                role="button"
                tabIndex={0}
                onClick={() => selectService(service)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') selectService(service);
                }}
                className={`w-full rounded-2xl border p-3 text-left transition ${selectedService?.id === service.id ? 'border-blue-400/50 bg-blue-500/15' : 'border-white/10 bg-slate-950/35 hover:bg-white/10'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-100">{service.name}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{service.categoryLabel}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{service.address}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-amber-300">{service.rating == null ? 'No rating' : `★ ${service.rating.toFixed(1)}`}</span>
                      <a href={service.googleMapsLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"><ExternalLink className="h-3 w-3" /> Maps</a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
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
