'use strict';

let map = null;
let markerLayer = null;
let clickMode = false;

document.addEventListener('DOMContentLoaded', function() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  initMap();
});

async function initMap() {
  map = L.map('map', { zoomControl: false, maxZoom: 19, minZoom: 10 }).setView([31.5204, 74.3587], 13);
  window.LSCW_MAP = map;
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  
  const categoryColors = { 'Pothole': '#dc2626', 'Waste': '#475569', 'Water Leak': '#2563eb', 'Street Light': '#d97706', 'Sewerage': '#0891b2', 'Encroachment': '#ea580c', 'Open Manhole': '#1e40af', 'Other': '#64748b' };
  const categoryIcons = { 'Pothole': '🕳️', 'Waste': '🗑️', 'Water Leak': '💧', 'Street Light': '💡', 'Sewerage': '🚽', 'Encroachment': '🏗️', 'Open Manhole': '⚠️', 'Other': '📍' };
  
  window.makeMarkerIcon = function(category, status, priority) {
    const color = status === 'resolved' ? '#059669' : (categoryColors[category] || '#64748b');
    const icon = categoryIcons[category] || '📍';
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="position:relative;width:40px;height:40px"><div style="width:40px;height:40px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${icon}</div>${priority === 'urgent' ? '<div style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;font-size:10px;padding:2px 4px;border-radius:10px;font-weight:700">!</div>' : ''}</div>`,
      iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -20]
    });
  };
  
  window.loadAllMarkers = async function() {
    markerLayer.clearLayers();
    const reports = await LSCW.getReports();
    const session = LSCW.getSession();
    if (Array.isArray(reports)) {
      reports.forEach(report => {
        if (session && session.role === 'admin') { addMarkerToMap(report); }
        else if (session && report.reporterId === session.userId) { addMarkerToMap(report); }
      });
    }
  };
  
  window.addMarkerToMap = function(report) {
    const marker = L.marker([report.lat, report.lng], { icon: makeMarkerIcon(report.category, report.status, report.priority) }).addTo(markerLayer);
    marker.bindPopup(`<div style="min-width:200px;padding:8px"><div style="font-size:18px;font-weight:700">${categoryIcons[report.category]||'📍'} ${LSCW.sanitise(report.category)}</div><p style="font-size:12px;color:#475569">${LSCW.sanitise(report.description).substring(0,100)}...</p><p style="font-size:10px;color:#94a3b8">${report.reportId} | ${report.status}</p></div>`, { maxWidth: 260 });
    return marker;
  };
  
  map.on('click', function(e) { if (clickMode) { clickMode = false; if (typeof openReportModal === 'function') openReportModal(e.latlng); const hint = document.getElementById('mapHint'); if (hint) hint.style.display = 'none'; } });
  await loadAllMarkers();
}

window.addReportMarker = function(report) { if (markerLayer && map) { const marker = addMarkerToMap(report); map.flyTo([report.lat, report.lng], 16, { duration: 0.8 }); marker.openPopup(); } };
window.enableClickMode = function() { clickMode = true; const hint = document.getElementById('mapHint'); if (hint) hint.style.display = 'flex'; };