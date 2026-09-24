const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { signAccessToken } = require('../middleware/auth');
const { generatePatientId } = require('../utils/idGenerator');
const { logAction } = require('../utils/audit');
const { calculateAge } = require('../utils/age');

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const insertUser = db.prepare(`
  INSERT INTO users
    (patient_id, role, email, password_hash, first_name, last_name, phone,
     ghana_card, birth_cert, national_id, nhis, dob, gender, address, home_hospital_id)
  VALUES
    (@patient_id, 'patient', @email, @password_hash, @first_name, @last_name, @phone,
     @ghana_card, @birth_cert, @national_id, @nhis, @dob, @gender, @address, @home_hospital_id)
`);

const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const findById = db.prepare('SELECT * FROM users WHERE id = ?');

function publicUser(u) {
  if (!u) return null;
  const { password_hash, failed_logins, locked_until, ...rest } = u; // eslint-disable-line no-unused-vars
  return { ...rest, age: calculateAge(u.dob) };
}

async function register(req, res, next) {
  try {
    const {
      email, password, firstName, lastName, phone,
      ghanaCard, birthCert, nationalId, nhis, dob, gender, address, homeHospitalId,
    } = req.body;

    if (findByEmail.get(email.toLowerCase())) {
      return res.status(409).json({ error: 'An account already exists with that email address.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const patientId = generatePatientId();

    const info = insertUser.run({
      patient_id: patientId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone,
      ghana_card: ghanaCard,
      birth_cert: birthCert || null,
      national_id: nationalId || null,
      nhis: nhis || null,
      dob,
      gender,
      address: address || null,
      home_hospital_id: homeHospitalId || null,
    });

    const user = findById.get(info.lastInsertRowid);
    const token = signAccessToken(user);
    logAction({ userId: user.id, action: 'REGISTER', entityType: 'user', entityId: user.id, req });

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = findByEmail.get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: `Account temporarily locked after repeated failed attempts. Try again after ${new Date(user.locked_until).toLocaleTimeString()}.` });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      const failed = user.failed_logins + 1;
      const lockedUntil = failed >= MAX_FAILED_LOGINS
        ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString()
        : null;
      db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
        .run(failed, lockedUntil, user.id);
      logAction({ userId: user.id, action: 'LOGIN_FAILED', req });
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    db.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').run(user.id);

    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact patient services.' });
    }

    const token = signAccessToken(user);
    logAction({ userId: user.id, action: 'LOGIN', req });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  const user = findById.get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  res.json({ user: publicUser(user) });
}

function changePassword(req, res, next) {
  (async () => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = findById.get(req.user.id);
      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
      const hash = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, user.id);
      logAction({ userId: user.id, action: 'PASSWORD_CHANGE', req });
      res.json({ message: 'Password updated.' });
    } catch (err) { next(err); }
  })();
}

module.exports = { register, login, me, changePassword, _publicUser: publicUser };
