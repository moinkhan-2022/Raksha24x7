import { Compass, Crosshair, Expand, Layers3, Minus, Plus } from 'lucide-react';
import { memo, useState } from 'react';

const MAP_TYPES = [
  { id: 'roadmap', label: 'Road' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' }
];

function MapControls({ map, userLocation, containerRef, onError }) {
  const [mapType, setMapType] = useState('roadmap');

  const locate = () => {
    if (!map || !userLocation) return;
    map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
    map.setZoom(16);
  };

  const zoom = (amount) => {
    if (!map) return;
    map.setZoom(Math.min(21, Math.max(2, (map.getZoom() || 14) + amount)));
  };

  const resetCompass = () => {
    map?.setHeading(0);
    map?.setTilt(0);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch {
      onError?.('Fullscreen is unavailable in this browser.');
    }
  };

  const changeType = (type) => {
    setMapType(type);
    map?.setMapTypeId(type);
  };

  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2" aria-label="Map controls">
      <div className="flex flex-col gap-2">
        <ControlButton icon={Crosshair} label="Locate me" onClick={locate} />
        <ControlButton icon={Plus} label="Zoom in" onClick={() => zoom(1)} />
        <ControlButton icon={Minus} label="Zoom out" onClick={() => zoom(-1)} />
        <ControlButton icon={Compass} label="Reset compass" onClick={resetCompass} />
        <ControlButton icon={Expand} label="Toggle fullscreen" onClick={toggleFullscreen} />
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-950/90 p-2 shadow-xl backdrop-blur-xl">
        <div className="mb-1 flex items-center gap-1 px-1 text-[10px] uppercase tracking-wider text-slate-400"><Layers3 className="h-3 w-3" /> Map type</div>
        <div className="flex gap-1">
          {MAP_TYPES.map((type) => (
            <button key={type.id} type="button" onClick={() => changeType(type.id)} aria-pressed={mapType === type.id} className={`min-h-9 rounded-lg px-2 text-xs transition ${mapType === type.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{type.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ControlButton({ icon: Icon, label, onClick }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-white shadow-xl backdrop-blur-xl transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"><Icon className="h-5 w-5" /></button>;
}

export default memo(MapControls);
