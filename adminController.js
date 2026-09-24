const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { logAction } = require('../utils/audit');
const { _publicUser: publicUser } = require('./authController');
const { ROLE_DEFINITIONS, roleCatalog } = require('../utils/staffRoles');

function addHospitalScope(req, where, params, hospitalAlias) {
  if (req.user.role === 'admin') return;
  if (!req.user.homeHospitalId) {
    where.push('1 = 0');
    return;
  }
  where.push(`${hospitalAlias}.hospital_id = @staffHospitalId`);
  params.staffHospitalId = req.user.homeHospitalId;
}

/* ───────────────────────── Dashboard ───────────────────────── */

function dashboardStats(req, res) {
  const stats = {
    totalPatients: db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'patient'").get().n,
    totalStaff: db.prepare("SELECT COUNT(*) n FROM users WHERE role IN ('staff','admin')").get().n,
    activeHospitals: db.prepare('SELECT COUNT(*) n FROM hospitals WHERE is_active = 1').get().n,
    appointmentsToday: db.prepare(
      "SELECT COUNT(*) n FROM appointments WHERE appt_date = date('now') AND status = 'confirmed'"
    ).get().n,
    pendingServiceRequests: db.prepare(
      "SELECT COUNT(*) n FROM service_requests WHERE status = 'pending'"
    ).get().n,
    openComplaints: db.prepare(
      "SELECT COUNT(*) n FROM complaints WHERE status IN ('received','under_review')"
    ).get().n,
    openMessages: db.prepare("SELECT COUNT(*) n FROM contact_messages WHERE status = 'open'").get().n,
    newPatients7d: db.prepare(
      "SELECT COUNT(*) n FROM users WHERE role = 'patient' AND created_at >= datetime('now','-7 days')"
    ).get().n,
  };

  const requestsByService = db.prepare(`
    SELECT service, COUNT(*) n FROM service_requests GROUP BY service ORDER BY n DESC LIMIT 8
  `).all();

  const complaintsByType = db.prepare(`
    SELECT complaint_type, COUNT(*) n FROM complaints GROUP BY complaint_type ORDER BY n DESC LIMIT 8
  `).all();

  const busiestHospitals = db.prepare(`
    SELECT h.name, COUNT(a.id) n FROM hospitals h
    LEFT JOIN appointments a ON a.hospital_id = h.id AND a.status = 'confirmed'
    GROUP BY h.id ORDER BY n DESC LIMIT 8
  `).all();

  res.json({ stats, requestsByService, complaintsByType, busiestHospitals });
}

/* ───────────────────────── Users (patients + staff) ───────────────────────── */

function listUsers(req, res) {
  const { role, search, page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const where = [];
  const params = {};
  if (role) { where.push('role = @role'); params.role = role; }
  if (search) {
    where.push('(email LIKE @s OR first_name LIKE @s OR last_name LIKE @s OR patient_id LIKE @s)');
    params.s = `%${search}%`;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) n FROM users ${whereSql}`).get(params).n;
  const rows = db.prepare(`
    SELECT id, patient_id, role, job_role, department, email, first_name, last_name, phone, dob, home_hospital_id, is_active, created_at
    FROM users ${whereSql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  res.json({ users: rows, total, page: Number(page), pageSize: limit });
}

function getUser(req, res) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
}

function listStaffRoles(req, res) {
  res.json({ roles: roleCatalog() });
}

async function createStaff(req, res, next) {
  try {
    const { email, password, firstName, lastName, phone, role, jobRole, department, homeHospitalId } = req.body;
    if (role === 'staff' && jobRole !== 'it_support' && !homeHospitalId) {
      return res.status(400).json({ error: 'Assign this hospital staff account to a hospital.' });
    }
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())) {
      return res.status(409).json({ error: 'An account already exists with that email address.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const info = db.prepare(`
      INSERT INTO users (role, job_role, department, email, password_hash, first_name, last_name, phone, home_hospital_id)
      VALUES (@role, @job_role, @department, @email, @password_hash, @first_name, @last_name, @phone, @home_hospital_id)
    `).run({
      role, job_role: jobRole || null, department: department || null,
      email: email.toLowerCase(), password_hash: hash,
      first_name: firstName, last_name: lastName, phone,
      home_hospital_id: homeHospitalId || null,
    });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    logAction({ userId: req.user.id, action: 'STAFF_CREATED', entityType: 'user', entityId: user.id, req, details: { role } });
    res.status(201).json({ user: publicUser(user) });
  } catch (err) { next(err); }
}

function updateUserProfile(req, res, next) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { firstName, lastName, phone, jobRole, department, homeHospitalId } = req.body;
    if (jobRole && !ROLE_DEFINITIONS[jobRole]) return res.status(400).json({ error: 'Select a valid hospital staff role.' });
    db.prepare(`
      UPDATE users SET first_name = ?, last_name = ?, phone = ?, job_role = ?, department = ?, home_hospital_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      firstName ?? user.first_name, lastName ?? user.last_name, phone ?? user.phone,
      jobRole ?? user.job_role, department ?? user.department, homeHospitalId ?? user.home_hospital_id, user.id
    );
    logAction({ userId: req.user.id, action: 'USER_PROFILE_UPDATED', entityType: 'user', entityId: user.id, req });
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)) });
  } catch (err) { next(err); }
}

function setUserActive(req, res) {
  const { isActive } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });

  db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, user.id);
  logAction({ userId: req.user.id, action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entityType: 'user', entityId: user.id, req });
  res.json({ message: isActive ? 'Account reactivated.' : 'Account deactivated.' });
}

function updateUserRole(req, res) {
  const { role } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot change your own role.' });

  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, user.id);
  logAction({ userId: req.user.id, action: 'USER_ROLE_CHANGED', entityType: 'user', entityId: user.id, req, details: { role } });
  res.json({ message: 'Role updated.' });
}

/* ───────────────────────── Hospitals ───────────────────────── */

function listHospitals(req, res) {
  const rows = db.prepare('SELECT * FROM hospitals ORDER BY name').all();
  res.json({ hospitals: rows });
}

function createHospital(req, res, next) {
  try {
    const { name, region, phone } = req.body;
    const info = db.prepare('INSERT INTO hospitals (name, region, phone) VALUES (?, ?, ?)').run(name, region, phone || null);
    logAction({ userId: req.user.id, action: 'HOSPITAL_CREATED', entityType: 'hospital', entityId: info.lastInsertRowid, req });
    res.status(201).json({ hospital: db.prepare('SELECT * FROM hospitals WHERE id = ?').get(info.lastInsertRowid) });
  } catch (err) { next(err); }
}

function updateHospital(req, res, next) {
  try {
    const { name, region, phone, isActive } = req.body;
    const h = db.prepare('SELECT * FROM hospitals WHERE id = ?').get(req.params.id);
    if (!h) return res.status(404).json({ error: 'Hospital not found.' });
    db.prepare('UPDATE hospitals SET name = ?, region = ?, phone = ?, is_active = ? WHERE id = ?').run(
      name ?? h.name, region ?? h.region, phone ?? h.phone, isActive === undefined ? h.is_active : (isActive ? 1 : 0), h.id
    );
    logAction({ userId: req.user.id, action: 'HOSPITAL_UPDATED', entityType: 'hospital', entityId: h.id, req });
    res.json({ hospital: db.prepare('SELECT * FROM hospitals WHERE id = ?').get(h.id) });
  } catch (err) { next(err); }
}

/* ───────────────────────── Operational queues (staff + admin) ───────────────────────── */

function listAppointments(req, res) {
  const { status, hospitalId, date } = req.query;
  const where = []; const params = {};
  if (status) { where.push('a.status = @status'); params.status = status; }
  if (hospitalId) { where.push('a.hospital_id = @hospitalId'); params.hospitalId = hospitalId; }
  if (date) { where.push('a.appt_date = @date'); params.date = date; }
  addHospitalScope(req, where, params, 'a');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT a.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.phone AS patient_phone, u.dob AS patient_dob
    FROM appointments a
    JOIN hospitals h ON h.id = a.hospital_id
    JOIN users u ON u.id = a.patient_id
    ${whereSql}
    ORDER BY a.appt_date DESC, a.appt_time DESC LIMIT 200
  `).all(params);
  res.json({ appointments: rows });
}

function listServiceRequests(req, res) {
  const { status } = req.query;
  const scope = req.user.role === 'admin' ? '' : req.user.homeHospitalId ? ' AND sr.hospital_id = ?' : ' AND 1 = 0';
  const scopeParams = req.user.role === 'admin' || !req.user.homeHospitalId ? [] : [req.user.homeHospitalId];
  const rows = status
    ? db.prepare(`
        SELECT sr.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.dob AS patient_dob
        FROM service_requests sr JOIN hospitals h ON h.id = sr.hospital_id JOIN users u ON u.id = sr.patient_id
        WHERE sr.status = ?${scope} ORDER BY sr.created_at DESC LIMIT 200
      `).all(status, ...scopeParams)
    : db.prepare(`
        SELECT sr.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.dob AS patient_dob
        FROM service_requests sr JOIN hospitals h ON h.id = sr.hospital_id JOIN users u ON u.id = sr.patient_id
        WHERE 1 = 1${scope} ORDER BY sr.created_at DESC LIMIT 200
      `).all(...scopeParams);
  res.json({ requests: rows });
}

function updateServiceRequestStatus(req, res) {
  const { status } = req.body;
  const r = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Service request not found.' });
  if (req.user.role !== 'admin' && r.hospital_id !== req.user.homeHospitalId) return res.status(403).json({ error: 'This request belongs to another hospital.' });
  db.prepare('UPDATE service_requests SET status = ? WHERE id = ?').run(status, r.id);
  logAction({ userId: req.user.id, action: 'SERVICE_REQUEST_UPDATED', entityType: 'service_request', entityId: r.id, req, details: { status } });
  res.json({ message: 'Service request updated.' });
}

function listMessages(req, res) {
  const { status } = req.query;
  const scope = req.user.role === 'admin' ? '' : req.user.homeHospitalId ? ' AND cm.hospital_id = ?' : ' AND 1 = 0';
  const scopeParams = req.user.role === 'admin' || !req.user.homeHospitalId ? [] : [req.user.homeHospitalId];
  const rows = status
    ? db.prepare(`
        SELECT cm.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.dob AS patient_dob
        FROM contact_messages cm JOIN hospitals h ON h.id = cm.hospital_id JOIN users u ON u.id = cm.patient_id
        WHERE cm.status = ?${scope} ORDER BY cm.created_at DESC LIMIT 200
      `).all(status, ...scopeParams)
    : db.prepare(`
        SELECT cm.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.dob AS patient_dob
        FROM contact_messages cm JOIN hospitals h ON h.id = cm.hospital_id JOIN users u ON u.id = cm.patient_id
        WHERE 1 = 1${scope} ORDER BY cm.created_at DESC LIMIT 200
      `).all(...scopeParams);
  res.json({ messages: rows });
}

function updateMessageStatus(req, res) {
  const { status } = req.body;
  const m = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Message not found.' });
  if (req.user.role !== 'admin' && m.hospital_id !== req.user.homeHospitalId) return res.status(403).json({ error: 'This message belongs to another hospital.' });
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, m.id);
  logAction({ userId: req.user.id, action: 'MESSAGE_UPDATED', entityType: 'contact_message', entityId: m.id, req, details: { status } });
  res.json({ message: 'Message updated.' });
}

function itOverview(req, res) {
  const database = db.prepare('PRAGMA database_list').all();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
  const counts = {
    users: db.prepare('SELECT COUNT(*) n FROM users').get().n,
    activeUsers: db.prepare('SELECT COUNT(*) n FROM users WHERE is_active = 1').get().n,
    auditEvents: db.prepare('SELECT COUNT(*) n FROM audit_log').get().n,
    failedLogins: db.prepare('SELECT COUNT(*) n FROM audit_log WHERE action = \'LOGIN_FAILED\' AND created_at >= datetime(\'now\', \'-24 hours\')').get().n,
  };
  res.json({ service: 'GhanaHealth API', status: 'operational', checkedAt: new Date().toISOString(), database, tables, counts });
}

function runItHealthCheck(req, res) {
  const startedAt = Date.now();
  db.prepare('SELECT 1 AS ok').get();
  logAction({ userId: req.user.id, action: 'IT_HEALTH_CHECK', entityType: 'system', req });
  res.json({ status: 'operational', database: 'reachable', latencyMs: Date.now() - startedAt, checkedAt: new Date().toISOString() });
}

/* ───────────────────────── Audit log & settings (admin only) ───────────────────────── */

function auditLog(req, res) {
  const { page = 1, pageSize = 50 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) n FROM audit_log').get().n;
  const rows = db.prepare(`
    SELECT al.*, u.email AS user_email, u.role AS user_role
    FROM audit_log al LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  res.json({ entries: rows, total, page: Number(page), pageSize: limit });
}

function getSettings(req, res) {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all();
  res.json({ settings: rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {}) });
}

function updateSettings(req, res) {
  const entries = Object.entries(req.body || {});
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (@key, @value, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);
  const tx = db.transaction((rows) => rows.forEach(([key, value]) => upsert.run({ key, value: String(value) })));
  tx(entries);
  logAction({ userId: req.user.id, action: 'SETTINGS_UPDATED', req, details: req.body });
  res.json({ message: 'Settings updated.' });
}

module.exports = {
  dashboardStats, listUsers, getUser, listStaffRoles, createStaff, updateUserProfile, setUserActive, updateUserRole,
  listHospitals, createHospital, updateHospital,
  listAppointments, listServiceRequests, updateServiceRequestStatus,
  listMessages, updateMessageStatus, itOverview, runItHealthCheck,
  auditLog, getSettings, updateSettings,
};
