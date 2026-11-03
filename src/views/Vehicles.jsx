import React, { useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Modal, Field, Empty } from '../components/ui';
import IMG from '../lib/images';
import { tonightLow, minTemp } from '../lib/model';
import { r0 } from '../lib/util';

export default function Vehicles() {
  const { state, dispatch, live } = useApp();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', threshold: 5, kind: 'car' });
  const home = state.props.findIndex((p) => p.id === state.settings.homeId);
  const w = (live.wx && live.wx[Math.max(0, home)]) || live.fbx;
  const low = w ? tonightLow(w) : null;
  const low72 = w ? minTemp(w, 72) : null;
  return (
    <>
      <div className="pagehead"><div><h1>Vehicle Profiles</h1><p>Plug-in reminders from tonight's forecast low at your home location{low !== null ? ` (${r0(low)}°F)` : ''}.</p></div><button className="btn primary" onClick={() => setAdding(true)}><Icon n="plus" size={15} />Add vehicle</button></div>
      {!state.vehicles.length && <Empty>No vehicles. Add one to get plug-in reminders.</Empty>}
      <div className="pc-big">
        {state.vehicles.map((v) => {
          const need = low !== null && low <= v.threshold;
          return (
            <Card key={v.id} className="prop-card">
              {v.img ? <img className="photo h150" src={IMG[v.img]} alt={v.name} style={{ borderRadius: 0, border: 0 }} /> : <div style={{ height: 150, display: 'grid', placeItems: 'center', background: 'rgba(56,189,248,.06)', color: 'var(--ac)' }}><Icon n="vehicle" size={64} stroke={1.2} /></div>}
              <div className="pb">
                <div className="row"><h4 className="sp">{v.name}</h4><button className="icon-btn" aria-label={`Delete ${v.name}`} onClick={() => confirm(`Remove ${v.name}?`) && dispatch({ type: 'delVehicle', id: v.id })}><Icon n="trash" size={14} /></button></div>
                <div className={`status-box ${v.plugged ? 'ok' : need ? 'bad' : ''}`} style={{ marginTop: 10 }}><Icon n="plug" size={22} /><div><b className={v.plugged ? 'down' : need ? 'up' : ''}>{v.plugged ? 'PLUGGED IN' : need ? 'PLUG IN TONIGHT' : 'Unplugged — OK for now'}</b><div className="sm mu">Plug in at or below {v.threshold}°F · tonight {low !== null ? r0(low) : '—'}°F · 72h min {low72 !== null && Number.isFinite(low72) ? r0(low72) : '—'}°F</div></div></div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button className={`btn ${v.plugged ? '' : 'primary'} sp`} onClick={() => dispatch({ type: 'updVehicle', id: v.id, patch: { plugged: !v.plugged } })}>{v.plugged ? 'Unplug' : 'Mark plugged in'}</button>
                  <Field label="Threshold °F"><input type="number" style={{ width: 80, padding: '5px 8px' }} value={v.threshold} onChange={(e) => dispatch({ type: 'updVehicle', id: v.id, patch: { threshold: parseFloat(e.target.value) || 0 } })} /></Field>
                </div>
                <input style={{ marginTop: 10 }} placeholder="Notes (block heater, battery, tires…)" value={v.notes} onChange={(e) => dispatch({ type: 'updVehicle', id: v.id, patch: { notes: e.target.value } })} aria-label="Notes" />
              </div>
            </Card>
          );
        })}
      </div>
      <Card title="Cold-start guide" icon="snow" style={{ marginTop: 14 }}><div className="sm mu" style={{ lineHeight: 1.7 }}>Common Interior Alaska practice: plug in block heaters 2–4 h before starting once temps drop near 0–10°F; use a timer to save power. Diesel: add anti-gel and consider an engine-oil pan heater and battery blanket below -20°F. These are general tips — follow your vehicle's manual.</div></Card>
      {adding && <Modal title="Add vehicle" onClose={() => setAdding(false)}>
        <div className="form-g"><Field label="Name"><input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Plug-in threshold (°F)"><input type="number" value={f.threshold} onChange={(e) => setF({ ...f, threshold: parseFloat(e.target.value) || 0 })} /></Field></div>
        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}><button className="btn" onClick={() => setAdding(false)}>Cancel</button><button className="btn primary" disabled={!f.name.trim()} onClick={() => { dispatch({ type: 'addVehicle', vehicle: { name: f.name.trim(), threshold: f.threshold, kind: 'car' } }); setAdding(false); setF({ name: '', threshold: 5, kind: 'car' }); }}>Add</button></div>
      </Modal>}
    </>
  );
}
