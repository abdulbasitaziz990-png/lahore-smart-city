'use strict';

function showToast(msg, type = '') {
  const tc = document.getElementById('toast-container') || (() => { const c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); return c; })();
  const t = document.createElement('div'); t.className = `toast ${type ? 'toast-' + type : ''}`;
  t.innerHTML = `<span class="material-symbols-outlined">${type==='success'?'check_circle':type==='error'?'error':'info'}</span> ${msg}`;
  tc.appendChild(t); setTimeout(() => t.remove(), 3500);
}

function loadAdminStats() {
  const reports = LSCW.getReports();
  const els = ['statTotal', 'statPending', 'statProgress', 'statResolved'];
  const stats = { statTotal: reports.length, statPending: reports.filter(r => r.status === 'pending').length, statProgress: reports.filter(r => r.status === 'in-progress').length, statResolved: reports.filter(r => r.status === 'resolved').length };
  els.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = stats[id]; });
}

function filterReports(filter = 'all', searchTerm = '') {
  let reports = LSCW.getReports();
  if (filter !== 'all') reports = reports.filter(r => r.status === filter);
  if (searchTerm) { const term = searchTerm.toLowerCase(); reports = reports.filter(r => r.category.toLowerCase().includes(term) || r.description.toLowerCase().includes(term) || (r.address && r.address.toLowerCase().includes(term))); }
  return reports.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function updateNotificationBadge() {
  const count = LSCW.getUnreadCount('admin-001');
  const badge = document.getElementById('notificationCount');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function adminLogout() { LSCW.clearSession(); window.location.href = '/'; }

window.showToast = showToast;
window.loadAdminStats = loadAdminStats;
window.filterReports = filterReports;
window.updateNotificationBadge = updateNotificationBadge;
window.openModal = openModal;
window.closeModal = closeModal;
window.adminLogout = adminLogout;