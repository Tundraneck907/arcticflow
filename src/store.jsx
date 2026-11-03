import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react';
import { fetchWeather, fetchAir, fetchNwsAlerts, fetchNwsForecast, fetchKp, FAIRBANKS } from './lib/api';
import { prepWx, propState, airStage, tonightLow, minTemp } from './lib/model';
import { SEED_PROPS, SEED_VEHICLES, seedTasks, seedLogs, syntheticWx } from './lib/seed';
import { nowAK, akMs, uid, fmtDate } from './lib/util';

const KEY = 'arcticflow.v1';
const DEFAULT_SETTINGS = { theme: 'dark', lowFuelPct: 40, leadDays: 3, stage1: 30, stage2: 35, notify: false, ntfy: '', ghToken: '', gistId: '', homeId: 'p1' };

function initial() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.props) return { ...s, settings: { ...DEFAULT_SETTINGS, ...s.settings } };
  } catch {}
  return { props: SEED_PROPS.map(({ target, ...p }) => ({ ...p, target })), vehicles: SEED_VEHICLES, entries: [], tasks: seedTasks(), settings: DEFAULT_SETTINGS, dismissed: [], outage: {}, seeded: false, demoBanner: true };
}

function reducer(s, a) {
  switch (a.type) {
    case 'seed': return { ...s, entries: a.entries, seeded: true };
    case 'addEntry': return { ...s, entries: [...s.entries, { id: uid(), ...a.entry }] };
    case 'delEntry': return { ...s, entries: s.entries.filter((e) => e.id !== a.id) };
    case 'addProp': return { ...s, props: [...s.props, { id: uid(), cooldown: 2.8, indoor: 66, genGal: 0, genGph: 0.68, notes: '', k: 4.5, ...a.prop }] };
    case 'updProp': return { ...s, props: s.props.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };
    case 'delProp': return { ...s, props: s.props.filter((p) => p.id !== a.id), entries: s.entries.filter((e) => e.propId !== a.id) };
    case 'toggleTask': return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, done: !t.done } : t)) };
    case 'addTask': return { ...s, tasks: [...s.tasks, { id: uid(), done: false, ...a.task }] };
    case 'delTask': return { ...s, tasks: s.tasks.filter((t) => t.id !== a.id) };
    case 'updVehicle': return { ...s, vehicles: s.vehicles.map((v) => (v.id === a.id ? { ...v, ...a.patch } : v)) };
    case 'addVehicle': return { ...s, vehicles: [...s.vehicles, { id: uid(), plugged: false, threshold: 5, kind: 'car', img: null, notes: '', ...a.vehicle }] };
    case 'delVehicle': return { ...s, vehicles: s.vehicles.filter((v) => v.id !== a.id) };
    case 'settings': return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'dismiss': return { ...s, dismissed: [...s.dismissed, a.id] };
    case 'undismiss': return { ...s, dismissed: [] };
    case 'outage': return { ...s, outage: { ...s.outage, [a.id]: a.on } };
    case 'hideBanner': return { ...s, demoBanner: false };
    case 'clearDemo': return { ...s, entries: s.entries.filter((e) => !String(e.note || '').startsWith('Demo')), demoBanner: false };
    case 'fresh': return { props: [], vehicles: [], entries: [], tasks: [], settings: s.settings, dismissed: [], outage: {}, seeded: true, demoBanner: false };
    case 'reset': return { props: SEED_PROPS, vehicles: SEED_VEHICLES, entries: [], tasks: seedTasks(), settings: s.settings, dismissed: [], outage: {}, seeded: false, demoBanner: true };
    case 'import': return { ...s, ...a.data, settings: { ...DEFAULT_SETTINGS, ...a.data.settings, ghToken: s.settings.ghToken, gistId: a.data.settings?.gistId || s.settings.gistId } };
    default: return s;
  }
}

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, initial);
  const [live, setLive] = useState({ loading: true, wx: null, fbx: null, air: null, alerts: [], nwsFc: null, kp: null, errors: {}, updated: null });
  const [clock, setClock] = useState(nowAK());
  useEffect(() => { const i = setInterval(() => setClock(nowAK()), 30000); return () => clearInterval(i); }, []);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { document.documentElement.dataset.theme = state.settings.theme; }, [state.settings.theme]);

  const locKey = state.props.map((p) => `${p.lat},${p.lon}`).join('|');
  const propsRef = useRef(state.props);
  propsRef.current = state.props;

  const refresh = useCallback(async () => {
    const props = propsRef.current;
    const locs = [...props.map((p) => ({ lat: p.lat, lon: p.lon })), FAIRBANKS];
    const errors = {};
    const guard = (k, p) => p.catch((e) => { errors[k] = e.message; return null; });
    setLive((l) => ({ ...l, loading: true }));
    const [wxRaw, air, kp, fc] = await Promise.all([
      guard('weather', fetchWeather(locs)),
      guard('air', fetchAir([FAIRBANKS, { lat: 64.7512, lon: -147.3494 }])),
      guard('kp', fetchKp()),
      guard('nws', fetchNwsForecast(FAIRBANKS.lat, FAIRBANKS.lon)),
    ]);
    const seen = new Map();
    const alertLocs = props.length ? props : [{ lat: FAIRBANKS.lat, lon: FAIRBANKS.lon }];
    await Promise.all(alertLocs.map((p) => guard('alerts', fetchNwsAlerts(p.lat, p.lon)).then((r) => (r || []).forEach((a) => seen.set(a.id, a)))));
    const all = wxRaw ? wxRaw.map(prepWx) : null;
    setLive({ loading: false, wx: all ? all.slice(0, props.length) : null, fbx: all ? all[all.length - 1] : null, air, alerts: [...seen.values()], nwsFc: fc, kp, errors, updated: Date.now() });
  }, []);

  useEffect(() => { refresh(); }, [locKey, refresh]);
  useEffect(() => { const i = setInterval(refresh, 10 * 60 * 1000); return () => clearInterval(i); }, [refresh]);

  const nowMs = live.fbx ? live.fbx.nowMs : akMs(clock);

  useEffect(() => {
    if (state.seeded || live.loading) return;
    const list = live.wx && live.wx.length ? live.wx : state.props.map(() => syntheticWx(nowMs));
    dispatch({ type: 'seed', entries: seedLogs(state.props, list, nowMs) });
  }, [live.loading, live.wx, state.seeded]); // eslint-disable-line

  const states = useMemo(() => {
    const m = {};
    state.props.forEach((p, i) => { m[p.id] = propState(p, state.entries, live.wx ? live.wx[i] : null, state.settings, nowMs); });
    return m;
  }, [state.props, state.entries, state.settings, live.wx, nowMs]);

  const airInfo = useMemo(() => (live.air ? airStage(live.air[0], state.settings) : null), [live.air, state.settings]);

  const alerts = useMemo(() => {
    const out = [];
    state.props.forEach((p, i) => {
      const s = states[p.id];
      if (!s || !p.cap || s.empty) return;
      if (s.pct < state.settings.lowFuelPct) out.push({ id: `fuel-${p.id}-${Math.floor(s.pct / 5)}`, sev: s.status === 'critical' ? 'critical' : 'warn', icon: 'fuel', title: `Low fuel — ${p.name}`, text: `${Math.round(s.pct)}% (${Math.round(s.level)} gal), about ${s.daysLeft.toFixed(1)} days left. Order by ${fmtDate(new Date(s.orderBy).toISOString())}.` });
      const w = live.wx && live.wx[i];
      if (w) { const m = minTemp(w, 72); if (m <= -30) out.push({ id: `cold-${p.id}-${new Date(nowMs).getUTCDate()}`, sev: 'warn', icon: 'snow', title: `Deep cold — ${p.name}`, text: `Forecast low ${Math.round(m)}°F within 72 hours. Check heat, pipes and block heaters.` }); }
    });
    state.vehicles.forEach((v) => {
      const w = live.wx && live.wx[Math.max(0, state.props.findIndex((p) => p.id === state.settings.homeId))];
      const low = w ? tonightLow(w) : live.fbx ? tonightLow(live.fbx) : null;
      if (low !== null && low <= v.threshold && !v.plugged) out.push({ id: `plug-${v.id}-${new Date(nowMs).getUTCDate()}`, sev: 'info', icon: 'plug', title: `Plug in — ${v.name}`, text: `Low tonight ${Math.round(low)}°F, below your ${v.threshold}°F threshold.` });
    });
    if (airInfo && airInfo.stage > 0) out.push({ id: `air-${airInfo.stage}-${new Date(nowMs).getUTCDate()}`, sev: 'warn', icon: 'air', title: `Air quality: estimated Stage ${airInfo.stage}`, text: `Forecast 24h PM2.5 average ${airInfo.avg24.toFixed(0)} µg/m³. Check the official DEC / borough notice before burning wood.` });
    live.alerts.forEach((a) => out.push({ id: `nws-${a.id}`, sev: /warning/i.test(a.event) ? 'critical' : 'warn', icon: 'nws', title: a.event, text: a.headline || a.description?.slice(0, 160), nws: true }));
    const od = state.tasks.filter((t) => !t.done && t.due < new Date(nowMs).toISOString().slice(0, 10)).length;
    if (od) out.push({ id: `prep-${od}`, sev: 'info', icon: 'check', title: `${od} overdue winter-prep task${od > 1 ? 's' : ''}`, text: 'Open the Winter Prep checklist to catch up.' });
    return out;
  }, [state.props, state.vehicles, state.tasks, state.settings, states, live.wx, live.fbx, live.alerts, airInfo, nowMs]);

  const active = alerts.filter((a) => !state.dismissed.includes(a.id));

  const notified = useRef(new Set(JSON.parse(localStorage.getItem('arcticflow.sent') || '[]')));
  useEffect(() => {
    const topic = state.settings.ntfy;
    const browser = state.settings.notify && 'Notification' in window && Notification.permission === 'granted';
    active.forEach((a) => {
      if (browser && !notified.current.has(`b:${a.id}`)) { notified.current.add(`b:${a.id}`); new Notification(`ArcticFlow: ${a.title}`, { body: a.text }); }
      if (topic && !notified.current.has(`n:${topic}:${a.id}`)) {
        notified.current.add(`n:${topic}:${a.id}`);
        fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: 'POST', headers: { Title: `ArcticFlow: ${a.title}`.replace(/[^\x20-\x7e]+/g, '-'), Priority: a.sev === 'critical' ? 'high' : 'default', Tags: 'snowflake' }, body: a.text }).catch(() => {});
      }
    });
    localStorage.setItem('arcticflow.sent', JSON.stringify([...notified.current].slice(-300)));
  }, [active, state.settings.notify, state.settings.ntfy]);

  const value = { state, dispatch, live, refresh, states, airInfo, alerts, active, nowMs, clock };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
