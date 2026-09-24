const db = require('../db/connection');
const { generateReference } = require('../utils/idGenerator');
const { logAction } = require('../utils/audit');

const FAQS = [
  { q: 'How do I retrieve my Patient ID?', a: 'Your Patient ID (GH-PAT-XXXXXX) appears on your QR code. You can also find it in the "My QR Code" section of your dashboard.' },
  { q: 'Can I sign in with my Ghana Card number instead of email?', a: 'Currently, the portal uses your registered email address and password for security. Your Ghana Card number is used for identity verification during registration only.' },
  { q: 'How long does a service request take to process?', a: 'Routine requests are handled within 24–48 hours. Urgent requests are attended to the same day. For emergencies, always call 0800-100-999 directly.' },
  { q: 'Can I cancel or reschedule an appointment?', a: 'Yes. Cancel it from the Appointments tab at least 24 hours before your scheduled time, or call 0544 260 591 / 0550 599 102.' },
  { q: 'Is my health data secure and private?', a: 'Yes. All data is protected under the Ghana Data Protection Act, 2012 (Act 843). Only authorised healthcare providers can access your medical records.' },
  { q: 'What if my NHIS card has expired?', a: 'Contact any NHIA district office or community health centre for renewal. You may still access services on a fee-for-service basis while renewing.' },
];

function faqs(req, res) {
  res.json({ faqs: FAQS });
}

// Public, read-only subset of system settings — the numbers shown on the Contact page.
// Deliberately excludes anything operational like maintenance_mode.
const PUBLIC_KEYS = ['emergency_number', 'ambulance_number', 'patient_helpline_1', 'patient_helpline_2', 'helpline_hours', 'maintenance_mode'];
function publicSettings(req, res) {
  const rows = db.prepare(
    `SELECT key, value FROM settings WHERE key IN (${PUBLIC_KEYS.map(() => '?').join(',')})`
  ).all(...PUBLIC_KEYS);
  res.json({ settings: rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {}) });
}

function send(req, res, next) {
  try {
    const { hospitalId, subject, message, preferredResponse } = req.body;
    const reference = generateReference('MSG');
    const info = db.prepare(`
      INSERT INTO contact_messages (reference, patient_id, hospital_id, subject, message, preferred_response)
      VALUES (@reference, @patient_id, @hospital_id, @subject, @message, @preferred_response)
    `).run({
      reference,
      patient_id: req.user.id,
      hospital_id: hospitalId,
      subject,
      message,
      preferred_response: preferredResponse || 'Phone Call',
    });
    const record = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(info.lastInsertRowid);
    logAction({ userId: req.user.id, action: 'CONTACT_MESSAGE_SENT', entityType: 'contact_message', entityId: record.id, req });
    res.status(201).json({ message: record });
  } catch (err) {
    next(err);
  }
}

module.exports = { faqs, send, publicSettings };
