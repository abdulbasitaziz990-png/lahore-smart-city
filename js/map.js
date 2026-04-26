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
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  
  window.loadAllMarkers = function() {
    markerLayer.clearLayers();
    var reports = JSON.parse(localStorage.getItem('lscw_reports') || '[]');
    var session = LSCW.getSession();
    if (Array.isArray(reports)) {
      reports.forEach(function(report) {
        if (session && session.role === 'admin') { addMarkerToMap(report); }
        else if (session && report.reporterId === session.userId) { addMarkerToMap(report); }
      });
    }
  };
  
  window.addMarkerToMap = function(report) {
    var marker = L.marker([report.lat, report.lng], {
      icon: L.divIcon({
        html: '<div style="width:30px;height:30px;border-radius:50%;background:#003f87;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px">📍</div>',
        iconSize: [30,30], iconAnchor: [15,15]
      })
    }).addTo(markerLayer);
    marker.bindPopup('<strong>' + (report.category || 'Report') + '</strong><br>' + (report.description || '').substring(0,100));
    return marker;
  };
  
  map.on('click', function(e) {
    if (clickMode) {
      clickMode = false;
      if (typeof openReportModal === 'function') openReportModal(e.latlng);
      var hint = document.getElementById('mapHint');
      if (hint) hint.style.display = 'none';
    }
  });
  
  loadAllMarkers();
}

window.addReportMarker = function(report) {
  if (markerLayer && map) {
    var marker = addMarkerToMap(report);
    map.flyTo([report.lat, report.lng], 16, { duration: 0.8 });
    marker.openPopup();
  }
};

window.enableClickMode = function() {
  clickMode = true;
  var hint = document.getElementById('mapHint');
  if (hint) hint.style.display = 'flex';
};