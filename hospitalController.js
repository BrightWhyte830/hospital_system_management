const db = require('../db/connection');

function list(req, res) {
  const rows = db.prepare('SELECT id, name, region, phone FROM hospitals WHERE is_active = 1 ORDER BY name').all();
  res.json({ hospitals: rows });
}

module.exports = { list };
