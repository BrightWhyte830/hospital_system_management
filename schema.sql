-- =====================================================================
-- GhanaHealth Portal — Database Schema (SQLite)
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Hospitals: the fixed list of registered facilities
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  region        TEXT NOT NULL,
  phone         TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------
-- Users: both patients and staff/admin accounts live here, distinguished
-- by role. Patient-only identity fields are nullable for staff rows.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id        TEXT UNIQUE,                 -- e.g. GH-PAT-482913, patients only
  role              TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient','staff','admin')),
  job_role         TEXT,
  department       TEXT,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  phone             TEXT NOT NULL,
  ghana_card        TEXT UNIQUE,
  birth_cert        TEXT,
  national_id       TEXT,
  nhis              TEXT,
  dob               TEXT,
  gender            TEXT CHECK (gender IN ('Male','Female','Other') OR gender IS NULL),
  address           TEXT,
  home_hospital_id  INTEGER REFERENCES hospitals(id),
  is_active         INTEGER NOT NULL DEFAULT 1,
  failed_logins     INTEGER NOT NULL DEFAULT 0,
  locked_until      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Appointments — unique per (hospital, date, time) so two patients can
-- never be double-booked into the same slot at the same facility.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     INTEGER NOT NULL REFERENCES hospitals(id),
  service         TEXT NOT NULL,
  appt_date       TEXT NOT NULL,                  -- YYYY-MM-DD
  appt_time       TEXT NOT NULL,                  -- e.g. "9:00 AM"
  mode            TEXT NOT NULL CHECK (mode IN ('In-Person Visit','Telehealth / Video Call','Phone Consultation')),
  reason          TEXT NOT NULL,
  doctor_pref     TEXT,
  language_pref   TEXT,
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (hospital_id, appt_date, appt_time)
);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_hospital_date ON appointments(hospital_id, appt_date);

-- ---------------------------------------------------------------------
-- Service requests (clinical intake, not a scheduled slot)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_requests (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  reference             TEXT NOT NULL UNIQUE,
  patient_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id           INTEGER NOT NULL REFERENCES hospitals(id),
  service               TEXT NOT NULL,
  urgency               TEXT NOT NULL CHECK (urgency IN ('Routine','Semi-Urgent','Urgent','Emergency')),
  symptoms              TEXT NOT NULL,
  duration              TEXT,
  medications           TEXT,
  allergies             TEXT,
  previous_hosp         TEXT,
  emergency_contact_nm  TEXT NOT NULL,
  emergency_contact_ph  TEXT NOT NULL,
  emergency_contact_rel TEXT,
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','triaged','in_progress','completed','cancelled')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_svc_patient ON service_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_svc_status ON service_requests(status);

-- ---------------------------------------------------------------------
-- Complaints
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     INTEGER NOT NULL REFERENCES hospitals(id),
  complaint_type  TEXT NOT NULL,
  incident_date   TEXT NOT NULL,
  department      TEXT,
  staff_involved  TEXT,
  description     TEXT NOT NULL,
  desired_outcome TEXT,
  rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
  status          TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','under_review','resolved','dismissed')),
  resolution_note TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_complaint_patient ON complaints(patient_id);
CREATE INDEX IF NOT EXISTS idx_complaint_status ON complaints(status);

-- ---------------------------------------------------------------------
-- Contact messages (patient -> hospital communications desk)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     INTEGER NOT NULL REFERENCES hospitals(id),
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  preferred_response TEXT CHECK (preferred_response IN ('Phone Call','SMS','Email')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','closed')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Audit log — every sensitive action, for accountability under Act 843
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  ip_address  TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

-- ---------------------------------------------------------------------
-- System settings — simple key/value store admins can edit at runtime
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Refresh tokens — supports logout / token revocation
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
