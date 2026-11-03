import React, { useState } from 'react';
import { useApp } from '../store';
import { Card, Gauge, Loading, Empty, Icon, Field } from '../components/ui';
import Chart from '../components/Chart';
import { pmCategory, airStage } from '../lib/model';
import { akMs, r0, r1 } from '../lib/util';

export default function Air() {
  const { live, state, dispatch, airInfo, nowMs, refresh } = useApp();
  const [i, setI] = useState(0);
  const names = ['Fairbanks', 'North Pole'];
  const air = live.air && live.air[i];
  if (!air) return live.loading ? <Loading /> : <Empty>Air quality feed unavailable. <button className="btn" onClick={refresh}>Retry</button></Empty>;
  const pm = air.current.pm2_5, cat = pmCategory(pm);
  const info = airStage(air, state.settings);
  const h = air.hourly;
  const rows = h.time.map((t, k) => ({ t, ms: akMs(t), pm: h.pm2_5[k], aqi: h.us_aqi[k] })).filter((r) => r.ms >= nowMs - 24 * 3600000);
  const days = {};
  rows.forEach((r) => { const d = r.t.slice(0, 10); (days[d] = days[d] || []).push(r.pm); });
  const dayAvg = Object.entries(days).map(([d, v]) => ({ d, avg: v.filter((x) => x != null).reduce((a, b) => a + b, 0) / Math.max(1, v.filter((x) => x != null).length) }));

  return (
    <>
      <div className="pagehead"><div><h1>Air & Burn Status</h1><p>Live PM2.5 from Open-Meteo's air-quality model (CAMS). Wood-burning advisories in Fairbanks are issued by Alaska DEC / the borough — always check the official notice.</p></div>
        <div className="row"><select value={i} onChange={(e) => setI(+e.target.value)} style={{ width: 'auto' }} aria-label="Area">{names.map((n, k) => <option key={n} value={k}>{n}</option>)}</select><button className="btn" onClick={refresh}><Icon n="refresh" size={15} />Refresh</button></div></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <Card title="Right now" icon="air">
          <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}><div><div className="mu sm">PM2.5</div><div className="big" style={{ fontSize: 54 }}>{r1(pm)}</div><div className="mu sm">µg/m³</div></div><div style={{ flex: 1 }}><Gauge value={pm} max={55} label={cat.label} color={cat.color} /></div></div>
          <div className="row" style={{ marginTop: 10, gap: 22 }}><div className="kpi"><span>US AQI</span><b>{r0(air.current.us_aqi)}</b></div><div className="kpi"><span>PM10</span><b>{r0(air.current.pm10)}</b></div><div className="kpi"><span>Next-24h avg</span><b>{r1(info.avg24)}</b></div><div className="kpi"><span>Next-24h peak</span><b>{r1(info.peak)}</b></div></div>
        </Card>
        <Card title="Estimated burn status" icon="shield">
          <div className={`status-box ${info.stage ? 'wn' : 'ok'}`}><Icon n="shield" size={30} /><div><div className="mu sm">ESTIMATE · NOT OFFICIAL</div><h4 style={{ fontSize: 28 }}>{info.stage ? `Stage ${info.stage}` : 'No stage triggered'}</h4><div className="sm mu">{info.stage ? 'Wood-burning restrictions may apply. Check the official notice.' : 'Forecast PM2.5 below your Stage 1 threshold.'}</div></div></div>
          <p className="sm mu" style={{ marginTop: 10 }}>UNVERIFIED: the stage is derived by comparing the model's next-24h average PM2.5 to thresholds you can edit below. Official determinations come from Alaska DEC and the Fairbanks North Star Borough, which use their own monitors and forecasts.</p>
          <div className="form-g"><Field label="Stage 1 at (µg/m³)"><input type="number" value={state.settings.stage1} onChange={(e) => dispatch({ type: 'settings', patch: { stage1: parseFloat(e.target.value) || 0 } })} /></Field><Field label="Stage 2 at (µg/m³)"><input type="number" value={state.settings.stage2} onChange={(e) => dispatch({ type: 'settings', patch: { stage2: parseFloat(e.target.value) || 0 } })} /></Field></div>
          <a className="btn block" style={{ marginTop: 10, textDecoration: 'none' }} href="https://dec.alaska.gov/air/" target="_blank" rel="noreferrer">Official Alaska DEC air site <Icon n="arrow" size={15} /></a>
        </Card>
      </div>
      <Card title="PM2.5 — past 24h and 4-day forecast" icon="air" style={{ marginTop: 14 }}>
        <Chart height={250} label="PM2.5 hourly" data={{ labels: rows.map((r) => new Date(r.ms).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', timeZone: 'UTC' })), datasets: [{ label: 'PM2.5 µg/m³', data: rows.map((r) => r.pm), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.12)', fill: true, tension: .3, pointRadius: 0, pointHoverRadius: 5 }, { label: `Stage 1 (${state.settings.stage1})`, data: rows.map(() => state.settings.stage1), borderColor: '#ef4444', borderDash: [6, 4], pointRadius: 0 }] }} options={{ plugins: { legend: { display: true } } }} />
        <div className="hours" style={{ marginTop: 12 }}>{dayAvg.map((d) => { const c = pmCategory(d.avg); return <div key={d.d} className="hour"><div className="mu sm">{new Date(akMs(d.d + 'T12:00')).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</div><b style={{ color: c.color }}>{r0(d.avg)}</b><div className="mu" style={{ fontSize: 10 }}>{c.label}</div></div>; })}</div>
      </Card>
    </>
  );
}
