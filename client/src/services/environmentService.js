const CACHE_DURATION_MS = 10 * 60 * 1000;
const cache = new Map();
const STORAGE_KEY = 'raksha_nearby_environment';

const cacheKey = (latitude, longitude) => `${Number(latitude).toFixed(2)},${Number(longitude).toFixed(2)}`;

const fetchJson = async (url, signal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Environmental service returned ${response.status}`);
  return response.json();
};

export const weatherCondition = (code) => {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Unknown conditions';
};

export const airQualityStatus = (aqi) => {
  if (!Number.isFinite(aqi)) return 'Unavailable';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  return 'Poor';
};

export const getEnvironmentData = async (latitude, longitude, { signal, force = false } = {}) => {
  const key = cacheKey(latitude, longitude);
  let cached = cache.get(key);
  if (!cached && typeof window !== 'undefined') {
    try { cached = JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}:${key}`)); } catch { cached = null; }
    if (cached) cache.set(key, cached);
  }
  if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) return cached.data;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=sunrise,sunset,uv_index_max,precipitation_probability_max&forecast_days=1&timezone=auto`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi&timezone=auto`;
  const [weatherResult, airResult] = await Promise.allSettled([
    fetchJson(weatherUrl, signal),
    fetchJson(airUrl, signal)
  ]);

  if (weatherResult.status === 'rejected' && airResult.status === 'rejected') {
    throw new Error('Weather and air-quality services are unavailable. Check your internet connection.');
  }

  const weatherCurrent = weatherResult.status === 'fulfilled' ? weatherResult.value.current : null;
  const airCurrent = airResult.status === 'fulfilled' ? airResult.value.current : null;
  const data = {
    weather: weatherCurrent ? {
      temperature: weatherCurrent.temperature_2m,
      feelsLike: weatherCurrent.apparent_temperature,
      humidity: weatherCurrent.relative_humidity_2m,
      weatherCode: weatherCurrent.weather_code,
      condition: weatherCondition(weatherCurrent.weather_code),
      windSpeed: weatherCurrent.wind_speed_10m,
      rainChance: weatherResult.value.daily?.precipitation_probability_max?.[0],
      uvIndex: weatherResult.value.daily?.uv_index_max?.[0],
      sunrise: weatherResult.value.daily?.sunrise?.[0],
      sunset: weatherResult.value.daily?.sunset?.[0],
      updatedAt: Date.now()
    } : null,
    airQuality: airCurrent && Number.isFinite(airCurrent.us_aqi) ? {
      aqi: airCurrent.us_aqi,
      status: airQualityStatus(airCurrent.us_aqi),
      updatedAt: Date.now()
    } : null,
    warnings: [
      weatherResult.status === 'rejected' ? 'Weather unavailable.' : null,
      airResult.status === 'rejected' ? 'Air quality unavailable.' : null
    ].filter(Boolean)
  };
  cache.set(key, { timestamp: Date.now(), data });
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify({ timestamp: Date.now(), data })); } catch { /* cache is optional */ }
  }
  return data;
};

export default { getEnvironmentData, weatherCondition, airQualityStatus };
