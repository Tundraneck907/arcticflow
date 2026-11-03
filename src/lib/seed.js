import { akMs, msToAK, uid } from './util';
import { hddBetween } from './model';
import img from './images';

export const PROPERTY_TYPES = ['Primary Home', 'Rental', 'Airbnb / VRBO', 'Cabin', 'Dry Cabin', 'Mobile Home / Trailer', 'Shop / Garage', 'Vacant Property', 'Commercial'];

const P = (o) => ({ cooldown: 2.8, indoor: 66, genGal: 11.5, genGph: 0.68, notes: '', fuelType: 'Heating oil #1', ...o });
export const SEED_PROPS = [
  P({ id: 'p1', name: 'Primary Home', place: 'Fairbanks, AK', type: 'Primary Home', img: 'home', lat: 64.8378, lon: -147.7164, cap: 400, k: 4.98, target: 42 }),
  P({ id: 'p2', name: 'Riverside Cabin', place: 'Chena River', type: 'Cabin', img: 'cabin', lat: 64.9226, lon: -146.9, cap: 400, k: 4.4, target: 78, cooldown: 3.4 }),
  P({ id: 'p3', name: 'North Pole Rental', place: 'North Pole, AK', type: 'Rental', img: 'rental', lat: 64.7512, lon: -147.3494, cap: 400, k: 5.6, target: 35 }),
  P({ id: 'p4', name: 'Dry Cabin', place: 'Ester Dome', type: 'Dry Cabin', img: 'drycabin', lat: 64.8667, lon: -148.0, cap: 0, k: 4.5, fuelType: 'Wood / none', cooldown: 4.2 }),
  P({ id: 'p5', name: 'Airbnb Chalet', place: 'Chatanika', type: 'Airbnb / VRBO', img: 'chalet', lat: 65.1, lon: -147.47, cap: 410, k: 4.7, target: 65 }),
  P({ id: 'p6', name: 'Trailer', place: 'Work Site, Fox', type: 'Mobile Home / Trailer', img: 'trailer', lat: 64.9575, lon: -147.6244, cap: 220, k: 3.2, target: 18, cooldown: 5.2, fuelType: 'Diesel #1' }),
];

export const SEED_VEHICLES = [
  { id: 'v1', name: '2010 Duramax', kind: 'truck', img: 'truck', threshold: 5, plugged: false, notes: 'Block heater + battery warmer' },
  { id: 'v2', name: 'Subaru Outback', kind: 'car', img: null, threshold: 10, plugged: true, notes: '' },
  { id: 'v3', name: 'Work Truck', kind: 'truck', img: 'truck', threshold: 5, plugged: false, notes: 'Job-site rig' },
];

const task = (cat, title, due, done) => ({ id: uid(), cat, title, due, done });
export function seedTasks() {
  const y = new Date().getUTCFullYear();
  const d = (m, dd) => `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const cats = {
    Heating: ['Annual furnace / boiler service', 'Replace fuel filter', 'Bleed & test fuel lines', 'Check tank gauge & vent cap', 'Clean chimney / stack', 'Stock spare nozzle & filter', 'Fuel delivery schedule set'],
    'Water & Plumbing': ['Heat tape tested', 'Insulate exposed pipes', 'Winterize outdoor spigots', 'Drain RV / trailer lines', 'Check water tank heater', 'Pipe-freeze alarm battery'],
    Power: ['Generator test run', 'Fresh generator fuel + stabilizer', 'Transfer switch inspection', 'Battery backup charged', 'Extension cords & outlets checked', 'Solar / inverter check'],
    Vehicle: ['Block heater cords inspected', 'Winter tires mounted', 'Battery load test', 'Winter fluids & wipers', 'Emergency kit stocked'],
    'Home Exterior': ['Clean gutters', 'Roof snow-load check', 'Seal windows & doors', 'Skirting / belly-board repair', 'Stock ice melt & shovels', 'Snow-machine / plow serviced'],
    Safety: ['Smoke detectors tested', 'CO detectors tested', 'Fire extinguishers inspected', 'Emergency numbers posted', 'Wood-stove clearances checked'],
    Supplies: ['Firewood stacked', 'Emergency food & water', 'Propane / backup heater fuel', 'Sleeping bags rated to -40'],
  };
  const overdue = new Set(['Replace fuel filter', 'Heat tape tested', 'Generator test run', 'Roof snow-load check']);
  const pending = new Set(['Clean chimney / stack', 'Winter tires mounted', 'Skirting / belly-board repair', 'Firewood stacked', 'Solar / inverter check', 'Check water tank heater']);
  const out = [];
  let i = 0;
  Object.entries(cats).forEach(([cat, list]) => list.forEach((t) => {
    i++;
    if (overdue.has(t)) out.push(task(cat, t, d(10, 5 + (i % 18)), false));
    else if (pending.has(t)) out.push(task(cat, t, d(11, 8 + (i % 20)), false));
    else out.push(task(cat, t, d(9, 1 + (i % 25)), true));
  }));
  return out;
}

function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }

export function seedLogs(props, wxList, nowMs) {
  const out = [];
  props.forEach((p, idx) => {
    if (!p.cap) return;
    const w = wxList[idx] || wxList[0];
    const rand = rng(1234 + idx * 77);
    const step = 2 * 86400000;
    const price = 4.19 + idx * 0.07;
    let t = nowMs - 3 * 3600000;
    let gal = (p.target / 100) * p.cap;
    out.push({ id: uid(), propId: p.id, t: msToAK(t), kind: 'reading', gauge: Math.round(p.target), price: null, gallons: null, note: 'Demo data' });
    for (let i = 0; i < 20; i++) {
      const t0 = t - step;
      const burn = (hddBetween(w, t0, t) / p.k) * (0.96 + rand() * 0.08);
      let g0 = gal + burn;
      if (g0 > 0.92 * p.cap) {
        const low = (0.14 + rand() * 0.06) * p.cap;
        const tf = t0 + 12 * 3600000;
        const afterGal = Math.min(0.93 * p.cap, gal + hddBetween(w, tf, t) / p.k);
        const gallons = Math.round(afterGal - (low - hddBetween(w, t0, tf) / p.k));
        out.push({ id: uid(), propId: p.id, t: msToAK(tf), kind: 'fill', gauge: Math.round((afterGal / p.cap) * 100), gallons, price: +(price - i * 0.004).toFixed(2), note: 'Demo delivery' });
        g0 = low;
      }
      gal = g0; t = t0;
      out.push({ id: uid(), propId: p.id, t: msToAK(t), kind: 'reading', gauge: Math.round((gal / p.cap) * 100), price: null, gallons: null, note: 'Demo data' });
    }
  });
  return out;
}

export function syntheticWx(nowMs) {
  const tms = [], temps = [];
  for (let h = -45 * 24; h < 14 * 24; h++) { const t = nowMs - (nowMs % 3600000) + h * 3600000; tms.push(t); temps.push(10 + 8 * Math.sin((h % 24) / 24 * 6.28)); }
  return { tms, temps };
}
