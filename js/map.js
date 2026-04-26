'use strict';

let map         = null;
let markerLayer = null;
let clickMode   = false;

const CATEGORY_COLORS = {
  'Pothole':      '#dc2626',
  'Waste':        '#475569',
  'Water Leak':   '#2563eb',
  'Street Light': '#d97706',
  'Sewerage':     '#0891b2',
  'Encroachment': '#ea580c',
  'Open Manhole': '#1e40af',
  'Other':        '#64748b'
};

const CATEGORY_ICONS = {
  'Pothole':      '🕳️',
  'Waste':        '🗑️',
  'Water Leak':   '💧',
  'Street Light': '💡',
  'Sewerage':     '🚽',
  'Encroachment': '🏗️',
  'Open Manhole': '⚠️',
  'Other':        '📍'
};

document.addEventListener('DOMContentLoaded', function () {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  // Guard: storage.js must load before map.js in HTML <script> order
  if (typeof window.LSCW === 'undefined') {
    console.error('map.js: LSCW not found. Make sure storage.js is loaded BEFORE map.js.');
    return;
  }

  initMap();
});

function initMap() {

  // ── Create Leaflet map ──────────────────────────────────────
  map = L.map('map', { zoomControl: false, maxZoom: 19, minZoom: 10 })
          .setView([31.5204, 74.3587], 13);
  window.LSCW_MAP = map;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  // ── Icon factory (defined first so all functions below can use it) ──
  window.makeMarkerIcon = function (category, status, priority) {
    const color     = status === 'resolved' ? '#059669' : (CATEGORY_COLORS[category] || '#64748b');
    const icon      = CATEGORY_ICONS[category] || '📍';
    const urgentDot = priority === 'urgent'
      ? '<div style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;font-size:9px;padding:2px 4px;border-radius:10px;font-weight:700;line-height:1">!</div>'
      : '';
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="position:relative;width:40px;height:40px">
               <div style="width:40px;height:40px;border-radius:50%;background:${color};
                    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);
                    display:flex;align-items:center;justify-content:center;font-size:18px">
                 ${icon}
               </div>
               ${urgentDot}
             </div>`,
      iconSize:    [40, 40],
      iconAnchor:  [20, 20],
      popupAnchor: [0, -22]
    });
  };

  // ── Add one marker ──────────────────────────────────────────
  window.addMarkerToMap = function (report) {
    if (!report) return null;

    // Ensure coords are numbers
    const lat = parseFloat(report.lat);
    const lng = parseFloat(report.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const icon      = window.makeMarkerIcon(report.category, report.status, report.priority);
    const marker    = L.marker([lat, lng], { icon }).addTo(markerLayer);
    const catIcon   = CATEGORY_ICONS[report.category] || '📍';
    const safeDesc  = LSCW.sanitise(report.description || '').substring(0, 100);
    const moreDots  = (report.description || '').length > 100 ? '…' : '';

    marker.bindPopup(
      `<div style="min-width:200px;padding:8px;font-family:sans-serif">
         <div style="font-size:1rem;font-weight:700;margin-bottom:6px">
           ${catIcon} ${LSCW.sanitise(report.category || 'Unknown')}
         </div>
         <p style="font-size:0.78rem;color:#475569;margin:0 0 8px">${safeDesc}${moreDots}</p>
         <p style="font-size:0.7rem;color:#94a3b8;margin:0">
           ${LSCW.sanitise(report.reportId || '')} · ${report.status || ''}
         </p>
       </div>`,
      { maxWidth: 260 }
    );
    return marker;
  };

  // ── Load all markers from localStorage (synchronous, no Promise) ──
  window.loadAllMarkers = function () {
    if (!markerLayer) return;
    markerLayer.clearLayers();

    // Parse safely — always produces a plain array, never a Promise
    var raw     = localStorage.getItem('lscw_reports');
    var reports = [];
    try {
      var parsed = JSON.parse(raw);
      reports = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      reports = [];
    }

    var session = null;
    try { session = LSCW.getSession(); } catch (e) { /* LSCW not ready */ }

    reports.forEach(function (report) {
      if (!report) return;
      var lat = parseFloat(report.lat);
      var lng = parseFloat(report.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      // Normalise to numbers so addMarkerToMap doesn't get strings
      report.lat = lat;
      report.lng = lng;

      if (session && session.role === 'admin') {
        window.addMarkerToMap(report);
      } else if (session && String(report.reporterId) === String(session.userId)) {
        window.addMarkerToMap(report);
      }
    });

    // Background API refresh — updates localStorage, then reloads markers
    // only if new data arrived (avoids flicker on no-change)
    if (typeof LSCW.getReports === 'function') {
      LSCW.getReports()
        .then(function (fresh) {
          if (Array.isArray(fresh) && fresh.length !== reports.length) {
            window.loadAllMarkers();
          }
        })
        .catch(function () { /* silent fail — offline or not logged in */ });
    }
  };

  // ── Map click for pinning report location ───────────────────
  map.on('click', function (e) {
    if (!clickMode) return;
    clickMode = false;
    map.getContainer().style.cursor = '';
    var hint = document.getElementById('mapHint');
    if (hint) hint.style.display = 'none';
    if (typeof openReportModal === 'function') openReportModal(e.latlng);
  });

  // ── Fly to freshly submitted report ────────────────────────
  window.addReportMarker = function (report) {
    if (!markerLayer || !map) return;
    report.lat = parseFloat(report.lat);
    report.lng = parseFloat(report.lng);
    var marker = window.addMarkerToMap(report);
    if (marker) {
      map.flyTo([report.lat, report.lng], 16, { duration: 0.8 });
      setTimeout(function () { marker.openPopup(); }, 900);
    }
  };

  // ── Enable crosshair click mode ─────────────────────────────
  window.enableClickMode = function () {
    clickMode = true;
    map.getContainer().style.cursor = 'crosshair';
    var hint = document.getElementById('mapHint');
    if (hint) hint.style.display = 'flex';
  };

  // ── Initial load ────────────────────────────────────────────
  window.loadAllMarkers();
}