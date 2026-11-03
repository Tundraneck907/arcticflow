import React, { useState } from 'react';
import { useApp } from '../store';
import { Card, Pill, STATUS, Icon, Modal, Field, Empty } from '../components/ui';
import Tank from '../components/Tank';
import Chart from '../components/Chart';
import { PropCard } from './Dashboard';
import { PROPERTY_TYPES } from '../lib/seed';
import IMG from '../lib/images';
import { fuelFacts } from '../lib/model';
import { fmtDate, fmtDT, r1, r0, money } from '../lib/util';

const IMG_BY_TYPE = { 'Primary Home': 'home', Rental: 'rental', 'Airbnb / VRBO': 'chalet', Cabin: 'cabin', 'Dry Cabin': 'drycabin', 'Mobile Home / Trailer': 'trailer', 'Shop / Garage': 'generator', 'Vacant Property': 'freeze', Commercial: 'freeze' };

export default function Properties({ nav }) {
  const { state, states, live } = useApp();
  return (
    <>
      <div className="pagehead"><div><h1>My Properties</h1><p>Homes, cabins, rentals and trailers with live microclimate temperature per location.</p></div><button className="btn primary" onClick={nav.add}><Icon n="plus" size={15} />Add property</button></div>
      {!state.props.length && <Empty>No properties yet.</Empty>}
      <div className="pc-big">{state.props.map((p, i) => <PropCard key={p.id} p={p} st={states[p.id] || { status: 'unknown' }} w={live.wx?.[i]} onClick={() => nav.open(p.id)} />)}</div>
      <Card title="Property Types" icon="props" style={{ marginTop: 14 }}><div className="chips">{PROPERTY_TYPES.map((t) => <span key={t} className="chip">{t}</span>)}</div></Card>
    </>
  );
}

export function PropertyDetail({ id, nav, onClose }) {
  const { state, dispatch, states, live } = useApp();
  const p = state.props.find((x) => x.id === id);
  const [tab, setTab] = useState('overview');
  if (!p) return null;
  const st = states[p.id] || {};
  const w = live.wx && live.wx[state.props.indexOf(p)];
  const facts = fuelFacts(p, state.entries);
  const set = (patch) => dispatch({ type: 'updProp', id: p.id, patch });
  const num = (k) => (e) => set({ [k]: parseFloat(e.target.value) || 0 });

  return (
    <Modal title={p.name} onClose={onClose} wide>
      <div className="grid split">
        <div>
          <img className="photo h180" src={IMG[p.img] || IMG.home} alt={p.name} />
          <div className="row" style={{ margin: '10px 0' }}><Pill kind={st.status || 'unknown'}>{STATUS[st.status || 'unknown']}</Pill><span className="mu sm">{p.type} · {p.place}</span></div>
          <div className="kpi"><span>Outdoor now (live)</span><b>{w ? `${r0(w.current.temperature_2m)}°F` : '—'}</b><small>{w ? `Feels like ${r0(w.current.apparent_temperature)}°F · wind ${r0(w.current.wind_speed_10m)} mph` : 'Weather unavailable'}</small></div>
        </div>
        <div>
          <div className="tabs2">{[['overview', 'Overview'], ['log', 'Fuel log'], ['settings', 'Settings']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
          {tab === 'overview' && (p.cap ? (st.empty ? <Empty>No fuel readings yet.</Empty> : (
            <>
              <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                <div style={{ flex: 1 }}><Tank pct={st.pct} gal={st.level} cap={p.cap} size={.9} /></div>
                <div style={{ display: 'grid', gap: 10, flex: 1 }}>
                  <div className="kpi"><span>Days left</span><b>{r1(st.daysLeft)}</b></div>
                  <div className="kpi"><span>Burn rate</span><b>{r1(st.burn)} gal/day</b><small className={st.trend > 0 ? 'up' : 'down'}>{st.trend > 0 ? '▲' : '▼'} {r0(Math.abs(st.trend))}% vs prior week</small></div>
                  <div className="kpi"><span>K-factor</span><b>{(Math.round(st.k * 100) / 100)} HDD/gal</b><small>{st.kLearned ? `learned from ${st.kSamples} intervals` : 'default (log more readings)'}</small></div>
                </div>
              </div>
              <div className="row" style={{ margin: '12px 0' }}>
                <div className="callout"><div className="mu sm">Order by</div><b>{fmtDate(new Date(st.orderBy).toISOString())}</b></div>
                <div className="callout"><div className="mu sm">Runs dry (est.)</div><b>{fmtDate(new Date(st.runout).toISOString())}</b></div>
                <div className="callout"><div className="mu sm">Avg paid</div><b>{facts.avgPrice ? money(facts.avgPrice) + '/gal' : '—'}</b></div>
                <div className="callout"><div className="mu sm">Season spend</div><b>{money(facts.spend)}</b></div>
              </div>
              <div className="row"><button className="btn" onClick={() => nav.log(p.id, 'reading')}>Log reading</button><button className="btn primary" onClick={() => nav.log(p.id, 'fill')}>Log delivery</button><button className="btn" onClick={() => { onClose(); nav.go('outage', { propId: p.id }); }}>Outage mode</button></div>
              <Chart height={150} label="Level history" data={{ labels: st.lv.map((l) => fmtDate(l.t)), datasets: [{ data: st.lv.map((l) => r0(l.gal)), borderColor: '#ff9a1f', backgroundColor: 'rgba(255,154,31,.12)', fill: true, tension: .25, pointRadius: 2 }] }} options={{ scales: { y: { min: 0, max: p.cap } } }} />
            </>
          )) : <Empty>This property has no fuel tank (dry cabin / wood heat). Weather, freeze and outage tools still work. Set a tank size under Settings to start logging.</Empty>)}
          {tab === 'log' && (
            <div className="tbl-wrap"><table><thead><tr><th>When</th><th>Type</th><th>Gauge</th><th>Gal</th><th>$/gal</th><th></th></tr></thead><tbody>
              {[...state.entries.filter((e) => e.propId === p.id)].sort((a, b) => (a.t < b.t ? 1 : -1)).map((e) => (
                <tr key={e.id}><td>{fmtDT(e.t)}</td><td>{e.kind === 'fill' ? 'Delivery' : 'Reading'}</td><td>{e.gauge ?? '—'}{e.gauge != null && '%'}</td><td>{e.gallons ?? '—'}</td><td>{e.price ? money(e.price) : '—'}</td><td><button className="icon-btn" aria-label="Delete entry" onClick={() => dispatch({ type: 'delEntry', id: e.id })}><Icon n="trash" size={14} /></button></td></tr>
              ))}
            </tbody></table></div>
          )}
          {tab === 'settings' && (
            <>
              <div className="form-g">
                <Field label="Name"><input value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Place"><input value={p.place} onChange={(e) => set({ place: e.target.value })} /></Field>
                <Field label="Type"><select value={p.type} onChange={(e) => set({ type: e.target.value, img: IMG_BY_TYPE[e.target.value] || p.img })}>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Fuel"><input value={p.fuelType} onChange={(e) => set({ fuelType: e.target.value })} /></Field>
                <Field label="Tank capacity (gal)" hint="0 = no tank"><input type="number" min="0" value={p.cap} onChange={num('cap')} /></Field>
                <Field label="Default K-factor (HDD/gal)" hint="Used until readings teach the app your real value"><input type="number" step="0.1" min="1" value={p.k} onChange={num('k')} /></Field>
                <Field label="Indoor temp (°F)"><input type="number" value={p.indoor} onChange={num('indoor')} /></Field>
                <Field label="Cooldown °F/hr at 80°F Δ" hint="How fast the building cools with heat off"><input type="number" step="0.1" value={p.cooldown} onChange={num('cooldown')} /></Field>
                <Field label="Generator fuel (gal)"><input type="number" step="0.5" value={p.genGal} onChange={num('genGal')} /></Field>
                <Field label="Generator burn (gal/hr)"><input type="number" step="0.05" value={p.genGph} onChange={num('genGph')} /></Field>
                <Field label="Latitude"><input type="number" step="0.0001" value={p.lat} onChange={num('lat')} /></Field>
                <Field label="Longitude"><input type="number" step="0.0001" value={p.lon} onChange={num('lon')} /></Field>
              </div>
              <Field label="Notes"><textarea rows="2" value={p.notes} onChange={(e) => set({ notes: e.target.value })} /></Field>
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => dispatch({ type: 'settings', patch: { homeId: p.id } })}>{state.settings.homeId === p.id ? '★ Home location' : 'Set as home location'}</button>
                <span className="sp" />
                <button className="btn warn" onClick={() => { if (confirm(`Delete ${p.name} and its fuel log?`)) { dispatch({ type: 'delProp', id: p.id }); onClose(); } }}><Icon n="trash" size={15} />Delete property</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function AddProperty({ onClose }) {
  const { dispatch } = useApp();
  const [f, setF] = useState({ name: '', type: 'Primary Home', place: 'Fairbanks, AK', lat: 64.8378, lon: -147.7164, cap: 300, k: 4.5, fuelType: 'Heating oil #1' });
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value });

  async function search() {
    if (!q.trim()) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&country_code=US`).then((x) => x.json());
      const list = (r.results || []).filter((x) => x.admin1 === 'Alaska');
      setRes(list); if (!list.length) setMsg('No Alaska matches. Enter coordinates manually.');
    } catch { setMsg('Search failed. Enter coordinates manually.'); }
    setBusy(false);
  }
  const save = () => {
    if (!f.name.trim()) return setMsg('Give the property a name.');
    dispatch({ type: 'addProp', prop: { ...f, name: f.name.trim(), img: IMG_BY_TYPE[f.type] || 'home' } });
    onClose();
  };
  return (
    <Modal title="Add property" onClose={onClose}>
      <div className="form-g">
        <Field label="Name"><input autoFocus value={f.name} onChange={set('name')} placeholder="e.g. Goldstream Cabin" /></Field>
        <Field label="Type"><select value={f.type} onChange={set('type')}>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Tank capacity (gal)" hint="0 for no tank"><input type="number" min="0" value={f.cap} onChange={set('cap')} /></Field>
        <Field label="Fuel type"><input value={f.fuelType} onChange={set('fuelType')} /></Field>
      </div>
      <div style={{ margin: '14px 0 6px' }} className="mu sm">LOCATION — search an Alaska town (live Open-Meteo geocoding API)</div>
      <div className="row"><input style={{ flex: 1 }} placeholder="e.g. Delta Junction" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} aria-label="Search location" /><button className="btn" onClick={search} disabled={busy}><Icon n="search" size={15} />{busy ? 'Searching…' : 'Search'}</button></div>
      {res.map((r) => <button key={r.id} className="btn block" style={{ marginTop: 6, justifyContent: 'space-between' }} onClick={() => { setF({ ...f, place: `${r.name}, AK`, lat: r.latitude, lon: r.longitude }); setRes([]); }}><span>{r.name}{r.admin2 ? ` · ${r.admin2}` : ''}</span><span className="mu">{r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}</span></button>)}
      <div className="form-g" style={{ marginTop: 10 }}>
        <Field label="Place label"><input value={f.place} onChange={set('place')} /></Field>
        <Field label="Latitude"><input type="number" step="0.0001" value={f.lat} onChange={set('lat')} /></Field>
        <Field label="Longitude"><input type="number" step="0.0001" value={f.lon} onChange={set('lon')} /></Field>
      </div>
      {msg && <p className="up sm">{msg}</p>}
      <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Add property</button></div>
    </Modal>
  );
}
