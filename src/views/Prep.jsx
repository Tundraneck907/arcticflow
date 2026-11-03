import React, { useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Ring, Field } from '../components/ui';
import { fmtDate } from '../lib/util';

export default function Prep() {
  const { state, dispatch, nowMs } = useApp();
  const { tasks } = state;
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const [filter, setFilter] = useState('all');
  const [f, setF] = useState({ title: '', cat: 'Heating', due: today });
  const cats = [...new Set(tasks.map((t) => t.cat)), ...['Heating', 'Water & Plumbing', 'Power', 'Vehicle', 'Home Exterior', 'Safety', 'Supplies'].filter((c) => !tasks.some((t) => t.cat === c))];
  const done = tasks.filter((t) => t.done).length;
  const od = tasks.filter((t) => !t.done && t.due < today).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const vis = (t) => filter === 'all' || (filter === 'open' && !t.done) || (filter === 'overdue' && !t.done && t.due < today) || (filter === 'done' && t.done);
  return (
    <>
      <div className="pagehead"><div><h1>Winter Prep Checklist</h1><p>Catch freeze-ups and no-heat emergencies before they happen.</p></div><div className="chips">{['all', 'open', 'overdue', 'done'].map((k) => <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}</div></div>
      <div className="grid split">
        <div className="grid" style={{ alignContent: 'start' }}>
          <Card title="Progress" icon="check"><div className="row" style={{ justifyContent: 'center' }}><Ring pct={pct} size={150} color={od ? '#f59e0b' : '#22c55e'}><div><b style={{ fontFamily: 'Rajdhani', fontSize: 38 }}>{pct}%</b><div className="mu sm">{done}/{tasks.length} done</div></div></Ring></div><div className="sm" style={{ textAlign: 'center', marginTop: 10, color: od ? 'var(--er)' : 'var(--ok)' }}>{od ? `${od} overdue` : 'Nothing overdue'}</div></Card>
          <Card title="Add task" icon="plus">
            <div className="grid" style={{ gap: 10 }}>
              <Field label="Task"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Replace tank vent whistle" /></Field>
              <Field label="Category"><select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Due"><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
              <button className="btn primary" disabled={!f.title.trim()} onClick={() => { dispatch({ type: 'addTask', task: { ...f, title: f.title.trim() } }); setF({ ...f, title: '' }); }}>Add task</button>
            </div>
          </Card>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignContent: 'start' }}>
          {cats.filter((c) => tasks.some((t) => t.cat === c && vis(t))).map((c) => {
            const list = tasks.filter((t) => t.cat === c);
            return (
              <Card key={c} title={c} right={<span className="mu sm">{list.filter((t) => t.done).length}/{list.length}</span>}>
                {list.filter(vis).sort((a, b) => a.due.localeCompare(b.due)).map((t) => {
                  const o = !t.done && t.due < today;
                  return <div key={t.id} className={`check ${t.done ? 'done' : ''}`}><input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'toggleTask', id: t.id })} aria-label={t.title} /><div className="sp"><div className="t">{t.title}</div><div className={`due ${o ? 'od' : ''}`}>{o ? 'OVERDUE · ' : 'Due '}{fmtDate(t.due + 'T12:00')}</div></div><button className="icon-btn" aria-label="Delete task" onClick={() => dispatch({ type: 'delTask', id: t.id })}><Icon n="trash" size={13} /></button></div>;
                })}
              </Card>
            );
          })}
          {!tasks.length && <div className="empty">No tasks. Add one on the left.</div>}
        </div>
      </div>
    </>
  );
}
