import React, { useId } from 'react';

export default function Tank({ pct = 0, gal = 0, cap = 400, size = 1 }) {
  const id = useId().replace(/:/g, '');
  const p = Math.max(0, Math.min(100, pct));
  const color = p < 20 ? ['#ff5a5f', '#ff2d55'] : p < 40 ? ['#ffb347', '#ff7a18'] : ['#ffc15e', '#ff8a00'];
  const top = 38 + (1 - p / 100) * 124;
  return (
    <svg viewBox="0 0 320 210" className="tank" style={{ width: '100%', maxWidth: 330 * size }} role="img" aria-label={`Tank ${Math.round(p)} percent, ${Math.round(gal)} gallons of ${cap}`}>
      <defs>
        <clipPath id={`c${id}`}><rect x="30" y="38" width="260" height="124" rx="58" /></clipPath>
        <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color[0]} /><stop offset="1" stopColor={color[1]} /></linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" stopOpacity=".5" /><stop offset=".5" stopColor="#38bdf8" stopOpacity=".08" /><stop offset="1" stopColor="#38bdf8" stopOpacity=".25" /></linearGradient>
        <filter id={`b${id}`}><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect x="30" y="38" width="260" height="124" rx="58" fill="#06162e" />
      <g clipPath={`url(#c${id})`}>
        <g style={{ transform: `translateY(${top}px)`, transition: 'transform 1s ease' }}>
          <path className="wave" d="M-320 0 q40 -9 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V200 H-320z" fill={`url(#f${id})`} opacity=".95" />
          <path className="wave2" d="M-300 4 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V200 H-300z" fill={color[0]} opacity=".35" />
        </g>
        {[70, 110, 150, 190, 230, 270].map((x) => <line key={x} x1={x} y1="38" x2={x} y2="162" stroke="#7dd3fc" strokeOpacity=".18" />)}
        {[62, 100, 138].map((y) => <line key={y} x1="30" y1={y} x2="290" y2={y} stroke="#7dd3fc" strokeOpacity=".15" />)}
      </g>
      <rect x="30" y="38" width="260" height="124" rx="58" fill={`url(#g${id})`} stroke="#38bdf8" strokeOpacity=".9" strokeWidth="2.5" />
      <rect x="30" y="38" width="260" height="124" rx="58" fill="none" stroke="#38bdf8" strokeOpacity=".5" strokeWidth="6" filter={`url(#b${id})`} />
      <rect x="95" y="160" width="14" height="30" fill="#0e3a66" stroke="#38bdf8" strokeOpacity=".6" /><rect x="212" y="160" width="14" height="30" fill="#0e3a66" stroke="#38bdf8" strokeOpacity=".6" />
      <rect x="70" y="186" width="70" height="8" rx="3" fill="#0e3a66" stroke="#38bdf8" strokeOpacity=".6" /><rect x="190" y="186" width="70" height="8" rx="3" fill="#0e3a66" stroke="#38bdf8" strokeOpacity=".6" />
      <rect x="150" y="22" width="20" height="16" fill="#0e3a66" stroke="#38bdf8" strokeOpacity=".7" />
      <text x="160" y="106" textAnchor="middle" className="tank-pct" fill="#fff4c9">{Math.round(p)}%</text>
      <text x="160" y="132" textAnchor="middle" className="tank-gal" fill="#e6f0ff">{Math.round(gal)} GAL of {cap}</text>
    </svg>
  );
}
