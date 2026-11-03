export const pad = (n) => String(n).padStart(2, '0');
export function nowAK() {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Anchorage', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  return f.format(new Date()).replace(' ', 'T');
}
export const akMs = (s) => Date.parse(s.slice(0, 16) + ':00Z');
export const msToAK = (ms) => new Date(ms).toISOString().slice(0, 16);
export const fmtDate = (s, o = { month: 'short', day: 'numeric' }) => new Date(akMs(s)).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });
export const fmtDT = (s) => new Date(akMs(s)).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
export const fmtTime = (s) => new Date(akMs(s)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
export const dow = (s) => new Date(akMs(s + 'T12:00')).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
export const uid = () => Math.random().toString(36).slice(2, 10);
export const r0 = (n) => Math.round(n);
export const r1 = (n) => Math.round(n * 10) / 10;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const money = (n) => '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const windChill = (t, mph) => (t <= 50 && mph > 3 ? 35.74 + 0.6215 * t - 35.75 * Math.pow(mph, 0.16) + 0.4275 * t * Math.pow(mph, 0.16) : t);
export function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const WMO = {
  0: ['Clear', '☀'], 1: ['Mostly clear', '🌤'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁'], 45: ['Ice fog', '🌫'], 48: ['Rime fog', '🌫'],
  51: ['Light drizzle', '🌦'], 53: ['Drizzle', '🌦'], 55: ['Heavy drizzle', '🌧'], 56: ['Freezing drizzle', '🌧'], 57: ['Freezing drizzle', '🌧'],
  61: ['Light rain', '🌧'], 63: ['Rain', '🌧'], 65: ['Heavy rain', '🌧'], 66: ['Freezing rain', '🌧'], 67: ['Freezing rain', '🌧'],
  71: ['Light snow', '🌨'], 73: ['Snow', '❄'], 75: ['Heavy snow', '❄'], 77: ['Snow grains', '❄'], 80: ['Showers', '🌦'], 81: ['Showers', '🌧'], 82: ['Heavy showers', '🌧'],
  85: ['Snow showers', '🌨'], 86: ['Heavy snow showers', '❄'], 95: ['Thunderstorm', '⛈'], 96: ['Thunderstorm', '⛈'], 99: ['Thunderstorm', '⛈'],
};
