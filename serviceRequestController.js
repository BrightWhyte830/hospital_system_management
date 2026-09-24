const db = require('../db/connection');
const { generateReference } = require('../utils/idGenerator');
const { logAction } = require('../utils/audit');

function myRequests(req, res) {
  const rows = db.prepare(`
    SELECT sr.*, h.name AS hospital_name FROM service_requests sr
    JOIN hospitals h ON h.id = sr.hospital_id
    WHERE sr.patient_id = ? ORDER BY sr.created_at DESC
  `).all(req.user.id);
  res.json({ requests: rows });
}

function create(req, res, next) {
  try {
    const {
      hospitalId, service, urgency, symptoms, duration, medications, allergies,
      previousHosp, emergencyContactName, emergencyContactPhone, emergencyContactRel, notes,
    } = req.body;

    const reference = generateReference('SRQ');
    const info = db.prepare(`
      INSERT INTO service_requests
        (reference, patient_id, hospital_id, service, urgency, symptoms, duration, medications,
         allergies, previous_hosp, emergency_contact_nm, emergency_contact_ph, emergency_contact_rel, notes)
      VALUES (@reference, @patient_id, @hospital_id, @service, @urgency, @symptoms, @duration, @medications,
              @allergies, @previous_hosp, @emergency_contact_nm, @emergency_contact_ph, @emergency_contact_rel, @notes)
    `).run({
      reference,
      patient_id: req.user.id,
      hospital_id: hospitalId,
      service,
      urgency,
      symptoms,
      duration: duration || null,
      medications: medications || null,
      allergies: allergies || null,
      previous_hosp: previousHosp || null,
      emergency_contact_nm: emergencyContactName,
      emergency_contact_ph: emergencyContactPhone,
      emergency_contact_rel: emergencyContactRel || null,
      notes: notes || null,
    });

    const request = db.prepare('SELECT * FROM service_requests WHERE id = ?').get(info.lastInsertRowid);
    logAction({ userId: req.user.id, action: 'SERVICE_REQUEST_CREATED', entityType: 'service_request', entityId: request.id, req });
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}

module.exports = { myRequests, create };
