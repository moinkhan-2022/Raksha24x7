import { Cloud, CloudFog, CloudLightning, CloudRain, Snowflake, Sun, Wind } from 'lucide-react';
import { memo } from 'react';

const weatherIcon = (code) => {
  if (code === 0) return Sun;
  if ([45, 48].includes(code)) return CloudFog;
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
  if ([95, 96, 99].includes(code)) return CloudLightning;
  return Cloud;
};

function WeatherWidget({ weather, loading }) {
  if (loading) return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  if (!weather) return <WidgetShell><p className="text-sm text-slate-400">Weather unavailable</p></WidgetShell>;
  const Icon = weatherIcon(weather.weatherCode);
  return (
    <WidgetShell>
      <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-wider text-blue-300">Local Weather</p><p className="mt-1 text-2xl font-bold">{Math.round(weather.temperature)}°C</p></div><Icon className="h-9 w-9 text-amber-300" /></div>
      <p className="mt-2 text-sm text-slate-300">{weather.condition}</p>
      <div className="mt-2 flex gap-4 text-xs text-slate-400"><span>Humidity {Math.round(weather.humidity)}%</span><span className="flex items-center gap-1"><Wind className="h-3 w-3" />{Math.round(weather.windSpeed)} km/h</span></div>
      <p className="mt-2 text-[9px] text-slate-600">Weather data: Open-Meteo</p>
    </WidgetShell>
  );
}

function WidgetShell({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur-xl">{children}</div>;
}

export default memo(WeatherWidget);
