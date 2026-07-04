const CACHE_DURATION_MS = 10 * 60 * 1000;
const cache = new Map();

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
  const cached = cache.get(key);
  if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) return cached.data;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
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
      humidity: weatherCurrent.relative_humidity_2m,
      weatherCode: weatherCurrent.weather_code,
      condition: weatherCondition(weatherCurrent.weather_code),
      windSpeed: weatherCurrent.wind_speed_10m
    } : null,
    airQuality: airCurrent && Number.isFinite(airCurrent.us_aqi) ? {
      aqi: airCurrent.us_aqi,
      status: airQualityStatus(airCurrent.us_aqi)
    } : null,
    warnings: [
      weatherResult.status === 'rejected' ? 'Weather unavailable.' : null,
      airResult.status === 'rejected' ? 'Air quality unavailable.' : null
    ].filter(Boolean)
  };
  cache.set(key, { timestamp: Date.now(), data });
  return data;
};

export default { getEnvironmentData, weatherCondition, airQualityStatus };
