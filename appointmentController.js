const db = require('../db/connection');
const { generateReference } = require('../utils/idGenerator');
const { logAction } = require('../utils/audit');

const SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
  '12:00 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
];

/** GET /api/appointments/slots?hospitalId=&date= — real availability from the DB */
function availableSlots(req, res) {
  const { hospitalId, date } = req.query;
  if (!hospitalId || !date) {
    return res.status(400).json({ error: 'hospitalId and date are required.' });
  }
  const taken = db.prepare(
    `SELECT appt_time FROM appointments WHERE hospital_id = ? AND appt_date = ? AND status = 'confirmed'`
  ).all(hospitalId, date).map((r) => r.appt_time);

  const slots = SLOTS.map((time) => ({ time, available: !taken.includes(time) }));
  res.json({ slots });
}

function myAppointments(req, res) {
  const rows = db.prepare(`
    SELECT a.*, h.name AS hospital_name FROM appointments a
    JOIN hospitals h ON h.id = a.hospital_id
    WHERE a.patient_id = ?
    ORDER BY a.appt_date DESC, a.appt_time DESC
  `).all(req.user.id);
  res.json({ appointments: rows });
}

function book(req, res, next) {
  try {
    const {
      hospitalId, service, date, time, mode, reason, doctorPref, languagePref,
    } = req.body;

    const reference = generateReference('APT');
    const stmt = db.prepare(`
      INSERT INTO appointments
        (reference, patient_id, hospital_id, service, appt_date, appt_time, mode, reason, doctor_pref, language_pref)
      VALUES (@reference, @patient_id, @hospital_id, @service, @appt_date, @appt_time, @mode, @reason, @doctor_pref, @language_pref)
    `);

    const info = stmt.run({
      reference,
      patient_id: req.user.id,
      hospital_id: hospitalId,
      service,
      appt_date: date,
      appt_time: time,
      mode,
      reason,
      doctor_pref: doctorPref || null,
      language_pref: languagePref || null,
    });

    const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
    logAction({ userId: req.user.id, action: 'APPOINTMENT_BOOKED', entityType: 'appointment', entityId: appt.id, req });
    res.status(201).json({ appointment: appt });
  } catch (err) {
    // UNIQUE(hospital_id, appt_date, appt_time) — someone else took the slot first
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'That time slot was just taken by another patient. Please choose a different slot.' });
    }
    next(err);
  }
}

function cancel(req, res, next) {
  try {
    const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
    logAction({ userId: req.user.id, action: 'APPOINTMENT_CANCELLED', entityType: 'appointment', entityId: appt.id, req });
    res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { availableSlots, myAppointments, book, cancel };
