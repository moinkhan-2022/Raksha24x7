export const GOOGLE_MAP_LOADER_ID = 'raksha24x7-google-maps-script';

// Keep this array stable and shared by every map page. Google Maps rejects
// attempts to reload the same script with different library options.
export const GOOGLE_MAP_LIBRARIES = ['places'];

export const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#13251f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b8e7b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#020617' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#172033' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071a2d' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] }
];

export const DARK_MAP_OPTIONS = {
  styles: DARK_MAP_STYLES,
  disableDefaultUI: false,
  mapTypeControl: false,
  streetViewControl: false,
  rotateControl: false,
  scaleControl: true,
  zoomControl: true,
  fullscreenControl: true,
  clickableIcons: false,
  backgroundColor: '#020617'
};
