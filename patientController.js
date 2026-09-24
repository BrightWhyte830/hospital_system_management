const db = require('../db/connection');
const { generatePatientQr } = require('../utils/qr');
const { _publicUser: publicUser } = require('./authController');

async function qrCode(req, res, next) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const dataUrl = await generatePatientQr({
      patientId: user.patient_id,
      firstName: user.first_name,
      lastName: user.last_name,
    });
    res.json({ qrCode: dataUrl, patientId: user.patient_id });
  } catch (err) {
    next(err);
  }
}

/** Combined dashboard summary: counts + recent activity across all record types */
function summary(req, res) {
  const uid = req.user.id;
  const counts = {
    appointments: db.prepare("SELECT COUNT(*) n FROM appointments WHERE patient_id = ? AND status = 'confirmed'").get(uid).n,
    serviceRequests: db.prepare('SELECT COUNT(*) n FROM service_requests WHERE patient_id = ?').get(uid).n,
    complaints: db.prepare('SELECT COUNT(*) n FROM complaints WHERE patient_id = ?').get(uid).n,
  };

  const activity = db.prepare(`
    SELECT * FROM (
      SELECT created_at, 'Appointment' AS type, service || ' — ' || appt_time AS description,
             (SELECT name FROM hospitals WHERE id = hospital_id) AS hospital, status
      FROM appointments WHERE patient_id = @uid
      UNION ALL
      SELECT created_at, 'Service Request', service,
             (SELECT name FROM hospitals WHERE id = hospital_id), status
      FROM service_requests WHERE patient_id = @uid
      UNION ALL
      SELECT created_at, 'Complaint', complaint_type,
             (SELECT name FROM hospitals WHERE id = hospital_id), status
      FROM complaints WHERE patient_id = @uid
      UNION ALL
      SELECT created_at, 'Message', subject,
             (SELECT name FROM hospitals WHERE id = hospital_id), status
      FROM contact_messages WHERE patient_id = @uid
    )
    ORDER BY created_at DESC
    LIMIT 20
  `).all({ uid });

  res.json({ counts, activity });
}

function profile(req, res) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
}

module.exports = { qrCode, summary, profile };
