'use strict';

const API_BASE_URL = '/api';

function getToken() { const s = sessionStorage.getItem('lscw_session'); return s ? JSON.parse(s).accessToken : null; }
function getSession() { try { const s = JSON.parse(sessionStorage.getItem('lscw_session') || 'null'); return s || null; } catch { return null; } }
function setSession(user) { sessionStorage.setItem('lscw_session', JSON.stringify(user)); }
function clearSession() { sessionStorage.removeItem('lscw_session'); }

async function loginUser(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, password}) });
    const data = await res.json();
    if (data.access) { setSession({ userId: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, phone: data.user.phone || '', accessToken: data.access, refreshToken: data.refresh }); return { ok: true, user: data.user }; }
    return { ok: false, error: data.error || 'Login failed' };
}

async function registerUser({ name, email, phone, password }) {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email, name, phone, password}) });
    const data = await res.json();
    if (data.user) return { ok: true, user: data.user };
    return { ok: false, error: data.error || 'Registration failed' };
}

async function loginAdmin(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/admin-login/`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: username, password}) });
    const data = await res.json();
    if (data.access) { setSession({ userId: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, accessToken: data.access, refreshToken: data.refresh }); return { ok: true, user: data.user }; }
    return { ok: false, error: data.error || 'Invalid credentials' };
}

function sanitise(str) { if (!str) return ''; return String(str).replace(/[<>'"]/g, c => ({ '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
function formatDate(d) { if (!d) return ''; return new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
function timeAgo(d) { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const m = Math.floor(diff / 60000); if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'; const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'; return Math.floor(h / 24) + 'd ago'; }
function generateReportId() { return 'LHR-' + Date.now().toString().slice(-8) + '-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'); }

function getReports() { return JSON.parse(localStorage.getItem('lscw_reports') || '[]'); }
function saveReport(report) { const reports = getReports(); report.id = Date.now().toString(36); report.reportId = report.reportId || generateReportId(); report.status = 'pending'; report.createdAt = new Date().toISOString(); report.zone = report.zone || 'Lahore'; report.adminNotes = ''; report.adminPhoto = null; report.estimatedResolution = null; report.resolutionDate = null; reports.push(report); localStorage.setItem('lscw_reports', JSON.stringify(reports)); const notif = JSON.parse(localStorage.getItem('lscw_notifications') || '[]'); notif.push({ id: Date.now().toString(36), userId: 'admin-001', title: 'New Report', message: `${report.category} by ${report.reportedBy}`, type: 'new_report', reportId: report.id, read: false, createdAt: new Date().toISOString() }); localStorage.setItem('lscw_notifications', JSON.stringify(notif)); return report; }
function getReportsByUser(userId) { return getReports().filter(r => r.reporterId === userId); }
function getReportsByUserEmail(email) { return getReports().filter(r => r.reporterEmail === email); }
function updateReportStatus(id, status, data = {}) { const reports = getReports(); const idx = reports.findIndex(r => r.id === id); if (idx >= 0) { reports[idx].status = status; if (data.notes) reports[idx].adminNotes = data.notes; if (data.photo) reports[idx].adminPhoto = data.photo; if (data.estimatedResolution) reports[idx].estimatedResolution = data.estimatedResolution; if (status === 'resolved') reports[idx].resolutionDate = new Date().toISOString(); const sameCat = reports.filter(r => r.category === reports[idx].category && r.status !== 'resolved'); if (sameCat.length >= 3) { sameCat.forEach(r => { if (r.priority !== 'urgent') r.priority = 'urgent'; }); } localStorage.setItem('lscw_reports', JSON.stringify(reports)); if (reports[idx].reporterId) { const notif = JSON.parse(localStorage.getItem('lscw_notifications') || '[]'); notif.push({ id: Date.now().toString(36), userId: reports[idx].reporterId, title: 'Status Updated', message: `Your ${reports[idx].category} report is now ${status}`, type: 'status_update', reportId: id, read: false, createdAt: new Date().toISOString() }); localStorage.setItem('lscw_notifications', JSON.stringify(notif)); } return true; } return false; }
function getReportById(id) { return getReports().find(r => r.id === id); }

function getZones() { return [{ id: 'gulberg', name: 'Gulberg', areas: ['Gulberg II', 'Gulberg III', 'Main Boulevard', 'Liberty', 'MM Alam Road'] }, { id: 'johar', name: 'Johar Town', areas: ['Block A', 'Block G', 'Block R', 'Expo Centre'] }, { id: 'dha', name: 'DHA', areas: ['Phase 1', 'Phase 5', 'Phase 6', 'Phase 8'] }, { id: 'modeltown', name: 'Model Town', areas: ['A Block', 'B Block', 'C Block', 'D Block'] }, { id: 'iqbal', name: 'Iqbal Town', areas: ['Township', 'Punjab Society', 'Pak Arab Society'] }, { id: 'cantt', name: 'Cantt', areas: ['Saddar', 'Garrison', 'Askari', 'Fortress'] }, { id: 'walled', name: 'Walled City', areas: ['Androon Lahore', 'Delhi Gate', 'Bhati Gate'] }, { id: 'faisal', name: 'Faisal Town', areas: ['Faisal Town', 'Canal Road', 'Muslim Town'] }, { id: 'garden', name: 'Garden Town', areas: ['Garden Town', 'Kalma Chowk', 'Mozang'] }, { id: 'shadman', name: 'Shadman', areas: ['Shadman Colony', 'Jail Road', 'Mall Road'] }]; }
function getZoneByCoordinates(lat, lng) { return { name: 'Gulberg' }; }
function getReportsByZone(name) { return getReports().filter(r => r.zone === name); }

function getNotifications(userId) { const all = JSON.parse(localStorage.getItem('lscw_notifications') || '[]'); return all.filter(n => n.userId === userId && !n.read).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); }
function getAllNotifications(userId) { const all = JSON.parse(localStorage.getItem('lscw_notifications') || '[]'); return all.filter(n => n.userId === userId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); }
function getUnreadCount(userId) { return getNotifications(userId).length; }
function markAllNotificationsRead(userId) { const all = JSON.parse(localStorage.getItem('lscw_notifications') || '[]'); all.forEach(n => { if (n.userId === userId) n.read = true; }); localStorage.setItem('lscw_notifications', JSON.stringify(all)); }

function getTickets() { return JSON.parse(localStorage.getItem('lscw_tickets') || '[]'); }
function getTicketsByUser(uid) { return getTickets().filter(t => t.userId === uid); }
function getAllTickets() { return getTickets(); }
function createTicket(data) { const tickets = getTickets(); const ticket = { id: Date.now().toString(36), ticketNumber: 'SUP-' + Date.now().toString().slice(-6), ...data, status: 'open', messages: [{ id: Date.now().toString(36), userId: data.userId, userName: data.userName, message: data.message, isAdmin: false, createdAt: new Date().toISOString() }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; tickets.push(ticket); localStorage.setItem('lscw_tickets', JSON.stringify(tickets)); return { ok: true, ticket }; }
function addTicketReply(id, uid, name, msg, isAdmin) { const tickets = getTickets(); const idx = tickets.findIndex(t => t.id === id); if (idx >= 0) { tickets[idx].messages.push({ id: Date.now().toString(36), userId: uid, userName: name, message: msg, isAdmin, createdAt: new Date().toISOString() }); tickets[idx].updatedAt = new Date().toISOString(); tickets[idx].status = isAdmin ? 'replied' : 'awaiting_reply'; localStorage.setItem('lscw_tickets', JSON.stringify(tickets)); return true; } return false; }
function getTicketById(id) { return getTickets().find(t => t.id === id); }
function updateTicketStatus(id, status) { const tickets = getTickets(); const idx = tickets.findIndex(t => t.id === id); if (idx >= 0) { tickets[idx].status = status; localStorage.setItem('lscw_tickets', JSON.stringify(tickets)); return true; } return false; }
function canCreateTicket(reportId) { return true; }
function isRateLimited() { return false; }
function recordAttempt() { }

function showToast(msg, type = 'info') { const tc = document.getElementById('toast-container'); if (!tc) { const c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); } const t = document.createElement('div'); t.className = `toast toast-${type}`; t.innerHTML = `<span class="material-symbols-outlined">${type==='success'?'check_circle':type==='error'?'error':'info'}</span> ${msg}`; document.getElementById('toast-container').appendChild(t); setTimeout(() => { t.classList.add('removing'); setTimeout(() => { if (t.parentNode) t.remove(); }, 300); }, 4000); }
window.showToast = showToast;

window.LSCW = { loginUser, registerUser, loginAdmin, setSession, getSession, clearSession, getReports, saveReport, getReportsByUser, getReportsByUserEmail, updateReportStatus, getReportById, getReportByReportId: getReportById, getZones, getZoneByCoordinates, getZoneByName: (n) => getZones().find(z => z.name === n), getReportsByZone, getNotifications, getAllNotifications, getUnreadCount, markAllNotificationsRead, getTickets, getTicketsByUser, getAllTickets, createTicket, addTicketReply, getTicketById, updateTicketStatus, canCreateTicket, isRateLimited, recordAttempt, sanitise, formatDate, timeAgo, generateReportId };