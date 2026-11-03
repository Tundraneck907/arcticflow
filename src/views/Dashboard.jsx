import React, { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Card, Pill, STATUS, Icon, Ring, Gauge, Loading, Empty } from '../components/ui';
import Tank from '../components/Tank';
import Chart from '../components/Chart';
import MapView from '../components/MapView';
import IMG from '../lib/images';
import { dayWx, todayIdx, freezeRisk, tonightLow, pmCategory } from '../lib/model';
import { fmtDate, r1, r0, fmtTime } from '../lib/util';

export function PropCard({ p, st, w, onClick }) {
  const cur = w && w.current;
  return (
    <Card className="prop-card clickable" onClick={onClick} tabIndex={0} role="button" aria-label={`Open ${p.name}`} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <img className="photo h110" src={IMG[p.img] || IMG.home} alt={p.name} style={{ borderRadius: 0, border: 0 }} />
      <div className="pb">
        <h4>{p.name}</h4>
        <div className="mu sm">{p.place}</div>
        <div className="meta"><Pill kind={st.status}>{STATUS[st.status]}</Pill><b>{cur ? `${r0(cur.temperature_2m)}°F` : '—'}</b></div>
        <div className="meta">
          <span className="fuelchip"><Icon n="fuel" size={15} />{p.cap ? `${r0(st.pct || 0)}%` : 'N/A'}</span>
          <span>{p.cap ? `${r0(st.level || 0)} gal` : 'No fuel'}</span>
        </div>
        {p.cap > 0 && <div className="bar"><i style={{ width: `${r0(st.pct || 0)}%`, background: st.status === 'critical' ? 'var(--er)' : st.status === 'attention' ? 'var(--wn)' : 'var(--ok)' }} /></div>}
      </div>
    </Card>
  );
}

export default function Dashboard({ nav }) {
  const { state, dispatch, live, states, airInfo, active, nowMs, refresh } = useApp();
  const { props, vehicles, tasks } = state;
  const [selId, setSelId] = useState(state.settings.homeId);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const fuelProps = props.filter((p) => p.cap > 0);
  const sel = props.find((p) => p.id === selId && p.cap) || fuelProps[0];
  const idx = sel ? props.indexOf(sel) : 0;
  const st = sel ? states[sel.id] : null;
  const w = live.wx && live.wx[idx];

  const counts = useMemo(() => {
    const c = { all: props.length, ready: 0, attention: 0, critical: 0 };
    props.forEach((p) => { const s = states[p.id]?.status; if (c[s] !== undefined) c[s]++; else if (p.cap === 0) c.ready++; });
    return c;
  }, [props, states]);

  const shown = props.filter((p) => (filter === 'all' || (states[p.id]?.status || 'ready') === filter || (filter === 'ready' && p.cap === 0)) && (p.name + p.place).toLowerCase().includes(q.toLowerCase()));

  const done = tasks.filter((t) => t.done).length;
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const overdue = tasks.filter((t) => !t.done && t.due < today).length;
  const pending = tasks.length - done - overdue;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const risk = sel && w ? freezeRisk(sel, st, w) : null;
  const tIdx = w ? todayIdx(w) : 0;
  const tomorrow = w ? dayWx(w, tIdx + 1) : null;
  const homeW = w || (live.wx && live.wx[0]);
  const low = homeW ? tonightLow(homeW) : null;
  const needPlug = vehicles.find((v) => !v.plugged && low !== null && low <= v.threshold) || vehicles[0];
  const plugged = vehicles.find((v) => v.plugged);

  const air = live.air && live.air[0];
  const pm = air ? air.current.pm2_5 : null;
  const cat = pmCategory(pm);

  const projData = st && st.proj ? {
    labels: st.proj.map((p) => fmtDate(p.t)),
    datasets: [{ label: 'Projected gallons', data: st.proj.map((p) => r1(p.gal)), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.12)', fill: true, tension: .3, pointRadius: 2, segment: { borderColor: (c) => (c.p1.parsed.y < sel.cap * 0.2 ? '#ef4444' : c.p1.parsed.y < sel.cap * 0.4 ? '#f59e0b' : '#22c55e') } }],
  } : null;

  const mapItems = props.map((p, i) => ({ id: p.id, lat: p.lat, lon: p.lon, name: p.name, sub: p.cap ? `${r0(states[p.id]?.pct || 0)}% fuel` : 'No fuel tank', status: states[p.id]?.status, temp: live.wx?.[i]?.current?.temperature_2m }));
  const gen = sel ? sel.genGal / (sel.genGph || 1) : 0;

  return (
    <>
      {state.demoBanner && state.entries.some((e) => String(e.note || '').startsWith('Demo')) && (
        <div className="banner">
          <Icon n="nws" /> <span>You're viewing <b>demo properties and sample fuel logs</b> (weather and air data are live). Replace them with your own tanks.</span>
          <span className="sp" />
          <button className="btn sm" onClick={() => dispatch({ type: 'fresh' })}>Start fresh</button>
          <button className="btn sm" onClick={() => dispatch({ type: 'hideBanner' })}>Dismiss</button>
        </div>
      )}
      {Object.keys(live.errors).length > 0 && (
        <div className="banner err"><Icon n="nws" /> <span>Some live feeds failed ({Object.keys(live.errors).join(', ')}). Showing last known values where possible.</span><span className="sp" /><button className="btn sm" onClick={refresh}>Retry</button></div>
      )}
      <div className="pagehead"><div><h1>Main Dashboard</h1><p>Live fuel, weather and readiness across {props.length} propert{props.length === 1 ? 'y' : 'ies'}.</p></div>
        <div className="row"><button className="btn" onClick={() => nav.log(sel?.id, 'reading')} disabled={!sel}><Icon n="plus" size={15} />Log reading</button><button className="btn primary" onClick={() => nav.log(sel?.id, 'fill')} disabled={!sel}><Icon n="fuel" size={15} />Log delivery</button></div>
      </div>

      {!props.length ? <Empty>No properties yet. <button className="btn" onClick={nav.add}>Add your first property</button></Empty> : (
        <div className="grid g-dash">
          <Card title="Heating Fuel" icon="fuel" style={{ gridColumn: 'span 4' }} right={
            <select value={sel?.id} onChange={(e) => setSelId(e.target.value)} style={{ width: 'auto', padding: '4px 8px' }} aria-label="Property">{fuelProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}>
            {!sel ? <Empty>No fueled property</Empty> : st.empty ? <Empty>No readings yet. Log your first gauge reading.</Empty> : (
              <>
                <div className="row" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
                  <div style={{ flex: 1.3 }}><Tank pct={st.pct} gal={st.level} cap={sel.cap} /></div>
                  <div style={{ flex: 1, display: 'grid', gap: 10 }}>
                    <div className="kpi"><span>Est. days of heat</span><b>{r1(st.daysLeft)} <small>days</small></b></div>
                    <div className="kpi"><span>Daily use (3-day)</span><b>{r1(st.burn)} <small>gal/day</small></b></div>
                    <div className="kpi"><span>Burn trend</span><b className={st.trend > 0 ? 'up' : 'down'}>{st.trend > 0 ? '▲' : '▼'} {r0(Math.abs(st.trend))}%</b><small>vs prior 7 days</small></div>
                    <Pill kind={st.status}>{STATUS[st.status]}</Pill>
                  </div>
                </div>
                <div className="mu sm" style={{ margin: '6px 0 4px' }}>14-DAY PROJECTION · order by <b style={{ color: 'var(--tx)' }}>{fmtDate(new Date(st.orderBy).toISOString())}</b> · runs dry ~{fmtDate(new Date(st.runout).toISOString())}</div>
                <Chart data={projData} height={150} label="14 day fuel projection" options={{ scales: { y: { min: 0, max: sel.cap, title: { display: false } } }, plugins: { tooltip: { callbacks: { label: (c) => `${c.parsed.y} gal` } } } }} />
                <button className="btn block" style={{ marginTop: 10 }} onClick={() => nav.open(sel.id)}>Open property <Icon n="arrow" size={15} /></button>
              </>
            )}
          </Card>

          <div className="midgrid">
            <Card title="Home & Freeze Risk" icon="snow">
              <img className="photo h110" src={IMG[sel?.img] || IMG.freeze} alt="" />
              {!risk ? <Loading /> : (
                <>
                  <div className={`status-box ${risk.level === 'low' ? 'ok' : risk.level === 'high' ? 'bad' : 'wn'}`} style={{ marginTop: 10 }}>
                    <Icon n="shield" size={28} /><div><h4>{risk.level.toUpperCase()} RISK</h4><div className="sm mu">{Number.isFinite(risk.hours) ? `~${r0(risk.hours)}h to freezing without heat` : 'Outdoor temp above freezing'}</div></div>
                  </div>
                  <div className="row sm" style={{ marginTop: 10, justifyContent: 'space-between' }}><div>Tonight's low<br /><b style={{ fontSize: 20 }}>{r0(risk.low)}°F</b></div><div style={{ textAlign: 'right' }}>Tomorrow high<br /><b style={{ fontSize: 20 }}>{tomorrow ? r0(tomorrow.hi) : '—'}°F</b></div></div>
                </>
              )}
            </Card>
            <Card title="Vehicle Status" icon="vehicle">
              <img className="photo h110" src={IMG.truck} alt="Truck" />
              {needPlug ? (
                <>
                  <div className={`status-box ${!needPlug.plugged && low !== null && low <= needPlug.threshold ? 'bad' : 'ok'}`} style={{ marginTop: 10 }}>
                    <Icon n="plug" size={24} /><div><b style={{ fontSize: 12 }}>{needPlug.name}</b><div style={{ fontWeight: 700 }} className={needPlug.plugged ? 'down' : 'up'}>{needPlug.plugged ? 'PLUGGED IN' : low !== null && low <= needPlug.threshold ? 'PLUG IN TONIGHT' : 'Not plugged in'}</div><div className="mu sm">Threshold {needPlug.threshold}°F · low {low !== null ? r0(low) : '—'}°F</div></div>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}><button className="btn sm" style={{ flex: 1 }} onClick={() => dispatch({ type: 'updVehicle', id: needPlug.id, patch: { plugged: !needPlug.plugged } })}>{needPlug.plugged ? 'Mark unplugged' : 'Mark plugged in'}</button><button className="btn sm" onClick={() => nav.go('vehicles')}>All</button></div>
                  {plugged && plugged.id !== needPlug.id && <div className="mu sm" style={{ marginTop: 6 }}>{plugged.name}: plugged in ✓</div>}
                </>
              ) : <Empty>No vehicles</Empty>}
            </Card>
            <Card title="Outage Readiness" icon="outage">
              <img className="photo h110" src={IMG.generator} alt="Generator" />
              {sel && (
                <>
                  <div className={`status-box ${gen >= 8 ? 'ok' : 'wn'}`} style={{ marginTop: 10 }}><Icon n="bolt" size={24} /><div><h4>{gen >= 8 ? 'READY' : 'LOW GEN FUEL'}</h4><div className="sm mu">Generator {sel.genGal} gal · est. {r0(gen)}h runtime</div></div></div>
                  <button className="btn block" style={{ marginTop: 8 }} onClick={() => nav.go('outage', { propId: sel.id })}>Enter Outage Mode <Icon n="arrow" size={15} /></button>
                </>
              )}
            </Card>
            <Card title="Air & Burn Status" icon="air">
              {!air ? <Loading /> : (
                <>
                  <div className="mu sm">North Pole / Fairbanks</div>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <div><div className="mu sm">PM2.5</div><div className="big">{r0(pm)}<small className="mu sm"> µg/m³</small></div></div>
                    <div style={{ flex: 1 }}><Gauge value={pm} max={55} label={cat.label} color={cat.color} /></div>
                  </div>
                  <div className={`status-box ${airInfo?.stage ? 'wn' : 'ok'}`}><Icon n="shield" size={22} /><div><div className="mu sm">EST. DEC STATUS</div><h4>{airInfo?.stage ? `Stage ${airInfo.stage}` : 'No stage'}</h4></div></div>
                  <button className="btn block" style={{ marginTop: 8 }} onClick={() => nav.go('air')}>View Details <Icon n="arrow" size={15} /></button>
                </>
              )}
            </Card>
          </div>

          <Card title="My Properties" icon="props" style={{ gridColumn: 'span 4' }} right={<button className="btn sm" onClick={nav.add}><Icon n="plus" size={14} />Add</button>}>
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="chips">{[['all', `All (${counts.all})`], ['ready', `Ready (${counts.ready})`], ['attention', `Attention (${counts.attention})`], ['critical', `Critical (${counts.critical})`]].map(([k, l]) => <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}</div>
              <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 80, padding: '5px 10px' }} aria-label="Search properties" />
            </div>
            <div className="pgrid">
              {shown.map((p) => <PropCard key={p.id} p={p} st={states[p.id] || { status: 'unknown' }} w={live.wx?.[props.indexOf(p)]} onClick={() => nav.open(p.id)} />)}
            </div>
            {!shown.length && <Empty>No matching properties</Empty>}
          </Card>

          <Card title="Winter Prep" icon="prep" style={{ gridColumn: 'span 2' }} className="half">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Ring pct={pct} size={92} color="#22c55e"><div><b style={{ fontFamily: 'Rajdhani', fontSize: 24 }}>{pct}%</b><div className="mu" style={{ fontSize: 9 }}>Complete</div></div></Ring>
              <div className="sm" style={{ lineHeight: 1.9 }}><div><span style={{ color: 'var(--ok)' }}>●</span> {done} Done</div><div><span style={{ color: 'var(--wn)' }}>●</span> {pending} Pending</div><div><span style={{ color: 'var(--er)' }}>●</span> {overdue} Overdue</div></div>
            </div>
            <button className="btn block" style={{ marginTop: 10 }} onClick={() => nav.go('prep')}>Open Checklist</button>
          </Card>

          <Card title="Properties" icon="props" style={{ gridColumn: 'span 2' }} className="half">
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <div style={{ textAlign: 'center' }}><div className="big" style={{ fontSize: 46 }}>{props.length}</div><div className="mu sm">Total</div></div>
              <div className="sm" style={{ lineHeight: 1.9 }}><div><span style={{ color: 'var(--ok)' }}>●</span> {counts.ready} Ready</div><div><span style={{ color: 'var(--wn)' }}>●</span> {counts.attention} Attention</div><div><span style={{ color: 'var(--er)' }}>●</span> {counts.critical} Critical</div></div>
            </div>
            <button className="btn block" style={{ marginTop: 10 }} onClick={() => nav.go('properties')}>View Properties</button>
          </Card>

          <Card title={`Today's Alerts`} icon="alerts" style={{ gridColumn: 'span 4' }} right={<span className="mu sm">{active.length} active</span>}>
            {active.slice(0, 3).map((a) => <div key={a.id} className={`alert-i ${a.sev}`}><div className="ic"><Icon n={a.icon} size={16} /></div><div><b>{a.title}</b><span>{a.text}</span></div></div>)}
            {!active.length && <Empty>All clear — no active alerts.</Empty>}
            <button className="btn block" onClick={() => nav.go('alerts')}>View All Alerts</button>
          </Card>

          <Card title="Fuel Insights" icon="fuel" style={{ gridColumn: 'span 4' }}>
            {sel && st && !st.empty ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="kpi"><span>Avg burn</span><b>{r1(st.burn7)}</b><small>gal/day (7d)</small></div>
                  <div className="kpi"><span>K-factor</span><b>{r1(st.k * 100) / 100}</b><small>{st.kLearned ? `learned · ${st.kSamples} samples` : 'default · log more'}</small></div>
                </div>
                <Chart height={90} type="bar" label="Fuel level history" data={{ labels: st.lv.slice(-14).map((l) => fmtDate(l.t)), datasets: [{ data: st.lv.slice(-14).map((l) => r0(l.gal)), backgroundColor: st.lv.slice(-14).map((l) => (l.kind === 'fill' ? '#22c55e' : '#38bdf8')), borderRadius: 3 }] }} options={{ scales: { x: { display: false }, y: { display: false } } }} />
                <button className="btn block" onClick={() => nav.go('fuel')} style={{ marginTop: 8 }}>View History</button>
              </>
            ) : <Empty>Log readings to see insights.</Empty>}
          </Card>

          <Card title="Regional Map — live temperature & fuel status" icon="pin" style={{ gridColumn: 'span 12' }}>
            <MapView items={mapItems} height={320} onPick={nav.open} />
          </Card>
        </div>
      )}
    </>
  );
}
