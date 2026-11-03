import React, { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Card, Field } from '../components/ui';
import Chart from '../components/Chart';
import { hddBetween } from '../lib/model';
import { fmtDate, r0, r1, money } from '../lib/util';

export default function Calculator() {
  const { state, live, states, nowMs } = useApp();
  const fuel = state.props.filter((p) => p.cap > 0);
  const p0 = fuel.find((p) => p.id === state.settings.homeId) || fuel[0];
  const [cap, setCap] = useState(p0?.cap ?? 300);
  const [gauge, setGauge] = useState(50);
  const [k, setK] = useState(p0 ? Math.round((states[p0.id]?.k || p0.k) * 100) / 100 : 4.5);
  const [price, setPrice] = useState(4.25);
  const [lead, setLead] = useState(state.settings.leadDays);
  const [fillPct, setFillPct] = useState(90);
  const [gen, setGen] = useState({ gal: 10, gph: 0.65 });
  const pickProp = (id) => { const p = fuel.find((x) => x.id === id); if (!p) return; setCap(p.cap); setK(Math.round((states[p.id]?.k || p.k) * 100) / 100); };

  const w = live.wx && live.wx[Math.max(0, state.props.findIndex((p) => p.id === (p0 && p0.id)))];
  const gal = (gauge / 100) * cap;
  const curve = useMemo(() => {
    if (!w) return null;
    const out = [];
    for (let d = 0; d <= 14; d++) out.push({ d, gal: Math.max(0, gal - hddBetween(w, nowMs, nowMs + d * 86400000) / k) });
    return out;
  }, [w, gal, k, nowMs]);
  let days = null;
  if (curve) { const z = curve.findIndex((c) => c.gal <= 0); days = z > 0 ? z - 1 + curve[z - 1].gal / (curve[z - 1].gal - curve[z].gal) : null; if (days === null) { const tail = Math.max(0.5, hddBetween(w, nowMs + 11 * 86400000, nowMs + 14 * 86400000) / 3 / k); days = 14 + curve[14].gal / tail; } }
  const need = Math.max(0, (fillPct / 100) * cap - gal);
  const coldBurn = (hdd) => hdd / k;

  return (
    <>
      <div className="pagehead"><div><h1>Fuel Calculator</h1><p>Plan deliveries, costs and generator fuel. Forecast-aware when live weather is available.</p></div>
        {fuel.length > 0 && <select defaultValue="" onChange={(e) => pickProp(e.target.value)} style={{ width: 'auto' }} aria-label="Load from property"><option value="" disabled>Load from property…</option>{fuel.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <Card title="Gauge → gallons → days" icon="calc">
          <div className="form-g">
            <Field label="Tank size (gal)"><input type="number" min="1" value={cap} onChange={(e) => setCap(parseFloat(e.target.value) || 0)} /></Field>
            <Field label={`Gauge reading: ${gauge}%`}><input type="range" min="0" max="100" value={gauge} onChange={(e) => setGauge(+e.target.value)} /></Field>
            <Field label="K-factor (HDD/gal)"><input type="number" step="0.1" min="1" value={k} onChange={(e) => setK(parseFloat(e.target.value) || 1)} /></Field>
            <Field label="Order lead time (days)"><input type="number" min="0" value={lead} onChange={(e) => setLead(parseFloat(e.target.value) || 0)} /></Field>
          </div>
          <div className="row" style={{ gap: 26, margin: '14px 0' }}><div className="kpi"><span>You have</span><b>{r0(gal)} gal</b></div><div className="kpi"><span>Days of heat</span><b>{days !== null ? r1(days) : '—'}</b><small>{w ? 'from live 14-day forecast' : 'needs weather'}</small></div><div className="kpi"><span>Order by</span><b style={{ fontSize: 20 }}>{days !== null ? fmtDate(new Date(nowMs + (days - lead) * 86400000).toISOString()) : '—'}</b></div></div>
          {curve && <Chart height={170} label="Projected level" data={{ labels: curve.map((c) => fmtDate(new Date(nowMs + c.d * 86400000).toISOString())), datasets: [{ data: curve.map((c) => r0(c.gal)), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.12)', fill: true, tension: .3 }] }} options={{ scales: { y: { min: 0, max: cap } } }} />}
        </Card>
        <Card title="Delivery cost" icon="fuel">
          <div className="form-g"><Field label="Fill to (%)"><input type="number" min="1" max="95" value={fillPct} onChange={(e) => setFillPct(parseFloat(e.target.value) || 0)} /></Field><Field label="Price ($/gal)"><input type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} /></Field></div>
          <div className="row" style={{ gap: 26, margin: '14px 0' }}><div className="kpi"><span>Gallons to order</span><b>{r0(need)}</b></div><div className="kpi"><span>Cost</span><b>{money(need * price)}</b></div></div>
          <div className="callout sm">Most vendors suggest filling to 80–90% — oil expands and tanks should not be filled to 100%. Cost of heating per day at current burn ≈ <b>{states[p0?.id]?.burn ? money(states[p0.id].burn * price) : '—'}</b>.</div>
          <div className="mu sm" style={{ marginTop: 10 }}>Quick burn estimates at this K-factor:</div>
          <table><thead><tr><th>Outdoor avg</th><th>HDD</th><th>Gal/day</th><th>$/day</th></tr></thead><tbody>{[40, 20, 0, -20, -40].map((t) => <tr key={t}><td>{t}°F</td><td>{65 - t}</td><td>{r1(coldBurn(65 - t))}</td><td>{money(coldBurn(65 - t) * price)}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Generator runtime" icon="bolt">
          <div className="form-g"><Field label="Fuel on hand (gal)"><input type="number" step="0.5" value={gen.gal} onChange={(e) => setGen({ ...gen, gal: parseFloat(e.target.value) || 0 })} /></Field><Field label="Burn (gal/hr)"><input type="number" step="0.05" value={gen.gph} onChange={(e) => setGen({ ...gen, gph: parseFloat(e.target.value) || 0.05 })} /></Field></div>
          <div className="row" style={{ gap: 26, marginTop: 14 }}><div className="kpi"><span>Runtime</span><b>{r1(gen.gal / gen.gph)} h</b></div><div className="kpi"><span>For 72h</span><b>{r1(gen.gph * 72)} gal</b></div></div>
        </Card>
      </div>
    </>
  );
}
