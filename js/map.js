'use strict';

let map = null;
let markerLayer = null;
let clickMode = false;

document.addEventListener('DOMContentLoaded', function() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  initMap();
});

function initMap() {
  map = L.map('map', { zoomControl: false, maxZoom: 19, minZoom: 10 }).setView([31.5204, 74.3587], 13);
  window.LSCW_MAP = map;
  
  // CartoDB tiles - Free, no block, with labels
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);
  
  // Zoom control bottom-right
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
  
  window.loadAllMarkers = function() {
    markerLayer.clearLayers();
    const reports = LSCW.getReports();
    const session = LSCW.getSession();
    reports.forEach(report => {
      if (session && session.role === 'admin') { addMarkerToMap(report); }
      else if (session && report.reporterId === session.userId) { addMarkerToMap(report); }
    });
  };
  
  window.addMarkerToMap = function(report) {
    const marker = L.marker([report.lat, report.lng], { icon: makeMarkerIcon(report.category, report.status, report.priority) }).addTo(markerLayer);
    marker.bindPopup(`<div style="min-width:200px;padding:8px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="font-size:18px">${categoryIcons[report.category]||'📍'}</span><span style="font-weight:700">${LSCW.sanitise(report.category)}</span></div><p style="font-size:12px;color:#475569;margin-bottom:8px">${LSCW.sanitise(report.description).substring(0,100)}...</p><p style="font-size:11px;color:#64748b">📍 ${LSCW.sanitise(report.zone||'Lahore')}</p><div style="display:flex;align-items:center;gap:6px;margin:8px 0"><span class="status-dot ${report.status==='pending'?'pending':report.status==='resolved'?'resolved':'progress'}"></span><span style="font-size:11px;font-weight:600">${report.status}</span></div><p style="font-size:10px;color:#94a3b8">${report.reportId}</p></div>`, { maxWidth: 260 });
    return marker;
  };
  
  map.on('click', function(e) { if (clickMode) { clickMode = false; if (typeof openReportModal === 'function') openReportModal(e.latlng); const hint = document.getElementById('mapHint'); if (hint) hint.style.display = 'none'; } });
  loadAllMarkers();
}

window.addReportMarker = function(report) { if (markerLayer && map) { const marker = addMarkerToMap(report); map.flyTo([report.lat, report.lng], 16, { duration: 0.8 }); marker.openPopup(); } };
window.enableClickMode = function() { clickMode = true; const hint = document.getElementById('mapHint'); if (hint) hint.style.display = 'flex'; };