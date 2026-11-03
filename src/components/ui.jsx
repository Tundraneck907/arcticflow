import React, { useEffect } from 'react';

const I = {
  dash: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z', props: 'M3 21V9l9-6 9 6v12h-7v-6h-4v6z', fuel: 'M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M5 21h10M15 9h2a2 2 0 012 2v6a1.5 1.5 0 003 0V9l-3-3M8 7h4',
  weather: 'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  outage: 'M13 2L4 14h7l-1 8 9-12h-7z', air: 'M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h8', vehicle: 'M3 14l2-6a2 2 0 012-1h10a2 2 0 012 1l2 6v4h-3v-2H6v2H3zM7 14h.01M17 14h.01',
  prep: 'M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1L19.1 4.9', history: 'M4 4v6h6M4.5 15a8 8 0 100-6', calc: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  alerts: 'M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0', settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .7-1.6-1L15 4h-4l-.4 2.7-1.6 1L7 7l-2 4 2 1v1.5L5 15l2 4 2-.7 1.6 1L11 22h4l.4-2.7 1.6-1 2 .7 2-4-2-1z',
  plug: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0zM12 18v4', snow: 'M12 2v20M4.9 7l14.2 10M4.9 17L19.1 7', check: 'M5 13l4 4L19 7', nws: 'M12 3l10 18H2z M12 10v5 M12 18h.01',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5', plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', refresh: 'M20 11a8 8 0 10-2 6M20 4v7h-7', download: 'M12 3v12M7 10l5 5 5-5M4 21h16', upload: 'M12 15V3M7 8l5-5 5 5M4 21h16', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
  shield: 'M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z', arrow: 'M5 12h14M13 6l6 6-6 6', chev: 'M9 6l6 6-6 6', pin: 'M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  aurora: 'M3 18c4-10 6-2 9-10s6 4 9-6', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
};
export const Icon = ({ n, size = 18, stroke = 1.8, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d={I[n] || I.dash} /></svg>
);

export const Card = ({ title, icon, right, children, className = '', onClick, ...p }) => (
  <section className={`card ${className}`} onClick={onClick} {...p}>
    {(title || right) && <header className="card-h"><h3>{icon && <Icon n={icon} size={15} />}{title}</h3>{right}</header>}
    {children}
  </section>
);

export const Pill = ({ kind = 'ready', children }) => <span className={`pill ${kind}`}><i />{children}</span>;
export const STATUS = { ready: 'READY', attention: 'ATTENTION', critical: 'CRITICAL', na: 'N/A', unknown: 'NO DATA' };

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 920 } : null} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon n="x" /></button></header>
        <div className="modal-b">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, children, hint }) => <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;

export const Loading = ({ text = 'Loading live data…' }) => <div className="loading"><span className="spin" />{text}</div>;
export const Empty = ({ children }) => <div className="empty">{children}</div>;

export function Ring({ pct, size = 110, color = '#22c55e', children }) {
  const r = 44, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r={r} className="ring-bg" /><circle cx="50" cy="50" r={r} className="ring-fg" stroke={color} strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 50 50)" /></svg>
      <div className="ring-c">{children}</div>
    </div>
  );
}

export function Gauge({ value, max = 60, label, color }) {
  const a = Math.min(1, (value ?? 0) / max);
  const R = 52, L = Math.PI * R;
  return (
    <svg viewBox="0 0 140 86" className="gauge" role="img" aria-label={`${label}: ${value}`}>
      <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stopColor="#22c55e" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" /></linearGradient></defs>
      <path d="M18 70 A52 52 0 0 1 122 70" fill="none" stroke="rgba(120,160,220,.18)" strokeWidth="11" strokeLinecap="round" />
      <path d="M18 70 A52 52 0 0 1 122 70" fill="none" stroke="url(#gg)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${a * L} ${L}`} />
      <text x="70" y="58" textAnchor="middle" className="gauge-v" fill={color}>{label}</text>
    </svg>
  );
}
