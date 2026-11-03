import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const col = { ready: '#22c55e', attention: '#f59e0b', critical: '#ef4444', na: '#64748b', unknown: '#64748b' };

export default function MapView({ items, onPick, height = 300, zoom = 8 }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([64.85, -147.5], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 14, className: 'osm-tiles', attribution: '© OpenStreetMap contributors' }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);
  useEffect(() => {
    layer.current.clearLayers();
    const pts = [];
    items.forEach((it) => {
      const c = col[it.status] || '#64748b';
      const icon = L.divIcon({ className: '', iconSize: [64, 28], iconAnchor: [32, 14], html: `<div class="map-pin" style="border-color:${c};box-shadow:0 0 14px ${c}88"><i style="background:${c}"></i>${it.temp != null ? Math.round(it.temp) + '°' : '—'}</div>` });
      const m = L.marker([it.lat, it.lon], { icon, title: it.name }).addTo(layer.current);
      m.bindTooltip(`${it.name}${it.sub ? ' · ' + it.sub : ''}`, { direction: 'top', offset: [0, -14] });
      m.on('click', () => onPick && onPick(it.id));
      pts.push([it.lat, it.lon]);
    });
    if (pts.length > 1) map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 10 });
  }, [items]); // eslint-disable-line
  return <div ref={el} className="map" style={{ height }} />;
}
