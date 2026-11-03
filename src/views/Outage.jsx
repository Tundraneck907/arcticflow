import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Empty, Ring, Field } from '../components/ui';
import Chart from '../components/Chart';
import IMG from '../lib/images';
import { coolHours } from '../lib/model';
import { r0, r1 } from '../lib/util';

const CHECK = ['Shut off water & drain exposed lines if > 12h expected', 'Open cabinet doors under sinks', 'Run generator outdoors only, 20 ft from windows', 'Check CO detector batteries', 'Move to one heated room; close off the rest', 'Unplug sensitive electronics', 'Keep vehicles plugged-in off generator or start every 4h', 'Notify tenants / guests'];

export default function Outage({ nav }) {
  const { state, dispatch, live, states } = useApp();
  const fuelless = state.props;
  const [id, setId] = useState(nav.ctx.propId || state.settings.homeId);
  const p = fuelless.find((x) => x.id === id) || fuelless[0];
  const on = !!(p && state.outage[p.id]);
  const [checked, setChecked] = useState({});
  const [tin, setTin] = useState(p?.indoor ?? 66);
  const [start, setStart] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { if (p) setTin(p.indoor); }, [p?.id]); // eslint-disable-line
  useEffect(() => { if (!on) { setStart(null); return; } setStart((s) => s || Date.now()); const i = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(i); }, [on]);
  if (!p) return <Empty>Add a property first.</Empty>;

  const w = live.wx && live.wx[fuelless.indexOf(p)];
  const out = w ? w.current.temperature_2m : null;
  const fcMin = w ? Math.min(...w.temps.filter((_, i) => w.tms[i] >= w.nowMs && w.tms[i] < w.nowMs + 48 * 3600000)) : null;
  const k = p.cooldown / 80;
  const hours = out !== null ? coolHours(tin, out, p.cooldown) : null;
  const hoursWorst = fcMin !== null ? coolHours(tin, fcMin, p.cooldown) : null;
  const genH = p.genGph ? p.genGal / p.genGph : 0;
  const curve = useMemo(() => {
    if (out === null) return null;
    const pts = [];
    for (let h = 0; h <= 48; h += 2) pts.push({ h, t: out + (tin - out) * Math.exp(-k * h) });
    return pts;
  }, [out, tin, k]);
  const st = states[p.id];
  const elapsed = start ? Math.floor((Date.now() - start) / 1000) : 0;
  const nowIn = start && out !== null ? out + (tin - out) * Math.exp(-k * (elapsed / 3600)) : tin;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <>
      <div className="pagehead"><div><h1>Outage Mode</h1><p>Freeze-clock and generator planner using live outdoor temperature and your building's cooldown rate.</p></div><select value={p.id} onChange={(e) => setId(e.target.value)} style={{ width: 'auto' }} aria-label="Property">{fuelless.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <Card title={on ? 'POWER OUTAGE ACTIVE' : 'Outage simulator'} icon="outage" className={on ? 'outage-on' : ''}>
          <img className="photo h130" src={IMG.generator} alt="Generator" />
          <div className="row" style={{ margin: '12px 0', alignItems: 'center' }}>
            <div className="kpi"><span>Indoor now{on ? ' (est.)' : ''}</span><b style={{ fontSize: 44 }}>{r0(on ? nowIn : tin)}°F</b></div>
            <div className="kpi"><span>Outdoor (live)</span><b style={{ fontSize: 44 }}>{out !== null ? r0(out) : '—'}°F</b></div>
          </div>
          {!on && <Field label="Indoor temp when power fails (°F)"><input type="number" value={tin} onChange={(e) => setTin(parseFloat(e.target.value) || 0)} /></Field>}
          <div className="callout" style={{ margin: '12px 0' }}>
            <div className="mu sm">TIME TO FREEZING (32°F) · no heat</div>
            <div className="big" style={{ color: hours !== null && hours < 12 ? 'var(--er)' : 'var(--tx)' }}>{hours === null ? '—' : Number.isFinite(hours) ? `${r1(hours)} h` : 'Not at risk'}</div>
            {hoursWorst !== null && Number.isFinite(hoursWorst) && <div className="mu sm">Worst case at 48h forecast low ({r0(fcMin)}°F): {r1(hoursWorst)} h</div>}
          </div>
          {on && start && <div className="mu sm" style={{ marginBottom: 10 }}>Outage clock: {Math.floor(elapsed / 3600)}h {Math.floor((elapsed % 3600) / 60)}m {elapsed % 60}s</div>}
          <button className={`btn block big-switch ${on ? 'danger' : 'warn'}`} onClick={() => dispatch({ type: 'outage', id: p.id, on: !on })}>{on ? 'END OUTAGE MODE' : 'ENTER OUTAGE MODE'}</button>
        </Card>

        <Card title="Generator runtime" icon="bolt">
          <div className="row" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
            <Ring pct={Math.min(100, (genH / 24) * 100)} size={120} color={genH >= 12 ? '#22c55e' : genH >= 6 ? '#f59e0b' : '#ef4444'}><div><b style={{ fontFamily: 'Rajdhani', fontSize: 28 }}>{r0(genH)}h</b><div className="mu" style={{ fontSize: 10 }}>runtime</div></div></Ring>
            <div style={{ flex: 1, display: 'grid', gap: 10 }}>
              <Field label="Generator fuel (gal)"><input type="number" step="0.5" min="0" value={p.genGal} onChange={(e) => dispatch({ type: 'updProp', id: p.id, patch: { genGal: parseFloat(e.target.value) || 0 } })} /></Field>
              <Field label="Burn at your load (gal/hr)"><input type="number" step="0.05" min="0.05" value={p.genGph} onChange={(e) => dispatch({ type: 'updProp', id: p.id, patch: { genGph: parseFloat(e.target.value) || 0.05 } })} /></Field>
            </div>
          </div>
          <div className="callout" style={{ marginTop: 12 }}>Gallons needed for a 24h outage: <b>{r1(p.genGph * 24)} gal</b>{p.genGal < p.genGph * 24 ? <span className="up"> — short by {r1(p.genGph * 24 - p.genGal)} gal</span> : <span className="down"> — covered</span>}</div>
          {p.cap > 0 && st && !st.empty && <div className="mu sm" style={{ marginTop: 10 }}>Furnace tank: {r0(st.level)} gal (~{r1(st.daysLeft)} days). Furnace blowers/igniters need power — a generator keeps oil heat running.</div>}
        </Card>

        <Card title="Indoor temperature forecast (no heat)" icon="snow">
          {curve ? <Chart height={230} label="Indoor temperature decay" data={{ labels: curve.map((c) => `${c.h}h`), datasets: [{ label: 'Indoor °F', data: curve.map((c) => r1(c.t)), borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,.14)', fill: true, tension: .3, pointRadius: 0 }, { label: 'Freezing', data: curve.map(() => 32), borderColor: '#ef4444', borderDash: [6, 4], pointRadius: 0 }] }} /> : <Empty>Needs live weather.</Empty>}
          <div className="mu sm">Newton cooling model using cooldown rate {p.cooldown}°F/hr at 80°F Δ. Calibrate it in the property's settings after a real outage.</div>
        </Card>

        <Card title="Emergency checklist" icon="check" right={<span className="mu sm">{done}/{CHECK.length}</span>}>
          {CHECK.map((c, i) => <label className="check" key={i}><input type="checkbox" checked={!!checked[i]} onChange={() => setChecked({ ...checked, [i]: !checked[i] })} /><span className="t">{c}</span></label>)}
        </Card>
      </div>
    </>
  );
}
