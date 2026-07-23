import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, LocateFixed, Navigation, Share2 } from 'lucide-react';
import { clusterServices } from '../services/markerCluster';
import { readLocalState, writeLocalState } from '../services/cacheService';
import { STORAGE_KEYS } from '../utils/cacheKeys';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const createMarkerIcon = ({ color = '#2563eb', label = '', selected = false, emergency = false }) => L.divIcon({
  className: '',
  html: `<div style="
    display:grid;place-items:center;
    width:${selected ? 38 : emergency ? 34 : 30}px;height:${selected ? 38 : emergency ? 34 : 30}px;
    border-radius:9999px;background:${color};color:white;
    border:${emergency ? 4 : 2}px solid ${emergency ? '#fef08a' : '#ffffff'};
    box-shadow:0 14px 30px rgba(15,23,42,.35);
    font-size:${String(label).length > 1 ? 10 : 12}px;font-weight:800;
  ">${label}</div>`,
  iconSize: [selected ? 38 : emergency ? 34 : 30, selected ? 38 : emergency ? 34 : 30],
  iconAnchor: [selected ? 19 : emergency ? 17 : 15, selected ? 19 : emergency ? 17 : 15],
  popupAnchor: [0, selected ? -18 : -15]
});

const createClusterIcon = (count) => L.divIcon({
  className: '',
  html: `<div style="
    display:grid;place-items:center;width:44px;height:44px;border-radius:9999px;
    background:#0f172a;color:white;border:3px solid #38bdf8;
    box-shadow:0 14px 30px rgba(15,23,42,.35);font-size:12px;font-weight:800;
  ">${count}</div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

function NearbyMap({
  userLocation,
  services,
  selectedService,
  onSelectService,
  onMapLoad = () => {},
  onMapUnmount = () => {},
  emergencyServiceIds,
  onNotify,
  onNavigate,
  onShare
}) {
  const [zoom, setZoom] = useState(14);
  const [map, setMap] = useState(null);
  const containerRef = useRef(null);
  const center = [userLocation.latitude, userLocation.longitude];
  const markers = useMemo(() => clusterServices(services, zoom), [services, zoom]);

  const handleMapReady = useCallback((instance) => {
    setMap(instance);
    onMapLoad(instance);
  }, [onMapLoad]);

  useEffect(() => () => onMapUnmount(), [onMapUnmount]);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-slate-950">
      <MapContainer
        center={center}
        zoom={14}
        minZoom={3}
        maxZoom={19}
        scrollWheelZoom
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
        <MapLifecycle onReady={handleMapReady} onZoomChange={setZoom} />
        <ViewportPersistence userLocation={userLocation} />
        <SelectedServiceFocus service={selectedService} />
        <CircleMarker center={center} radius={18} pathOptions={{ color: '#38bdf8', fillColor: '#2563eb', fillOpacity: 0.9, weight: 4 }}>
          <Tooltip direction="top" offset={[0, -18]}>Your current location</Tooltip>
        </CircleMarker>
        <UserPulse center={center} />

        {markers.map((marker) => {
          if (marker.type === 'cluster') {
            return (
              <Marker
                key={marker.id}
                position={[marker.latitude, marker.longitude]}
                icon={createClusterIcon(marker.count)}
                eventHandlers={{
                  click: () => {
                    map?.setView([marker.latitude, marker.longitude], Math.min(18, zoom + 2), { animate: true });
                  }
                }}
              />
            );
          }

          const service = marker.service;
          const selected = selectedService?.placeId === service.placeId;
          const emergency = emergencyServiceIds?.has(service.placeId);
          return (
            <Marker
              key={service.id}
              position={[service.latitude, service.longitude]}
              icon={createMarkerIcon({ color: service.color, label: service.markerLabel, selected, emergency })}
              eventHandlers={{ click: () => onSelectService(service) }}
              zIndexOffset={selected ? 1000 : emergency ? 500 : 0}
            >
              <Popup>
                <div className="max-w-[240px] p-1 text-slate-900">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: service.color }} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{service.categoryLabel}</p>
                  </div>
                  <h3 className="text-base font-bold leading-snug">{service.name}</h3>
                  <p className="mt-1 text-sm font-medium text-blue-700">{service.distanceLabel}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.address}</p>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <button type="button" onClick={() => onNavigate(service)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-xs font-semibold text-white"><Navigation className="h-3.5 w-3.5" /> Navigate</button>
                    <button type="button" onClick={() => onShare(service)} className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-700 px-2 py-2 text-xs font-semibold text-white"><Share2 className="h-3.5 w-3.5" /> Share</button>
                    <a href={service.googleMapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-700 px-2 py-2 text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <LeafletControls
        map={map}
        userLocation={userLocation}
        containerRef={containerRef}
        onError={(message) => onNotify?.(message, 'error')}
      />
    </div>
  );
}

function MapLifecycle({ onReady, onZoomChange }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  useMapEvents({
    zoomend() { onZoomChange(map.getZoom()); },
    moveend() {
      const center = map.getCenter();
      writeLocalState(STORAGE_KEYS.mapPosition, {
        center: { lat: center.lat, lng: center.lng },
        zoom: map.getZoom(),
        timestamp: Date.now()
      });
    }
  });
  return null;
}

function ViewportPersistence({ userLocation }) {
  const map = useMap();
  useEffect(() => {
    const savedViewport = readLocalState(STORAGE_KEYS.mapPosition, null);
    if (Number.isFinite(savedViewport?.center?.lat) && Number.isFinite(savedViewport?.center?.lng)) {
      map.setView([savedViewport.center.lat, savedViewport.center.lng], savedViewport.zoom || 14);
      return;
    }
    map.setView([userLocation.latitude, userLocation.longitude], 14);
  }, [map, userLocation.latitude, userLocation.longitude]);
  return null;
}

function SelectedServiceFocus({ service }) {
  const map = useMap();
  useEffect(() => {
    if (!service) return;
    map.setView([service.latitude, service.longitude], Math.max(map.getZoom(), 16), { animate: true });
  }, [map, service]);
  return null;
}

function UserPulse({ center }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] hidden -translate-x-1/2 -translate-y-1/2 md:block">
      <span className="absolute -inset-5 animate-ping rounded-full bg-blue-400/20" />
    </div>
  );
}

function LeafletControls({ map, userLocation, containerRef, onError }) {
  const locate = () => map?.setView([userLocation.latitude, userLocation.longitude], 16, { animate: true });
  const zoom = (amount) => {
    if (!map) return;
    map.setZoom(Math.min(19, Math.max(3, map.getZoom() + amount)));
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {
      onError?.('Fullscreen is unavailable in this browser.');
    }
  };
  return (
    <div className="absolute right-3 top-3 z-[800] flex flex-col gap-2" aria-label="Map controls">
      <button type="button" aria-label="Locate me" onClick={locate} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-white shadow-xl backdrop-blur-xl transition hover:bg-slate-800"><LocateFixed className="h-5 w-5" /></button>
      <button type="button" aria-label="Zoom in" onClick={() => zoom(1)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-lg font-bold text-white shadow-xl backdrop-blur-xl transition hover:bg-slate-800">+</button>
      <button type="button" aria-label="Zoom out" onClick={() => zoom(-1)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-lg font-bold text-white shadow-xl backdrop-blur-xl transition hover:bg-slate-800">−</button>
      <button type="button" aria-label="Toggle fullscreen" onClick={toggleFullscreen} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-xs font-bold text-white shadow-xl backdrop-blur-xl transition hover:bg-slate-800">⛶</button>
    </div>
  );
}

export default NearbyMap;
