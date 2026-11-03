import { useSyncExternalStore } from 'react';

const status = {};
const subs = new Set();
const emit = () => subs.forEach((f) => f());
let snap = {};
export const useApiStatus = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => snap);

async function tracked(name, url, opts) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    status[name] = { ok: true, ms: Math.round(performance.now() - t0), at: Date.now(), url: url.split('?')[0] };
    snap = { ...status }; emit();
    return json;
  } catch (e) {
    status[name] = { ok: false, error: e.message, at: Date.now(), url: url.split('?')[0] };
    snap = { ...status }; emit();
    throw e;
  }
}

export const FAIRBANKS = { lat: 64.8378, lon: -147.7164 };

export async function fetchWeather(locs) {
  const q = new URLSearchParams({
    latitude: locs.map((l) => l.lat).join(','),
    longitude: locs.map((l) => l.lon).join(','),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',
    hourly: 'temperature_2m',
    daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,sunrise,sunset,daylight_duration,weather_code,snowfall_sum,wind_speed_10m_max',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
    timezone: 'America/Anchorage', past_days: '45', forecast_days: '14',
  });
  const j = await tracked('Open-Meteo Forecast', `https://api.open-meteo.com/v1/forecast?${q}`);
  return Array.isArray(j) ? j : [j];
}

export async function fetchAir(locs) {
  const q = new URLSearchParams({
    latitude: locs.map((l) => l.lat).join(','), longitude: locs.map((l) => l.lon).join(','),
    current: 'pm2_5,pm10,us_aqi', hourly: 'pm2_5,us_aqi', timezone: 'America/Anchorage', past_days: '2', forecast_days: '4',
  });
  const j = await tracked('Open-Meteo Air Quality', `https://air-quality-api.open-meteo.com/v1/air-quality?${q}`);
  return Array.isArray(j) ? j : [j];
}

export async function fetchNwsAlerts(lat, lon) {
  const j = await tracked('NWS Alerts', `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: { Accept: 'application/geo+json' } });
  return j.features.map((f) => f.properties);
}

export async function fetchNwsForecast(lat, lon) {
  const p = await tracked('NWS Points', `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
  const f = await tracked('NWS Forecast', p.properties.forecast);
  return { office: p.properties.gridId, city: p.properties.relativeLocation?.properties?.city, periods: f.properties.periods };
}

export async function fetchKp() {
  const rows = await tracked('NOAA SWPC Kp', 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
  return rows.slice(-24).map((r) => ({ t: r.time_tag.slice(0, 16), kp: Number(r.Kp) }));
}

export async function githubRateLimit(token) {
  return tracked('GitHub API', 'https://api.github.com/rate_limit', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

const GH = (token) => ({ Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' });
export async function gistSave(token, gistId, content) {
  const body = JSON.stringify({ description: 'ArcticFlow backup', public: false, files: { 'arcticflow-backup.json': { content } } });
  if (gistId) return tracked('GitHub Gist', `https://api.github.com/gists/${gistId}`, { method: 'PATCH', headers: GH(token), body });
  return tracked('GitHub Gist', 'https://api.github.com/gists', { method: 'POST', headers: GH(token), body });
}
export async function gistLoad(token, gistId) {
  const j = await tracked('GitHub Gist', `https://api.github.com/gists/${gistId}`, { headers: GH(token) });
  const f = j.files['arcticflow-backup.json'];
  return f.truncated ? (await fetch(f.raw_url)).text() : f.content;
}
export async function githubRepo(repo) {
  return tracked('GitHub Repo', `https://api.github.com/repos/${repo}`);
}
