import React from 'react';
import { useApp } from '../store';
import { Card, Icon, Empty } from '../components/ui';

export default function Alerts({ nav }) {
  const { alerts, state, dispatch, live } = useApp();
  const active = alerts.filter((a) => !state.dismissed.includes(a.id));
  const gone = alerts.filter((a) => state.dismissed.includes(a.id));
  async function enableNotify() {
    if (!('Notification' in window)) return alert('This browser does not support notifications.');
    const perm = await Notification.requestPermission();
    dispatch({ type: 'settings', patch: { notify: perm === 'granted' } });
    if (perm !== 'granted') alert('Notifications were not allowed in the browser.');
  }
  return (
    <>
      <div className="pagehead"><div><h1>Alerts</h1><p>Generated live from your fuel levels, forecast, vehicles, air quality and National Weather Service warnings.</p></div>
        <div className="row"><button className="btn" onClick={enableNotify}><Icon n="alerts" size={15} />{state.settings.notify ? 'Browser notifications on' : 'Enable browser notifications'}</button>{state.dismissed.length > 0 && <button className="btn" onClick={() => dispatch({ type: 'undismiss' })}>Restore dismissed</button>}</div></div>
      {!active.length && <Empty>All clear. Nothing needs attention right now.</Empty>}
      <div className="grid" style={{ maxWidth: 900 }}>
        {active.map((a) => (
          <div key={a.id} className={`alert-i ${a.sev}`} style={{ padding: 14 }}>
            <div className="ic"><Icon n={a.icon} size={18} /></div>
            <div style={{ flex: 1 }}><b>{a.title}</b><span>{a.text}</span></div>
            <button className="btn sm" onClick={() => dispatch({ type: 'dismiss', id: a.id })}>Dismiss</button>
          </div>
        ))}
      </div>
      {live.alerts.length === 0 && <p className="mu sm" style={{ marginTop: 14 }}>NWS: no active watches, warnings or advisories for your property locations (api.weather.gov).</p>}
      {gone.length > 0 && <p className="mu sm">{gone.length} dismissed.</p>}
    </>
  );
}
