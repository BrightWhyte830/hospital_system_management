const db = require('../db/connection');
const { generateReference } = require('../utils/idGenerator');
const { logAction } = require('../utils/audit');

function myComplaints(req, res) {
  const rows = db.prepare(`
    SELECT c.*, h.name AS hospital_name FROM complaints c
    JOIN hospitals h ON h.id = c.hospital_id
    WHERE c.patient_id = ? ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json({ complaints: rows });
}

function create(req, res, next) {
  try {
    const {
      hospitalId, complaintType, incidentDate, department, staffInvolved,
      description, desiredOutcome, rating,
    } = req.body;

    const reference = generateReference('CMP');
    const info = db.prepare(`
      INSERT INTO complaints
        (reference, patient_id, hospital_id, complaint_type, incident_date, department,
         staff_involved, description, desired_outcome, rating)
      VALUES (@reference, @patient_id, @hospital_id, @complaint_type, @incident_date, @department,
              @staff_involved, @description, @desired_outcome, @rating)
    `).run({
      reference,
      patient_id: req.user.id,
      hospital_id: hospitalId,
      complaint_type: complaintType,
      incident_date: incidentDate,
      department: department || null,
      staff_involved: staffInvolved || null,
      description,
      desired_outcome: desiredOutcome || null,
      rating: rating || null,
    });

    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(info.lastInsertRowid);
    logAction({ userId: req.user.id, action: 'COMPLAINT_FILED', entityType: 'complaint', entityId: complaint.id, req });
    res.status(201).json({ complaint });
  } catch (err) {
    next(err);
  }
}

// ---- Staff/admin: triage queue across all patients ----
function queue(req, res) {
  const { status } = req.query;
  const scope = req.user.role === 'admin' ? '' : req.user.homeHospitalId ? ' AND c.hospital_id = ?' : ' AND 1 = 0';
  const scopeParams = req.user.role === 'admin' || !req.user.homeHospitalId ? [] : [req.user.homeHospitalId];
  const rows = status
    ? db.prepare(`
        SELECT c.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.dob AS patient_dob
        FROM complaints c JOIN hospitals h ON h.id = c.hospital_id JOIN users u ON u.id = c.patient_id
        WHERE c.status = ?${scope} ORDER BY c.created_at DESC
      `).all(status, ...scopeParams)
    : db.prepare(`
        SELECT c.*, h.name AS hospital_name, u.first_name, u.last_name, u.patient_id, u.dob AS patient_dob
        FROM complaints c JOIN hospitals h ON h.id = c.hospital_id JOIN users u ON u.id = c.patient_id
        WHERE 1 = 1${scope} ORDER BY c.created_at DESC
      `).all(...scopeParams);
  res.json({ complaints: rows });
}

function resolve(req, res, next) {
  try {
    const { status, resolutionNote } = req.body;
    const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
    if (req.user.role !== 'admin' && complaint.hospital_id !== req.user.homeHospitalId) return res.status(403).json({ error: 'This complaint belongs to another hospital.' });

    db.prepare(`
      UPDATE complaints SET status = ?, resolution_note = ?, resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE resolved_at END
      WHERE id = ?
    `).run(status, resolutionNote || null, status, complaint.id);

    logAction({ userId: req.user.id, action: 'COMPLAINT_UPDATED', entityType: 'complaint', entityId: complaint.id, req, details: { status } });
    res.json({ message: 'Complaint updated.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { myComplaints, create, queue, resolve };
