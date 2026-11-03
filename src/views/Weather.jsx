import React, { useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Loading, Empty } from '../components/ui';
import Chart from '../components/Chart';
import { dayWx, todayIdx } from '../lib/model';
import { WMO, dow, fmtDate, fmtTime, r0, r1, windChill, akMs } from '../lib/util';

export default function Weather() {
  const { state, live, nowMs, refresh } = useApp();
  const [id, setId] = useState(state.settings.homeId);
  const p = state.props.find((x) => x.id === id) || state.props[0];
  const w = p && live.wx ? live.wx[state.props.indexOf(p)] : live.fbx;
  if (!w) return live.loading ? <Loading /> : <Empty>Weather feed unavailable. <button className="btn" onClick={refresh}>Retry</button></Empty>;
  const t0 = todayIdx(w);
  const days = Array.from({ length: 14 }, (_, i) => dayWx(w, t0 + i));
  const past = Array.from({ length: 7 }, (_, i) => dayWx(w, t0 - 7 + i));
  const cur = w.current;
  const hrs = [];
  w.tms.forEach((t, i) => { if (t >= nowMs - 1800000 && t < nowMs + 48 * 3600000) hrs.push({ t, temp: w.temps[i] }); });
  const today = days[0];
  const dl = (today.daylight || 0) / 3600;
  const hdd = Math.max(0, 65 - today.mean);

  return (
    <>
      <div className="pagehead"><div><h1>Weather</h1><p>Open-Meteo forecast for the exact coordinates of each property · NWS alerts and forecast text.</p></div>
        <div className="row"><select value={p?.id} onChange={(e) => setId(e.target.value)} style={{ width: 'auto' }} aria-label="Location">{state.props.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.place}</option>)}</select><button className="btn" onClick={refresh}><Icon n="refresh" size={15} />Refresh</button></div></div>

      {live.alerts.length > 0 && live.alerts.map((a) => <div key={a.id} className="banner err"><Icon n="nws" /><div><b>{a.event}</b> <span className="mu">— {a.headline}</span></div></div>)}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <Card title="Right now" icon="weather">
          <div className="row" style={{ flexWrap: 'nowrap' }}><div style={{ fontSize: 56 }}>{(WMO[cur.weather_code] || [0, '·'])[1]}</div><div><div className="big" style={{ fontSize: 56 }}>{r0(cur.temperature_2m)}°F</div><div className="mu">Feels like {r0(cur.apparent_temperature)}°F · {(WMO[cur.weather_code] || ['—'])[0]}</div></div></div>
          <div className="row" style={{ marginTop: 14, gap: 24 }}>
            <div className="kpi"><span>Wind</span><b>{r0(cur.wind_speed_10m)} mph</b></div>
            <div className="kpi"><span>Humidity</span><b>{r0(cur.relative_humidity_2m)}%</b></div>
            <div className="kpi"><span>Wind chill</span><b>{r0(windChill(cur.temperature_2m, cur.wind_speed_10m))}°F</b></div>
            <div className="kpi"><span>HDD today</span><b>{r0(hdd)}</b></div>
          </div>
        </Card>
        <Card title="Daylight" icon="aurora">
          <div className="row" style={{ gap: 24 }}><div className="kpi"><span>Sunrise</span><b>{fmtTime(today.sunrise)}</b></div><div className="kpi"><span>Sunset</span><b>{fmtTime(today.sunset)}</b></div><div className="kpi"><span>Daylight</span><b>{Math.floor(dl)}h {r0((dl % 1) * 60)}m</b></div></div>
          <div className="mu sm" style={{ marginTop: 10 }}>Day length in interior Alaska changes by ~5–6 min/day in autumn — plan solar, outdoor work and generator runs around it.</div>
          {live.kp && <div style={{ marginTop: 14 }}><div className="mu sm">AURORA · NOAA planetary Kp (latest {live.kp[live.kp.length - 1].kp})</div><Chart height={70} type="bar" label="Kp index" data={{ labels: live.kp.map((k) => k.t.slice(11, 16)), datasets: [{ data: live.kp.map((k) => k.kp), backgroundColor: live.kp.map((k) => (k.kp >= 5 ? '#ef4444' : k.kp >= 4 ? '#f59e0b' : '#22c55e')), borderRadius: 2 }] }} options={{ scales: { x: { display: false }, y: { min: 0, max: 9 } } }} /></div>}
        </Card>
      </div>

      <Card title="Next 48 hours" icon="weather" style={{ marginTop: 14 }}>
        <Chart height={220} label="48 hour temperature" data={{ labels: hrs.map((h) => new Date(h.t).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', timeZone: 'UTC' })), datasets: [{ label: '°F', data: hrs.map((h) => r1(h.temp)), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.14)', fill: true, tension: .35, pointRadius: 0, pointHoverRadius: 5 }, { label: '0°F', data: hrs.map(() => 0), borderColor: 'rgba(255,255,255,.3)', borderDash: [4, 4], pointRadius: 0 }] }} />
      </Card>

      <Card title="14-day outlook" icon="calc" style={{ marginTop: 14 }}>
        <Chart height={230} label="14 day highs and lows" data={{ labels: days.map((d) => fmtDate(d.date + 'T12:00')), datasets: [{ label: 'High', data: days.map((d) => r0(d.hi)), borderColor: '#f59e0b', tension: .3, backgroundColor: 'rgba(245,158,11,.1)', fill: '+1' }, { label: 'Low', data: days.map((d) => r0(d.lo)), borderColor: '#38bdf8', tension: .3 }] }} options={{ plugins: { legend: { display: true } } }} />
        <div className="hours" style={{ marginTop: 12 }}>{days.map((d, i) => <div key={d.date} className={`hour ${i === 0 ? 'today' : ''}`}><div className="mu sm">{i === 0 ? 'Today' : dow(d.date)}</div><div style={{ fontSize: 22 }}>{(WMO[d.code] || [0, '·'])[1]}</div><b>{r0(d.hi)}°</b><div className="mu sm">{r0(d.lo)}°</div>{d.snow > 0 && <div className="sm" style={{ color: 'var(--ac)' }}>{r1(d.snow)}″</div>}</div>)}</div>
      </Card>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', marginTop: 14 }}>
        <Card title="Past 7 days (observed/modeled)" icon="history"><Chart height={180} type="bar" label="Past 7 day heating degree days" data={{ labels: past.map((d) => dow(d.date)), datasets: [{ label: 'HDD', data: past.map((d) => r0(Math.max(0, 65 - d.mean))), backgroundColor: 'rgba(248,113,113,.6)', borderRadius: 4 }] }} /><div className="mu sm">Heating degree-days (base 65°F) drive fuel burn.</div></Card>
        <Card title="NWS forecast (Fairbanks office)" icon="nws">
          {live.nwsFc ? <div style={{ maxHeight: 260, overflow: 'auto' }}>{live.nwsFc.periods.slice(0, 6).map((pr) => <div key={pr.number} style={{ marginBottom: 10 }}><b>{pr.name}</b> <span className="mu">{pr.temperature}°{pr.temperatureUnit}</span><div className="sm mu">{pr.detailedForecast}</div></div>)}</div> : <Empty>NWS forecast unavailable.</Empty>}
          <div className="mu sm" style={{ marginTop: 6 }}>Source: api.weather.gov</div>
        </Card>
      </div>
    </>
  );
}
