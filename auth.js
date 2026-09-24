const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in the environment (see .env.example).');
}

/** Requires a valid access token; attaches { id, role, patientId } to req.user */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in again.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/** Restricts a route to one or more roles, e.g. requireRole('staff','admin') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      jobRole: user.job_role || null,
      department: user.department || null,
      patientId: user.patient_id,
      homeHospitalId: user.home_hospital_id || null,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

module.exports = { requireAuth, requireRole, signAccessToken, JWT_SECRET };
