import { useCallback, useRef, useState } from 'react';
import { DirectionsRenderer, GoogleMap, InfoWindowF, MarkerF, OverlayViewF, TrafficLayerF } from '@react-google-maps/api';
import { ExternalLink, LocateFixed } from 'lucide-react';
import MapControls from './MapControls';
import TrafficToggle from './TrafficToggle';
import { DARK_MAP_OPTIONS } from '../utils/googleMapConfig';

function NearbyMap({
  userLocation,
  services,
  selectedService,
  onSelectService,
  onMapLoad,
  onMapUnmount,
  directions,
  trafficEnabled,
  onTrafficToggle,
  emergencyServiceIds,
  onNotify
}) {
  const [map, setMap] = useState(null);
  const containerRef = useRef(null);
  const center = { lat: userLocation.latitude, lng: userLocation.longitude };

  const handleLoad = useCallback((instance) => {
    setMap(instance);
    onMapLoad(instance);
  }, [onMapLoad]);

  const handleUnmount = useCallback(() => {
    setMap(null);
    onMapUnmount();
  }, [onMapUnmount]);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-slate-950">
      <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={center} zoom={14} options={DARK_MAP_OPTIONS} onLoad={handleLoad} onUnmount={handleUnmount}>
        {trafficEnabled && <TrafficLayerF />}
        {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, preserveViewport: false, polylineOptions: { strokeColor: '#38bdf8', strokeOpacity: 0.9, strokeWeight: 6 } }} />}

        <OverlayViewF position={center} mapPaneName="overlayMouseTarget">
          <div className="relative -translate-x-1/2 -translate-y-1/2 transition-all duration-700" title="Your live location">
            <span className="absolute -inset-4 animate-ping rounded-full bg-blue-400/35" />
            <span className="absolute -inset-2 rounded-full bg-blue-400/20" />
            <div className="relative grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-blue-600 shadow-xl shadow-blue-500/50"><LocateFixed className="h-4 w-4 text-white" /></div>
          </div>
        </OverlayViewF>

        {services.map((service) => {
          const selected = selectedService?.placeId === service.placeId;
          const emergency = emergencyServiceIds?.has(service.placeId);
          return <MarkerF
            key={service.id}
            position={{ lat: service.latitude, lng: service.longitude }}
            title={service.name}
            onClick={() => onSelectService(service)}
            animation={selected ? window.google.maps.Animation.BOUNCE : undefined}
            zIndex={selected ? 1000 : emergency ? 500 : undefined}
            icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: service.color, fillOpacity: 1, strokeColor: emergency ? '#fef08a' : '#ffffff', strokeOpacity: 1, strokeWeight: emergency ? 4 : 2, scale: selected ? 17 : emergency ? 15 : 13 }}
            label={{ text: service.markerLabel, color: '#ffffff', fontSize: service.markerLabel.length > 1 ? '9px' : '11px', fontWeight: '700' }}
          />;
        })}

        {selectedService && (
          <>
            <OverlayViewF position={{ lat: selectedService.latitude, lng: selectedService.longitude }} mapPaneName="overlayLayer">
              <span className="block h-12 w-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-4 border-amber-300/60 bg-amber-300/15" />
            </OverlayViewF>
            <InfoWindowF position={{ lat: selectedService.latitude, lng: selectedService.longitude }} onCloseClick={() => onSelectService(null)} options={{ pixelOffset: new window.google.maps.Size(0, -24) }}>
              <div className="max-w-[240px] p-1 text-slate-900">
                <div className="mb-2 flex items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selectedService.color }} /><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedService.categoryLabel}</p></div>
                <h3 className="text-base font-bold leading-snug">{selectedService.name}</h3>
                {selectedService.rating != null && <p className="mt-1 text-sm text-amber-600">Rating {selectedService.rating.toFixed(1)}</p>}
                <p className="mt-1 text-sm font-medium text-blue-700">{selectedService.distanceLabel}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedService.address}</p>
                <a href={selectedService.googleMapsLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"><ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps</a>
              </div>
            </InfoWindowF>
          </>
        )}
      </GoogleMap>

      <MapControls map={map} userLocation={userLocation} containerRef={containerRef} onError={(message) => onNotify(message, 'error')} />
      <TrafficToggle enabled={trafficEnabled} onToggle={onTrafficToggle} />
    </div>
  );
}

export default NearbyMap;
