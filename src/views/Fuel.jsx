import React, { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Modal, Field, Empty, Pill, STATUS } from '../components/ui';
import Chart from '../components/Chart';
import Tank from '../components/Tank';
import { hddBetween, fuelFacts } from '../lib/model';
import { nowAK, fmtDate, r0, r1, money, akMs } from '../lib/util';

export function LogForm({ init, onClose }) {
  const { state, dispatch, states } = useApp();
  const fuelProps = state.props.filter((p) => p.cap > 0);
  const [f, setF] = useState({ propId: init.propId || fuelProps[0]?.id, kind: init.kind || 'reading', t: nowAK(), gauge: '', gallons: '', price: '', note: '' });
  const [err, setErr] = useState('');
  const p = state.props.find((x) => x.id === f.propId);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const lastPrice = p ? fuelFacts(p, state.entries).lastPrice : 0;

  function save() {
    if (!p) return setErr('Add a property with a tank first.');
    const g = f.gauge === '' ? null : parseFloat(f.gauge);
    const gal = f.gallons === '' ? null : parseFloat(f.gallons);
    if (f.kind === 'reading' && (g === null || isNaN(g) || g < 0 || g > 100)) return setErr('Enter a gauge reading between 0 and 100%.');
    if (f.kind === 'fill' && (!gal || gal <= 0)) return setErr('Enter the gallons delivered.');
    if (g !== null && (g < 0 || g > 100)) return setErr('Gauge must be 0–100%.');
    if (f.kind === 'fill' && gal > p.cap) return setErr(`That is more than the ${p.cap}-gal tank holds.`);
    dispatch({ type: 'addEntry', entry: { propId: f.propId, kind: f.kind, t: f.t, gauge: g, gallons: gal, price: f.price === '' ? null : parseFloat(f.price), note: f.note } });
    onClose();
  }
  return (
    <Modal title={f.kind === 'fill' ? 'Log fuel delivery' : 'Log gauge reading'} onClose={onClose}>
      <div className="chips" style={{ marginBottom: 14 }}>{[['reading', 'Gauge reading'], ['fill', 'Fuel delivery']].map(([k, l]) => <button key={k} className={`chip ${f.kind === k ? 'on' : ''}`} onClick={() => setF({ ...f, kind: k })}>{l}</button>)}</div>
      <div className="form-g">
        <Field label="Property"><select value={f.propId} onChange={set('propId')}>{fuelProps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Date & time (Alaska)"><input type="datetime-local" value={f.t} onChange={set('t')} /></Field>
        <Field label={f.kind === 'fill' ? 'Gauge after delivery (%) — optional' : 'Gauge reading (%)'}><input type="number" min="0" max="100" step="1" value={f.gauge} onChange={set('gauge')} autoFocus /></Field>
        {f.kind === 'fill' && <Field label="Gallons delivered"><input type="number" min="0" step="0.1" value={f.gallons} onChange={set('gallons')} /></Field>}
        {f.kind === 'fill' && <Field label="Price per gallon ($)" hint={lastPrice ? `Last paid ${money(lastPrice)}` : ''}><input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} /></Field>}
      </div>
      <Field label="Note"><input value={f.note} onChange={set('note')} placeholder="Vendor, invoice #, observations…" /></Field>
      {f.gauge !== '' && p && <p className="mu sm">≈ {r0((parseFloat(f.gauge) / 100) * p.cap)} gal of {p.cap}</p>}
      {err && <p className="up sm" role="alert">{err}</p>}
      <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save entry</button></div>
    </Modal>
  );
}

export default function Fuel({ nav }) {
  const { state, states, live, nowMs } = useApp();
  const fuelProps = state.props.filter((p) => p.cap > 0);
  const [id, setId] = useState(state.settings.homeId);
  const p = fuelProps.find((x) => x.id === id) || fuelProps[0];
  const st = p ? states[p.id] : null;
  const w = p && live.wx ? live.wx[state.props.indexOf(p)] : null;
  const facts = p ? fuelFacts(p, state.entries) : null;

  const daily = useMemo(() => {
    if (!p || !st || st.empty || !w) return null;
    const out = [];
    for (let d = 20; d >= 1; d--) {
      const a = nowMs - d * 86400000, b = a + 86400000;
      out.push({ t: new Date(a).toISOString(), gal: hddBetween(w, a, b) / st.k, hdd: hddBetween(w, a, b) });
    }
    return out;
  }, [p, st, w, nowMs]);

  if (!p) return <Empty>No property with a fuel tank. <button className="btn" onClick={nav.add}>Add property</button></Empty>;
  return (
    <>
      <div className="pagehead"><div><h1>Fuel Log</h1><p>Log readings and deliveries; the model learns your K-factor from real weather data.</p></div>
        <div className="row"><select value={p.id} onChange={(e) => setId(e.target.value)} style={{ width: 'auto' }} aria-label="Property">{fuelProps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button className="btn" onClick={() => nav.log(p.id, 'reading')}><Icon n="plus" size={15} />Reading</button><button className="btn primary" onClick={() => nav.log(p.id, 'fill')}><Icon n="fuel" size={15} />Delivery</button></div></div>
      {st.empty ? <Empty>No entries for {p.name} yet. Log a gauge reading to begin.</Empty> : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
          <Card title="Current level" icon="fuel"><div className="row" style={{ flexWrap: 'nowrap' }}><div style={{ flex: 1.2 }}><Tank pct={st.pct} gal={st.level} cap={p.cap} /></div><div style={{ display: 'grid', gap: 10, flex: 1 }}><Pill kind={st.status}>{STATUS[st.status]}</Pill><div className="kpi"><span>Days left</span><b>{r1(st.daysLeft)}</b></div><div className="kpi"><span>Last entry</span><b style={{ fontSize: 16 }}>{fmtDate(st.last.t, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</b><small>{st.last.kind === 'fill' ? 'delivery' : 'reading'} · estimate decays with weather</small></div></div></div></Card>
          <Card title="Level history" icon="history"><Chart height={230} label="Fuel level history" data={{ labels: st.lv.map((l) => fmtDate(l.t)), datasets: [{ label: 'Gallons', data: st.lv.map((l) => r0(l.gal)), borderColor: '#ff9a1f', backgroundColor: 'rgba(255,154,31,.14)', fill: true, tension: .25, pointRadius: st.lv.map((l) => (l.kind === 'fill' ? 6 : 2)), pointBackgroundColor: st.lv.map((l) => (l.kind === 'fill' ? '#22c55e' : '#ff9a1f')) }] }} options={{ scales: { y: { min: 0, max: p.cap } } }} /><div className="mu sm">Green dots = deliveries</div></Card>
          <Card title="Daily burn vs degree-days" icon="weather">
            {daily ? <Chart height={230} type="bar" label="Daily burn and heating degree days" data={{ labels: daily.map((d) => fmtDate(d.t)), datasets: [{ type: 'bar', label: 'Est. gal/day', data: daily.map((d) => r1(d.gal)), backgroundColor: 'rgba(56,189,248,.55)', borderRadius: 4, yAxisID: 'y' }, { type: 'line', label: 'HDD', data: daily.map((d) => r0(d.hdd)), borderColor: '#f87171', pointRadius: 0, tension: .3, yAxisID: 'y1' }] }} options={{ plugins: { legend: { display: true } }, scales: { y1: { position: 'right', grid: { display: false }, ticks: { color: '#f87171' } } } }} /> : <Empty>Weather data needed.</Empty>}
            <div className="mu sm">K-factor {Math.round(st.k * 100) / 100} HDD/gal ({st.kLearned ? 'learned from your logs' : 'default'}). Burn = heating degree-days ÷ K.</div>
          </Card>
          <Card title="14-day projection" icon="calc"><Chart height={230} label="Projection" data={{ labels: st.proj.map((x) => fmtDate(x.t)), datasets: [{ label: 'Projected gal', data: st.proj.map((x) => r0(x.gal)), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.12)', fill: true, tension: .3 }, { label: '25% line', data: st.proj.map(() => p.cap * 0.25), borderColor: '#ef4444', borderDash: [6, 4], pointRadius: 0 }] }} options={{ plugins: { legend: { display: true } }, scales: { y: { min: 0, max: p.cap } } }} />
            <div className="mu sm">Uses the live 14-day NOAA-model forecast from Open-Meteo.</div></Card>
          <Card title="Season totals" icon="history"><div className="row" style={{ gap: 28 }}><div className="kpi"><span>Deliveries</span><b>{facts.fills.length}</b></div><div className="kpi"><span>Gallons bought</span><b>{r0(facts.gal)}</b></div><div className="kpi"><span>Spend</span><b>{money(facts.spend)}</b></div><div className="kpi"><span>Avg $/gal</span><b>{facts.avgPrice ? money(facts.avgPrice) : '—'}</b></div></div></Card>
        </div>
      )}
    </>
  );
}
