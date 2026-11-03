import React, { useEffect, useRef } from 'react';
import ChartJS from 'chart.js/auto';

ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.font.size = 11;

export function themeColors() {
  const dark = document.documentElement.dataset.theme !== 'light';
  return { text: dark ? '#9fb4cf' : '#475569', grid: dark ? 'rgba(120,160,220,.12)' : 'rgba(15,23,42,.08)', tip: dark ? '#0b1730' : '#ffffff', tipText: dark ? '#e6f0ff' : '#0f172a' };
}

export default function Chart({ type = 'line', data, options = {}, height = 200, label }) {
  const ref = useRef(null);
  const chart = useRef(null);
  useEffect(() => {
    const c = themeColors();
    const base = {
      plugins: { legend: { display: false, labels: { color: c.text, boxWidth: 10, usePointStyle: true } }, tooltip: { backgroundColor: c.tip, titleColor: c.tipText, bodyColor: c.tipText, borderColor: 'rgba(56,189,248,.4)', borderWidth: 1, padding: 10 } },
      scales: type === 'doughnut' ? {} : { x: { ticks: { color: c.text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }, grid: { color: c.grid } }, y: { ticks: { color: c.text }, grid: { color: c.grid } } },
    };
    const o = options;
    const scales = { ...base.scales };
    Object.entries(o.scales || {}).forEach(([k, v]) => { scales[k] = { ...(scales[k] || { ticks: { color: c.text }, grid: { color: c.grid } }), ...v }; });
    const plugins = { ...base.plugins };
    Object.entries(o.plugins || {}).forEach(([k, v]) => { plugins[k] = { ...(plugins[k] || {}), ...v }; });
    const opts = { responsive: true, maintainAspectRatio: false, animation: { duration: 500 }, interaction: { mode: 'index', intersect: false }, ...o, plugins, scales };
    if (chart.current) chart.current.destroy();
    chart.current = new ChartJS(ref.current, { type, data, options: opts });
    return () => { chart.current && chart.current.destroy(); chart.current = null; };
  }, [JSON.stringify(data), JSON.stringify(options), type, document.documentElement.dataset.theme]); // eslint-disable-line
  return <div style={{ height, position: 'relative' }}><canvas ref={ref} role="img" aria-label={label || 'chart'} /></div>;
}
