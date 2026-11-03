import { akMs, msToAK, clamp } from './util';

export function prepWx(raw) {
  return { raw, tms: raw.hourly.time.map(akMs), temps: raw.hourly.temperature_2m, daily: raw.daily, current: raw.current, nowMs: akMs(raw.current.time) };
}

export function hddBetween(w, a, b) {
  if (!w) return 0;
  let s = 0;
  for (let i = 0; i < w.tms.length; i++) {
    if (w.tms[i] >= a && w.tms[i] < b && w.temps[i] != null) s += Math.max(0, 65 - w.temps[i]) / 24;
  }
  return s;
}

export function buildLevels(prop, entries, w) {
  const es = entries.filter((e) => e.propId === prop.id).sort((a, b) => (a.t < b.t ? -1 : 1));
  const out = [];
  let prev = null;
  for (const e of es) {
    let gal, explicit = true;
    if (e.gauge !== null && e.gauge !== undefined && e.gauge !== '') gal = (e.gauge / 100) * prop.cap;
    else {
      const before = prev ? Math.max(0, prev.gal - hddBetween(w, akMs(prev.t), akMs(e.t)) / prop.k) : 0;
      gal = Math.min(prop.cap, before + (+e.gallons || 0));
      explicit = false;
    }
    prev = { ...e, gal, pct: (gal / prop.cap) * 100, explicit };
    out.push(prev);
  }
  return out;
}

export function learnK(prop, lv, w) {
  let H = 0, G = 0, n = 0;
  for (let i = 1; i < lv.length; i++) {
    const a = lv[i - 1], b = lv[i];
    if (b.kind !== 'reading' || !a.explicit) continue;
    const h = hddBetween(w, akMs(a.t), akMs(b.t));
    const drop = a.gal - b.gal;
    if (h >= 15 && drop >= 2) { H += h; G += drop; n++; }
  }
  if (G >= 8) return { k: clamp(H / G, 1.5, 12), learned: true, samples: n };
  return { k: prop.k, learned: false, samples: n };
}

export function propState(prop, entries, w, settings, nowMs) {
  if (!prop.cap) return { noFuel: true, status: 'na' };
  const lv = buildLevels(prop, entries, w);
  if (!lv.length) return { empty: true, status: 'unknown', lv, level: 0, pct: 0 };
  const { k, learned, samples } = learnK(prop, lv, w);
  const last = lv[lv.length - 1];
  const est = Math.max(0, last.gal - hddBetween(w, akMs(last.t), nowMs) / k);
  const day = 86400000;
  const burn3 = hddBetween(w, nowMs - 3 * day, nowMs) / 3 / k;
  const burn7 = hddBetween(w, nowMs - 7 * day, nowMs) / 7 / k;
  const burnPrev = hddBetween(w, nowMs - 14 * day, nowMs - 7 * day) / 7 / k;
  const trend = burnPrev > 0 ? (burn7 / burnPrev - 1) * 100 : 0;
  const proj = [];
  let daysLeft = null;
  for (let d = 0; d <= 14; d++) {
    const lvl = est - hddBetween(w, nowMs, nowMs + d * day) / k;
    proj.push({ d, t: msToAK(nowMs + d * day), gal: Math.max(0, lvl) });
    if (daysLeft === null && lvl <= 0 && d > 0) {
      const p = est - hddBetween(w, nowMs, nowMs + (d - 1) * day) / k;
      daysLeft = d - 1 + p / Math.max(0.01, p - lvl);
    }
  }
  if (daysLeft === null) {
    const rem = est - hddBetween(w, nowMs, nowMs + 14 * day) / k;
    const tail = Math.max(0.5, hddBetween(w, nowMs + 11 * day, nowMs + 14 * day) / 3 / k);
    daysLeft = 14 + rem / tail;
  }
  const pct = (est / prop.cap) * 100;
  const status = pct < 20 || daysLeft < 4 ? 'critical' : pct < settings.lowFuelPct || daysLeft < 8 ? 'attention' : 'ready';
  const runout = nowMs + daysLeft * day;
  return { lv, k, kLearned: learned, kSamples: samples, level: est, pct, burn3, burn7, burn: burn3 || burn7, trend, proj, daysLeft, runout, orderBy: runout - settings.leadDays * day, status, last };
}

export function fuelFacts(prop, entries) {
  const fills = entries.filter((e) => e.propId === prop.id && e.kind === 'fill').sort((a, b) => (a.t < b.t ? -1 : 1));
  const gal = fills.reduce((s, f) => s + (+f.gallons || 0), 0);
  const spend = fills.reduce((s, f) => s + (+f.gallons || 0) * (+f.price || 0), 0);
  return { fills, gal, spend, avgPrice: gal ? spend / gal : 0, lastPrice: fills.length ? +fills[fills.length - 1].price || 0 : 0 };
}

export function coolHours(tin, tout, ratePer80) {
  const k = ratePer80 / 80;
  if (tout >= 32 || tin <= 32) return Infinity;
  return Math.log((tin - tout) / (32 - tout)) / k;
}

export function pmCategory(pm) {
  if (pm == null) return { label: '—', color: '#64748b', idx: 0 };
  if (pm <= 9) return { label: 'GOOD', color: '#22c55e', idx: 0 };
  if (pm <= 35.4) return { label: pm > 25 ? 'POOR' : 'MODERATE', color: pm > 25 ? '#f59e0b' : '#eab308', idx: 1 };
  if (pm <= 55.4) return { label: 'UNHEALTHY (SENS.)', color: '#f97316', idx: 2 };
  if (pm <= 125.4) return { label: 'UNHEALTHY', color: '#ef4444', idx: 3 };
  return { label: 'HAZARDOUS', color: '#a21caf', idx: 4 };
}

export function airStage(air, settings) {
  if (!air) return { stage: 0, peak: null, avg24: null };
  const h = air.hourly, now = akMs(air.current.time);
  let sum = 0, n = 0, peak = 0;
  h.time.forEach((t, i) => {
    const ms = akMs(t);
    if (ms >= now && ms < now + 86400000 && h.pm2_5[i] != null) { sum += h.pm2_5[i]; n++; peak = Math.max(peak, h.pm2_5[i]); }
  });
  const avg24 = n ? sum / n : air.current.pm2_5;
  const stage = avg24 >= settings.stage2 ? 2 : avg24 >= settings.stage1 ? 1 : 0;
  return { stage, avg24, peak };
}

export function dayWx(w, i) {
  const d = w.daily;
  return { date: d.time[i], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], mean: d.temperature_2m_mean[i], code: d.weather_code[i], snow: d.snowfall_sum[i], wind: d.wind_speed_10m_max[i], sunrise: d.sunrise[i], sunset: d.sunset[i], daylight: d.daylight_duration[i] };
}

export function tonightLow(w) {
  if (!w) return null;
  const a = w.nowMs, b = a + 14 * 3600000;
  let m = Infinity;
  w.tms.forEach((t, i) => { if (t >= a && t < b && w.temps[i] < m) m = w.temps[i]; });
  return Number.isFinite(m) ? m : null;
}

export function minTemp(w, hours) {
  let m = Infinity;
  w.tms.forEach((t, i) => { if (t >= w.nowMs && t < w.nowMs + hours * 3600000 && w.temps[i] < m) m = w.temps[i]; });
  return m;
}

export function todayIdx(w) {
  const d = w.current.time.slice(0, 10);
  const i = w.daily.time.indexOf(d);
  return i < 0 ? 0 : i;
}

export function freezeRisk(prop, st, w) {
  if (!w) return { level: 'unknown', hours: null, low: null };
  const low = tonightLow(w);
  const hours = coolHours(prop.indoor, low, prop.cooldown);
  const level = st.status === 'critical' || hours < 8 ? 'high' : st.status === 'attention' || hours < 16 ? 'elevated' : 'low';
  return { level, hours, low };
}
