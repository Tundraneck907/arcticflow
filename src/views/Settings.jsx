import React, { useRef, useState } from 'react';
import { useApp } from '../store';
import { Card, Icon, Field } from '../components/ui';
import { useApiStatus, gistSave, gistLoad, githubRateLimit } from '../lib/api';
import { download } from '../lib/util';

export default function Settings() {
  const { state, dispatch, refresh } = useApp();
  const api = useApiStatus();
  const s = state.settings;
  const set = (patch) => dispatch({ type: 'settings', patch });
  const file = useRef(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const snapshot = () => JSON.stringify({ app: 'arcticflow', v: 1, props: state.props, vehicles: state.vehicles, entries: state.entries, tasks: state.tasks, settings: { ...s, ghToken: '', gistId: '' } }, null, 2);

  async function run(fn) { setBusy(true); setMsg(''); try { setMsg(await fn()); } catch (e) { setMsg(`Failed: ${e.message}`); } setBusy(false); }
  const backup = () => run(async () => { const g = await gistSave(s.ghToken, s.gistId, snapshot()); set({ gistId: g.id }); return `Backed up to private gist ${g.id}.`; });
  const restore = () => run(async () => { const d = JSON.parse(await gistLoad(s.ghToken, s.gistId)); if (d.app !== 'arcticflow') throw new Error('Not an ArcticFlow backup'); dispatch({ type: 'import', data: d }); return 'Restored from gist.'; });
  const check = () => run(async () => { const r = await githubRateLimit(s.ghToken); return `GitHub API reachable. ${r.rate.remaining}/${r.rate.limit} requests left this hour${s.ghToken ? ' (authenticated)' : ' (anonymous)'}.`; });

  const importFile = async (e) => {
    try { const d = JSON.parse(await e.target.files[0].text()); if (d.app !== 'arcticflow') throw new Error('not an ArcticFlow export'); dispatch({ type: 'import', data: d }); setMsg('Imported backup file.'); } catch (er) { setMsg(`Import failed: ${er.message}`); }
    e.target.value = '';
  };

  return (
    <>
      <div className="pagehead"><div><h1>Settings</h1><p>Preferences, backups and live-data diagnostics. Everything is stored in this browser; nothing is sent anywhere unless you use GitHub backup.</p></div></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))' }}>
        <Card title="Preferences" icon="settings">
          <div className="grid" style={{ gap: 12 }}>
            <Field label="Theme"><select value={s.theme} onChange={(e) => set({ theme: e.target.value })}><option value="dark">Dark (aurora)</option><option value="light">Light</option></select></Field>
            <Field label="Home location (header weather, vehicle plug-in alerts)"><select value={s.homeId} onChange={(e) => set({ homeId: e.target.value })}>{state.props.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label={`Low-fuel alert below ${s.lowFuelPct}%`}><input type="range" min="10" max="60" step="5" value={s.lowFuelPct} onChange={(e) => set({ lowFuelPct: +e.target.value })} /></Field>
            <Field label="Fuel vendor lead time (days)"><input type="number" min="0" value={s.leadDays} onChange={(e) => set({ leadDays: parseFloat(e.target.value) || 0 })} /></Field>
          </div>
        </Card>

        <Card title="Phone push alerts (free, ntfy.sh)" icon="alerts">
          <p className="sm mu" style={{ marginTop: 0 }}>Install the free <b>ntfy</b> app, subscribe to a private topic name, and enter the same name here. New alerts (low fuel, deep cold, plug-in, air, NWS) are pushed to your phone while ArcticFlow is open in any tab. Anyone who knows the topic name can read it, so make it long and random.</p>
          <Field label="ntfy topic"><input value={s.ntfy || ''} onChange={(e) => set({ ntfy: e.target.value.trim() })} placeholder="arcticflow-yourname-8472" /></Field>
          <div className="row"><button className="btn" disabled={!s.ntfy} onClick={() => fetch(`https://ntfy.sh/${encodeURIComponent(s.ntfy)}`, { method: 'POST', headers: { Title: 'ArcticFlow test' }, body: 'Push alerts are working.' }).then((r) => setMsg(r.ok ? 'Test sent. Check your phone.' : 'ntfy rejected the request.')).catch(() => setMsg('Could not reach ntfy.sh.'))}>Send test</button></div>
        </Card>
        <Card title="GitHub backup (free)" icon="github">
          <p className="sm mu" style={{ marginTop: 0 }}>Back up your logs to a <b>private GitHub Gist</b> using a personal access token with only the <code>gist</code> scope. The token stays in this browser's local storage and is never included in backups.</p>
          <div className="grid" style={{ gap: 10 }}>
            <Field label="GitHub token (gist scope)"><input type="password" autoComplete="off" value={s.ghToken} onChange={(e) => set({ ghToken: e.target.value.trim() })} placeholder="ghp_… or github_pat_…" /></Field>
            <Field label="Gist ID (auto-filled after first backup)"><input value={s.gistId} onChange={(e) => set({ gistId: e.target.value.trim() })} /></Field>
            <div className="row"><button className="btn primary" disabled={busy || !s.ghToken} onClick={backup}><Icon n="upload" size={15} />Back up now</button><button className="btn" disabled={busy || !s.ghToken || !s.gistId} onClick={restore}><Icon n="download" size={15} />Restore</button><button className="btn" disabled={busy} onClick={check}>Test GitHub API</button></div>
            {msg && <div className="callout sm" role="status">{msg}</div>}
          </div>
        </Card>

        <Card title="Data" icon="shield">
          <div className="grid" style={{ gap: 10 }}>
            <div className="row"><button className="btn" onClick={() => download('arcticflow-backup.json', snapshot(), 'application/json')}><Icon n="download" size={15} />Export JSON</button><button className="btn" onClick={() => file.current.click()}><Icon n="upload" size={15} />Import JSON</button><input ref={file} type="file" accept=".json" hidden onChange={importFile} /></div>
            <button className="btn" onClick={() => dispatch({ type: 'clearDemo' })}>Remove demo fuel entries</button>
            <button className="btn warn" onClick={() => confirm('Delete ALL properties, vehicles, logs and tasks from this browser?') && dispatch({ type: 'fresh' })}><Icon n="trash" size={15} />Start fresh (erase everything)</button>
            <button className="btn" onClick={() => confirm('Reload the demo properties and sample data? Your current data will be replaced.') && dispatch({ type: 'reset' })}>Reload demo data</button>
          </div>
        </Card>

        <Card title="Live data sources" icon="refresh" right={<button className="btn sm" onClick={refresh}>Refresh all</button>}>
          <div className="apis">
            {Object.entries(api).map(([n, v]) => <div key={n} className="api"><div><b>{n}</b><br /><code>{v.url.replace('https://', '')}</code></div><span className={v.ok ? 'down' : 'up'} style={{ fontWeight: 700 }}>{v.ok ? `${v.ms} ms` : 'ERR'}</span></div>)}
            {!Object.keys(api).length && <span className="mu sm">Waiting for first requests…</span>}
          </div>
          <p className="mu sm">All keyless, CORS-enabled and free: Open-Meteo (forecast, air quality, geocoding), National Weather Service (api.weather.gov), NOAA SWPC (aurora Kp), GitHub REST API (backup).</p>
        </Card>
      </div>
    </>
  );
}
