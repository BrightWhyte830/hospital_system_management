// One-time seed: registered hospitals + a default admin account.
// Safe to re-run — uses INSERT OR IGNORE keyed on unique columns.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./connection');

const HOSPITALS = [
  ['Korle-Bu Teaching Hospital, Accra', 'Greater Accra', '0302739300'],
  ['Komfo Anokye Teaching Hospital, Kumasi', 'Ashanti', '0322022308'],
  ['37 Military Hospital, Accra', 'Greater Accra', '0302777611'],
  ['Accra Ridge Hospital', 'Greater Accra', '0302662701'],
  ['Cape Coast Teaching Hospital', 'Central', '0332132440'],
  ['Tamale Teaching Hospital', 'Northern', '0372022441'],
  ['Ho Teaching Hospital', 'Volta', '0362026600'],
  ['Tema General Hospital', 'Greater Accra', '0303202626'],
  ['Eastern Regional Hospital, Koforidua', 'Eastern', '0342022212'],
  ['Bolgatanga Regional Hospital', 'Upper East', '0382022395'],
  ['Wa Regional Hospital', 'Upper West', '0392022043'],
];

const insertHospital = db.prepare(
  `INSERT OR IGNORE INTO hospitals (name, region, phone) VALUES (?, ?, ?)`
);
const tx = db.transaction((rows) => rows.forEach((r) => insertHospital.run(...r)));
tx(HOSPITALS);

// Default admin (Patient Rights Unit) account — change the password immediately in production.
const adminEmail = 'admin@ghanahealth.gov.gh';
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existing) {
  const hash = bcrypt.hashSync('ChangeMe!2026', 10);
  db.prepare(
    `INSERT INTO users (role, email, password_hash, first_name, last_name, phone, is_active)
     VALUES ('admin', ?, ?, 'Patient Rights', 'Unit', '0544260591', 1)`
  ).run(adminEmail, hash);
  console.log(`Seeded admin account: ${adminEmail} / ChangeMe!2026 (change this immediately)`);
} else {
  console.log('Admin account already exists — skipped.');
}

// A sample hospital staff account, distinct from the ministry admin above,
// so the "staff" role (triage-level access) can be demonstrated separately.
const staffEmail = 'staff@korlebu.gov.gh';
if (!db.prepare('SELECT id FROM users WHERE email = ?').get(staffEmail)) {
  const hash = bcrypt.hashSync('ChangeMe!2026', 10);
  const korlebu = db.prepare('SELECT id FROM hospitals WHERE name LIKE ?').get('Korle-Bu%');
  db.prepare(
    `INSERT INTO users (role, email, password_hash, first_name, last_name, phone, home_hospital_id, is_active)
     VALUES ('staff', ?, ?, 'Ama', 'Boateng', '0550599102', ?, 1)`
  ).run(staffEmail, hash, korlebu ? korlebu.id : null);
  console.log(`Seeded staff account: ${staffEmail} / ChangeMe!2026 (change this immediately)`);
} else {
  console.log('Staff account already exists — skipped.');
}

const defaultSettings = {
  emergency_number: '0800-100-999',
  ambulance_number: '193',
  patient_helpline_1: '0544 260 591',
  patient_helpline_2: '0550 599 102',
  helpline_hours: 'Monday – Friday, 8:00 AM – 5:00 PM (Emergency line 24/7)',
  maintenance_mode: 'off',
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
const settingsTx = db.transaction((entries) => entries.forEach(([k, v]) => insertSetting.run(k, v)));
settingsTx(Object.entries(defaultSettings));

console.log(`Seeded ${HOSPITALS.length} hospitals and default system settings.`);
