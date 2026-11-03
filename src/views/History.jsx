import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Empty } from '../components/ui';
import Chart from '../components/Chart';
import { download, fmtDT, money, r0, r1, uid, akMs } from '../lib/util';

export default function History() {
  const { state, dispatch } = useApp();
  const [pid, setPid] = useState('all');
  const [kind, setKind] = useState('all');
  const file = useRef(null);
  const rows = useMemo(() => state.entries.filter((e) => (pid === 'all' || e.propId === pid) && (kind === 'all' || e.kind === kind)).sort((a, b) => (a.t < b.t ? 1 : -1)), [state.entries, pid, kind]);
  const name = (id) => state.props.find((p) => p.id === id)?.name || '(deleted)';
  const fills = state.entries.filter((e) => e.kind === 'fill' && (pid === 'all' || e.propId === pid));
  const byMonth = {};
  fills.forEach((f) => { const m = f.t.slice(0, 7); byMonth[m] = byMonth[m] || { gal: 0, usd: 0 }; byMonth[m].gal += +f.gallons || 0; byMonth[m].usd += (+f.gallons || 0) * (+f.price || 0); });
  const months = Object.keys(byMonth).sort();
  const totals = fills.reduce((a, f) => ({ gal: a.gal + (+f.gallons || 0), usd: a.usd + (+f.gallons || 0) * (+f.price || 0) }), { gal: 0, usd: 0 });

  const csv = () => {
    const head = 'date,property,type,gauge_pct,gallons,price_per_gal,note';
    const body = rows.map((e) => [e.t, `"${name(e.propId)}"`, e.kind, e.gauge ?? '', e.gallons ?? '', e.price ?? '', `"${String(e.note || '').replace(/"/g, '""')}"`].join(','));
    download('arcticflow-fuel-log.csv', [head, ...body].join('\n'), 'text/csv');
  };
  const importCsv = async (ev) => {
    const text = await ev.target.files[0].text();
    const lines = text.trim().split(/\r?\n/).slice(1);
    let n = 0;
    lines.forEach((ln) => {
      const c = ln.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((s) => s.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
      const prop = state.props.find((p) => p.name === c[1]);
      if (!prop || !c[0] || !['reading', 'fill'].includes(c[2])) return;
      dispatch({ type: 'addEntry', entry: { propId: prop.id, t: c[0].slice(0, 16), kind: c[2], gauge: c[3] === '' ? null : +c[3], gallons: c[4] === '' ? null : +c[4], price: c[5] === '' ? null : +c[5], note: c[6] || 'Imported' } });
      n++;
    });
    alert(`Imported ${n} entries (property names must match exactly).`);
    ev.target.value = '';
  };

  return (
    <>
      <div className="pagehead"><div><h1>History & Reports</h1><p>Every reading and delivery, with spend by month. Export for taxes, rental accounting or your fuel vendor.</p></div>
        <div className="row"><select value={pid} onChange={(e) => setPid(e.target.value)} style={{ width: 'auto' }} aria-label="Property"><option value="all">All properties</option>{state.props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 'auto' }} aria-label="Type"><option value="all">All entries</option><option value="fill">Deliveries</option><option value="reading">Readings</option></select>
          <button className="btn" onClick={csv}><Icon n="download" size={15} />Export CSV</button><button className="btn" onClick={() => file.current.click()}><Icon n="upload" size={15} />Import CSV</button><input ref={file} type="file" accept=".csv" hidden onChange={importCsv} /></div></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
        <Card title="Spend by month" icon="calc">
          {months.length ? <Chart height={220} type="bar" label="Fuel spend by month" data={{ labels: months, datasets: [{ label: 'Spend $', data: months.map((m) => Math.round(byMonth[m].usd)), backgroundColor: 'rgba(255,154,31,.7)', borderRadius: 5 }] }} options={{ plugins: { tooltip: { callbacks: { label: (c) => money(c.parsed.y) } } } }} /> : <Empty>No deliveries logged.</Empty>}
          <div className="row" style={{ gap: 26, marginTop: 10 }}><div className="kpi"><span>Gallons</span><b>{r0(totals.gal)}</b></div><div className="kpi"><span>Spend</span><b>{money(totals.usd)}</b></div><div className="kpi"><span>Avg $/gal</span><b>{totals.gal ? money(totals.usd / totals.gal) : '—'}</b></div></div>
        </Card>
        <Card title="Price paid per delivery" icon="fuel">
          {fills.length ? <Chart height={220} label="Price per gallon" data={{ labels: [...fills].sort((a, b) => (a.t < b.t ? -1 : 1)).map((f) => f.t.slice(5, 10)), datasets: [{ label: '$/gal', data: [...fills].sort((a, b) => (a.t < b.t ? -1 : 1)).map((f) => f.price), borderColor: '#22c55e', tension: .3 }] }} /> : <Empty>No prices yet.</Empty>}
        </Card>
      </div>
      <Card title={`Entries (${rows.length})`} icon="history" style={{ marginTop: 14 }}>
        <div className="tbl-wrap"><table><thead><tr><th>When</th><th>Property</th><th>Type</th><th>Gauge</th><th>Gallons</th><th>$/gal</th><th>Note</th><th /></tr></thead><tbody>
          {rows.slice(0, 300).map((e) => <tr key={e.id}><td>{fmtDT(e.t)}</td><td>{name(e.propId)}</td><td>{e.kind === 'fill' ? 'Delivery' : 'Reading'}</td><td>{e.gauge != null ? e.gauge + '%' : '—'}</td><td>{e.gallons ?? '—'}</td><td>{e.price ? money(e.price) : '—'}</td><td className="mu">{e.note}</td><td><button className="icon-btn" aria-label="Delete entry" onClick={() => dispatch({ type: 'delEntry', id: e.id })}><Icon n="trash" size={13} /></button></td></tr>)}
        </tbody></table>{!rows.length && <Empty>No entries.</Empty>}</div>
      </Card>
    </>
  );
}
