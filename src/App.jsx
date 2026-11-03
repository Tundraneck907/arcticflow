import React, { useEffect, useState } from 'react';
import { Provider, useApp } from './store';
import { Icon } from './components/ui';
import IMG from './lib/images';
import { WMO, fmtDate, fmtTime } from './lib/util';
import Dashboard from './views/Dashboard';
import Properties, { PropertyDetail, AddProperty } from './views/Properties';
import Fuel, { LogForm } from './views/Fuel';
import Weather from './views/Weather';
import Outage from './views/Outage';
import Air from './views/Air';
import Vehicles from './views/Vehicles';
import Prep from './views/Prep';
import History from './views/History';
import Calculator from './views/Calculator';
import Alerts from './views/Alerts';
import Settings from './views/Settings';

const TABS = [
  ['dashboard', 'Dashboard', 'dash'], ['properties', 'Properties', 'props'], ['fuel', 'Fuel', 'fuel'], ['weather', 'Weather', 'weather'], ['outage', 'Outage', 'outage'],
  ['air', 'Air & Burn', 'air'], ['vehicles', 'Vehicle', 'vehicle'], ['prep', 'Winter Prep', 'prep'], ['history', 'History', 'history'], ['calc', 'Calculator', 'calc'], ['alerts', 'Alerts', 'alerts'], ['settings', 'Settings', 'settings'],
];

function Logo() {
  return (
    <svg width="54" height="46" viewBox="0 0 54 46" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe9ff" /><stop offset="1" stopColor="#2f9bff" /></linearGradient></defs>
      <path d="M2 42L20 8l8 12 6-8 18 30z" fill="url(#lg)" opacity=".92" /><path d="M20 8l-6 11 5-3 3 4 4-5z" fill="#fff" opacity=".9" />
      <path d="M2 42h50" stroke="#38bdf8" strokeWidth="2" />
    </svg>
  );
}

function Shell() {
  const { state, live, active, nowMs, refresh, dispatch } = useApp();
  const [tab, setTab] = useState(() => location.hash.slice(1) || 'dashboard');
  const [ctx, setCtx] = useState({});
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [logging, setLogging] = useState(null);

  useEffect(() => { location.hash = tab; window.scrollTo({ top: 0 }); }, [tab]);
  useEffect(() => { const h = () => setTab(location.hash.slice(1) || 'dashboard'); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);

  const nav = { go: (t, c = {}) => { setCtx(c); setTab(t); }, open: (id) => setDetail(id), add: () => setAdding(true), log: (propId, kind) => setLogging({ propId, kind }), ctx };

  const home = state.props.find((p) => p.id === state.settings.homeId) || state.props[0];
  const hi = Math.max(0, state.props.indexOf(home));
  const w = (live.wx && live.wx[hi]) || live.fbx;
  const cur = w && w.current;
  const wmo = cur ? WMO[cur.weather_code] || ['—', '·'] : ['—', ''];
  const View = { dashboard: Dashboard, properties: Properties, fuel: Fuel, weather: Weather, outage: Outage, air: Air, vehicles: Vehicles, prep: Prep, history: History, calc: Calculator, alerts: Alerts, settings: Settings }[tab] || Dashboard;
  const bad = Object.keys(live.errors).length > 0;

  return (
    <div className="app">
      <div className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${IMG.hero})` }} />
        <div className="hero-in">
          <div className="logo" onClick={() => nav.go('dashboard')} role="link" tabIndex={0} aria-label="ArcticFlow home">
            <Logo />
            <div><b>ARCTIC<em>FLOW</em></b><small>ALASKA WINTER INTELLIGENCE</small><small style={{ marginTop: 2 }}>PREPARE · PROTECT · SURVIVE</small></div>
          </div>
          <div className="hero-wx">
            <div className="clock">
              <div>{fmtDate(new Date(nowMs).toISOString(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
              <div style={{ fontSize: 16, color: 'var(--tx)', fontWeight: 600 }}>{fmtTime(new Date(nowMs).toISOString())} AKST</div>
              <button className={`live-dot ${bad ? 'bad' : ''}`} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }} onClick={refresh} title="Refresh live data">
                <i /> {live.loading ? 'Updating…' : bad ? 'Some feeds offline' : 'Live'} · refresh
              </button>
            </div>
            <div className="ico">{wmo[1]}</div>
            <div>
              <div className="loc"><Icon n="pin" size={13} /> {home ? home.place : 'Fairbanks, AK'}</div>
              <div className="t">{cur ? `${Math.round(cur.temperature_2m)}°F` : '—'}</div>
              <div className="loc">{cur ? `Feels like ${Math.round(cur.apparent_temperature)}°F · ${wmo[0]}` : live.loading ? 'Loading…' : 'Weather unavailable'}</div>
            </div>
          </div>
        </div>
      </div>

      <nav className="tabs" aria-label="Sections">
        {TABS.map(([id, label, ic]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => nav.go(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon n={ic} size={20} />{label}
            {id === 'alerts' && active.length > 0 && <span className="badge">{active.length}</span>}
          </button>
        ))}
      </nav>

      <main><View nav={nav} /></main>

      <div className="tagline">BECAUSE ALASKA DOESN'T TAKE <b>DAYS OFF</b></div>
      <div className="footer">
        {[['shield', 'Data Local & Private', 'Stored in this browser only'], ['refresh', 'Live Data Sources', 'Open-Meteo · NWS · NOAA SWPC'], ['github', 'Open Source Stack', 'Free APIs · GitHub backup'], ['alerts', 'Smart Alerts', 'Low fuel · cold · plug-in · air']].map(([i, a, b]) => (
          <div className="card" key={a}><Icon n={i} size={26} /><div><b>{a}</b><div className="mu sm">{b}</div></div></div>
        ))}
      </div>

      {detail && <PropertyDetail id={detail} nav={nav} onClose={() => setDetail(null)} />}
      {adding && <AddProperty onClose={() => setAdding(false)} />}
      {logging && <LogForm init={logging} onClose={() => setLogging(null)} />}
    </div>
  );
}

export default function App() {
  return <Provider><Shell /></Provider>;
}
