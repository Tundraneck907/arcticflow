import { prepWx, propState, tonightLow, minTemp, airStage } from '../src/lib/model.js';
import { akMs, fmtDate } from '../src/lib/util.js';

const { GIST_ID, NTFY_TOPIC, GH_TOKEN, DRY_RUN } = process.env;
if (!GIST_ID || !NTFY_TOPIC) { console.error('GIST_ID and NTFY_TOPIC are required'); process.exit(1); }

const getJson = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { 'User-Agent': 'arcticflow-alerts', ...headers } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.json();
};

const gist = await getJson(`https://api.github.com/gists/${GIST_ID}`, GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {});
const file = gist.files['arcticflow-backup.json'];
if (!file) throw new Error('arcticflow-backup.json not found in gist');
const data = JSON.parse(file.truncated ? await (await fetch(file.raw_url)).text() : file.content);
const { props = [], vehicles = [], entries = [], tasks = [] } = data;
const settings = { lowFuelPct: 40, leadDays: 3, stage1: 30, stage2: 35, homeId: props[0]?.id, ...data.settings };
if (!props.length) { console.log('No properties in backup; nothing to check.'); process.exit(0); }

const q = new URLSearchParams({
  latitude: props.map((p) => p.lat).join(','), longitude: props.map((p) => p.lon).join(','),
  current: 'temperature_2m', hourly: 'temperature_2m',
  daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean',
  temperature_unit: 'fahrenheit', timezone: 'America/Anchorage', past_days: '45', forecast_days: '14',
});
const wxRaw = await getJson(`https://api.open-meteo.com/v1/forecast?${q}`);
const wx = (Array.isArray(wxRaw) ? wxRaw : [wxRaw]).map(prepWx);
const nowMs = wx[0].nowMs;
const day = new Date(nowMs).getUTCDate();

const out = [];
props.forEach((p, i) => {
  const s = propState(p, entries, wx[i], settings, nowMs);
  if (!s || !p.cap || s.empty) return;
  if (s.pct < settings.lowFuelPct) out.push({ sev: s.status === 'critical' ? 'high' : 'default', title: `Low fuel - ${p.name}`, text: `${Math.round(s.pct)}% (${Math.round(s.level)} gal), about ${s.daysLeft.toFixed(1)} days left. Order by ${fmtDate(new Date(s.orderBy).toISOString())}.` });
  const m = minTemp(wx[i], 72);
  if (m <= -30) out.push({ sev: 'default', title: `Deep cold - ${p.name}`, text: `Forecast low ${Math.round(m)}F within 72 hours. Check heat, pipes and block heaters.` });
});
const home = Math.max(0, props.findIndex((p) => p.id === settings.homeId));
const low = tonightLow(wx[home]);
vehicles.forEach((v) => {
  if (low !== null && low <= v.threshold && !v.plugged) out.push({ sev: 'default', title: `Plug in - ${v.name}`, text: `Low tonight ${Math.round(low)}F, below your ${v.threshold}F threshold.` });
});
const od = tasks.filter((t) => !t.done && t.due < new Date(nowMs).toISOString().slice(0, 10)).length;
if (od) out.push({ sev: 'default', title: `${od} overdue winter-prep task${od > 1 ? 's' : ''}`, text: 'Open the Winter Prep checklist to catch up.' });

try {
  const aq = await getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${props[home].lat}&longitude=${props[home].lon}&current=pm2_5&hourly=pm2_5&timezone=America%2FAnchorage&forecast_days=2`);
  const a = airStage(aq, settings);
  if (a.stage > 0) out.push({ sev: 'default', title: `Air quality: estimated Stage ${a.stage}`, text: `Forecast 24h PM2.5 average ${a.avg24.toFixed(0)} ug/m3. Check the official DEC / borough notice before burning wood.` });
} catch (e) { console.warn('air quality skipped:', e.message); }

const seen = new Set();
for (const p of props) {
  try {
    const j = await getJson(`https://api.weather.gov/alerts/active?point=${p.lat.toFixed(4)},${p.lon.toFixed(4)}`, { Accept: 'application/geo+json' });
    j.features.forEach(({ properties: a }) => {
      if (seen.has(a.id)) return; seen.add(a.id);
      out.push({ sev: /warning/i.test(a.event) ? 'high' : 'default', title: a.event, text: a.headline || (a.description || '').slice(0, 160) });
    });
  } catch (e) { console.warn('NWS skipped:', e.message); }
}

const ascii = (s) => s.replace(/[^\x20-\x7e]+/g, '-');
const recent = new Set();
try {
  const r = await fetch(`https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}/json?poll=1&since=24h`);
  (await r.text()).split('\n').filter(Boolean).forEach((l) => { const m = JSON.parse(l); recent.add(`${m.title}|${m.message}`); });
} catch (e) { console.warn('could not read ntfy history; may resend:', e.message); }

let sent = 0;
for (const a of out) {
  const title = ascii(`ArcticFlow: ${a.title}`);
  if (recent.has(`${title}|${a.text}`)) { console.log('skip (sent <24h ago):', title); continue; }
  console.log('push:', title, '-', a.text);
  if (!DRY_RUN) await fetch(`https://ntfy.sh/${encodeURIComponent(NTFY_TOPIC)}`, { method: 'POST', headers: { Title: title, Priority: a.sev, Tags: 'snowflake' }, body: a.text });
  sent++;
}
console.log(`${out.length} active alert(s), ${sent} ${DRY_RUN ? 'would be ' : ''}pushed.`);
